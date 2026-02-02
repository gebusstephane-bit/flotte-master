import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";

export async function DELETE(request: NextRequest) {
  try {
    // 1. Auth
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
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // 2. Check caller role AND organization — admin ONLY
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role, current_organization_id")
      .eq("id", user.id)
      .single();

    if (!callerProfile || callerProfile.role !== "admin") {
      return NextResponse.json(
        { error: "Accès interdit — seul un admin peut supprimer un utilisateur" },
        { status: 403 }
      );
    }

    if (!callerProfile.current_organization_id) {
      return NextResponse.json(
        { error: "Organisation non définie" },
        { status: 403 }
      );
    }

    // 3. Parse body
    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId manquant" },
        { status: 400 }
      );
    }

    // 4. Prevent self-deletion
    if (userId === user.id) {
      return NextResponse.json(
        { error: "Impossible de supprimer votre propre compte" },
        { status: 400 }
      );
    }

    // 5. Verify target user is in the SAME organization
    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("current_organization_id, email")
      .eq("id", userId)
      .single();

    if (!targetProfile) {
      return NextResponse.json(
        { error: "Utilisateur introuvable" },
        { status: 404 }
      );
    }

    if (targetProfile.current_organization_id !== callerProfile.current_organization_id) {
      console.error(`[DELETE-USER] Org mismatch: target=${targetProfile.current_organization_id}, caller=${callerProfile.current_organization_id}`);
      return NextResponse.json(
        { error: "Accès interdit — cet utilisateur n'appartient pas à votre organisation" },
        { status: 403 }
      );
    }

    // 6. Delete profile from public.profiles
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileError) {
      console.error("[DELETE-USER] Delete profile error:", profileError);
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
    }

    // 7. Remove from organization_members
    await supabaseAdmin
      .from("organization_members")
      .delete()
      .eq("user_id", userId)
      .eq("organization_id", callerProfile.current_organization_id);

    // 8. Delete auth user
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(
      userId
    );

    if (authError) {
      console.error("[DELETE-USER] Delete auth user error:", authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 500 }
      );
    }

    console.log(
      `[DELETE-USER] User ${userId} (${targetProfile.email}) deleted by ${user.email} (admin)`
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[DELETE-USER] Unexpected error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur interne" },
      { status: 500 }
    );
  }
}
