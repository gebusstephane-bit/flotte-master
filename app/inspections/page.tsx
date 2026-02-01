"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { 
  AlertTriangle,
  Eye, 
  RefreshCw, 
  Loader2, 
  OctagonAlert,
  CircleCheck,
  Timer,
  Search,
  ShieldCheck,
  Wrench
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { ValidationModal } from "@/components/inspection/ValidationModal";
import { getUserRole, getPermissions, type UserRole } from "@/lib/role";

interface VehicleInfo {
  immat: string;
  marque: string;
}

interface Inspection {
  id: string;
  created_at: string;
  status: string;
  mileage: number;
  fuel_level: number;
  inspection_type: string;
  vehicle_id: string;
  inspector_name: string | null;
  defects: any[];
  intervention_id?: string | null;
  intervention?: { id: string; status: string } | null;
  vehicle?: VehicleInfo;
}

const TIME_FILTERS = [
  { id: 'all', label: 'Tout', days: null },
  { id: 'today', label: "Aujourd'hui", days: 0 },
  { id: 'yesterday', label: 'Hier', days: 1 },
  { id: 'week', label: '7 jours', days: 7 },
  { id: 'month', label: '30 jours', days: 30 },
];

const STATUS_FILTERS = [
  { id: 'all', label: 'Tous statuts', color: 'bg-slate-500' },
  { id: 'requires_action', label: '🔴 Action requise', color: 'bg-red-500' },
  { id: 'pending_review', label: '🟡 À valider', color: 'bg-amber-500' },
  { id: 'validated', label: '🟢 Validés', color: 'bg-green-500' },
];

