export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";

const DEVIS_BUCKET = "devis-interventions";

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate caller
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

    // 2. Check caller role (admin, direction, or agent_parc can refuse)
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      !callerProfile ||
      !["admin", "direction", "agent_parc"].includes(callerProfile.role)
    ) {
      return NextResponse.json({ error: "Accès interdit" }, { status: 403 });
    }

    // 3. Read body
    const body = await request.json();
    const { interventionId } = body as { interventionId: string };

    if (!interventionId) {
      return NextResponse.json(
        { error: "interventionId manquant" },
        { status: 400 }
      );
    }

    // 4. Fetch intervention to get devis_path
    const { data: intervention, error: fetchError } = await supabaseAdmin
      .from("interventions")
      .select("id, devis_path, devis_filename")
      .eq("id", interventionId)
      .single();

    if (fetchError || !intervention) {
      console.error("[DELETE-DEVIS] Intervention introuvable:", fetchError);
      return NextResponse.json(
        { error: "Intervention introuvable" },
        { status: 404 }
      );
    }

    // 5. Delete file from Storage if devis_path exists
    const devisPath = intervention.devis_path;
    if (devisPath) {
      console.log("[DELETE-DEVIS] Suppression fichier:", devisPath);
      const { error: removeError } = await supabaseAdmin.storage
        .from(DEVIS_BUCKET)
        .remove([devisPath]);

      if (removeError) {
        // Log but don't block — file may already be deleted
        console.warn(
          "[DELETE-DEVIS] Erreur suppression fichier (non bloquante):",
          removeError.message
        );
      } else {
        console.log("[DELETE-DEVIS] Fichier supprimé du storage");
      }
    } else {
      console.log("[DELETE-DEVIS] Aucun fichier devis à supprimer");
    }

    // 6. Clear devis fields in DB
    const { error: updateError } = await supabaseAdmin
      .from("interventions")
      .update({
        devis_path: null,
        devis_filename: null,
        devis_uploaded_at: null,
      })
      .eq("id", interventionId);

    if (updateError) {
      console.error("[DELETE-DEVIS] Erreur nettoyage DB:", updateError);
      return NextResponse.json(
        { error: "Erreur nettoyage base de données" },
        { status: 500 }
      );
    }

    console.log("[DELETE-DEVIS] OK — intervention:", interventionId);
    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    console.error("[DELETE-DEVIS] Erreur serveur:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
