import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";

const DEVIS_BUCKET = "devis-interventions";

export async function DELETE(request: NextRequest) {
  try {
    // 1. Auth: get caller from cookie session
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
        { error: "Accès interdit — seuls admin et direction peuvent supprimer un véhicule" },
        { status: 403 }
      );
    }

    // 3. Parse body
    const body = await request.json();
    const { vehicleId } = body;

    if (!vehicleId) {
      return NextResponse.json(
        { error: "vehicleId manquant" },
        { status: 400 }
      );
    }

    // 4. Check for linked interventions
    const { data: linkedInterventions, error: intError } = await supabaseAdmin
      .from("interventions")
      .select("id, devis_path")
      .eq("vehicle_id", vehicleId);

    if (intError) {
      console.error("[DELETE-VEHICLE] Error fetching interventions:", intError);
      return NextResponse.json(
        { error: "Erreur lors de la vérification des interventions liées" },
        { status: 500 }
      );
    }

    // 5. Delete linked interventions and their devis files
    if (linkedInterventions && linkedInterventions.length > 0) {
      // Delete devis files from storage
      const devisPaths = linkedInterventions
        .map((i) => i.devis_path)
        .filter(Boolean) as string[];

      if (devisPaths.length > 0) {
        const { error: storageError } = await supabaseAdmin.storage
          .from(DEVIS_BUCKET)
          .remove(devisPaths);

        if (storageError) {
          console.error("[DELETE-VEHICLE] Storage cleanup error:", storageError);
          // Continue — don't block vehicle deletion for storage errors
        }
      }

      // Delete interventions
      const { error: deleteIntError } = await supabaseAdmin
        .from("interventions")
        .delete()
        .eq("vehicle_id", vehicleId);

      if (deleteIntError) {
        console.error("[DELETE-VEHICLE] Delete interventions error:", deleteIntError);
        return NextResponse.json(
          { error: "Erreur lors de la suppression des interventions liées" },
          { status: 500 }
        );
      }
    }

    // 6. Delete the vehicle
    const { error: deleteError } = await supabaseAdmin
      .from("vehicles")
      .delete()
      .eq("id", vehicleId);

    if (deleteError) {
      console.error("[DELETE-VEHICLE] Delete vehicle error:", deleteError);
      return NextResponse.json(
        { error: deleteError.message },
        { status: 500 }
      );
    }

    console.log(
      `[DELETE-VEHICLE] Vehicle ${vehicleId} deleted by ${user.email} (${callerProfile.role}). ${linkedInterventions?.length ?? 0} interventions also deleted.`
    );

    return NextResponse.json({
      success: true,
      deletedInterventions: linkedInterventions?.length ?? 0,
    });
  } catch (err: unknown) {
    console.error("[DELETE-VEHICLE] Unexpected error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Erreur interne" },
      { status: 500 }
    );
  }
}
