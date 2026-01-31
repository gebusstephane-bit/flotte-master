import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";

const DEVIS_BUCKET = "devis-interventions";

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

    // 2. Check caller role
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      !callerProfile ||
      !["admin", "direction"].includes(callerProfile.role)
    ) {
      return NextResponse.json(
        { error: "Accès interdit — seuls admin et direction peuvent supprimer une intervention" },
        { status: 403 }
      );
    }

    // 3. Parse body
    const body = await request.json();
    const { interventionId } = body;

    if (!interventionId) {
      return NextResponse.json(
        { error: "interventionId manquant" },
        { status: 400 }
      );
    }

    // 4. Fetch intervention to get devis_path
    const { data: intervention, error: fetchError } = await supabaseAdmin
      .from("interventions")
      .select("id, devis_path")
      .eq("id", interventionId)
      .single();

    if (fetchError || !intervention) {
      return NextResponse.json(
        { error: "Intervention introuvable" },
        { status: 404 }
      );
    }

    // 5. Delete devis file from storage if it exists
    if (intervention.devis_path) {
      const { error: storageError } = await supabaseAdmin.storage
        .from(DEVIS_BUCKET)
        .remove([intervention.devis_path]);

      if (storageError) {
        console.error("[DELETE-INTERVENTION] Storage cleanup error:", storageError);
        // Continue — don't block deletion for storage errors
      }
    }

    // 6. Delete the intervention
    const { error: deleteError } = await supabaseAdmin
      .from("interventions")
      .delete()
      .eq("id", interventionId);

    if (deleteError) {
      console.error("[DELETE-INTERVENTION] Delete error:", deleteError);
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    console.log(
      `[DELETE-INTERVENTION] Intervention ${interventionId} deleted by ${user.email} (${callerProfile.role}). Devis cleaned: ${!!intervention.devis_path}`
    );

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[DELETE-INTERVENTION] Unexpected error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur interne" },
      { status: 500 }
    );
  }
}
