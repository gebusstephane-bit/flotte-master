"use client";

import { useEffect, useState } from "react";
import { 
  Building2, 
  Car, 
  TrendingUp, 
  Users, 
  ArrowUpRight,
  ArrowDownRight,
  Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface DashboardStats {
  totalOrganizations: number;
  totalVehicles: number;
  totalUsers: number;
  newOrganizations7d: number;
  organizationsByPlan: { plan: string; count: number }[];
}

export default function SuperAdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/superadmin/stats");
      const data = await res.json();
      
      if (res.ok) {
        setStats({
          totalOrganizations: data.totalOrganizations || 0,
          totalVehicles: data.totalVehicles || 0,
          totalUsers: data.totalUsers || 0,
          newOrganizations7d: data.newOrganizations7d || 0,
          organizationsByPlan: data.organizationsByPlan || [],
        });
      } else {
        console.error("API error:", data.error);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </div>
    );
  }

  const kpiCards = [
    {
      title: "Entreprises actives",
      value: stats?.totalOrganizations || 0,
      icon: Building2,
      trend: `+${stats?.newOrganizations7d || 0} cette semaine`,
      trendUp: true,
      color: "violet",
    },
    {
      title: "Véhicules gérés",
      value: stats?.totalVehicles || 0,
      icon: Car,
      trend: "Total global",
      trendUp: null,
      color: "blue",
    },
    {
      title: "Utilisateurs",
      value: stats?.totalUsers || 0,
      icon: Users,
      trend: "Total global",
      trendUp: null,
      color: "emerald",
    },
  ];

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-slate-400">Vue d'ensemble de la plateforme FleetFlow</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {kpiCards.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Card key={kpi.title} className="bg-slate-900 border-slate-800">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-slate-400 text-sm mb-1">{kpi.title}</p>
                    <h3 className="text-3xl font-bold text-white">
                      {kpi.value.toLocaleString()}
                    </h3>
                    {kpi.trend && (
                      <div className="flex items-center gap-1 mt-2">
                        {kpi.trendUp === true && (
                          <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                        )}
                        {kpi.trendUp === false && (
                          <ArrowDownRight className="w-4 h-4 text-red-400" />
                        )}
                        <span className={`text-sm ${
                          kpi.trendUp === true ? "text-emerald-400" : 
                          kpi.trendUp === false ? "text-red-400" : "text-slate-500"
                        }`}>
                          {kpi.trend}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className={`p-3 rounded-lg bg-${kpi.color}-500/20`}>
                    <Icon className={`w-6 h-6 text-${kpi.color}-400`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Charts & Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Répartition par plan */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-violet-400" />
              Répartition par plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats?.organizationsByPlan.map((item) => (
                <div key={item.plan} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full ${
                      item.plan === "enterprise" ? "bg-amber-400" :
                      item.plan === "pro" ? "bg-violet-400" : "bg-blue-400"
                    }`} />
                    <span className="text-slate-300 capitalize">{item.plan}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-32 h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${
                          item.plan === "enterprise" ? "bg-amber-400" :
                          item.plan === "pro" ? "bg-violet-400" : "bg-blue-400"
                        }`}
                        style={{ 
                          width: `${stats.totalOrganizations > 0 ? (item.count / stats.totalOrganizations) * 100 : 0}%` 
                        }}
                      />
                    </div>
                    <span className="text-white font-medium w-8">{item.count}</span>
                  </div>
                </div>
              ))}
              {(!stats?.organizationsByPlan || stats.organizationsByPlan.length === 0) && (
                <p className="text-slate-500 text-center py-4">Aucune donnée disponible</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Activité récente */}
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white">Activité récente</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-slate-500">
              <p>Module d'activité en cours de développement</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
