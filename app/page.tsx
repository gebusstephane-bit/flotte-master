"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, Euro, FileText, TrendingUp, Wrench, ChevronRight, Loader2, Calendar } from "lucide-react";
import { supabase, type Vehicle, type Intervention } from "@/lib/supabase";
import { differenceInDays, isPast, parseISO, format, startOfMonth, endOfMonth, subMonths } from "date-fns";
import { fr } from "date-fns/locale";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function DashboardPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<"6months" | "year">("6months");

  useEffect(() => {
    async function fetchData() {
      const [vRes, iRes] = await Promise.all([
        supabase.from("vehicles").select("*").order("immat"),
        supabase.from("interventions").select("*").order("created_at", { ascending: false }),
      ]);

      if (vRes.data) setVehicles(vRes.data as Vehicle[]);
      if (iRes.data) setInterventions(iRes.data as Intervention[]);
      setLoading(false);
    }
    fetchData();
  }, []);

  // KPIs calculés
  const monthlyCosts = useMemo(() => {
    const months = period === "6months" ? 6 : 12;
    const data = [];
    
    for (let i = months - 1; i >= 0; i--) {
      const monthDate = subMonths(new Date(), i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);
      
      const monthInterventions = interventions.filter((inv) => {
        if (!inv.created_at) return false;
        const date = new Date(inv.created_at);
        return date >= monthStart && date <= monthEnd && 
               inv.status !== "pending" && inv.status !== "rejected";
      });
      
      const total = monthInterventions.reduce((sum, inv) => sum + (Number(inv.montant) || 0), 0);
      
      data.push({
        month: format(monthDate, "MMM", { locale: fr }),
        year: format(monthDate, "yyyy"),
        cost: total,
        count: monthInterventions.length,
      });
    }
    return data;
  }, [interventions, period]);

  const statusDistribution = useMemo(() => {
    const counts = {
      pending: interventions.filter((i) => i.status === "pending").length,
      approved: interventions.filter((i) => i.status === "approved_waiting_rdv").length,
      planned: interventions.filter((i) => i.status === "planned").length,
      completed: interventions.filter((i) => i.status === "completed").length,
      rejected: interventions.filter((i) => i.status === "rejected").length,
    };
    
    return [
      { name: "En attente", value: counts.pending, color: "#f97316" },
      { name: "Validé (RDV)", value: counts.approved, color: "#3b82f6" },
      { name: "Planifié", value: counts.planned, color: "#22c55e" },
      { name: "Terminé", value: counts.completed, color: "#64748b" },
      { name: "Refusé", value: counts.rejected, color: "#dc2626" },
    ].filter((item) => item.value > 0);
  }, [interventions]);

  const today = new Date();

  // Véhicules critiques : date_ct ou date_tachy périmée ou < 7 jours
  const criticalVehicles = vehicles.filter((v) => {
    if (v.date_ct) {
      const d = parseISO(v.date_ct);
      if (isPast(d) || differenceInDays(d, today) < 7) return true;
    }
    if (v.date_tachy) {
      const d = parseISO(v.date_tachy);
      if (isPast(d) || differenceInDays(d, today) < 7) return true;
    }
    return false;
  });
  const vehiculesCritiques = criticalVehicles.length;

  // Budget maintenance : somme des interventions validées (pas pending, pas rejected)
  const budgetMaintenance = interventions
    .filter((i) => i.status !== "pending" && i.status !== "rejected")
    .reduce((sum, i) => sum + (Number(i.montant) || 0), 0);

  // Devis à valider
  const pendingInterventions = interventions.filter((i) => i.status === "pending");
  const devisAValider = pendingInterventions.length;

  // Interventions planifiées
  const plannedInterventions = interventions.filter((i) => i.status === "planned");

  // Total du parc
  const totalVehicules = vehicles.length;
  const vehiculesEnMaintenance = vehicles.filter((v) => v.status === "maintenance").length;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        <p className="ml-3 text-slate-500">Chargement…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-600 mt-2">Vue d&apos;ensemble de votre flotte</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Véhicules Critiques */}
        <Link href="/parc?filter=critical">
          <Card className={`cursor-pointer hover:shadow-lg transition-shadow ${vehiculesCritiques > 0 ? "border-red-200" : ""}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Véhicules Critiques
              </CardTitle>
              <div className="flex items-center gap-1">
                <AlertTriangle className={`w-5 h-5 ${vehiculesCritiques > 0 ? "text-red-600" : "text-slate-400"}`} />
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-4xl font-bold ${vehiculesCritiques > 0 ? "text-red-600" : "text-green-600"}`}>
                {vehiculesCritiques}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {vehiculesCritiques > 0 ? "Maintenance urgente requise" : "Tous les véhicules sont à jour"}
              </p>
              {criticalVehicles.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                  {criticalVehicles.slice(0, 5).map((v) => (
                    <div key={v.id} className="text-xs flex justify-between">
                      <span className="font-mono font-semibold text-red-600">{v.immat}</span>
                      <span className="text-slate-500">{v.marque}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Devis à Valider */}
        <Link href="/maintenance?tab=validation">
          <Card className={`cursor-pointer hover:shadow-lg transition-shadow ${devisAValider > 0 ? "border-orange-200" : ""}`}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                Devis à Valider
              </CardTitle>
              <div className="flex items-center gap-1">
                <FileText className={`w-5 h-5 ${devisAValider > 0 ? "text-orange-600" : "text-slate-400"}`} />
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-4xl font-bold ${devisAValider > 0 ? "text-orange-600" : "text-slate-900"}`}>
                {devisAValider}
              </div>
              <p className="text-xs text-slate-500 mt-2">
                {devisAValider > 0 ? "En attente d'approbation" : "Aucun devis en attente"}
              </p>
              {pendingInterventions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                  {pendingInterventions.slice(0, 5).map((i) => (
                    <div key={i.id} className="text-xs flex justify-between">
                      <span className="font-mono font-semibold text-orange-600">{i.immat}</span>
                      <span className="text-slate-500">{(Number(i.montant) || 0).toLocaleString()} EUR</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* En maintenance (Planning) */}
        <Link href="/planning">
          <Card className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-slate-600">
                En Maintenance
              </CardTitle>
              <div className="flex items-center gap-1">
                <Wrench className="w-5 h-5 text-blue-600" />
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-blue-600">
                {plannedInterventions.length}
              </div>
              <p className="text-xs text-slate-500 mt-2">RDV planifiés</p>
              {plannedInterventions.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1">
                  {plannedInterventions.slice(0, 5).map((i) => (
                    <div key={i.id} className="text-xs flex justify-between">
                      <span className="font-mono font-semibold text-blue-600">{i.immat}</span>
                      <span className="text-slate-500">
                        {i.rdv_date ? new Date(i.rdv_date).toLocaleDateString("fr-FR") : "-"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Alerte si véhicules critiques */}
      {vehiculesCritiques > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <div>
                <p className="font-semibold text-red-900">
                  Action requise : {vehiculesCritiques} véhicule{vehiculesCritiques > 1 ? "s" : ""} en alerte
                </p>
                <p className="text-sm text-red-700">
                  Des contrôles techniques ou tachygraphes arrivent à échéance.
                  Consultez la page{" "}
                  <Link href="/parc?filter=critical" className="underline font-medium">
                    Mon Parc
                  </Link>{" "}
                  pour plus de détails.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Vue d'ensemble du parc */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Synthèse du parc */}
        <Card>
          <CardHeader>
            <CardTitle>Synthèse du parc</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-700 font-medium">Total véhicules</span>
              <span className="text-2xl font-bold text-slate-900">{totalVehicules}</span>
            </div>
            <Link href="/parc">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer">
                <span className="text-green-700 font-medium">Actifs</span>
                <span className="text-2xl font-bold text-green-600">
                  {vehicles.filter((v) => v.status === "actif").length}
                </span>
              </div>
            </Link>
            <Link href="/planning">
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors cursor-pointer">
                <span className="text-orange-700 font-medium">En maintenance</span>
                <span className="text-2xl font-bold text-orange-600">{vehiculesEnMaintenance}</span>
              </div>
            </Link>
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="text-slate-700 font-medium">Au garage</span>
              <span className="text-2xl font-bold text-slate-600">
                {vehicles.filter((v) => v.status === "garage").length}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Activité récente */}
        <Card>
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {interventions.slice(0, 4).map((intervention) => (
              <Link key={intervention.id} href="/maintenance">
                <div className="flex items-start gap-3 pb-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 rounded p-2 -m-2 cursor-pointer transition-colors">
                  <div
                    className={`p-2 rounded-lg ${
                      intervention.status === "completed"
                        ? "bg-slate-100"
                        : intervention.status === "rejected"
                        ? "bg-red-100"
                        : intervention.status === "planned"
                        ? "bg-green-100"
                        : intervention.status === "approved_waiting_rdv"
                        ? "bg-blue-100"
                        : intervention.status === "pending"
                        ? "bg-orange-100"
                        : "bg-slate-100"
                    }`}
                  >
                    {intervention.status === "completed" ? (
                      <TrendingUp className="w-4 h-4 text-slate-600" />
                    ) : intervention.status === "rejected" ? (
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                    ) : intervention.status === "planned" ? (
                      <TrendingUp className="w-4 h-4 text-green-600" />
                    ) : intervention.status === "pending" ? (
                      <FileText className="w-4 h-4 text-orange-600" />
                    ) : (
                      <Wrench className="w-4 h-4 text-blue-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">
                      {intervention.description}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      <span className="font-mono text-blue-600">{intervention.immat}</span> -{" "}
                      {intervention.date_creation
                        ? new Date(intervention.date_creation).toLocaleDateString("fr-FR")
                        : "-"}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-slate-900">
                    {(Number(intervention.montant) || 0).toLocaleString()} EUR
                  </span>
                </div>
              </Link>
            ))}
            {interventions.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-4">Aucune intervention</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* KPI Charts */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as "6months" | "year")} className="w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-900">Analyse des coûts</h2>
          <TabsList>
            <TabsTrigger value="6months">6 mois</TabsTrigger>
            <TabsTrigger value="year">1 an</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={period} className="mt-0">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart: Monthly costs */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Coûts mensuels (EUR)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {monthlyCosts.some((d) => d.cost > 0) ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyCosts}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis 
                          dataKey="month" 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value, index) => {
                            const item = monthlyCosts[index];
                            return item ? `${value} ${item.year.slice(2)}` : value;
                          }}
                        />
                        <YAxis 
                          tick={{ fontSize: 12 }}
                          tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip 
                          formatter={(value: number) => [`${value.toLocaleString()} EUR`, "Coût"]}
                          labelFormatter={(label, items) => {
                            const item = items?.[0]?.payload;
                            return item ? `${item.month} ${item.year}` : label;
                          }}
                        />
                        <Bar dataKey="cost" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400">
                      <Calendar className="w-8 h-8 mr-2" />
                      Aucune donnée pour cette période
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Chart: Status distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Répartition par statut</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  {statusDistribution.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {statusDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-400">
                      —
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-4">
                  {statusDistribution.map((item) => (
                    <div key={item.name} className="flex items-center gap-1 text-xs">
                      <div 
                        className="w-3 h-3 rounded-full" 
                        style={{ backgroundColor: item.color }}
                      />
                      <span className="text-slate-600">{item.name}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Budget Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Budget Maintenance Total</CardTitle>
          <Euro className="w-5 h-5 text-slate-600" />
        </CardHeader>
        <CardContent>
          <div className="text-4xl font-bold text-slate-900">
            {budgetMaintenance.toLocaleString()} EUR
          </div>
          <p className="text-sm text-slate-500 mt-2">
            Total des interventions validées et planifiées
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
