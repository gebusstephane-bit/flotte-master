/**
 * ORGANIZATION / MULTI-TENANT UTILITIES
 * 
 * Gestion des organisations et isolation des données
 */

import { supabase } from "./supabase";

// Types
export interface Organization {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  primary_color: string;
  plan: "free" | "starter" | "pro" | "enterprise";
  max_vehicles: number;
  max_users: number;
  status: "active" | "suspended" | "cancelled";
  created_at: string;
  updated_at: string;
  created_by: string | null;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: "owner" | "admin" | "manager" | "mechanic" | "member";
  status: "active" | "invited" | "suspended";
  joined_at: string;
  invited_at: string | null;
  invited_by: string | null;
  // Join avec profiles
  profile?: {
    id: string;
    email: string;
    nom: string | null;
    prenom: string | null;
  };
}

export type OrganizationRole = OrganizationMember["role"];

export const ROLE_LABELS: Record<OrganizationRole, string> = {
  owner: "Propriétaire",
  admin: "Administrateur",
  manager: "Manager",
  mechanic: "Mécanicien",
  member: "Membre",
};

export const ROLE_PERMISSIONS: Record<OrganizationRole, string[]> = {
  owner: ["*"], // Tout faire
  admin: [
    "vehicles:read",
    "vehicles:write",
    "vehicles:delete",
    "interventions:read",
    "interventions:write",
    "interventions:delete",
    "inspections:read",
    "inspections:write",
    "members:read",
    "members:write",
    "members:invite",
    "subscription:read",
    "subscription:manage",
  ],
  manager: [
    "vehicles:read",
    "vehicles:write",
    "interventions:read",
    "interventions:write",
    "inspections:read",
    "inspections:write",
    "members:read",
  ],
  mechanic: [
    "vehicles:read",
    "interventions:read",
    "interventions:write",
    "inspections:read",
    "inspections:write",
  ],
  member: [
    "vehicles:read",
    "interventions:read",
    "inspections:read",
  ],
};

// ============================================
// ORGANIZATION CRUD
// ============================================

/**
 * Récupérer l'organisation courante de l'utilisateur
 */
export async function getCurrentOrganization(): Promise<Organization | null> {
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("current_organization_id")
    .single();

  if (profileError || !profile?.current_organization_id) {
    // Essayer de récupérer la première org de l'utilisateur
    const { data: membership } = await supabase
      .from("organization_members")
      .select("organization_id")
      .eq("status", "active")
      .limit(1)
      .single();

    if (!membership) return null;

    // Mettre à jour le profil
    await supabase
      .from("profiles")
      .update({ current_organization_id: membership.organization_id })
      .eq("id", (await supabase.auth.getUser()).data.user?.id);

    const { data: org } = await supabase
      .from("organizations")
      .select("*")
      .eq("id", membership.organization_id)
      .single();

    return org;
  }

  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", profile.current_organization_id)
    .single();

  return org;
}

/**
 * Changer d'organisation courante
 */
export async function switchOrganization(organizationId: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ current_organization_id: organizationId })
    .eq("id", (await supabase.auth.getUser()).data.user?.id);

  if (error) throw error;
}

/**
 * Récupérer toutes les organisations de l'utilisateur
 */
export async function getUserOrganizations(): Promise<Organization[]> {
  const { data, error } = await supabase
    .from("organization_members")
    .select(`
      organization:organizations(*)
    `)
    .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
    .eq("status", "active");

  if (error) throw error;

  return data?.map((d: any) => d.organization) || [];
}

/**
 * Créer une nouvelle organisation
 */
