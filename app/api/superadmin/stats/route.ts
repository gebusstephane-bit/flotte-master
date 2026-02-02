import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

const SUPER_ADMIN_EMAIL = "fleet.master.contact@gmail.com";

export async function GET(request: NextRequest) {
  try {
    // Auth check
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
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Récupérer les stats avec supabaseAdmin (bypass RLS)
    const { count: totalOrgs, error: orgsError } = await supabaseAdmin
      .from("organizations")
      .select("*", { count: "exact", head: true });
    
    if (orgsError) console.error("[superadmin/stats] orgs error:", orgsError);

    const { count: totalVehicles, error: vehError } = await supabaseAdmin
      .from("vehicles")
      .select("*", { count: "exact", head: true });
    
    if (vehError) console.error("[superadmin/stats] vehicles error:", vehError);

    const { count: totalUsers, error: userError } = await supabaseAdmin
      .from("profiles")
      .select("*", { count: "exact", head: true });
    
    if (userError) console.error("[superadmin/stats] profiles error:", userError);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: newOrgs, error: newError } = await supabaseAdmin
      .from("organizations")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo.toISOString());
    
    if (newError) console.error("[superadmin/stats] new orgs error:", newError);

    const { data: planData, error: planError } = await supabaseAdmin
      .from("organizations")
      .select("plan");
    
    if (planError) console.error("[superadmin/stats] plan error:", planError);

    const planCounts = planData?.reduce((acc, org) => {
      acc[org.plan] = (acc[org.plan] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    return NextResponse.json({
      totalOrganizations: totalOrgs || 0,
      totalVehicles: totalVehicles || 0,
      totalUsers: totalUsers || 0,
      newOrganizations7d: newOrgs || 0,
      organizationsByPlan: Object.entries(planCounts).map(([plan, count]) => ({
        plan,
        count,
      })),
    });
  } catch (error) {
    console.error("[superadmin/stats] Error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
