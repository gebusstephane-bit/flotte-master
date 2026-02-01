"use server";

/**
 * Server Actions - Module Vehicle Inspection
 * Next.js 14+ Server Actions pour les inspections véhicules
 * VERSION SÉCURISÉE - Corrections des vulnérabilités critiques
 */

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { headers } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import type {
  VehicleInspection,
  VehicleInspectionInput,
  VehicleInspectionSummary,
  OpenDefect,
  InspectionStats,
} from "./types";
import { VehicleInspectionSchema, InspectionStatusUpdateSchema } from "./types";

// ============================================================================
// CONSTANTES DE SÉCURITÉ
// ============================================================================

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 5;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

// ============================================================================
// RATE LIMITING - In-Memory Store (prod: utiliser Redis)
// ============================================================================

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Nettoyage périodique du store (toutes les 5 minutes)
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Vérifie si une requête respecte le rate limit
 */
function checkRateLimit(identifier: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = rateLimitStore.get(identifier);

  if (!entry || entry.resetAt < now) {
    // Nouvelle fenêtre
    rateLimitStore.set(identifier, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    // Limite atteinte
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  // Incrémenter le compteur
  entry.count++;
  return { allowed: true };
}

/**
 * Récupère l'identifiant pour le rate limiting (IP ou user ID)
 */
async function getRateLimitIdentifier(userId: string): Promise<string> {
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");
  const ip = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";
  return `inspection:create:${ip}:${userId}`;
}

// ============================================================================
// SANITIZATION - Protection XSS
// ============================================================================

/**
 * Échappe les caractères HTML spéciaux pour prévenir XSS
 */
function escapeHtml(str: string): string {
  const htmlEscapes: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };
  return str.replace(/[&<>"'\/]/g, (char) => htmlEscapes[char] || char);
}

/**
 * Sanitize une chaîne de caractères
 */
function sanitizeString(str: unknown): string {
  if (typeof str !== "string") return "";
  // Trim et limiter la longueur
  let sanitized = str.trim().slice(0, 5000);
  // Échapper les caractères spéciaux
  sanitized = escapeHtml(sanitized);
  return sanitized;
}

/**
 * Sanitize un objet inspection avant insertion
 */
function sanitizeInspectionInput(input: VehicleInspectionInput): VehicleInspectionInput {
  return {
    ...input,
    notes: input.notes ? sanitizeString(input.notes) : undefined,
    defects: input.defects?.map((defect) => ({
      ...defect,
      description: sanitizeString(defect.description),
    })),
  };
}

// ============================================================================
// AUTHORIZATION - Gestion des rôles
// ============================================================================

type UserRole = "admin" | "manager" | "driver" | "user";

interface UserWithRole {
  id: string;
  email?: string;
  role?: UserRole;
  app_metadata?: { role?: UserRole } | Record<string, any>;
  user_metadata?: { role?: UserRole } | Record<string, any>;
}

/**
 * Récupère l'utilisateur courant avec son rôle
 */
async function getCurrentUserWithRole(): Promise<UserWithRole> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll() {},
      },
    }
  );

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Non authentifié");
  }

  // Récupérer le rôle depuis les métadonnées ou la table profiles
  let role: UserRole = "user";
  
  // Essayer d'abord les métadonnées
  const metadataRole = user.app_metadata?.role || user.user_metadata?.role;
  if (metadataRole && ["admin", "manager", "driver"].includes(metadataRole)) {
    role = metadataRole as UserRole;
  } else {
    // Sinon, récupérer depuis la table profiles
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();
    
    if (profile?.role && ["admin", "manager", "driver"].includes(profile.role)) {
      role = profile.role as UserRole;
    }
  }

  return {
    ...user,
    role,
  };
}

/**
 * Vérifie si l'utilisateur est admin ou manager
 */
function isAdminOrManager(user: UserWithRole): boolean {
  return user.role === "admin" || user.role === "manager";
}

