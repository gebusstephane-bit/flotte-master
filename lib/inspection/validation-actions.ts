"use server";

/**
 * Server Actions - Validation des inspections avec gestion défaut par défaut
 * Création automatique d'intervention pour les défauts non réparés
 */

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { z } from "zod";
import type { InspectionStatus } from "./types";
import type { UserRole } from "@/lib/role";

// ============================================================================
// SCHEMAS DE VALIDATION
// ============================================================================

const DefectSchema = z.object({
  category: z.string(),
  severity: z.enum(["critical", "warning", "minor"]),
  description: z.string(),
  location: z.string(),
  repaired: z.boolean(),
  repairDescription: z.string(),
});

const ValidateWithDefectsSchema = z.object({
  inspection_id: z.string().uuid(),
  vehicle_id: z.string().uuid(),
  vehicle_info: z.object({
    immat: z.string().optional(),
    marque: z.string().optional(),
    type: z.string().optional(),
  }).optional(),
  defects: z.array(DefectSchema),
});

export type ValidateWithDefectsInput = z.infer<typeof ValidateWithDefectsSchema>;

// ============================================================================
// ROLES AUTORISÉS (admin, agent_parc, exploitation)
// ============================================================================

const AUTHORIZED_ROLES: UserRole[] = ["admin", "agent_parc", "exploitation"];

// ============================================================================
// HELPER: Récupérer le rôle depuis Supabase
// ============================================================================

async function getUserRoleFromServer(): Promise<UserRole | null> {
  try {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => cookieStore.get(name)?.value,
          set: () => {},
          remove: () => {},
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (error || !profile) {
      console.error("[getUserRoleFromServer] Erreur:", error);
      return null;
    }

    return profile.role as UserRole;
  } catch (error) {
    console.error("[getUserRoleFromServer] Exception:", error);
    return null;
  }
}

// ============================================================================
// HELPER: Créer une intervention
// ============================================================================

async function createIntervention(
  supabase: any,
  params: {
    vehicleId: string;
    inspectionId: string;
    description: string;
    priority: string;
    userId: string;
    vehicleInfo?: { immat?: string; marque?: string; type?: string };
  }
): Promise<{ success: boolean; interventionId?: string; error?: string }> {
  try {
    const { data, error } = await supabase
      .from("interventions")
      .insert({
        vehicle_id: params.vehicleId,
        vehicule: params.vehicleInfo?.marque || "Véhicule",
        immat: params.vehicleInfo?.immat || "",
        description: params.description,
        garage: "À définir", // À compléter dans le processus de demande
        montant: 0, // À compléter par le garage
        status: "pending",
        date_creation: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (error) {
      console.error("[createIntervention] Erreur:", error);
      return { success: false, error: error.message };
    }

    return { success: true, interventionId: data.id };
  } catch (err: any) {
    console.error("[createIntervention] Exception:", err);
    return { success: false, error: err.message };
  }
}

// ============================================================================
// ACTION: Valider une inspection avec gestion des défauts
// ============================================================================

export async function validateInspectionWithDefects(
  input: ValidateWithDefectsInput
): Promise<{ success: boolean; error?: string; data?: any }> {
  console.log("[validateInspectionWithDefects] Démarrage:", { 
    inspection_id: input.inspection_id, 
    defects_count: input.defects.length 
  });

  try {
    // 1. Validation du schéma
    const validated = ValidateWithDefectsSchema.safeParse(input);
    if (!validated.success) {
      console.error("[validateInspectionWithDefects] Erreur schéma:", validated.error);
      return {
        success: false,
        error: "Données invalides: " + validated.error.issues.map((e: any) => e.message).join(", "),
      };
    }

    const { inspection_id, vehicle_id, vehicle_info, defects } = validated.data;

    // 2. Authentification
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => cookieStore.get(name)?.value,
          set: () => {},
          remove: () => {},
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return { success: false, error: "Non authentifié" };
    }

    // 3. Vérification du rôle
    const userRole = await getUserRoleFromServer();
    if (!userRole || !AUTHORIZED_ROLES.includes(userRole)) {
      return { 
        success: false, 
        error: `Permission refusée. Rôle '${userRole}' non autorisé.` 
      };
    }

    // 4. Séparer les défauts réparés et non réparés
    const repairedDefects = defects.filter(d => d.repaired);
    const toRepairDefects = defects.filter(d => !d.repaired);

    console.log("[validateInspectionWithDefects] Défauts:", {
      repaired: repairedDefects.length,
      toRepair: toRepairDefects.length,
    });

    // 5. Créer une intervention si des défauts ne sont pas réparés
    let interventionId: string | undefined;
    let interventionCreated = false;

    if (toRepairDefects.length > 0) {
      const priority = toRepairDefects.some(d => d.severity === "critical") ? "critique" :
                       toRepairDefects.some(d => d.severity === "warning") ? "haute" : "moyenne";

      const description = toRepairDefects.map((d, i) => 
        `${i + 1}. [${d.severity.toUpperCase()}] ${d.category}: ${d.description} (${d.location})`
      ).join("\n");

      const result = await createIntervention(supabase, {
        vehicleId: vehicle_id,
        inspectionId: inspection_id,
        description: `Anomalies détectées lors de l'inspection:\n${description}`,
        priority,
        userId: user.id,
        vehicleInfo: vehicle_info,
      });

      if (!result.success) {
        console.error("[validateInspectionWithDefects] Erreur création intervention:", result.error);
        return { 
          success: false, 
          error: "Erreur lors de la création de l'intervention: " + result.error 
        };
      }

      interventionId = result.interventionId;
      interventionCreated = true;
      console.log("[validateInspectionWithDefects] Intervention créée:", interventionId);
    }

    // 6. Déterminer le nouveau statut
    // Si tous les défauts sont réparés → validated
    // Si certains défauts sont à réparer → requires_action (en attente d'intervention)
    const newStatus: InspectionStatus = toRepairDefects.length > 0 ? "requires_action" : "validated";
    
    const reviewNotes = toRepairDefects.length > 0
      ? `VALIDÉE_AVEC_INTERVENTION: ${toRepairDefects.length} défaut(s) à réparer. Intervention: ${interventionId}`
      : "VALIDÉE_TOUT_REPARÉ";

    const { error: updateError } = await supabase
      .from("vehicle_inspections")
      .update({
        status: newStatus,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes,
        updated_at: new Date().toISOString(),
        // Lier l'inspection à l'intervention créée
        intervention_id: interventionId || null,
        // Sauvegarder les défauts avec leur statut de réparation
        defects: defects.map(d => ({
          ...d,
          repaired: d.repaired,
          repair_description: d.repairDescription,
        })),
      })
      .eq("id", inspection_id);

    if (updateError) {
      console.error("[validateInspectionWithDefects] Erreur update:", updateError);
      return { success: false, error: "Erreur lors de la validation" };
    }

    // 7. Revalidation du cache
    revalidatePath("/inspections");
    revalidatePath(`/inspections/${inspection_id}`);

    return {
      success: true,
      data: {
        inspectionId: inspection_id,
        interventionCreated,
        interventionId,
        repairedCount: repairedDefects.length,
        toRepairCount: toRepairDefects.length,
        message: interventionCreated 
          ? `Inspection validée. ${toRepairDefects.length} défaut(s) à réparer via intervention #${interventionId?.slice(0, 8)}`
          : "Inspection validée - Tous les défauts sont réparés",
      },
    };

  } catch (error: any) {
    console.error("[validateInspectionWithDefects] Exception:", error);
    return {
      success: false,
      error: error.message || "Erreur technique",
    };
  }
}
