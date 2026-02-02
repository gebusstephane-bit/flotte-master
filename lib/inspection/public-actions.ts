"use server";

/**
 * PUBLIC SERVER ACTIONS - Inspection anonyme
 * 
 * Ces actions sont accessibles SANS authentification.
 * Elles permettent aux conducteurs anonymes de soumettre des inspections.
 * 
 * SÉCURITÉ:
 * - Rate limiting par IP
 * - Validation Zod stricte
 * - Sanitization des inputs
 * - Vérification de l'existence du véhicule
 * - Isolation par organisation (récupérée depuis le véhicule)
 * - Pas d'accès aux données sensibles
 */

import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cleanDisplayString } from "@/lib/security/input-sanitizer";
import { z } from "zod";

// ============================================================================
// RATE LIMITING (In-memory, simple pour démarrer)
// ============================================================================

const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 3; // 3 inspections par minute max

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

// Nettoyage périodique
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

async function checkRateLimit(): Promise<{ allowed: boolean; retryAfter?: number }> {
  const headersList = await headers();
  const forwardedFor = headersList.get("x-forwarded-for");
  const realIp = headersList.get("x-real-ip");
  const ip = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";
  
  const now = Date.now();
  const entry = rateLimitStore.get(ip);

  if (!entry || entry.resetAt < now) {
    rateLimitStore.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });
    return { allowed: true };
  }

  if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
    return {
      allowed: false,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  entry.count++;
  return { allowed: true };
}

// ============================================================================
// SCHEMAS DE VALIDATION
// ============================================================================

const DefectSchema = z.object({
  category: z.enum(["tires", "body", "mechanical", "electrical", "cleanliness", "lights", "fluids", "safety"]),
  severity: z.enum(["critical", "warning", "minor"]),
  description: z.string().min(2).max(500),
  location: z.string().min(2).max(200),
  photo_url: z.string().url().nullable().optional(),
  reported_at: z.string().datetime(),
});

const AnonymousInspectionSchema = z.object({
  vehicleId: z.string(), // Accepte tout format d'ID (UUID ou autre)
  mileage: z.number().min(0).max(9999999),
  fuelGasoil: z.number().min(0).max(100),
  fuelGnr: z.number().min(0).max(100),
  fuelAdblue: z.number().min(0).max(100),
  interiorCondition: z.enum(["clean", "dirty", "damaged"]),
  exteriorCondition: z.enum(["clean", "dirty", "damaged"]),
  defects: z.array(DefectSchema).max(20), // Max 20 anomalies
  driverSignature: z.string().min(10), // Signature base64 (peut être courte)
  driverName: z.string().min(2).max(100),
});

// Type explicite pour éviter les problèmes d'hoisting
interface AnonymousInspectionInput {
  vehicleId: string;
  mileage: number;
  fuelGasoil: number;
  fuelGnr: number;
  fuelAdblue: number;
  interiorCondition: "clean" | "dirty" | "damaged";
  exteriorCondition: "clean" | "dirty" | "damaged";
  defects: Array<{
    category: "tires" | "body" | "mechanical" | "electrical" | "cleanliness" | "lights" | "fluids" | "safety";
    severity: "critical" | "warning" | "minor";
    description: string;
    location: string;
    photo_url?: string | null | undefined;
    reported_at: string;
  }>;
  driverSignature: string;
  driverName: string;
}

// ============================================================================
// ACTIONS PUBLIQUES
// ============================================================================

export interface VehicleInfo {
  id: string;
  immat: string;
  marque: string;
  type: string;
}

/**
 * Récupérer un véhicule par ID (public)
 * SÉCURISÉ: Retourne uniquement les infos de base, pas l'organization_id
 */
export async function getVehicleById(
  rawId: string
): Promise<{ success: true; data: VehicleInfo } | { success: false; error: string }> {
  try {
    // Décoder l'ID si encodé dans l'URL
    const id = decodeURIComponent(rawId).trim();
    
    // Validation de base (non vide)
    if (!id || id.length < 1) {
      console.error("[getVehicleById] ID vide");
      return { success: false, error: "ID de véhicule manquant" };
    }
    
    // Log pour debug
    console.log("[getVehicleById] ID reçu:", id, "longueur:", id.length);

    const { data, error } = await supabaseAdmin
      .from("vehicles")
      .select("id, immat, marque, type")
      .eq("id", id)
      .single();

    if (error || !data) {
      return { success: false, error: "Véhicule non trouvé" };
    }

    return { success: true, data };
  } catch (err) {
    return { success: false, error: "Erreur lors de la recherche" };
  }
}

/**
 * Normalise une immatriculation pour la recherche
 * Retire espaces et tirets pour comparaison flexible
 */
