import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { logger } from "@/lib/logger";

const ITEMS_PER_PAGE = 50;

/**
 * GET /api/vehicles?page=1&search=ABC
 * 
 * Récupère les véhicules paginés avec recherche optionnelle
 * RLS garantit que seuls les véhicules de l'org sont visibles
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const search = searchParams.get("search")?.trim() || "";
    const offset = (page - 1) * ITEMS_PER_PAGE;

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
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Récupérer l'organization_id depuis le profil
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("current_organization_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile?.current_organization_id) {
      logger.warn("API", "User without organization", { userId: user.id });
      return NextResponse.json(
        { error: "Aucune organisation active" },
        { status: 403 }
      );
    }

    const organizationId = profile.current_organization_id;

    // Requête paginée avec count total
    let query = supabase
      .from("vehicles")
      .select("*", { count: "exact" })
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: false })
      .range(offset, offset + ITEMS_PER_PAGE - 1);

    // Recherche si fournie
    if (search) {
      query = query.or(`immat.ilike.%${search}%,marque.ilike.%${search}%`);
    }

    const { data, count, error } = await query;

    if (error) {
      logger.apiError("/api/vehicles GET", error, { 
        userId: user.id, 
        statusCode: 500 
      });
      return NextResponse.json(
        { error: "Erreur lors de la récupération des véhicules" },
        { status: 500 }
      );
    }

    const duration = Date.now() - startTime;
    logger.perf("/api/vehicles GET", duration, {
      userId: user.id,
      page,
      count: data?.length || 0,
      total: count || 0,
    });

    return NextResponse.json({
      data: data || [],
      pagination: {
        page,
        per_page: ITEMS_PER_PAGE,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / ITEMS_PER_PAGE),
      },
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.apiError("/api/vehicles GET", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vehicles
 * 
 * Crée un véhicule avec vérification atomique des limites
 * Utilise la fonction SQL create_vehicle_safe
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();

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

    // Auth check
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json(
        { error: "Non authentifié" },
        { status: 401 }
      );
    }

    // Vérifier les permissions
    const { data: member, error: memberError } = await supabase
      .from("organization_members")
      .select("organization_id, role")
      .eq("user_id", user.id)
      .eq("status", "active")
      .single();

    if (memberError || !member) {
      return NextResponse.json(
        { error: "Membre non trouvé" },
        { status: 403 }
      );
    }

    // Seuls certains rôles peuvent créer
    const allowedRoles = ["owner", "admin", "manager", "agent_parc"];
    if (!allowedRoles.includes(member.role)) {
      logger.warn("API", "Unauthorized vehicle creation attempt", {
        userId: user.id,
        role: member.role,
      });
      return NextResponse.json(
        { error: "Permission insuffisante" },
        { status: 403 }
      );
    }

    // Validation du body
    const body = await request.json();
    const { immat, marque, type, date_ct, date_tachy, date_atp, status } = body;

    if (!immat || !marque || !type) {
      return NextResponse.json(
        { error: "immat, marque et type sont requis" },
        { status: 400 }
      );
    }

    // Utiliser la fonction SQL atomique si disponible, sinon fallback
    try {
      const { data: result, error: rpcError } = await supabase.rpc(
        "create_vehicle_safe",
        {
          p_organization_id: member.organization_id,
          p_immatriculation: immat.toUpperCase().trim(),
          p_marque: marque.trim(),
          p_type: type,
          p_date_ct: date_ct || null,
          p_date_tachy: date_tachy || null,
          p_date_atp: date_atp || null,
          p_status: status || "actif",
          p_created_by: user.id,
        }
      );

      if (rpcError) {
        // Si la fonction n'existe pas, fallback sur insert classique
        if (rpcError.message.includes("function")) {
          logger.warn("API", "create_vehicle_safe not found, using fallback");
          return createVehicleFallback(supabase, {
            organization_id: member.organization_id,
            immat: immat.toUpperCase().trim(),
            marque: marque.trim(),
            type,
            date_ct: date_ct || null,
            date_tachy: date_tachy || null,
            date_atp: date_atp || null,
            status: status || "actif",
          });
        }
        throw rpcError;
      }

      if (!result?.success) {
        return NextResponse.json(
          { error: result?.error || "Erreur création" },
          { status: 400 }
        );
      }

      const duration = Date.now() - startTime;
      logger.perf("/api/vehicles POST", duration, {
        userId: user.id,
        vehicleId: result.vehicle_id,
      });

      return NextResponse.json(result, { status: 201 });
    } catch (err) {
      // Fallback si la fonction SQL n'existe pas
      logger.warn("API", "RPC failed, using fallback", { error: String(err) });
      return createVehicleFallback(supabase, {
        organization_id: member.organization_id,
        immat: immat.toUpperCase().trim(),
        marque: marque.trim(),
        type,
        date_ct: date_ct || null,
        date_tachy: date_tachy || null,
        date_atp: date_atp || null,
        status: status || "actif",
      });
    }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.apiError("/api/vehicles POST", error);
    return NextResponse.json(
      { error: "Erreur serveur" },
      { status: 500 }
    );
  }
}

/**
 * Fallback si la fonction SQL n'existe pas encore
 * Note: Ce n'est pas atomique, mais meilleur que rien
 */
async function createVehicleFallback(
  supabase: any,
  data: {
    organization_id: string;
    immat: string;
    marque: string;
    type: string;
    date_ct: string | null;
    date_tachy: string | null;
    date_atp: string | null;
    status: string;
  }
) {
  // Vérifier la limite (non atomique, mais meilleur que rien)
  const { data: org } = await supabase
    .from("organizations")
    .select("max_vehicles")
    .eq("id", data.organization_id)
    .single();

  const { count } = await supabase
    .from("vehicles")
    .select("*", { count: "exact", head: true })
    .eq("organization_id", data.organization_id);

  if (count && count >= (org?.max_vehicles || 10)) {
    return NextResponse.json(
      { error: `Limite de ${org?.max_vehicles || 10} véhicules atteinte` },
      { status: 400 }
    );
  }

  // Insérer
  const { data: vehicle, error } = await supabase
    .from("vehicles")
    .insert(data)
    .select()
    .single();

  if (error) {
    if (error.message.includes("duplicate")) {
      return NextResponse.json(
        { error: "Un véhicule avec cette immatriculation existe déjà" },
        { status: 409 }
      );
    }
    throw error;
  }

  return NextResponse.json(
    {
      success: true,
      vehicle_id: vehicle.id,
      vehicle,
    },
    { status: 201 }
  );
}
