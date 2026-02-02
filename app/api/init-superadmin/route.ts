import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const SUPER_ADMIN_EMAIL = "fleet.master.contact@gmail.com";
const SUPER_ADMIN_PASSWORD = "Emilie57"; // Mot de passe temporaire à changer

/**
 * API pour initialiser le compte super admin
 * À appeler une seule fois lors du setup initial
 */
export async function POST(request: NextRequest) {
  try {
    // Vérifier si un super admin existe déjà
    const { data: existingUsers } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("email", SUPER_ADMIN_EMAIL)
      .single();

    if (existingUsers) {
      return NextResponse.json(
        { error: "Le compte super admin existe déjà" },
        { status: 400 }
      );
    }

    // Créer l'utilisateur dans Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: SUPER_ADMIN_EMAIL,
      password: SUPER_ADMIN_PASSWORD,
      email_confirm: true,
      user_metadata: {
        first_name: "Super",
        last_name: "Admin",
      },
    });

    if (authError) {
      console.error("[init-superadmin] Auth error:", authError);
      return NextResponse.json(
        { error: `Erreur création auth: ${authError.message}` },
        { status: 500 }
      );
    }

    if (!authData.user) {
      return NextResponse.json(
        { error: "Échec création utilisateur" },
        { status: 500 }
      );
    }

    // Créer une organisation pour le super admin
    const { data: orgData, error: orgError } = await supabaseAdmin
      .from("organizations")
      .insert({
        name: "FleetFlow HQ",
        slug: "fleetflow-hq",
        created_by: authData.user.id,
        plan: "enterprise",
        max_vehicles: 999999,
        max_users: 999999,
        status: "active",
      })
      .select()
      .single();

    if (orgError) {
      console.error("[init-superadmin] Org error:", orgError);
    }

    // Mettre à jour le profil avec l'organisation
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({
        current_organization_id: orgData?.id,
        role: "admin",
      })
      .eq("id", authData.user.id);

    if (profileError) {
      console.error("[init-superadmin] Profile error:", profileError);
    }

    // Ajouter comme membre de l'organisation
    if (orgData) {
      await supabaseAdmin.from("organization_members").insert({
        organization_id: orgData.id,
        user_id: authData.user.id,
        role: "owner",
        status: "active",
      });
    }

    return NextResponse.json({
      success: true,
      message: "Compte super admin créé avec succès",
      email: SUPER_ADMIN_EMAIL,
      password: SUPER_ADMIN_PASSWORD,
      note: "Changez le mot de passe après la première connexion",
    });
  } catch (error: any) {
    console.error("[init-superadmin] Error:", error);
    return NextResponse.json(
      { error: error.message || "Erreur interne" },
      { status: 500 }
    );
  }
}

// GET pour vérifier si le super admin existe
export async function GET() {
  try {
    const { data } = await supabaseAdmin
      .from("profiles")
      .select("id, email")
      .eq("email", SUPER_ADMIN_EMAIL)
      .single();

    return NextResponse.json({
      exists: !!data,
      email: SUPER_ADMIN_EMAIL,
    });
  } catch (error) {
    return NextResponse.json({
      exists: false,
      email: SUPER_ADMIN_EMAIL,
    });
  }
}
