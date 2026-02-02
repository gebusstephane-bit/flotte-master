/**
 * SCRIPT DE RÉPARATION DES DONNÉES
 * 
 * À exécuter dans la console navigateur ou comme script Node.js
 * Ce script lie vos données existantes à votre organisation
 */

import { supabase } from "@/lib/supabase";

export async function fixDataOrganization() {
  console.log("🔧 Réparation des données...");
  
  // 1. Récupérer l'utilisateur courant
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    console.error("❌ Non authentifié");
    return;
  }
  
  console.log("👤 Utilisateur:", user.email);
  
  // 2. Vérifier si l'utilisateur a une organisation
  const { data: memberships } = await supabase
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", user.id)
    .eq("status", "active");
  
  let orgId: string;
  
  if (!memberships || memberships.length === 0) {
    console.log("🏢 Création d'une organisation...");
    
    // Créer une organisation
    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({
        name: "Mon Organisation",
        slug: `mon-org-${Math.random().toString(36).substring(2, 8)}`,
        plan: "enterprise",
        max_vehicles: 999999,
        max_users: 999999,
        created_by: user.id,
      })
      .select()
      .single();
    
    if (orgError || !org) {
      console.error("❌ Erreur création org:", orgError);
      return;
    }
    
    orgId = org.id;
    
    // Ajouter l'utilisateur comme owner
    await supabase.from("organization_members").insert({
      organization_id: orgId,
      user_id: user.id,
      role: "owner",
      status: "active",
    });
    
    // Mettre à jour le profil
    await supabase
      .from("profiles")
      .update({ current_organization_id: orgId })
      .eq("id", user.id);
    
    console.log("✅ Organisation créée:", orgId);
  } else {
    orgId = memberships[0].organization_id;
    console.log("✅ Organisation existante:", orgId);
  }
  
  // 3. Lier les véhicules sans organization_id
  console.log("🚗 Mise à jour des véhicules...");
  const { data: vehicles, error: vError } = await supabase
    .from("vehicles")
    .select("id")
    .is("organization_id", null);
  
  if (vError) {
    console.error("❌ Erreur récupération véhicules:", vError);
  } else if (vehicles && vehicles.length > 0) {
    console.log(`📊 ${vehicles.length} véhicules à mettre à jour`);
    
    // Désactiver RLS temporairement (nécessite des privilèges admin)
    // Ou mettre à jour un par un
    for (const vehicle of vehicles) {
      await supabase
        .from("vehicles")
        .update({ organization_id: orgId })
        .eq("id", vehicle.id);
    }
    
    console.log("✅ Véhicules mis à jour");
  } else {
    console.log("✅ Tous les véhicules sont déjà liés");
  }
  
  // 4. Lier les interventions
  console.log("🔧 Mise à jour des interventions...");
  const { data: interventions, error: iError } = await supabase
    .from("interventions")
    .select("id")
    .is("organization_id", null);
  
  if (iError) {
    console.error("❌ Erreur récupération interventions:", iError);
  } else if (interventions && interventions.length > 0) {
    console.log(`📊 ${interventions.length} interventions à mettre à jour`);
    
    for (const intervention of interventions) {
      await supabase
        .from("interventions")
        .update({ organization_id: orgId })
        .eq("id", intervention.id);
    }
    
    console.log("✅ Interventions mises à jour");
  } else {
    console.log("✅ Toutes les interventions sont déjà liées");
  }
  
  console.log("🎉 Réparation terminée ! Rafraîchissez la page.");
}

// Pour l'exécuter dans la console:
// import { fixDataOrganization } from "./scripts/fix-data-organization";
// fixDataOrganization();
