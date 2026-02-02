import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

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

    // Récupérer les stats
    const { count: totalOrgs } = await supabase
      .from("organizations")
      .select("*", { count: "exact", head: true });

    const { count: totalVehicles } = await supabase
      .from("vehicles")
      .select("*", { count: "exact", head: true });

    const { count: totalUsers } = await supabase
      .from("profiles")
      .select("*", { count: "exact", head: true });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const { count: newOrgs } = await supabase
      .from("organizations")
      .select("*", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo.toISOString());

    const { data: planData } = await supabase
      .from("organizations")
      .select("plan");

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
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
