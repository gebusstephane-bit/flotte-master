import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";

export async function PATCH(request: NextRequest) {
  try {
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

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role, current_organization_id")
      .eq("id", user.id)
      .single();

    if (!callerProfile || !["admin", "direction"].includes(callerProfile.role)) {
      return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
    }

    if (!callerProfile.current_organization_id) {
      return NextResponse.json({ error: "Organisation non définie" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, role } = body;

    if (!userId || !role) {
      return NextResponse.json({ error: "Champs obligatoires manquants" }, { status: 400 });
    }

    if (!["admin", "direction", "agent_parc", "exploitation"].includes(role)) {
      return NextResponse.json({ error: "Rôle invalide" }, { status: 400 });
    }

    // Verify target user is in the SAME organization
    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("current_organization_id")
      .eq("id", userId)
      .single();

    if (!targetProfile) {
      return NextResponse.json({ error: "Utilisateur introuvable" }, { status: 404 });
    }

    if (targetProfile.current_organization_id !== callerProfile.current_organization_id) {
      console.error(`[UPDATE-ROLE] Org mismatch: target=${targetProfile.current_organization_id}, caller=${callerProfile.current_organization_id}`);
      return NextResponse.json(
        { error: "Accès interdit — cet utilisateur n'appartient pas à votre organisation" },
        { status: 403 }
      );
    }

    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ role })
      .eq("id", userId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Erreur interne" }, { status: 500 });
  }
}
