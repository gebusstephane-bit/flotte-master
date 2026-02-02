import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

  return supabase;
}

// GET - Liste des organisations
export async function GET(request: NextRequest) {
  const supabase = await checkSuperAdmin(request);
  if (!supabase) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const { data, error } = await supabase
      .from("organizations")
      .select(`
        *,
        owner:profiles!organizations_created_by_fkey(email, prenom, nom)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return NextResponse.json({ organizations: data });
  } catch (error) {
    console.error("[superadmin/organizations] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch organizations" },
      { status: 500 }
    );
  }
}

// PATCH - Modifier une organisation
export async function PATCH(request: NextRequest) {
  const supabase = await checkSuperAdmin(request);
  if (!supabase) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { id, ...updates } = body;

    const { data, error } = await supabase
      .from("organizations")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ organization: data });
  } catch (error) {
    console.error("[superadmin/organizations] Error:", error);
    return NextResponse.json(
      { error: "Failed to update organization" },
      { status: 500 }
    );
  }
}

// DELETE - Supprimer une organisation
export async function DELETE(request: NextRequest) {
  const supabase = await checkSuperAdmin(request);
  if (!supabase) {
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

    const { error } = await supabase
      .from("organizations")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[superadmin/organizations] Error:", error);
    return NextResponse.json(
      { error: "Failed to delete organization" },
      { status: 500 }
    );
  }
}
