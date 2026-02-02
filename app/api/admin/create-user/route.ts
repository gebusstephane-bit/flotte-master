import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    // Verify caller is admin/direction
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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Check caller role AND get their organization
    const { data: callerProfile, error: callerError } = await supabaseAdmin
      .from("profiles")
      .select("role, current_organization_id")
      .eq("id", user.id)
      .single();

    if (callerError) {
      console.error("[create-user] Error fetching caller profile:", callerError);
      return NextResponse.json({ error: "Erreur profil appelant" }, { status: 500 });
    }

    if (!callerProfile || !["admin", "direction"].includes(callerProfile.role)) {
      return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
    }

    // Vérifier que l'admin a une organisation
    if (!callerProfile.current_organization_id) {
      console.error("[create-user] Caller has no organization:", user.id);
      return NextResponse.json({ error: "Organisation non définie pour l'admin" }, { status: 403 });
    }

    const body = await request.json();
    const { email, prenom, nom, role, password } = body;

    if (!email || !prenom || !nom || !role || !password) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    if (!["admin", "direction", "agent_parc", "exploitation"].includes(role)) {
      return NextResponse.json({ error: "Rôle invalide" }, { status: 400 });
    }

    console.log("[create-user] Creating user:", email, "by:", user.email, "org:", callerProfile.current_organization_id);

    // Create auth user via service role
    const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

    if (authError) {
      console.error("[create-user] Auth error:", authError);
      return NextResponse.json({ error: `Erreur auth: ${authError.message}` }, { status: 400 });
    }

    if (!newUser.user) {
      console.error("[create-user] No user returned from createUser");
      return NextResponse.json({ error: "Erreur création utilisateur (aucune donnée retournée)" }, { status: 500 });
    }

    console.log("[create-user] Auth user created:", newUser.user.id);

    // Create profile linked to the SAME organization as the admin
    const profileData = {
      id: newUser.user.id,
      email,
      prenom,
      nom,
      role,
      current_organization_id: callerProfile.current_organization_id,
    };

    console.log("[create-user] Inserting profile:", profileData);

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert(profileData);

    if (profileError) {
      console.error("[create-user] Profile error:", profileError);
      // Rollback: delete auth user
      await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
      return NextResponse.json({ error: `Erreur profil: ${profileError.message}` }, { status: 500 });
    }

    console.log("[create-user] Profile created successfully");

    // Add to organization_members
    const memberData = {
      organization_id: callerProfile.current_organization_id,
      user_id: newUser.user.id,
      role: role === "admin" ? "admin" : "member",
      status: "active",
    };

    console.log("[create-user] Adding to organization_members:", memberData);

    const { error: memberError } = await supabaseAdmin
      .from("organization_members")
      .insert(memberData);

    if (memberError) {
      console.error("[create-user] Member error (non-critical):", memberError);
      // Non-critical error, don't rollback
    } else {
      console.log("[create-user] Organization member added successfully");
    }

    return NextResponse.json({ 
      success: true, 
      userId: newUser.user.id,
      organization_id: callerProfile.current_organization_id 
    });
  } catch (err: unknown) {
    console.error("[create-user] Unexpected error:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur interne" }, { status: 500 });
  }
}
