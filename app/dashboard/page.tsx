"use client";

/**
 * Dashboard PREMIUM - FleetFlow 2.0
 * Design professionnel, coloré et moderne
 */

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ButtonUnified } from "@/components/ui/button-unified";
import { FleetHealthCard } from "@/components/dashboard/FleetHealthCard";
import { StatCard } from "@/components/dashboard/StatCard";
import { EmptyState } from "@/components/dashboard/EmptyState";
import {
  AlertTriangle,
  CheckCircle2,
  Timer,
  Truck,
  Wrench,
  FileText,
  AlertOctagon,
  QrCode,
  Plus,
  ArrowUpRight,
  TrendingUp,
  Calendar,
  Zap,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { supabase, type Vehicle, type Intervention } from "@/lib/supabase";
import { differenceInDays, isPast, parseISO } from "date-fns";
import { RecentInspectionsWidget } from "@/components/dashboard/RecentInspectionsWidget";

export default function ModernDashboardPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        console.log("[Dashboard] Chargement des données...");
        
        const [vRes, iRes] = await Promise.all([
          supabase.from("vehicles").select("*").order("immat"),
          supabase.from("interventions").select("*").order("created_at", { ascending: false }),
        ]);
        
        console.log("[Dashboard] Résultat véhicules:", vRes);
        console.log("[Dashboard] Résultat interventions:", iRes);
        
        if (vRes.error) {
          console.error("[Dashboard] ❌ Erreur véhicules:", vRes.error);
          setError(`Erreur véhicules: ${vRes.error.message}`);
        }
        if (iRes.error) {
          console.error("[Dashboard] ❌ Erreur interventions:", iRes.error);
          setError((prev) => `${prev || ""}\nErreur interventions: ${iRes.error?.message}`);
        }
        
        const vData = vRes.data || [];
        const iData = iRes.data || [];
        
        setVehicles(vData as Vehicle[]);
        setInterventions(iData as Intervention[]);
        
        // Debug
        if (vData.length === 0) {
          console.log("[Dashboard] ⚠️ Aucun véhicule trouvé");
          // Essayer de voir s'il y a des véhicules sans organization_id
          const { data: allVehicles, error: checkError } = await supabase
            .from("vehicles")
            .select("id, immat, organization_id")
            .limit(5);
          console.log("[Dashboard] Check véhicules (sans filtres):", allVehicles, checkError);
        } else {
          console.log("[Dashboard] ✅", vData.length, "véhicules chargés");
        }
        
        if (iData.length === 0) {
          console.log("[Dashboard] ⚠️ Aucune intervention trouvée");
        } else {
          console.log("[Dashboard] ✅", iData.length, "interventions chargées");
        }
      } catch (err: any) {
        console.error("[Dashboard] ❌ Erreur critique:", err);
        setError(`Erreur critique: ${err.message}`);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const today = new Date();

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

  const pendingInterventions = interventions.filter((i) => i.status === "pending");
  const plannedInterventions = interventions.filter((i) => i.status === "planned");
  const maintenanceBudget = interventions
    .filter((i) => i.status !== "pending" && i.status !== "rejected")
    .reduce((sum, i) => sum + (Number(i.montant) || 0), 0);

  const fleetHealthScore = Math.round(
    ((vehicles.length - criticalVehicles.length) / (vehicles.length || 1)) * 100
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <div className="max-w-7xl mx-auto space-y-8 p-6">
        {/* Messages d'erreur ou d'aide */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700 font-medium">⚠️ Erreur de chargement</p>
            <pre className="text-red-600 text-xs mt-2 whitespace-pre-wrap">{error}</pre>
            <div className="mt-3 p-3 bg-white rounded border border-red-100">
              <p className="text-sm text-slate-700 font-medium">🔧 Solution rapide :</p>
              <p className="text-sm text-slate-600 mt-1">
                Exécutez le script <code>supabase-emergency-fix.sql</code> dans Supabase SQL Editor.
              </p>
              <p className="text-sm text-slate-600">
                Ce script va créer une organisation et lier toutes vos données.
              </p>
            </div>
          </div>
        )}
        
        {!loading && !error && vehicles.length === 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <p className="text-amber-700 font-medium">🚗 Aucun véhicule trouvé</p>
            <p className="text-amber-600 text-sm mt-1">
              Vos données existent peut-être mais ne sont pas liées à une organisation.
            </p>
            <p className="text-amber-600 text-sm">
              Ouvrez la console (F12) pour voir les détails, puis exécutez le script SQL de migration.
            </p>
          </div>
        )}

        {/* Header PREMIUM */}
        <motion.div 
          className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 pb-6 border-b border-slate-200/60"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <motion.div
                className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl shadow-lg shadow-blue-500/25"
                whileHover={{ rotate: 5, scale: 1.05 }}
              >
                <Zap className="w-6 h-6 text-white" />
              </motion.div>
              <h1 className="text-4xl font-bold tracking-tight bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 bg-clip-text text-transparent">
                Dashboard
              </h1>
            </div>
            <p className="text-slate-500 text-lg">
              Vue d&apos;ensemble de votre flotte en temps réel
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <ButtonUnified 
              variant="secondary" 
              leftIcon={<QrCode className="w-4 h-4" />} 
              size="lg"
              onClick={() => router.push("/inspection")}
            >
              Scanner QR
            </ButtonUnified>
            <ButtonUnified 
              leftIcon={<Plus className="w-4 h-4" />} 
              size="lg"
              onClick={() => router.push("/parc")}
            >
              Ajouter véhicule
            </ButtonUnified>
          </div>
        </motion.div>

        {/* Section Santé du Parc - HERO */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold text-slate-800">État de la flotte</h2>
          </div>
          
          <FleetHealthCard
            score={fleetHealthScore}
            totalVehicles={vehicles.length}
            criticalVehicles={criticalVehicles.length}
          />
        </motion.section>

        {/* Section Stats - Grid coloré */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-emerald-500" />
            <h2 className="text-lg font-semibold text-slate-800">KPIs essentiels</h2>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              title="Alertes Critiques"
              value={criticalVehicles.length}
              icon={AlertOctagon}
              trend={{ 
                value: criticalVehicles.length > 0 ? "Urgent" : "OK",
                direction: criticalVehicles.length === 0 ? "up" : "down"
              }}
              variant={criticalVehicles.length > 0 ? "danger" : "success"}
              href="/parc?filter=critical"
              delay={0.1}
            />

            <StatCard
              title="Devis à Valider"
              value={pendingInterventions.length}
              icon={FileText}
              trend={{ 
                value: pendingInterventions.length > 0 ? "En attente" : "À jour",
                direction: pendingInterventions.length === 0 ? "up" : "neutral"
              }}
              variant={pendingInterventions.length > 0 ? "warning" : "success"}
              href="/maintenance"
              delay={0.2}
            />

            <StatCard
              title="Véhicules Actifs"
              value={vehicles.filter((v) => v.status === "actif").length}
              icon={Truck}
              trend={{ 
                value: `${Math.round((vehicles.filter((v) => v.status === "actif").length / (vehicles.length || 1)) * 100)}%`,
                direction: "up"
              }}
              variant="info"
              href="/parc"
              delay={0.3}
            />

            <StatCard
              title="Budget Mensuel"
              value={`${(maintenanceBudget / 1000).toFixed(1)}k€`}
              icon={Wrench}
              trend={{ value: "Ce mois", direction: "neutral" }}
              variant="default"
              href="/maintenance"
              delay={0.4}
            />
          </div>
        </motion.section>

        {/* Section Alertes et Planning */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Critical Vehicles List */}
          <motion.div 
            className="lg:col-span-2"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="overflow-hidden border-0 shadow-xl shadow-slate-200/50 bg-white">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 pb-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg shadow-lg shadow-orange-500/25">
                      <AlertTriangle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl text-slate-800">Véhicules en Alertes</CardTitle>
                      <CardDescription className="text-slate-500">
                        {criticalVehicles.length > 0 
                          ? `${criticalVehicles.length} véhicule${criticalVehicles.length > 1 ? 's' : ''} nécessite${criticalVehicles.length > 1 ? 'nt' : ''} votre attention`
                          : "Aucune alerte critique"
                        }
                      </CardDescription>
                    </div>
                  </div>
                  <Link href="/parc?filter=critical">
                    <ButtonUnified variant="ghost" size="icon-sm">
                      <ArrowUpRight className="w-5 h-5" />
                    </ButtonUnified>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {criticalVehicles.length === 0 ? (
                  <div className="p-8">
                    <EmptyState
                      type="vehicles"
                      title="Tous les véhicules sont à jour"
                      description="Aucun contrôle technique ou tachygraphe n'arrive à échéance"
                      compact
                    />
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {criticalVehicles.slice(0, 5).map((vehicle, index) => (
                      <VehicleAlertRow key={vehicle.id} vehicle={vehicle} today={today} index={index} />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Inspections Widget */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <RecentInspectionsWidget />
          </motion.div>
        </div>

        {/* Section Planning rapide */}
        {plannedInterventions.length > 0 && (
          <motion.section
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="bg-gradient-to-r from-blue-600 via-cyan-600 to-teal-500 rounded-2xl p-6 text-white shadow-xl shadow-blue-500/25"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                  <Calendar className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Prochains rendez-vous</h3>
                  <p className="text-white/80">{plannedInterventions.length} interventions planifiées</p>
                </div>
              </div>
              <ButtonUnified 
                variant="secondary" 
                className="bg-white/20 border-white/30 text-white hover:bg-white/30"
                asChild
              >
                <Link href="/planning">Voir le planning</Link>
              </ButtonUnified>
            </div>
          </motion.section>
        )}
      </div>
    </div>
  );
}

// Composant ligne véhicule en alerte
function VehicleAlertRow({ vehicle, today, index }: { vehicle: Vehicle; today: Date; index: number }) {
  const ctDays = vehicle.date_ct ? differenceInDays(parseISO(vehicle.date_ct), today) : null;
  const tachyDays = vehicle.date_tachy ? differenceInDays(parseISO(vehicle.date_tachy), today) : null;

  const getUrgency = (days: number | null) => {
    if (days === null) return null;
    if (days < 0) return { label: "EXPIRÉ", color: "bg-gradient-to-r from-red-500 to-rose-500", shadow: "shadow-red-500/30" };
    if (days < 7) return { label: `${days}j`, color: "bg-gradient-to-r from-red-500 to-rose-500", shadow: "shadow-red-500/30" };
    return { label: `${days}j`, color: "bg-gradient-to-r from-amber-400 to-orange-500", shadow: "shadow-amber-500/30" };
  };

  return (
    <motion.div 
      className="flex items-center justify-between p-4 hover:bg-slate-50/80 transition-colors cursor-pointer group"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ x: 4, backgroundColor: "rgba(248, 250, 252, 1)" }}
    >
      <div className="flex items-center gap-4">
        <Avatar className="h-12 w-12 bg-gradient-to-br from-blue-500 to-cyan-500 shadow-lg shadow-blue-500/25">
          <AvatarFallback className="text-white text-sm font-bold">
            {vehicle.immat.slice(0, 2)}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-mono font-bold text-slate-900 text-lg">{vehicle.immat}</p>
          <p className="text-sm text-slate-500">{vehicle.marque}</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        {ctDays !== null && getUrgency(ctDays) && (
          <Badge className={cn(
            getUrgency(ctDays)?.color,
            "text-white font-bold px-3 py-1 shadow-lg",
            getUrgency(ctDays)?.shadow
          )}>
            CT {getUrgency(ctDays)?.label}
          </Badge>
        )}
        {tachyDays !== null && getUrgency(tachyDays) && (
          <Badge className={cn(
            getUrgency(tachyDays)?.color,
            "text-white font-bold px-3 py-1 shadow-lg",
            getUrgency(tachyDays)?.shadow
          )}>
            Tachy {getUrgency(tachyDays)?.label}
          </Badge>
        )}
        <ArrowUpRight className="w-5 h-5 text-slate-400 opacity-0 group-hover:opacity-100 transition-all group-hover:text-blue-500" />
      </div>
    </motion.div>
  );
}
