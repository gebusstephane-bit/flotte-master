import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/logger";

const SUPER_ADMIN_EMAIL = "fleet.master.contact@gmail.com";

/**
 * GET /api/organizations/[id]/stats
 * 
 * Récupère les compteurs d'une organisation en UNE SEULE requête optimisée
 * Évite les N+1 queries
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const startTime = Date.now();

  try {
    const { id: organizationId } = await params;

    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID requis" },
        { status: 400 }
      );
    }

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

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Vérifier l'accès (superadmin ou membre de l'org)
    const isSuperAdmin = user.email === SUPER_ADMIN_EMAIL;
    
    if (!isSuperAdmin) {
      // Vérifier que l'user est membre de cette org
      const { data: membership } = await supabase
        .from("organization_members")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .single();

      if (!membership) {
        return NextResponse.json(
          { error: "Accès refusé" },
          { status: 403 }
        );
      }
    }

    // Utiliser supabaseAdmin pour les compteurs (plus rapide)
    const adminClient = isSuperAdmin ? supabaseAdmin : supabase;

    // Compteurs en PARALLÈLE (pas séquentiel)
    const [
      vehiclesResult,
      usersResult,
      interventionsResult,
      orgResult,
    ] = await Promise.all([
      // Véhicules
      adminClient
        .from("vehicles")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId),

      // Membres
      adminClient
        .from("organization_members")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("status", "active"),

      // Interventions
      adminClient
        .from("interventions")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId),

      // Info org pour les limites
      adminClient
        .from("organizations")
        .select("max_vehicles, max_users, plan, status")
        .eq("id", organizationId)
        .single(),
    ]);

    if (orgResult.error) {
      logger.error("API", "Organization not found", {
        orgId: organizationId,
        error: orgResult.error.message,
      });
      return NextResponse.json(
        { error: "Organisation non trouvée" },
        { status: 404 }
      );
    }

    const duration = Date.now() - startTime;
    logger.perf("/api/organizations/[id]/stats", duration, {
      orgId: organizationId,
      isSuperAdmin,
    });

    return NextResponse.json({
      organization_id: organizationId,
      counts: {
        vehicles: vehiclesResult.count || 0,
        users: usersResult.count || 0,
        interventions: interventionsResult.count || 0,
      },
      limits: {
        max_vehicles: orgResult.data?.max_vehicles || 10,
        max_users: orgResult.data?.max_users || 3,
      },
      usage: {
        vehicles_percentage: Math.round(
          ((vehiclesResult.count || 0) / (orgResult.data?.max_vehicles || 10)) * 100
        ),
        users_percentage: Math.round(
          ((usersResult.count || 0) / (orgResult.data?.max_users || 3)) * 100
        ),
      },
      plan: orgResult.data?.plan,
      status: orgResult.data?.status,
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.apiError("/api/organizations/[id]/stats", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}