export async function createOrganization(
  name: string,
  options?: { description?: string; email?: string; phone?: string }
): Promise<Organization> {
  const user = (await supabase.auth.getUser()).data.user;
  if (!user) throw new Error("Non authentifié");

  // Générer un slug unique
  const baseSlug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  const slug = `${baseSlug}-${Math.random().toString(36).substring(2, 8)}`;

  const { data: org, error } = await supabase
    .from("organizations")
    .insert({
      name,
      slug,
      description: options?.description,
      email: options?.email,
      phone: options?.phone,
      created_by: user.id,
      plan: "free",
      max_vehicles: 10,
      max_users: 3,
    })
    .select()
    .single();

  if (error) throw error;

  // Ajouter l'utilisateur comme owner
  await supabase.from("organization_members").insert({
    organization_id: org.id,
    user_id: user.id,
    role: "owner",
    status: "active",
  });

  // Mettre à jour le profil
  await supabase
    .from("profiles")
    .update({ current_organization_id: org.id })
    .eq("id", user.id);

  return org;
}

// ============================================
// MEMBERS MANAGEMENT
// ============================================

/**
 * Récupérer les membres d'une organisation
 */
export async function getOrganizationMembers(
  organizationId: string
): Promise<OrganizationMember[]> {
  const { data, error } = await supabase
    .from("organization_members")
    .select(`
      *,
      profile:user_id(id, email, nom, prenom)
    `)
    .eq("organization_id", organizationId)
    .order("joined_at", { ascending: false });

  if (error) throw error;

  return data || [];
}

/**
 * Inviter un membre
 */
export async function inviteMember(
  organizationId: string,
  email: string,
  role: OrganizationRole = "member"
): Promise<void> {
  // Vérifier les permissions
  const { data: currentMember } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", (await supabase.auth.getUser()).data.user?.id)
    .single();

  if (!currentMember || !["owner", "admin"].includes(currentMember.role)) {
    throw new Error("Permission refusée");
  }

  // Vérifier la limite d'utilisateurs
  const { data: org } = await supabase
    .from("organizations")
    .select("max_users")
    .eq("id", organizationId)
    .single();

  const { count } = await supabase
    .from("organization_members")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  if (count && count >= (org?.max_users || 3)) {
    throw new Error("Limite d'utilisateurs atteinte");
  }

  // Chercher l'utilisateur par email
  const { data: user } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .single();

  if (user) {
    // L'utilisateur existe, ajouter directement
    await supabase.from("organization_members").insert({
      organization_id: organizationId,
      user_id: user.id,
      role,
      status: "invited",
      invited_by: (await supabase.auth.getUser()).data.user?.id,
      invited_at: new Date().toISOString(),
    });
  } else {
    // TODO: Envoyer un email d'invitation
    throw new Error("Utilisateur non trouvé. Envoyez une invitation par email.");
  }
}

/**
 * Mettre à jour le rôle d'un membre
 */
export async function updateMemberRole(
  organizationId: string,
  memberId: string,
  newRole: OrganizationRole
): Promise<void> {
  const { error } = await supabase
    .from("organization_members")
    .update({ role: newRole })
    .eq("id", memberId)
    .eq("organization_id", organizationId);

  if (error) throw error;
}

/**
 * Retirer un membre
 */
export async function removeMember(
  organizationId: string,
  memberId: string
): Promise<void> {
  const { error } = await supabase
    .from("organization_members")
    .delete()
    .eq("id", memberId)
    .eq("organization_id", organizationId);

  if (error) throw error;
}

// ============================================
// PERMISSIONS HELPERS
// ============================================

/**
 * Vérifier si l'utilisateur a une permission
 */
export function hasPermission(
  role: OrganizationRole,
  permission: string
): boolean {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions.includes("*") || permissions.includes(permission);
}

/**
 * Vérifier les limites de l'organisation
 */
export async function checkOrganizationLimit(
  organizationId: string,
  type: "vehicles" | "users"
): Promise<{ current: number; max: number; canAdd: boolean }> {
  const { data: org } = await supabase
    .from("organizations")
    .select("max_vehicles, max_users")
    .eq("id", organizationId)
    .single();

  if (!org) throw new Error("Organisation non trouvée");

  const max = type === "vehicles" ? org.max_vehicles : org.max_users;

  const { count } = await supabase
    .from(type === "vehicles" ? "vehicles" : "organization_members")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", organizationId);

  return {
    current: count || 0,
    max,
    canAdd: (count || 0) < max,
  };
}
