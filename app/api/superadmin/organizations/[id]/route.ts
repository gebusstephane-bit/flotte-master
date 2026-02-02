import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const SUPER_ADMIN_EMAIL = "fleet.master.contact@gmail.com";

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

// GET - Détails d'une organisation
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isSuperAdmin = await checkSuperAdmin(request);
  if (!isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;

    // Récupérer l'organisation
    const { data: org, error: orgError } = await supabaseAdmin
      .from("organizations")
      .select("*")
      .eq("id", id)
      .single();

    if (orgError) {
      console.error("[superadmin/organization] org error:", orgError);
      throw orgError;
    }

    if (!org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    // Récupérer le propriétaire
    let owner = null;
    if (org.created_by) {
      const { data: ownerData, error: ownerError } = await supabaseAdmin
        .from("profiles")
        .select("email, prenom, nom")
        .eq("id", org.created_by)
        .single();
      
      if (!ownerError) {
        owner = ownerData;
      }
    }

    // Compter les véhicules
    const { count: vehicleCount, error: vError } = await supabaseAdmin
      .from("vehicles")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", id);

    if (vError) console.error("[superadmin/organization] vehicles error:", vError);

    // Compter les utilisateurs
    const { count: userCount, error: uError } = await supabaseAdmin
      .from("organization_members")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", id);

    if (uError) console.error("[superadmin/organization] members count error:", uError);

    // Récupérer les membres
    const { data: members, error: membersError } = await supabaseAdmin
      .from("organization_members")
      .select("*")
      .eq("organization_id", id)
      .order("joined_at", { ascending: false });

    if (membersError) {
      console.error("[superadmin/organization] members error:", membersError);
    }

    // Récupérer les profils des membres
    const memberUserIds = (members || []).map((m) => m.user_id).filter(Boolean);
    let profilesMap = new Map();
    
    if (memberUserIds.length > 0) {
      const { data: profiles, error: profilesError } = await supabaseAdmin
        .from("profiles")
        .select("id, email, prenom, nom")
        .in("id", memberUserIds);
      
      if (profilesError) {
        console.error("[superadmin/organization] profiles error:", profilesError);
      } else {
        profiles?.forEach((p) => profilesMap.set(p.id, p));
      }
    }

    // Assembler les membres avec leurs profils
    const membersWithProfiles = (members || []).map((member) => {
      const profile = profilesMap.get(member.user_id);
      return {
        ...member,
        profile: profile || null,
      };
    });

    return NextResponse.json({
      organization: {
        ...org,
        owner_email: owner?.email || "N/A",
        owner_name: owner ? `${owner.prenom || ""} ${owner.nom || ""}`.trim() : "N/A",
        vehicle_count: vehicleCount || 0,
        user_count: userCount || 0,
      },
      members: membersWithProfiles,
    });
  } catch (error) {
    console.error("[superadmin/organization] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch organization", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

// PATCH - Modifier une organisation
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isSuperAdmin = await checkSuperAdmin(request);
  if (!isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { ...updates } = body;

    const { data, error } = await supabaseAdmin
      .from("organizations")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ organization: data });
  } catch (error) {
    console.error("[superadmin/organization] Error:", error);
    return NextResponse.json(
      { error: "Failed to update organization" },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer une organisation
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const isSuperAdmin = await checkSuperAdmin(request);
  if (!isSuperAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { id } = await params;

    const { error } = await supabaseAdmin
      .from("organizations")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[superadmin/organization] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete organization" },
      { status: 500 }
    );
  }
}
