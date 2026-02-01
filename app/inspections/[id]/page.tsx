"use client";

/**
 * Détail d'une inspection spécifique
 * Affiche toutes les informations du contrôle avec option de validation
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  ArrowLeft,
  Truck,
  User,
  Calendar,
  Gauge,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Timer,
  Thermometer,
  Droplets,
  Sun,
  Loader2,
  Printer,
  FileText,
  ShieldCheck
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { ValidationModal } from "@/components/inspection/ValidationModal";
import { getUserRole, getPermissions, type UserRole } from "@/lib/role";

interface InspectionDetail {
  id: string;
  created_at: string;
  vehicle_id: string;
  mileage: number;
  fuel_level: number | null;
  fuel_gasoil: number | null;
  fuel_gnr: number | null;
  fuel_adblue: number | null;
  fuel_type: string;
  inspection_type: string;
  weather_conditions: string | null;
  interior_condition: string;
  exterior_condition: string;
  temp_compartment_1: number | null;
  temp_compartment_2: number | null;
  defects: any[];
  notes: string | null;
  status: string;
  geolocation: any;
  inspector_name: string | null;
  reviewed_by?: string | null;
  reviewed_at?: string | null;
  review_notes?: string | null;
  vehicle: {
    immat: string;
    marque: string;
    type: string;
  } | null;
}

export default function InspectionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const inspectionId = params.id as string;
  
  const [inspection, setInspection] = useState<InspectionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  
  // User role state
  const [userRole, setUserRole] = useState<UserRole>("exploitation");
  const [canValidate, setCanValidate] = useState(false);
  
  // Validation modal state
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);

  useEffect(() => {
    // Get user role
    const role = getUserRole();
    setUserRole(role);
    const permissions = getPermissions(role);
    setCanValidate(permissions.canValidateInspection);
    
    fetchInspection();
  }, [inspectionId]);

  async function fetchInspection() {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from("vehicle_inspections")
        .select(`
          *,
          vehicles:vehicle_id (immat, marque, type)
        `)
        .eq("id", inspectionId)
        .single();
      
      if (error) throw error;
      
      setInspection({
        ...data,
        vehicle: data.vehicles,
      });
    } catch (error) {
      console.error("Erreur chargement inspection:", error);
      toast.error("Inspection non trouvée");
      router.push("/inspections");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-slate-900">Inspection non trouvée</h1>
        <Button variant="outline" className="mt-4" asChild>
          <Link href="/inspections">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à l&apos;historique
          </Link>
        </Button>
      </div>
    );
  }

  const defects = inspection.defects || [];
  const criticalCount = defects.filter((d) => d.severity === "critical").length;
  const warningCount = defects.filter((d) => d.severity === "warning").length;
  const minorCount = defects.filter((d) => d.severity === "minor").length;
  const healthScore = calculateHealthScore(defects);

  const isInspectionValidatable = (status: string): boolean => {
    return ["pending_review", "requires_action"].includes(status);
  };

  const showValidateButton = canValidate && isInspectionValidatable(inspection.status);

  const getStatusBadge = () => {
    switch (inspection.status) {
      case "requires_action":
        return (
          <Badge variant="destructive" className="text-lg px-4 py-2">
            <AlertTriangle className="w-5 h-5 mr-2" />
            ACTION REQUISE
          </Badge>
        );
      case "pending_review":
        return (
          <Badge variant="outline" className="text-lg px-4 py-2 bg-amber-50 text-amber-700 border-amber-200">
            <Timer className="w-5 h-5 mr-2" />
            EN ATTENTE DE VALIDATION
          </Badge>
        );
      case "validated":
        return (
          <Badge variant="outline" className="text-lg px-4 py-2 bg-green-50 text-green-700 border-green-200">
            <CheckCircle2 className="w-5 h-5 mr-2" />
            VALIDÉ
          </Badge>
        );
      default:
        return <Badge>{inspection.status}</Badge>;
    }
  };

  const getScoreColor = () => {
    if (healthScore >= 80) return "text-green-600 bg-green-50 border-green-200";
    if (healthScore >= 50) return "text-amber-600 bg-amber-50 border-amber-200";
    return "text-red-600 bg-red-50 border-red-200";
  };

  const handleOpenValidation = () => {
    setIsValidationModalOpen(true);
  };

  const handleCloseValidation = () => {
    setIsValidationModalOpen(false);
  };

  const handleValidationSuccess = () => {
    fetchInspection(); // Refresh inspection data
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" asChild>
            <Link href="/inspections">
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Détail du contrôle</h1>
            <p className="text-slate-500">
              Effectué le {format(new Date(inspection.created_at), "dd MMMM yyyy à HH:mm", { locale: fr })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {showValidateButton && (
            <Button 
              onClick={handleOpenValidation}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <ShieldCheck className="w-4 h-4 mr-2" />
              Valider l&apos;inspection
            </Button>
          )}
          <Button variant="outline" size="sm">
            <Printer className="w-4 h-4 mr-2" />
            Imprimer
          </Button>
        </div>
      </div>

      {/* Status Banner */}
      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
        {getStatusBadge()}
        <div className={`px-4 py-2 rounded-lg border font-bold text-lg ${getScoreColor()}`}>
          Score: {healthScore}/100
        </div>
      </div>

      {/* Validation Info Banner (if validated) */}
      {inspection.status === "validated" && inspection.reviewed_at && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2 text-green-800">
            <ShieldCheck className="w-5 h-5" />
            <span className="font-medium">Inspection validée</span>
          </div>
          <p className="text-sm text-green-700 mt-1">
            Validée le {format(new Date(inspection.reviewed_at), "dd/MM/yyyy à HH:mm", { locale: fr })}
            {inspection.review_notes && (
              <span className="ml-2">
                • {inspection.review_notes.includes("SANS_ANOMALIE") 
                  ? "✓ Sans anomalie" 
                  : "⚠ Avec anomalie détectée"}
              </span>
            )}
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne gauche - Infos */}
        <div className="space-y-6">
          {/* Véhicule */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Truck className="w-5 h-5" />
                Véhicule
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {inspection.vehicle ? (
                <>
                  <div>
                    <p className="text-sm text-slate-500">Immatriculation</p>
                    <p className="text-xl font-mono font-bold text-slate-900">{inspection.vehicle.immat}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Marque / Modèle</p>
                    <p className="font-medium text-slate-900">{inspection.vehicle.marque}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Type</p>
                    <Badge variant="outline">{inspection.vehicle.type}</Badge>
                  </div>
                </>
              ) : (
                <p className="text-slate-500">Véhicule inconnu</p>
              )}
              <Separator />
              <Button variant="outline" className="w-full" asChild>
                <Link href={`/parc/${inspection.vehicle_id}`}>
                  Voir fiche véhicule
                </Link>
              </Button>
            </CardContent>
          </Card>

          {/* Conducteur */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Conducteur
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="font-medium text-slate-900">{inspection.inspector_name || "Inconnu"}</p>
              <p className="text-sm text-slate-500">
                {format(new Date(inspection.created_at), "dd/MM/yyyy à HH:mm", { locale: fr })}
              </p>
            </CardContent>
          </Card>

          {/* Géolocalisation */}
          {inspection.geolocation && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="w-5 h-5" />
                  Localisation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-slate-500">Coordonnées GPS</p>
                <p className="font-mono text-slate-900">
                  {inspection.geolocation.lat.toFixed(6)}, {inspection.geolocation.lng.toFixed(6)}
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Colonne centrale - Métriques */}
        <div className="space-y-6">
          {/* Métriques */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Gauge className="w-5 h-5" />
                Métriques
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">Kilométrage</p>
                  <p className="text-xl font-bold text-slate-900">
                    {inspection.mileage.toLocaleString()} km
                  </p>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg">
                  <p className="text-sm text-slate-500">Carburant</p>
                  <div className="flex items-center gap-2">
                    <Droplets className="w-4 h-4 text-blue-500" />
                    <p className="text-xl font-bold text-slate-900">{inspection.fuel_gasoil ?? inspection.fuel_level ?? 50}%</p>
                  </div>
                  <p className="text-xs text-slate-500 capitalize">{inspection.fuel_type}</p>
                </div>
              </div>

              <Separator />

              {/* 3 niveaux de carburant détaillés */}
              <div className="space-y-3">
                <p className="text-sm text-slate-500">Niveaux détaillés</p>
                <div className="grid grid-cols-3 gap-2">
                  <div className="p-2 bg-slate-100 rounded text-center">
                    <p className="text-xs text-slate-500">Gasoil</p>
                    <p className="font-bold text-slate-900">{inspection.fuel_gasoil ?? 50}%</p>
                  </div>
                  <div className="p-2 bg-amber-50 rounded text-center">
                    <p className="text-xs text-slate-500">GNR</p>
                    <p className="font-bold text-amber-700">{inspection.fuel_gnr ?? 50}%</p>
                  </div>
                  <div className={`p-2 rounded text-center ${(inspection.fuel_adblue ?? 50) < 20 ? 'bg-red-50' : 'bg-blue-50'}`}>
                    <p className="text-xs text-slate-500">AdBlue</p>
                    <p className={`font-bold ${(inspection.fuel_adblue ?? 50) < 20 ? 'text-red-700' : 'text-blue-700'}`}>
                      {inspection.fuel_adblue ?? 50}%
                    </p>
                    {(inspection.fuel_adblue ?? 50) < 20 && (
                      <p className="text-[10px] text-red-600 font-medium">⚠️ Faible</p>
                    )}
                  </div>
                </div>
              </div>

              <Separator />

              <div>
                <p className="text-sm text-slate-500 mb-2">État intérieur</p>
                <Badge variant="outline" className="capitalize">
                  {inspection.interior_condition}
                </Badge>
              </div>

              <div>
                <p className="text-sm text-slate-500 mb-2">État extérieur</p>
                <Badge variant="outline" className="capitalize">
                  {inspection.exterior_condition}
                </Badge>
              </div>

              {(inspection.temp_compartment_1 !== null || inspection.temp_compartment_2 !== null) && (
                <>
                  <Separator />
                  <div className="flex items-center gap-2">
                    <Thermometer className="w-5 h-5 text-blue-500" />
                    <span className="font-medium">Températures:</span>
                    {inspection.temp_compartment_1 !== null && (
                      <Badge variant="outline">Comp. 1: {inspection.temp_compartment_1}°C</Badge>
                    )}
                    {inspection.temp_compartment_2 !== null && (
                      <Badge variant="outline">Comp. 2: {inspection.temp_compartment_2}°C</Badge>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Conditions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sun className="w-5 h-5" />
                Conditions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Type d&apos;inspection</span>
                  <Badge variant="outline" className="capitalize">
                    {inspection.inspection_type.replace("_", " ")}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Météo</span>
                  <span className="capitalize">{inspection.weather_conditions || "Non spécifié"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {inspection.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-slate-700 whitespace-pre-wrap">{inspection.notes}</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Colonne droite - Défauts */}
        <div>
          <Card className="h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Anomalies signalées
              </CardTitle>
              <CardDescription>
                {defects.length === 0 ? (
                  "Aucune anomalie détectée"
                ) : (
                  <>
                    {criticalCount > 0 && (
                      <span className="text-red-600 font-medium">{criticalCount} critique(s) </span>
                    )}
                    {warningCount > 0 && (
                      <span className="text-amber-600">{warningCount} attention </span>
                    )}
                    {minorCount > 0 && <span>{minorCount} mineur(s)</span>}
                  </>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {defects.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="w-12 h-12 text-green-300 mx-auto mb-3" />
                  <p className="text-slate-500">Parfait ! Aucune anomalie signalée.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {defects.map((defect, index) => (
                    <DefectCard key={index} defect={defect} index={index} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Modal de validation */}
      <ValidationModal
        inspectionId={inspection.id}
        inspectionStatus={inspection.status}
        vehicleId={inspection.vehicle_id}
        vehicleInfo={inspection.vehicle ? {
          immat: inspection.vehicle.immat,
          marque: inspection.vehicle.marque,
          type: inspection.vehicle.type,
        } : undefined}
        defects={defects}
        isOpen={isValidationModalOpen}
        onClose={handleCloseValidation}
        onSuccess={handleValidationSuccess}
      />
    </div>
  );
}

function DefectCard({ defect, index }: { defect: any; index: number }) {
  const severityColors: Record<string, { bg: string; border: string; text: string; badge: string }> = {
    critical: { 
      bg: "bg-red-50", 
      border: "border-red-500", 
      text: "text-red-700",
      badge: "bg-red-100 text-red-700 border-red-300"
    },
    warning: { 
      bg: "bg-amber-50", 
      border: "border-amber-300", 
      text: "text-amber-700",
      badge: "bg-amber-100 text-amber-700 border-amber-300"
    },
    minor: { 
      bg: "bg-slate-50", 
      border: "border-slate-200", 
      text: "text-slate-700",
      badge: "bg-slate-100 text-slate-700 border-slate-300"
    },
  };

  const colors = severityColors[defect.severity] || severityColors.minor;
  const isCritical = defect.severity === "critical";

  return (
    <div className={`p-3 rounded-lg border-2 ${colors.bg} ${colors.border} ${isCritical ? 'shadow-md' : ''}`}>
      <div className="flex items-start gap-3">
        <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
          isCritical ? 'bg-red-500 text-white' : 'bg-white border text-slate-500'
        }`}>
          {isCritical ? '!' : index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <Badge variant="outline" className="text-xs capitalize">
              {defect.category}
            </Badge>
            <Badge 
              variant="outline" 
              className={`text-xs font-semibold ${colors.badge} ${isCritical ? 'animate-pulse' : ''}`}
            >
              {isCritical ? '⚠️ CRITIQUE' : defect.severity}
            </Badge>
          </div>
          <p className={`font-medium ${isCritical ? 'text-red-900' : 'text-slate-900'}`}>
            {defect.description}
          </p>
          <p className="text-sm text-slate-500 mt-1">
            <MapPin className="w-3 h-3 inline mr-1" />
            {defect.location}
          </p>
        </div>
      </div>
    </div>
  );
}

function calculateHealthScore(defects: any[]): number {
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
}
