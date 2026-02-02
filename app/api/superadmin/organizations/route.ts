import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { logger } from "@/lib/logger";

const SUPER_ADMIN_EMAIL = "fleet.master.contact@gmail.com";
const ITEMS_PER_PAGE = 50;

async function checkSuperAdmin(request: NextRequest) {
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

  if (!user || user.email !== SUPER_ADMIN_EMAIL) {
    return null;
  }

  return true;
}

/**
 * GET /api/superadmin/organizations?page=1&search=xxx
 * 
 * Liste paginée des organisations (sans les compteurs N+1)
 * Les compteurs sont récupérés via /api/organizations/[id]/stats
 */
export async function GET(request: NextRequest) {
  const startTime = Date.now();

  const isSuperAdmin = await checkSuperAdmin(request);
  if (!isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const search = searchParams.get("search")?.trim() || "";
    const offset = (page - 1) * ITEMS_PER_PAGE;

    // Requête paginée - SEULEMENT les champs nécessaires (pas de jointures N+1)
    let query = supabaseAdmin
      .from("organizations")
      .select("id, name, slug, plan, status, max_vehicles, max_users, created_at, created_by", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + ITEMS_PER_PAGE - 1);

    if (search) {
      query = query.ilike("name", `%${search}%`);
    }

    const { data, count, error } = await query;

    if (error) {
      logger.error("API", "Failed to fetch organizations", { error: error.message });
      throw error;
    }

    // Récupérer les profils des propriétaires en UNE requête (pas N)
    const ownerIds = (data || []).map((o) => o.created_by).filter(Boolean);
    let profilesMap = new Map();

    if (ownerIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from("profiles")
        .select("id, email, prenom, nom")
        .in("id", ownerIds);

      if (profilesError) {
        logger.warn("API", "Failed to fetch profiles", { error: profilesError.message });
      } else {
        profiles?.forEach((p) => profilesMap.set(p.id, p));
      }
    }

    // Formatter les données (sans compteurs - ceux-ci sont dans un endpoint séparé)
    const formattedOrgs = (data || []).map((org) => {
      const owner = profilesMap.get(org.created_by);
      return {
        ...org,
        owner_email: owner?.email || "N/A",
        owner_name: owner ? `${owner.prenom || ""} ${owner.nom || ""}`.trim() : "N/A",
        // Les compteurs sont récupérés via /api/organizations/[id]/stats
      };
    });

    const duration = Date.now() - startTime;
    logger.perf("/api/superadmin/organizations GET", duration, {
      page,
      count: formattedOrgs.length,
      total: count || 0,
    });

    return NextResponse.json({
      organizations: formattedOrgs,
      pagination: {
        page,
        per_page: ITEMS_PER_PAGE,
        total: count || 0,
        total_pages: Math.ceil((count || 0) / ITEMS_PER_PAGE),
      },
    });
  } catch (error) {
    logger.apiError("/api/superadmin/organizations GET", error as Error);
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: 500 }
    );
  }
}

// PATCH - Modifier une organisation
export async function PATCH(request: NextRequest) {
  const isSuperAdmin = await checkSuperAdmin(request);
  if (!isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    const { data, error } = await supabaseAdmin
      .from("organizations")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    logger.info("API", "Organization updated", { orgId: id });
    return NextResponse.json({ organization: data });
  } catch (error) {
    logger.apiError("/api/superadmin/organizations PATCH", error as Error);
    return NextResponse.json(
      { error: "Failed to update organization" },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer une organisation
export async function DELETE(request: NextRequest) {
  const isSuperAdmin = await checkSuperAdmin(request);
  if (!isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { error: "Organization ID required" },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from("organizations")
      .delete()
      .eq("id", id);

    if (error) throw error;

    logger.info("API", "Organization deleted", { orgId: id });
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.apiError("/api/superadmin/organizations DELETE", error as Error);
    return NextResponse.json(
      { error: "Failed to delete organization" },
      { status: 500 }
    );
  }
}