function normalizeImmat(immat: string): string {
  return immat.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Rechercher un véhicule par immatriculation (public)
 * Recherche flexible : accepte avec ou sans tirets/espaces
 * SÉCURISÉ: Limite à 5 résultats, pas de données sensibles
 */
export async function searchVehicleByImmat(
  immat: string
): Promise<{ success: true; data: VehicleInfo[] } | { success: false; error: string }> {
  try {
    // Rate limiting
    const rateLimit = await checkRateLimit();
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: `Trop de recherches. Réessayez dans ${rateLimit.retryAfter} secondes.`,
      };
    }

    // Sanitization
    if (!immat || typeof immat !== "string") {
      return { success: false, error: "Immatriculation invalide" };
    }

    const searchTerm = immat.trim().toUpperCase();
    const normalizedSearch = normalizeImmat(searchTerm);

    if (normalizedSearch.length < 2) {
      return { success: false, error: "Immatriculation trop courte (min 2 caractères)" };
    }

    // Recherche flexible - récupère tous les véhicules et filtre côté serveur
    // Cela permet de gérer les formats avec/sans tirets/espaces
    const { data: allVehicles, error } = await supabaseAdmin
      .from("vehicles")
      .select("id, immat, marque, type")
      .limit(100);

    if (error) {
      console.error("[searchVehicleByImmat] Supabase error:", error);
      return { success: false, error: "Erreur base de données" };
    }

    if (!allVehicles) {
      return { success: true, data: [] };
    }

    // Filtrer les véhicules qui correspondent
    const filtered = allVehicles.filter((v) => {
      const normalizedDb = normalizeImmat(v.immat);
      // Match si la recherche est incluse dans la DB ou vice versa
      return normalizedDb.includes(normalizedSearch) || 
             normalizedSearch.includes(normalizedDb) ||
             v.immat.toUpperCase().includes(searchTerm) ||
             searchTerm.includes(v.immat.toUpperCase());
    });

    console.log("[searchVehicleByImmat] Recherche:", normalizedSearch, "Trouvés:", filtered.length, "Premier:", filtered[0]);

    return { success: true, data: filtered.slice(0, 5) };
  } catch (err) {
    console.error("[searchVehicleByImmat] Unexpected error:", err);
    return { success: false, error: "Erreur lors de la recherche" };
  }
}

/**
 * Créer une inspection anonyme (public)
 * SÉCURISÉ: Récupère l'organization_id depuis le véhicule pour isolation
 */
export async function createAnonymousInspection(
  input: AnonymousInspectionInput
): Promise<{ success: true; inspectionId: string } | { success: false; error: string }> {
  console.log("[createAnonymousInspection] Input reçu:", JSON.stringify(input, null, 2));
  
  try {
    // Rate limiting strict (3 par minute)
    const rateLimit = await checkRateLimit();
    console.log("[createAnonymousInspection] Rate limit:", rateLimit);
    if (!rateLimit.allowed) {
      return {
        success: false,
        error: `Trop de soumissions. Réessayez dans ${rateLimit.retryAfter} secondes.`,
      };
    }

    // Validation Zod
    const parsed = AnonymousInspectionSchema.safeParse(input);
    console.log("[createAnonymousInspection] Validation:", parsed.success ? "OK" : parsed.error);
    if (!parsed.success) {
      const errorMessage = parsed.error?.issues?.map((e: any) => e.message).join(", ") 
        || parsed.error?.message 
        || "Données invalides";
      return {
        success: false,
        error: `Données invalides: ${errorMessage}`,
      };
    }

    // Vérifier que le véhicule existe ET récupérer son organization_id
    const { data: vehicle, error: vehicleError } = await supabaseAdmin
      .from("vehicles")
      .select("id, organization_id")
      .eq("id", parsed.data.vehicleId)
      .single();

    if (vehicleError || !vehicle) {
      console.error("[createAnonymousInspection] Véhicule non trouvé:", parsed.data.vehicleId);
      return { success: false, error: "Véhicule non trouvé" };
    }

    if (!vehicle.organization_id) {
      console.error("[createAnonymousInspection] Véhicule sans organisation:", parsed.data.vehicleId);
      return { success: false, error: "Configuration véhicule invalide" };
    }

    // Sanitization
    const sanitizedData = {
      ...parsed.data,
      driverName: cleanDisplayString(parsed.data.driverName),
      defects: parsed.data.defects.map((d) => ({
        ...d,
        description: cleanDisplayString(d.description),
        location: cleanDisplayString(d.location),
      })),
    };

    console.log("[createAnonymousInspection] Tentative d'insertion avec org:", vehicle.organization_id);
    
    // Prparer les données d'insertion avec organization_id
    const insertData = {
      vehicle_id: sanitizedData.vehicleId,
      driver_id: null,
      inspector_name: sanitizedData.driverName,
      mileage: sanitizedData.mileage,
      fuel_gasoil: sanitizedData.fuelGasoil,
      fuel_gnr: sanitizedData.fuelGnr,
      fuel_adblue: sanitizedData.fuelAdblue,
      fuel_type: "diesel",
      interior_condition: sanitizedData.interiorCondition,
      exterior_condition: sanitizedData.exteriorCondition,
      defects: sanitizedData.defects,
      digital_signature: sanitizedData.driverSignature,
      status: "pending_review",
      inspection_type: "anonymous_driver",
      fuel_level: sanitizedData.fuelGasoil,
      organization_id: vehicle.organization_id, // ← ISOLATION: assigne l'org du véhicule
    };
    
    const { data: directInsert, error: directError } = await supabaseAdmin
      .from("vehicle_inspections")
      .insert(insertData)
      .select("id")
      .single();
    
    if (directError) {
      console.error("[createAnonymousInspection] Insert error:", directError);
      return { success: false, error: `Erreur DB: ${directError.message}` };
    }
    
    console.log("[createAnonymousInspection] Succès:", directInsert?.id);
    return { success: true, inspectionId: directInsert.id };
  } catch (err) {
    console.error("[createAnonymousInspection] Unexpected error:", err);
    return { success: false, error: "Erreur inattendue" };
  }
}
