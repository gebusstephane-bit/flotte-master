/**
 * Client API pour les inspections publiques
 * Utilise fetch() au lieu des Server Actions pour meilleure compatibilité mobile
 */

import { VehicleInfo } from "./public-actions";

const API_BASE = "/api/public";

/**
 * Récupère un véhicule par ID via API (compatible mobile)
 */
export async function getVehicleByIdAPI(
  id: string
): Promise<{ success: true; data: VehicleInfo } | { success: false; error: string }> {
  try {
    console.log("[getVehicleByIdAPI] Fetching vehicle:", id);
    
    const response = await fetch(`${API_BASE}/vehicle?id=${encodeURIComponent(id)}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      // Important pour mobile : pas de cache
      cache: "no-store",
    });

    const result = await response.json();
    console.log("[getVehicleByIdAPI] Response:", result);

    if (!response.ok || !result.success) {
      return { 
        success: false, 
        error: result.error || `Erreur ${response.status}` 
      };
    }

    return { success: true, data: result.data };
  } catch (err: any) {
    console.error("[getVehicleByIdAPI] Error:", err);
    return { 
      success: false, 
      error: "Erreur réseau: " + (err.message || "Unknown error") 
    };
  }
}

/**
 * Recherche un véhicule par immatriculation via API
 */
export async function searchVehicleByImmatAPI(
  immat: string
): Promise<{ success: true; data: VehicleInfo[] } | { success: false; error: string }> {
  try {
    console.log("[searchVehicleByImmatAPI] Searching:", immat);
    
    const response = await fetch(`${API_BASE}/vehicle?immat=${encodeURIComponent(immat)}`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
      },
      cache: "no-store",
    });

    const result = await response.json();
    console.log("[searchVehicleByImmatAPI] Response:", result);

    if (!response.ok || !result.success) {
      return { 
        success: false, 
        error: result.error || `Erreur ${response.status}` 
      };
    }

    return { success: true, data: result.data ? [result.data] : [] };
  } catch (err: any) {
    console.error("[searchVehicleByImmatAPI] Error:", err);
    return { 
      success: false, 
      error: "Erreur réseau: " + (err.message || "Unknown error") 
    };
  }
}
