import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";

export async function GET() {
  try {
    // 1. Vérifier l'authentification via cookies
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
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("[api/admin/list-profiles] Auth error:", authError?.message);
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // 2. Vérifier que le caller est admin ou direction ET récupérer son organisation
    const { data: callerProfile, error: callerError } = await supabaseAdmin
      .from("profiles")
      .select("role, current_organization_id")
      .eq("id", user.id)
      .single();

    if (callerError || !callerProfile) {
      console.error("[api/admin/list-profiles] Caller profile error:", callerError?.message);
      return NextResponse.json({ error: "Profil introuvable" }, { status: 403 });
    }

    if (!["admin", "direction"].includes(callerProfile.role)) {
      return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
    }

    // Vérifier que l'admin a une organisation
    if (!callerProfile.current_organization_id) {
      console.error("[api/admin/list-profiles] Caller has no organization");
      return NextResponse.json({ error: "Organisation non définie" }, { status: 403 });
    }

    // 3. Lire SEULEMENT les profils de la MÊME organisation via service role (bypass RLS)
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, email, prenom, nom, role, created_at, current_organization_id")
      .eq("current_organization_id", callerProfile.current_organization_id)  // ← FILTRE ORGANISATION
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[api/admin/list-profiles] Query error:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    console.log("[api/admin/list-profiles] OK, count:", data?.length, "for org:", callerProfile.current_organization_id);
    return NextResponse.json({ profiles: data ?? [] });
  } catch (err: unknown) {
    console.error("[api/admin/list-profiles] Unexpected error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
