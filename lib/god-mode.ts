/**
 * GOD MODE - Accès développeur
 * 
 * Ce fichier permet de bypasser les restrictions multi-tenant
 * pour le compte développeur uniquement.
 */

import { supabase } from "./supabase";

// Email du développeur (vous)
const GOD_MODE_EMAILS: string[] = [
  // Ajoutez votre email ici
  // "votre-email@exemple.com",
];

/**
 * Vérifie si l'utilisateur courant est en mode god
 */
export async function isGodMode(): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  
  return GOD_MODE_EMAILS.includes(user.email || "");
}

/**
 * Récupère TOUS les véhicules (god mode) ou seulement ceux de l'org
 */
export async function getAllVehiclesGodMode() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { data: [], error: new Error("Non authentifié") };
  }
  
  // Si god mode, récupérer tous les véhicules
  if (GOD_MODE_EMAILS.includes(user.email || "")) {
    const { data, error } = await supabase
      .from("vehicles")
      .select("*")
      .order("immat");
    
    return { data: data || [], error };
  }
  
  // Sinon comportement normal (avec RLS)
  const { data, error } = await supabase
    .from("vehicles")
    .select("*")
    .order("immat");
  
  return { data: data || [], error };
}

/**
 * Récupère TOUTES les interventions (god mode)
 */
export async function getAllInterventionsGodMode() {
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { data: [], error: new Error("Non authentifié") };
  }
  
  const { data, error } = await supabase
    .from("interventions")
    .select("*")
    .order("created_at", { ascending: false });
  
  return { data: data || [], error };
}
