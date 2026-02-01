"use client";

/**
 * Widget des inspections récentes - Version stable sans dépendance lucide problématique
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

// Icônes SVG inline pour éviter les problèmes de cache HMR
const Icons = {
  FileText: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/>
      <polyline points="14 2 14 8 20 8"/>
      <line x1="16" y1="13" x2="8" y2="13"/>
      <line x1="16" y1="17" x2="8" y2="17"/>
      <line x1="10" y1="9" x2="8" y2="9"/>
    </svg>
  ),
  AlertTriangle: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
      <line x1="12" y1="9" x2="12" y2="13"/>
      <line x1="12" y1="17" x2="12.01" y2="17"/>
    </svg>
  ),
  AlertOctagon: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/>
      <line x1="12" y1="8" x2="12" y2="12"/>
      <line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  ),
  CheckCircle: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
      <polyline points="22 4 12 14.01 9 11.01"/>
    </svg>
  ),
  ChevronRight: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6"/>
    </svg>
  ),
  Eye: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ),
  RefreshCw: () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/>
      <path d="M21 3v5h-5"/>
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/>
      <path d="M8 16H3v5"/>
    </svg>
  ),
};

interface RecentInspection {
  id: string;
  created_at: string;
  vehicle_id: string;
  vehicle_immat: string;
  vehicle_marque: string;
  status: string;
  defects: any[];
  inspector_name: string | null;
}

export function RecentInspectionsWidget() {
  const [inspections, setInspections] = useState<RecentInspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchRecentInspections();
  }, []);

  const fetchRecentInspections = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: inspectionsData, error: inspectionsError } = await supabase
        .from("vehicle_inspections")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(5);

      if (inspectionsError) {
        throw new Error(inspectionsError.message);
      }

      if (!inspectionsData || inspectionsData.length === 0) {
        setInspections([]);
        return;
      }

      const rawIds = inspectionsData.map((i: any) => i.vehicle_id);
      const validIds = rawIds.filter((id: any) => id && typeof id === "string" && id.length > 0);
      const vehicleIds = Array.from(new Set(validIds));

      let vehiclesData: any[] = [];
      try {
        const { data: vData } = await supabase
          .from("vehicles")
          .select("id, immat, marque")
          .in("id", vehicleIds);
        vehiclesData = vData || [];
      } catch (vErr) {
        console.error("[ERROR] Chargement véhicules:", vErr);
      }

      const vehiclesMap = new Map();
      vehiclesData.forEach((v: any) => {
        if (v && v.id) vehiclesMap.set(v.id, v);
      });

      const formatted: RecentInspection[] = inspectionsData.map((item: any) => {
        const vehicle = vehiclesMap.get(item.vehicle_id);
        return {
          id: item.id,
          created_at: item.created_at,
          vehicle_id: item.vehicle_id,
          vehicle_immat: vehicle?.immat || "Véhicule supprimé",
          vehicle_marque: vehicle?.marque || "N/A",
          status: item.status,
          defects: item.defects || [],
          inspector_name: item.inspector_name,
        };
      });

      setInspections(formatted);
    } catch (err: any) {
      console.error("[FATAL] Erreur inspections:", err);
      setError(err.message || "Erreur lors du chargement");
      toast.error("Impossible de charger les inspections récentes");
    } finally {
      setLoading(false);
    }
  };

  const calculateHealthScore = (defects: any[]): number => {
    if (!defects || defects.length === 0) return 100;
    let penalty = 0;
    defects.forEach((d) => {
      if (d.severity === "critical") penalty += 30;
      else if (d.severity === "warning") penalty += 10;
      else penalty += 2;
    });
    return Math.max(0, 100 - penalty);
  };

  const criticalCount = inspections.filter((i) => {
    const criticalDefs = i.defects?.filter((d: any) => d.severity === "critical").length || 0;
    return criticalDefs > 0 || i.status === "requires_action";
  }).length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <div className="h-6 w-48 bg-slate-200 rounded animate-pulse" />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-16 w-full bg-slate-200 rounded animate-pulse" />
          <div className="h-16 w-full bg-slate-200 rounded animate-pulse" />
          <div className="h-16 w-full bg-slate-200 rounded animate-pulse" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="w-5 h-5 text-slate-600"><Icons.FileText /></span>
            Inspections récentes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <span className="w-10 h-10 text-amber-500 mx-auto mb-2 block"><Icons.AlertTriangle /></span>
            <p className="text-slate-600 mb-3">{error}</p>
            <Button variant="outline" size="sm" onClick={fetchRecentInspections}>
              <span className="w-4 h-4 mr-2"><Icons.RefreshCw /></span>
              Réessayer
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <span className="w-5 h-5 text-slate-600"><Icons.FileText /></span>
            Inspections récentes
          </CardTitle>
          <CardDescription>
            {criticalCount > 0 ? (
              <span className="text-red-600 font-medium">
                {criticalCount} alerte{criticalCount > 1 ? "s" : ""} critique{criticalCount > 1 ? "s" : ""} à consulter
              </span>
            ) : (
              "Derniers contrôles effectués"
            )}
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href="/inspections">
            Voir tout
            <span className="w-4 h-4 ml-1"><Icons.ChevronRight /></span>
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {inspections.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 text-slate-300 mx-auto mb-3">
              <Icons.FileText />
            </div>
            <p className="text-slate-500">Aucune inspection récente</p>
          </div>
        ) : (
          <div className="space-y-2">
            {inspections.map((inspection) => {
              const healthScore = calculateHealthScore(inspection.defects);
              const criticalDefs = inspection.defects?.filter((d: any) => d.severity === "critical").length || 0;
              const isCritical = criticalDefs > 0 || inspection.status === "requires_action";
              const isWarning = !isCritical && healthScore < 80;

              return (
                <Link
                  key={inspection.id}
                  href={`/inspections/${inspection.id}`}
                  className={`
                    flex items-center justify-between p-3 rounded-lg border transition-all hover:shadow-sm
                    ${isCritical ? "bg-red-50 border-red-200 hover:border-red-300" : 
                      isWarning ? "bg-amber-50 border-amber-200 hover:border-amber-300" : 
                      "bg-slate-50 border-slate-200 hover:border-slate-300"}
                  `}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`
                      p-2 rounded-full shrink-0
                      ${isCritical ? "bg-red-100 text-red-600" : 
                        isWarning ? "bg-amber-100 text-amber-600" : 
                        "bg-green-100 text-green-600"}
                    `}>
                      <span className="w-4 h-4 block">
                        {isCritical ? <Icons.AlertOctagon /> : 
                         isWarning ? <Icons.AlertTriangle /> : 
                         <Icons.CheckCircle />}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-slate-900 truncate">
                          {inspection.vehicle_immat}
                        </span>
                        <Badge 
                          variant={isCritical ? "destructive" : "outline"}
                          className={isWarning ? "bg-amber-50 text-amber-700 border-amber-200 text-xs" : "text-xs"}
                        >
                          {isCritical ? "CRITIQUE" : isWarning ? "Attention" : "OK"}
                        </Badge>
                      </div>
                      <div className="text-xs text-slate-500">
                        {format(new Date(inspection.created_at), "dd/MM/yyyy HH:mm", { locale: fr })}
                        {inspection.inspector_name && ` • ${inspection.inspector_name}`}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <div className={`text-sm font-bold ${
                        healthScore >= 80 ? "text-green-600" : 
                        healthScore >= 50 ? "text-amber-600" : "text-red-600"
                      }`}>
                        {healthScore}/100
                      </div>
                      {criticalDefs > 0 && (
                        <div className="text-xs text-red-600 font-medium">
                          {criticalDefs} défaut critique
                        </div>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <span className="w-4 h-4"><Icons.Eye /></span>
                    </Button>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
