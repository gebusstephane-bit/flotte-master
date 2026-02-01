/**
 * Client Supabase DIRECT pour mobile (sans API intermédiaire)
 * Utilise le client Supabase directement côté client
 */

import { createClient } from "@supabase/supabase-js";
import { VehicleInfo } from "./public-actions";

let supabaseClient: ReturnType<typeof createClient> | null = null;

function getSupabaseClient() {
  if (!supabaseClient) {
    // Récupérer les variables d'environnement (NEXT_PUBLIC_ sont disponibles côté client)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    console.log("[DIRECT] Env check:", { 
      hasUrl: !!supabaseUrl, 
      hasKey: !!supabaseAnonKey,
      url: supabaseUrl?.substring(0, 20) + "..."
    });
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(`Configuration manquante: URL=${!!supabaseUrl}, KEY=${!!supabaseAnonKey}`);
    }
    
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    
    console.log("[DIRECT] Client Supabase créé");
  }
  return supabaseClient;
}

/**
 * Récupère un véhicule par ID - VERSION DIRECTE
 */
export async function getVehicleByIdDirect(
  id: string
): Promise<{ success: true; data: VehicleInfo } | { success: false; error: string }> {
  try {
    console.log("[DIRECT] Recherche véhicule:", id);
    
    const decodedId = decodeURIComponent(id).trim();
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from("vehicles")
      .select("id, immat, marque, type")
      .eq("id", decodedId)
      .single();

    if (error) {
      console.error("[DIRECT] Supabase error:", error);
      return { success: false, error: "Véhicule non trouvé" };
    }

    console.log("[DIRECT] Trouvé:", data);
    return { success: true, data };
  } catch (err: any) {
    console.error("[DIRECT] Exception:", err);
    return { success: false, error: err.message || "Erreur inconnue" };
  }
}

/**
 * Recherche un véhicule par immatriculation - VERSION DIRECTE
 */
export async function searchVehicleByImmatDirect(
  immat: string
): Promise<{ success: true; data: VehicleInfo[] } | { success: false; error: string }> {
  try {
    console.log("[DIRECT] Recherche immat:", immat);
    
    const normalizedImmat = immat.toUpperCase().replace(/[^A-Z0-9]/g, "");
    const supabase = getSupabaseClient();
    
    const { data, error } = await supabase
      .from("vehicles")
      .select("id, immat, marque, type")
      .ilike("immat", `%${normalizedImmat}%`);

    if (error) {
      console.error("[DIRECT] Supabase error:", error);
      return { success: false, error: error.message };
    }

    console.log("[DIRECT] Résultats:", data?.length || 0);
    return { success: true, data: data || [] };
  } catch (err: any) {
    console.error("[DIRECT] Exception:", err);
    return { success: false, error: err.message || "Erreur inconnue" };
  }
}
