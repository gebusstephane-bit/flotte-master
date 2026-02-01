"use client";

/**
 * Historique des inspections pour un véhicule spécifique
 * Affiché dans l'onglet "Historique des contrôles" de la fiche véhicule
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { 
  CheckCircle2, 
  AlertTriangle, 
  AlertOctagon, 
  Timer, 
  User, 
  ChevronRight, 
  Gauge, 
  Droplets,
  Activity,
  ExternalLink,
  RefreshCw
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface Inspection {
  id: string;
  created_at: string;
  status: string;
  mileage: number;
  fuel_level: number;
  fuel_gasoil: number | null;
  fuel_gnr: number | null;
  fuel_adblue: number | null;
  fuel_type: string;
  inspection_type: string;
  defects: any[];
  inspector_name: string | null;
}

interface VehicleInspectionHistoryProps {
  vehicleId: string;
}

export function VehicleInspectionHistory({ vehicleId }: VehicleInspectionHistoryProps) {
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (vehicleId) {
      fetchInspections();
    }
  }, [vehicleId]);

  const fetchInspections = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error: supabaseError } = await supabase
        .from("vehicle_inspections")
        .select("*")
        .eq("vehicle_id", vehicleId)
        .order("created_at", { ascending: false });

      if (supabaseError) {
        console.error("[VehicleInspectionHistory] Erreur Supabase:", supabaseError);
        throw new Error(supabaseError.message);
      }

      setInspections(data || []);
    } catch (err: any) {
      console.error("[VehicleInspectionHistory] Erreur:", err);
      setError(err.message || "Erreur lors du chargement");
      toast.error("Impossible de charger l'historique des contrôles");
    } finally {
      setLoading(false);
    }
  };

  // Calculer le score de santé basé sur les défauts
  const calculateHealthScore = (defects: any[]): number => {
    if (!defects || defects.length === 0) return 100;
    
    let penalty = 0;
    defects.forEach((defect) => {
      switch (defect.severity) {
        case "critical":
          penalty += 30;
          break;
        case "warning":
          penalty += 10;
          break;
        case "minor":
          penalty += 2;
          break;
      }
    });
    
    return Math.max(0, 100 - penalty);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 w-full bg-slate-200 rounded animate-pulse" />
        <div className="h-24 w-full bg-slate-200 rounded animate-pulse" />
        <div className="h-24 w-full bg-slate-200 rounded animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-8 text-center">
          <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            Erreur de chargement
          </h3>
          <p className="text-slate-500 mb-4">{error}</p>
          <Button variant="outline" onClick={fetchInspections}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Réessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (inspections.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Activity className="w-8 h-8 text-slate-400" />
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">
            Aucun contrôle enregistré
          </h3>
          <p className="text-slate-500 max-w-sm mx-auto mb-4">
            Ce véhicule n&apos;a pas encore fait l&apos;objet d&apos;un état des lieux.
          </p>
          <Button asChild>
            <Link href={`/inspection?vehicle=${vehicleId}`}>
              <Activity className="w-4 h-4 mr-2" />
              Effectuer un contrôle
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h3 className="font-semibold text-lg text-slate-900">
            {inspections.length} contrôle{inspections.length > 1 ? "s" : ""} effectué{inspections.length > 1 ? "s" : ""}
          </h3>
          <p className="text-sm text-slate-500">
            Cliquez sur un contrôle pour voir le détail complet
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/inspections?vehicle=${vehicleId}`}>
            <ExternalLink className="w-4 h-4 mr-2" />
            Voir dans l&apos;historique global
          </Link>
        </Button>
      </div>

      {/* Liste des inspections */}
      <div className="space-y-3">
        {inspections.map((inspection) => {
          const healthScore = calculateHealthScore(inspection.defects);
          const defectsCount = inspection.defects?.length || 0;
          const criticalCount = inspection.defects?.filter((d: any) => d.severity === "critical").length || 0;
          
          const isCritical = inspection.status === "requires_action" || criticalCount > 0;
          const isWarning = inspection.status === "pending_review" || healthScore < 80;
          const isOk = !isCritical && !isWarning;

          return (
            <Link 
              key={inspection.id}
              href={`/inspections/${inspection.id}`}
              className={`
                block p-4 rounded-lg border transition-all hover:shadow-md
                ${isCritical ? "bg-red-50 border-red-200 hover:border-red-300" : 
                  isWarning ? "bg-amber-50 border-amber-200 hover:border-amber-300" : 
                  "bg-white border-slate-200 hover:border-blue-300"}
              `}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {/* Header ligne */}
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <div className={`
                      p-2 rounded-full
                      ${isCritical ? "bg-red-100 text-red-600" : 
                        isWarning ? "bg-amber-100 text-amber-600" : 
                        "bg-green-100 text-green-600"}
                    `}>
                      {isCritical ? <AlertOctagon className="w-5 h-5" /> : 
                       isWarning ? <AlertTriangle className="w-5 h-5" /> : 
                       <CheckCircle2 className="w-5 h-5" />}
                    </div>
                    
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900">
                        {format(new Date(inspection.created_at), "dd MMMM yyyy", { locale: fr })}
                      </div>
                      <div className="text-sm text-slate-500">
                        {format(new Date(inspection.created_at), "HH:mm")}
                        {inspection.inspector_name && ` • ${inspection.inspector_name}`}
                      </div>
                    </div>

                    <Badge 
                      variant={isCritical ? "destructive" : isWarning ? "outline" : "default"}
                      className={isWarning ? "bg-amber-50 text-amber-700 border-amber-200" : ""}
                    >
                      {isCritical ? "CRITIQUE" : isWarning ? "À VÉRIFIER" : "CONFORME"}
                    </Badge>
                  </div>

                  {/* Métriques rapides */}
                  <div className="flex flex-wrap gap-4 text-sm text-slate-600 mt-3">
                    <div className="flex items-center gap-1.5">
                      <Gauge className="w-4 h-4 text-slate-400" />
                      <span>Score: </span>
                      <span className={`font-bold ${
                        healthScore >= 80 ? "text-green-600" : 
                        healthScore >= 50 ? "text-amber-600" : "text-red-600"
                      }`}>
                        {healthScore}/100
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Droplets className="w-4 h-4 text-slate-400" />
                      <span>
                        {inspection.fuel_gasoil ?? inspection.fuel_level ?? 50}% 
                        {criticalCount > 0 && (
                          <span className="ml-2 text-red-600 font-bold">⚠️ {criticalCount} CRITIQUE</span>
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <User className="w-4 h-4 text-slate-400" />
                      <span>{inspection.mileage?.toLocaleString()} km</span>
                    </div>
                    {defectsCount > 0 && (
                      <div className={`flex items-center gap-1.5 font-medium ${
                        criticalCount > 0 ? "text-red-600" : "text-amber-600"
                      }`}>
                        <AlertTriangle className="w-4 h-4" />
                        <span>
                          {defectsCount} anomalie{defectsCount > 1 ? "s" : ""}
                          {criticalCount > 0 && ` (${criticalCount} critique${criticalCount > 1 ? "s" : ""})`}
                        </span>
                      </div>
                    )}
                    {defectsCount === 0 && (
                      <div className="flex items-center gap-1.5 text-green-600">
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Aucune anomalie</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Flèche indication clic */}
                <ChevronRight className="text-slate-400 mt-2 shrink-0" />
              </div>
            </Link>
          );
        })}
      </div>

      {/* Bouton nouvelle inspection */}
      <div className="pt-4 border-t mt-6">
        <Button asChild className="w-full sm:w-auto">
          <Link href={`/inspection?vehicle=${vehicleId}`}>
            <Activity className="w-4 h-4 mr-2" />
            Effectuer un nouveau contrôle
          </Link>
        </Button>
      </div>
    </div>
  );
}