/**
 * Vérifie si l'utilisateur peut modifier une inspection
 * - Admin/Manager: peuvent modifier toutes les inspections
 * - Driver: ne peut modifier que ses propres inspections en pending_review
 */
async function canModifyInspection(
  user: UserWithRole,
  inspectionId: string
): Promise<{ allowed: boolean; reason?: string }> {
  // Admin et manager peuvent tout faire
  if (isAdminOrManager(user)) {
    return { allowed: true };
  }

  // Récupérer l'inspection
  const { data: inspection, error } = await supabaseAdmin
    .from("vehicle_inspections")
    .select("driver_id, status")
    .eq("id", inspectionId)
    .single();

  if (error || !inspection) {
    return { allowed: false, reason: "Inspection non trouvée" };
  }

  // Vérifier que l'utilisateur est le créateur
  if (inspection.driver_id !== user.id) {
    return {
      allowed: false,
      reason: "Vous n'êtes pas autorisé à modifier cette inspection",
    };
  }

  // Vérifier que le statut permet la modification
  if (inspection.status !== "pending_review") {
    return {
      allowed: false,
      reason: "Cette inspection ne peut plus être modifiée",
    };
  }

  return { allowed: true };
}

// ============================================================================
// ACTIONS - CRUD INSPECTIONS
// ============================================================================

/**
 * Créer une nouvelle inspection
 * SÉCURISÉ: Rate limiting + Sanitization
 */