export default function InspectionsHistoryPage() {
  const router = useRouter();
  
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [filteredInspections, setFilteredInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // User role state
  const [userRole, setUserRole] = useState<UserRole>("exploitation");
  const [canValidate, setCanValidate] = useState(false);
  
  // Validation modal state
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [isValidationModalOpen, setIsValidationModalOpen] = useState(false);
  
  // Refresh trigger - incrémenter pour forcer le re-fetch
  const [refreshKey, setRefreshKey] = useState(0);
  
  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTimeFilter, setSelectedTimeFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  // Fetch inspections - définie avec useCallback pour pouvoir être utilisée dans useEffect
  const fetchInspections = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: queryError } = await supabase
        .from("vehicle_inspections")
        .select(`
          *,
          vehicle:vehicles(immat, marque),
          intervention:interventions(id, status)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (queryError) {
        throw new Error(`Erreur requête: ${queryError.message}`);
      }

      if (!data || data.length === 0) {
        setInspections([]);
        setLoading(false);
        return;
      }

      // Transformer les données pour avoir vehicle et intervention sous forme d'objet
      const processedData = data.map((item: any) => ({
        ...item,
        vehicle: item.vehicle || null,
        intervention: item.intervention || null,
      }));

      setInspections(processedData);
    } catch (err: any) {
      setError(err.message || "Erreur inconnue");
      toast.error("Erreur: " + (err.message || "Erreur technique"));
      setInspections([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + refresh quand refreshKey change
  useEffect(() => {
    // Get user role
    const role = getUserRole();
    setUserRole(role);
    const permissions = getPermissions(role);
    setCanValidate(permissions.canValidateInspection);
    
    fetchInspections();
  }, [refreshKey, fetchInspections]);

  useEffect(() => {
    applyFilters();
  }, [inspections, searchQuery, selectedTimeFilter, selectedStatusFilter]);

  const applyFilters = () => {
    let filtered = [...inspections];

    // Filtre temporel
    if (selectedTimeFilter !== 'all') {
      const filter = TIME_FILTERS.find(f => f.id === selectedTimeFilter);
      if (filter && filter.days !== null) {
        const now = new Date();
        let start: Date;
        let end: Date;

        if (filter.days === 0) {
          // Aujourd'hui
          start = startOfDay(now);
          end = endOfDay(now);
        } else if (filter.days === 1) {
          // Hier
          const yesterday = subDays(now, 1);
          start = startOfDay(yesterday);
          end = endOfDay(yesterday);
        } else {
          // N derniers jours
          start = startOfDay(subDays(now, filter.days));
          end = endOfDay(now);
        }

        filtered = filtered.filter(inspection => {
          const inspectionDate = new Date(inspection.created_at);
          return inspectionDate >= start && inspectionDate <= end;
        });
      }
    }

    // Filtre statut
    if (selectedStatusFilter !== 'all') {
      filtered = filtered.filter(inspection => inspection.status === selectedStatusFilter);
    }

    // Filtre recherche (immat, marque, conducteur)
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(inspection => {
        const immat = inspection.vehicle?.immat?.toLowerCase() || '';
        const marque = inspection.vehicle?.marque?.toLowerCase() || '';
        const conducteur = inspection.inspector_name?.toLowerCase() || '';
        return immat.includes(query) || marque.includes(query) || conducteur.includes(query);
      });
    }

    setFilteredInspections(filtered);
  };

  const getHealthScore = (defects: any[]): number => {
    if (!defects || defects.length === 0) return 100;
    let penalty = 0;
    defects.forEach((d) => {
      if (d.severity === "critical") penalty += 30;
      else if (d.severity === "warning") penalty += 10;
      else penalty += 2;
    });
    return Math.max(0, 100 - penalty);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "requires_action": return <OctagonAlert className="w-4 h-4" />;
      case "pending_review": return <Timer className="w-4 h-4" />;
      case "validated": return <CircleCheck className="w-4 h-4" />;
      default: return null;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "requires_action": return "Action requise";
      case "pending_review": return "À valider";
      case "validated": return "Validé";
      default: return status;
    }
  };

  const getPriorityBadge = (inspection: Inspection) => {
    const hasCritical = inspection.defects?.some((d: any) => d.severity === 'critical');
    const hasWarning = inspection.defects?.some((d: any) => d.severity === 'warning');
    
    if (hasCritical) {
      return (
        <Badge variant="destructive" className="animate-pulse">
          <OctagonAlert className="w-3 h-3 mr-1" />
          CRITIQUE
        </Badge>
      );
    }
    if (hasWarning) {
      return (
        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
          <AlertTriangle className="w-3 h-3 mr-1" />
          ATTENTION
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
        <CircleCheck className="w-3 h-3 mr-1" />
        OK
      </Badge>
    );
  };

  // Check if inspection can be validated
  const isInspectionValidatable = (status: string): boolean => {
    return ["pending_review", "requires_action"].includes(status);
  };

  // Open validation modal
  const handleOpenValidation = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    setIsValidationModalOpen(true);
  };

  // Close validation modal
  const handleCloseValidation = () => {
    setIsValidationModalOpen(false);
    setSelectedInspection(null);
  };

  // Handle successful validation
  const handleValidationSuccess = () => {
    setRefreshKey(prev => prev + 1); // Force re-fetch via useEffect
    router.refresh(); // Force Next.js to re-render with fresh data
  };

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Historique des contrôles</h1>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-red-800 mb-2">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="font-bold">Erreur de chargement</h3>
            </div>
            <p className="text-red-700 mb-4">{error}</p>
            <Button onClick={fetchInspections} variant="destructive">
              <RefreshCw className="w-4 h-4 mr-2" />
              Réessayer
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Historique des contrôles</h1>
          <p className="text-slate-500">
            {filteredInspections.length} contrôle{filteredInspections.length !== 1 ? 's' : ''} affiché{filteredInspections.length !== 1 ? 's' : ''} sur {inspections.length} total
          </p>
        </div>
        <div className="flex items-center gap-2">
          {canValidate && (
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
              <ShieldCheck className="w-3 h-3 mr-1" />
              Validateur
            </Badge>
          )}
          <Button onClick={fetchInspections} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Actualiser
          </Button>
        </div>
      </div>

      {/* Filtres */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          {/* Recherche */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Rechercher par plaque, marque ou conducteur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Filtres temporels */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-slate-500 py-2">Période:</span>
            {TIME_FILTERS.map((filter) => (
              <Button
                key={filter.id}
                variant={selectedTimeFilter === filter.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTimeFilter(filter.id)}
              >
                {filter.label}
              </Button>
            ))}
          </div>

          {/* Filtres statut */}
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-slate-500 py-2">Statut:</span>
            {STATUS_FILTERS.map((filter) => (
              <Button
                key={filter.id}
                variant={selectedStatusFilter === filter.id ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedStatusFilter(filter.id)}
                className={selectedStatusFilter === filter.id ? "" : `hover:${filter.color}`}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tableau */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : filteredInspections.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center py-12">
            <p className="text-slate-500">Aucun contrôle trouvé avec ces critères</p>
            {(searchQuery || selectedTimeFilter !== 'all' || selectedStatusFilter !== 'all') && (
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedTimeFilter('all');
                  setSelectedStatusFilter('all');
                }}
              >
                Réinitialiser les filtres
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Liste des contrôles</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 border-b">
                  <tr>
                    <th className="text-left p-4 font-medium">Date</th>
                    <th className="text-left p-4 font-medium">Véhicule</th>
                    <th className="text-left p-4 font-medium">Conducteur</th>
                    <th className="text-left p-4 font-medium">Priorité</th>
                    <th className="text-left p-4 font-medium">Score</th>
                    <th className="text-left p-4 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredInspections.map((inspection) => {
                    const score = getHealthScore(inspection.defects);
                    const vehicle = inspection.vehicle;
                    const showValidateButton = canValidate && isInspectionValidatable(inspection.status);
                    
                    return (
                      <tr 
                        key={inspection.id} 
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="p-4 whitespace-nowrap">
                          <div className="font-medium">
                            {format(new Date(inspection.created_at), "dd/MM/yyyy", { locale: fr })}
                          </div>
                          <div className="text-sm text-slate-500">
                            {format(new Date(inspection.created_at), "HH:mm", { locale: fr })}
                          </div>
                        </td>
                        <td className="p-4">
                          {vehicle ? (
                            <div>
                              <div className="font-bold text-lg font-mono tracking-wide">
                                {vehicle.immat}
                              </div>
                              <div className="text-sm text-slate-500">
                                {vehicle.marque}
                              </div>
                            </div>
                          ) : (
                            <div className="text-slate-400 italic">
                              ID: {inspection.vehicle_id.slice(0, 8)}...
                            </div>
                          )}
                        </td>
                        <td className="p-4">{inspection.inspector_name || "Inconnu"}</td>
                        <td className="p-4">
                          {getPriorityBadge(inspection)}
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              score < 50 ? 'bg-red-500' : score < 80 ? 'bg-amber-500' : 'bg-green-500'
                            }`} />
                            <span className={score < 50 ? "text-red-600 font-bold" : score < 80 ? "text-amber-600 font-bold" : "text-green-600 font-bold"}>
                              {score}/100
                            </span>
                          </div>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm" asChild>
                              <Link href={`/inspections/${inspection.id}`}>
                                <Eye className="w-4 h-4 mr-1" />
                                Voir
                              </Link>
                            </Button>
                            
                            {inspection.intervention_id && inspection.intervention?.status !== 'completed' && inspection.intervention?.status !== 'rejected' ? (
                              // Une intervention existe et n'est pas terminée
                              <Button 
                                variant="outline" 
                                size="sm"
                                asChild
                                className="bg-amber-50 text-amber-700 border-amber-300 hover:bg-amber-100"
                              >
                                <Link href={`/maintenance?edit=${inspection.intervention_id}`}>
                                  <Wrench className="w-4 h-4 mr-1" />
                                  Intervention
                                </Link>
                              </Button>
                            ) : inspection.intervention_id && (inspection.intervention?.status === 'completed' || inspection.intervention?.status === 'rejected') ? (
                              // Intervention terminée - ne rien afficher
                              null
                            ) : showValidateButton ? (
                              // Pas d'intervention et peut valider
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => handleOpenValidation(inspection)}
                                className="bg-blue-50 text-blue-700 border-blue-300 hover:bg-blue-100"
                              >
                                <ShieldCheck className="w-4 h-4 mr-1" />
                                Valider
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de validation */}
      <ValidationModal
        inspectionId={selectedInspection?.id || ""}
        inspectionStatus={selectedInspection?.status || ""}
        vehicleId={selectedInspection?.vehicle_id || ""}
        vehicleInfo={selectedInspection?.vehicle ? {
          immat: selectedInspection.vehicle.immat,
          marque: selectedInspection.vehicle.marque,
        } : undefined}
        defects={selectedInspection?.defects || []}
        isOpen={isValidationModalOpen}
        onClose={handleCloseValidation}
        onSuccess={handleValidationSuccess}
      />
    </div>
  );
}
