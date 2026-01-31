import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { cookies } from "next/headers";

export async function GET() {
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

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.log("[api/auth/profile] No authenticated user", authError?.message);
      return NextResponse.json({ profile: null }, { status: 401 });
    }

    // Use service role to bypass RLS — guaranteed to read the row
    const { data, error } = await supabaseAdmin
      .from("profiles")
      .select("id, email, prenom, nom, role, created_at")
      .eq("id", user.id)
      .single();

    if (error) {
      console.error("[api/auth/profile] Profile query error:", error.message);
      return NextResponse.json(
        { profile: null, error: error.message },
        { status: 500 }
      );
    }

    if (!data) {
      console.warn("[api/auth/profile] No profile row for user:", user.id);
      return NextResponse.json({ profile: null }, { status: 404 });
    }

    console.log("[api/auth/profile] OK:", data.email, "role:", data.role);
    return NextResponse.json({ profile: data });
  } catch (err: unknown) {
    console.error("[api/auth/profile] Unexpected error:", err);
    return NextResponse.json(
      { profile: null, error: err instanceof Error ? err.message : "Erreur serveur" },
      { status: 500 }
    );
  }
}