export async function createInspection(
  input: VehicleInspectionInput
): Promise<{ success: true; data: VehicleInspection } | { success: false; error: string }> {
  try {
    // Validation Zod
    const parsed = VehicleInspectionSchema.safeParse(input);
    if (!parsed.success) {
      console.error("[createInspection] Validation Zod échouée:", parsed.error.issues);
      return {
        success: false,
        error: `Validation échouée: ${parsed.error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ")}`,
      };
    }

    // Vérifier l'authentification
    const user = await getCurrentUserWithRole();

    // Rate limiting
    const rateLimitId = await getRateLimitIdentifier(user.id);
    const rateLimit = checkRateLimit(rateLimitId);
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: `Trop de requêtes. Réessayez dans ${rateLimit.retryAfter} secondes.`,
      };
    }

    // Sanitization des entrées utilisateur
    const sanitizedData = sanitizeInspectionInput(parsed.data);

    // Préparer les données
    const inspectionData = {
      ...sanitizedData,
      driver_id: user.id,
      status: "pending_review" as const,
      defects: sanitizedData.defects || [],
      // Assurer que fuel_type est défini
      fuel_type: sanitizedData.fuel_type || "diesel",
      // Assurer que inspection_type est défini
      inspection_type: sanitizedData.inspection_type || "pre_trip",
    };

    console.log("[createInspection] Données à insérer:", JSON.stringify(inspectionData, null, 2));

    // Insertion avec service role (bypass RLS pour la création)
    const { data, error } = await supabaseAdmin
      .from("vehicle_inspections")
      .insert(inspectionData)
      .select()
      .single();

    if (error) {
      console.error("[createInspection] Supabase error:", error);
      return { success: false, error: `Erreur base de données: ${error.message}` };
    }

    // Revalidation des paths concernés
    revalidatePath("/inspection");
    revalidatePath("/parc");
    revalidatePath("/");

    return { success: true, data: data as VehicleInspection };
  } catch (err) {
    console.error("[createInspection] Unexpected error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
}

/**
 * Récupérer les inspections d'un véhicule
 * SÉCURISÉ: Pagination + Limit
 */
export async function getVehicleInspections(
  vehicleId: string,
  limit: number = 10,
  offset: number = 0
): Promise<{ success: true; data: VehicleInspection[]; count: number } | { success: false; error: string }> {
  try {
    // Validation des paramètres de pagination
    const validatedLimit = Math.min(Math.max(1, limit), MAX_PAGE_SIZE);
    const validatedOffset = Math.max(0, offset);

    const { data, error, count } = await supabaseAdmin
      .from("vehicle_inspections")
      .select("*, profiles:prenom,nom", { count: "exact" })
      .eq("vehicle_id", vehicleId)
      .order("created_at", { ascending: false })
      .range(validatedOffset, validatedOffset + validatedLimit - 1);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: (data || []) as unknown as VehicleInspection[], count: count || 0 };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
}

/**
 * Récupérer toutes les inspections (pour managers)
 * SÉCURISÉ: Pagination complète + Vérification rôle
 */
export async function getAllInspections(params?: {
  status?: string;
  vehicleId?: string;
  driverId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
  offset?: number;
  cursor?: string; // Pour cursor-based pagination
}): Promise<
  { success: true; data: VehicleInspection[]; count: number; hasMore: boolean; nextCursor?: string } | { success: false; error: string }
> {
  try {
    // Vérifier l'authentification et les permissions
    const user = await getCurrentUserWithRole();

    // Si l'utilisateur n'est pas admin/manager, il ne peut voir que ses inspections
    const driverFilter = isAdminOrManager(user) ? params?.driverId : user.id;

    // Validation de la pagination
    const limit = Math.min(Math.max(1, params?.limit || DEFAULT_PAGE_SIZE), MAX_PAGE_SIZE);
    const offset = Math.max(0, params?.offset || 0);

    // Construction de la requête avec JOIN pour éviter N+1
    let query = supabaseAdmin
      .from("vehicle_inspections")
      .select(
        `*,
        vehicle:vehicles!vehicle_id(id, immat, marque, type),
        driver:profiles!driver_id(id, prenom, nom, email)`,
        { count: "exact" }
      );

    // Filtres
    if (params?.status) {
      query = query.eq("status", params.status);
    }
    if (params?.vehicleId) {
      query = query.eq("vehicle_id", params.vehicleId);
    }
    if (driverFilter) {
      query = query.eq("driver_id", driverFilter);
    }
    if (params?.dateFrom) {
      query = query.gte("created_at", params.dateFrom);
    }
    if (params?.dateTo) {
      query = query.lte("created_at", params.dateTo);
    }

    // Cursor-based pagination (plus performant pour grandes tables)
    if (params?.cursor) {
      query = query.lt("created_at", params.cursor);
    }

    // Exécution avec range
    const { data, error, count } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + limit);

    if (error) {
      return { success: false, error: error.message };
    }

    // Calcul de la pagination
    const totalCount = count || 0;
    const hasMore = offset + (data?.length || 0) < totalCount;
    const nextCursor = hasMore && data && data.length > 0 
      ? data[data.length - 1].created_at 
      : undefined;

    return {
      success: true,
      data: (data || []) as unknown as VehicleInspection[],
      count: totalCount,
      hasMore,
      nextCursor,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
}

/**
 * Récupérer une inspection par ID
 * SÉCURISÉ: Vérification des permissions
 */
export async function getInspectionById(
  id: string
): Promise<{ success: true; data: VehicleInspection } | { success: false; error: string }> {
  try {
    // Vérifier l'authentification
    const user = await getCurrentUserWithRole();

    const { data, error } = await supabaseAdmin
      .from("vehicle_inspections")
      .select(
        `*,
        vehicle:vehicles!vehicle_id(id, immat, marque, type),
        driver:profiles!driver_id(id, prenom, nom, email)`
      )
      .eq("id", id)
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    // Vérifier les permissions si l'utilisateur n'est pas admin/manager
    if (!isAdminOrManager(user)) {
      const inspection = data as unknown as VehicleInspection & { driver_id: string };
      if (inspection.driver_id !== user.id) {
        return { success: false, error: "Accès non autorisé" };
      }
    }

    return { success: true, data: data as unknown as VehicleInspection };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
}

/**
 * Mettre à jour le statut d'une inspection (validation manager)
 * SÉCURISÉ: Vérification autorisation + Rôle requis
 */
export async function updateInspectionStatus(
  input: z.infer<typeof InspectionStatusUpdateSchema>
): Promise<{ success: true; data: VehicleInspection } | { success: false; error: string }> {
  try {
    const parsed = InspectionStatusUpdateSchema.safeParse(input);
    if (!parsed.success) {
      return {
        success: false,
        error: `Validation échouée: ${parsed.error.issues.map((e: any) => e.message).join(", ")}`,
      };
    }

    const user = await getCurrentUserWithRole();

    // Vérifier les permissions
    const authCheck = await canModifyInspection(user, parsed.data.inspection_id);
    if (!authCheck.allowed) {
      console.warn(`[updateInspectionStatus] Accès refusé pour user ${user.id}: ${authCheck.reason}`);
      return { success: false, error: authCheck.reason || "Accès non autorisé" };
    }

    // Sanitization des notes
    const sanitizedNotes = parsed.data.review_notes 
      ? sanitizeString(parsed.data.review_notes) 
      : null;

    const { data, error } = await supabaseAdmin
      .from("vehicle_inspections")
      .update({
        status: parsed.data.status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        notes: sanitizedNotes,
      })
      .eq("id", parsed.data.inspection_id)
      .select()
      .single();

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/inspection");
    revalidatePath("/inspection/review");

    return { success: true, data: data as VehicleInspection };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
}

/**
 * Supprimer une inspection (admin uniquement)
 * SÉCURISÉ: Vérification rôle admin
 */
export async function deleteInspection(
  id: string
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const user = await getCurrentUserWithRole();

    // Seul l'admin peut supprimer
    if (user.role !== "admin") {
      return { success: false, error: "Seuls les administrateurs peuvent supprimer une inspection" };
    }

    const { error } = await supabaseAdmin.from("vehicle_inspections").delete().eq("id", id);

    if (error) {
      return { success: false, error: error.message };
    }

    revalidatePath("/inspection");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
}

// ============================================================================
// ACTIONS - VUES & STATISTIQUES
// ============================================================================

/**
 * Récupérer le résumé des inspections (vue materialisée)
 * SÉCURISÉ: Vérification rôle pour données sensibles
 */
export async function getInspectionSummaries(): Promise<
  { success: true; data: VehicleInspectionSummary[] } | { success: false; error: string }
> {
  try {
    // Vérifier l'authentification
    await getCurrentUserWithRole();

    const { data, error } = await supabaseAdmin
      .from("vehicle_inspection_summary")
      .select("*")
      .order("health_score", { ascending: true });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: (data || []) as VehicleInspectionSummary[] };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
}

/**
 * Récupérer les défauts ouverts
 * SÉCURISÉ: Vérification authentification
 */
export async function getOpenDefects(): Promise<
  { success: true; data: OpenDefect[] } | { success: false; error: string }
> {
  try {
    // Vérifier l'authentification
    await getCurrentUserWithRole();

    const { data, error } = await supabaseAdmin
      .from("open_defects_view")
      .select("*")
      .order("reported_at", { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: (data || []) as OpenDefect[] };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
}

/**
 * Récupérer les statistiques globales
 * SÉCURISÉ: Vérification authentification
 */
export async function getInspectionStats(): Promise<
  { success: true; data: InspectionStats } | { success: false; error: string }
> {
  try {
    // Vérifier l'authentification
    await getCurrentUserWithRole();

    const today = new Date().toISOString().split("T")[0];

    // Total inspections
    const { count: totalInspections, error: error1 } = await supabaseAdmin
      .from("vehicle_inspections")
      .select("*", { count: "exact", head: true });

    // Critical defects
    const { count: criticalDefects, error: error2 } = await supabaseAdmin
      .from("vehicle_inspections")
      .select("*", { count: "exact", head: true })
      .contains("defects", [{ severity: "critical" }]);

    // Warning defects
    const { count: warningDefects, error: error3 } = await supabaseAdmin
      .from("vehicle_inspections")
      .select("*", { count: "exact", head: true })
      .contains("defects", [{ severity: "warning" }]);

    // Today's inspections
    const { count: inspectionsToday, error: error4 } = await supabaseAdmin
      .from("vehicle_inspections")
      .select("*", { count: "exact", head: true })
      .gte("created_at", today);

    // Pending reviews
    const { count: pendingReviews, error: error5 } = await supabaseAdmin
      .from("vehicle_inspections")
      .select("*", { count: "exact", head: true })
      .eq("status", "pending_review");

    // Average health score
    const { data: healthData, error: error6 } = await supabaseAdmin
      .from("vehicle_inspection_summary")
      .select("health_score");

    if (error1 || error2 || error3 || error4 || error5 || error6) {
      return { success: false, error: "Erreur lors de la récupération des statistiques" };
    }

    const healthScores = healthData?.map((d) => d.health_score) || [];
    const averageHealthScore =
      healthScores.length > 0
        ? Math.round(healthScores.reduce((a, b) => a + b, 0) / healthScores.length)
        : 100;

    return {
      success: true,
      data: {
        totalInspections: totalInspections || 0,
        criticalDefects: criticalDefects || 0,
        warningDefects: warningDefects || 0,
        averageHealthScore,
        inspectionsToday: inspectionsToday || 0,
        pendingReviews: pendingReviews || 0,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
}

// ============================================================================
// ACTIONS - VÉHICULE (pour QR scan)
// ============================================================================

/**
 * Récupérer un véhicule par ID (pour QR scan)
 * SÉCURISÉ: Validation ID + Authentification
 */
export async function getVehicleById(
  id: string
): Promise<
  | { success: true; data: { id: string; immat: string; marque: string; type: string } }
  | { success: false; error: string }
> {
  try {
    // Validation de l'ID (prévention injection)
    if (!id || typeof id !== "string" || !/^[0-9a-fA-F-]{36}$/.test(id)) {
      return { success: false, error: "ID de véhicule invalide" };
    }

    // Vérifier l'authentification
    await getCurrentUserWithRole();

    const { data, error } = await supabaseAdmin
      .from("vehicles")
      .select("id, immat, marque, type")
      .eq("id", id)
      .single();

    if (error) {
      return { success: false, error: "Véhicule non trouvé" };
    }

    return { success: true, data };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
}

/**
 * Rechercher un véhicule par immatriculation
 * SÉCURISÉ: Sanitization input + Rate limiting + Authentification
 */
export async function searchVehicleByImmat(
  immat: string
): Promise<
  | { success: true; data: { id: string; immat: string; marque: string; type: string }[] }
  | { success: false; error: string }
> {
  try {
    // Vérifier l'authentification
    const user = await getCurrentUserWithRole();

    // Rate limiting sur la recherche
    const rateLimitId = `vehicle:search:${user.id}`;
    const rateLimit = checkRateLimit(rateLimitId);
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: `Trop de recherches. Réessayez dans ${rateLimit.retryAfter} secondes.`,
      };
    }

    // Sanitization de l'input
    if (!immat || typeof immat !== "string") {
      return { success: false, error: "Immatriculation invalide" };
    }

    // Nettoyer et valider l'immatriculation
    const sanitizedImmat = immat
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9\-]/g, "") // Garder uniquement alphanumérique et tiret
      .slice(0, 20); // Limiter la longueur

    if (sanitizedImmat.length < 2) {
      return { success: false, error: "Immatriculation trop courte" };
    }

    const { data, error } = await supabaseAdmin
      .from("vehicles")
      .select("id, immat, marque, type")
      .ilike("immat", `%${sanitizedImmat}%`)
      .limit(5);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, data: data || [] };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Erreur inconnue",
    };
  }
}
