import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  // 1. Auth: get session from cookies
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
  }

  // 2. Check role: only admin/direction can reject
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile || !["admin", "direction"].includes(profile.role)) {
    return NextResponse.json(
      { error: "Seuls admin/direction peuvent refuser un devis" },
      { status: 403 }
    );
  }

  // 3. Parse body
  const body = await req.json();
  const { interventionId, reason } = body;

  if (!interventionId) {
    return NextResponse.json(
      { error: "interventionId requis" },
      { status: 400 }
    );
  }

  // 4. Update intervention status to rejected (keep PDF for traceability)
  const { error } = await supabaseAdmin
    .from("interventions")
    .update({
      status: "rejected",
      rejected_reason: reason || null,
      rejected_at: new Date().toISOString(),
    })
    .eq("id", interventionId);

  if (error) {
    console.error("[REJECT] DB error:", error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
