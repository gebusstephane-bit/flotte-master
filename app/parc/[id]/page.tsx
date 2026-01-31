"use client";
// Fix: vehicle click crash - useCallback import + UUID validation + date guards

import { useState, useEffect, useCallback } from "react";
import type { ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  Truck,
  Calendar,
  Clock,
  AlertTriangle,
  Wrench,
  MapPin,
  Euro,
  FileText,
  CheckCircle2,
  Loader2,
  Shield,
  Gauge,
  Thermometer,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase, type Vehicle, type Intervention, VEHICLE_CONTROLS } from "@/lib/supabase";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { useRole } from "@/components/RoleSwitcher";
import { getPermissions } from "@/lib/role";
import { differenceInDays, isPast, parseISO, format, parse, isValid } from "date-fns";
import { fr } from "date-fns/locale";
import { FileDown } from "lucide-react";
import { exportVehiclePdf } from "@/lib/pdf";
import { DocumentUpload, type Document } from "@/components/DocumentUpload";

// Helper pour le statut de date
function getDateStatus(dateString: string | null): {
  variant: "destructive" | "default" | "secondary" | "outline";
  className: string;
  label: string;
  icon: ReactNode;
} {
  if (!dateString) {
    return {
      variant: "outline",
      className: "border-slate-300 text-slate-500",
      label: "Non defini",
      icon: null,
    };
  }

  const date = parseISO(dateString);
  
  // Garde-fou: date invalide
  if (!isValid(date)) {
    return {
      variant: "outline",
      className: "border-slate-300 text-slate-500",
      label: "Date invalide",
      icon: null,
    };
  }
  
  const today = new Date();
  const daysUntil = differenceInDays(date, today);

  if (isPast(date) || daysUntil < 0) {
    return {
      variant: "destructive",
      className: "",
      label: `EXPIRE (${Math.abs(daysUntil)}j)`,
      icon: <AlertTriangle className="w-3 h-3" />,
    };
  }

  if (daysUntil < 7) {
    return {
      variant: "destructive",
      className: "",
      label: `${daysUntil}j restants`,
      icon: <AlertTriangle className="w-3 h-3" />,
    };
  }

  if (daysUntil < 30) {
    return {
      variant: "default",
      className: "bg-orange-500 hover:bg-orange-600",
      label: `${daysUntil}j restants`,
      icon: <Clock className="w-3 h-3" />,
    };
  }

  return {
    variant: "secondary",
    className: "bg-green-100 text-green-800",
    label: `${daysUntil}j restants`,
    icon: <CheckCircle2 className="w-3 h-3" />,
  };
}

// Helper pour le statut intervention
function getInterventionStatusBadge(status: string) {
  switch (status) {
    case "pending":
      return { label: "En attente", className: "bg-orange-500 text-white" };
    case "approved_waiting_rdv":
      return { label: "RDV a planifier", className: "bg-blue-500 text-white" };
    case "planned":
      return { label: "Planifie", className: "bg-green-600 text-white" };
    case "completed":
      return { label: "Termine", className: "bg-slate-500 text-white" };
    default:
      return { label: status, className: "bg-slate-300" };
  }
}
function safeFormatInterventionDate(intervention: any) {
  if (intervention.created_at) {
    const d = new Date(intervention.created_at);
    if (!isNaN(d.getTime())) return format(d, "dd/MM/yyyy");
  }

  if (intervention.date_creation) {
    const isoTry = parseISO(intervention.date_creation);
    if (isValid(isoTry)) return format(isoTry, "dd/MM/yyyy");

    const frTry = parse(intervention.date_creation, "dd/MM/yyyy", new Date());
    if (isValid(frTry)) return format(frTry, "dd/MM/yyyy");

    return intervention.date_creation;
  }

  return "-";
}

function safeFormatRdvDate(rdvDate: any) {
  if (!rdvDate) return null;
  const d = new Date(rdvDate);
  if (isNaN(d.getTime())) return null;
  return format(d, "dd/MM HH:mm");
}
const DEVIS_BUCKET = "devis-interventions";

export default function VehicleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const vehicleId = params.id as string;
  
  // Validation UUID
  const isValidUUID = (id: string): boolean => {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  };

  const { role } = useRole();
  const permissions = getPermissions(role);

  const [vehicle, setVehicle] = useState<Vehicle | null>(null);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  // Delete states
  const [deleteVehicleOpen, setDeleteVehicleOpen] = useState(false);
  const [isDeletingVehicle, setIsDeletingVehicle] = useState(false);
  const [deleteInterventionTarget, setDeleteInterventionTarget] = useState<Intervention | null>(null);
  const [isDeletingIntervention, setIsDeletingIntervention] = useState(false);

  const fetchDocuments = useCallback(async () => {
    if (!vehicleId) return;
    const { data } = await supabase
      .from("documents")
      .select(`
        *,
        uploader:profiles(prenom, nom)
      `)
      .eq("vehicle_id", vehicleId)
      .order("created_at", { ascending: false });
    setDocuments(data || []);
  }, [vehicleId]);

  async function handleDownloadDevis(intervention: Intervention) {
    const path = intervention.devis_path;
    if (!path) return;
    setDownloading(intervention.id);
    try {
      const { data, error } = await supabase.storage
        .from(DEVIS_BUCKET)
        .createSignedUrl(path, 60);
      if (error || !data?.signedUrl) {
        console.error("[DEVIS] Signed URL error:", error);
        toast.error("Impossible de télécharger le devis", {
          description: error?.message || "URL non générée",
        });
        return;
      }
      window.open(data.signedUrl, "_blank");
    } catch (err: any) {
      console.error("[DEVIS] Download error:", err);
      toast.error("Erreur téléchargement", { description: err?.message });
    } finally {
      setDownloading(null);
    }
  }

  // Charger les donnees
  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);

        // Charger le vehicule
        const { data: vehicleData, error: vehicleError } = await supabase
          .from("vehicles")
          .select("*")
          .eq("id", vehicleId)
          .single();

        if (vehicleError) throw vehicleError;
        setVehicle(vehicleData);

        // Charger les interventions du vehicule
        const { data: interventionsData, error: interventionsError } = await supabase
          .from("interventions")
          .select("*")
          .eq("vehicle_id", vehicleId)
          .order("created_at", { ascending: false });

        if (interventionsError) throw interventionsError;
        setInterventions(interventionsData || []);

        // Charger les documents
        await fetchDocuments();

      } catch (error: any) {
        console.error("Erreur chargement:", error);
        toast.error("Erreur de chargement", {
          description: error?.message,
        });
      } finally {
        setLoading(false);
      }
    }

    if (vehicleId) {
      fetchData();
    }
  }, [vehicleId, fetchDocuments]);

  // Delete vehicle handler
  const handleDeleteVehicle = async () => {
    if (!vehicle) return;
    setIsDeletingVehicle(true);
    try {
      const res = await fetch("/api/admin/delete-vehicle", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId: vehicle.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Véhicule supprimé définitivement");
      router.push("/parc");
    } catch (err: any) {
      toast.error("Erreur de suppression", { description: err?.message });
    } finally {
      setIsDeletingVehicle(false);
    }
  };

  // Delete intervention handler
  const handleDeleteIntervention = async () => {
    if (!deleteInterventionTarget) return;
    setIsDeletingIntervention(true);
    try {
      const res = await fetch("/api/admin/delete-intervention", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interventionId: deleteInterventionTarget.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Intervention supprimée définitivement");
      setDeleteInterventionTarget(null);
      setInterventions((prev) => prev.filter((i) => i.id !== deleteInterventionTarget.id));
    } catch (err: any) {
      toast.error("Erreur de suppression", { description: err?.message });
    } finally {
      setIsDeletingIntervention(false);
    }
  };

  // UUID invalide
  if (!isValidUUID(vehicleId)) {
    return (
      <div className="text-center py-20">
        <Truck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-slate-700">ID invalide</h2>
        <p className="text-slate-500 mt-2">L&apos;identifiant du véhicule est invalide.</p>
        <Button variant="outline" className="mt-6" onClick={() => router.push("/parc")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour au parc
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
        <p className="ml-3 text-slate-600">Chargement...</p>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="text-center py-20">
        <Truck className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-slate-700">Vehicule non trouve</h2>
        <p className="text-slate-500 mt-2">Ce vehicule n&apos;existe pas ou a ete supprime.</p>
        <Button variant="outline" className="mt-6" onClick={() => router.push("/parc")}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour au parc
        </Button>
      </div>
    );
  }

  const controls = VEHICLE_CONTROLS[vehicle.type] || {
    requiresCT: true,
    requiresTachy: true,
    requiresATP: true,
  };

  const ctStatus = getDateStatus(vehicle.date_ct);
  const tachyStatus = getDateStatus(vehicle.date_tachy);
  const atpStatus = getDateStatus(vehicle.date_atp);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/parc")}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-900 font-mono">
                {vehicle.immat}
              </h1>
              <Badge variant="outline" className="text-sm font-medium">
                {vehicle.type}
              </Badge>
              <Badge
                variant="outline"
                className={
                  vehicle.status === "actif"
                    ? "border-green-300 bg-green-50 text-green-700"
                    : vehicle.status === "maintenance"
                    ? "border-orange-300 bg-orange-50 text-orange-700"
                    : "border-slate-300 bg-slate-50 text-slate-700"
                }
              >
                {vehicle.status}
              </Badge>
            </div>
            <p className="text-slate-600 mt-1">{vehicle.marque}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              try {
                exportVehiclePdf(vehicle, interventions);
                toast.success("PDF exporté");
              } catch (err: any) {
                console.error("[PDF]", err);
                toast.error("Erreur export PDF", { description: err?.message });
              }
            }}
          >
            <FileDown className="w-4 h-4 mr-2" />
            Exporter PDF
          </Button>
          {permissions.canDeleteVehicle && (
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setDeleteVehicleOpen(true)}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Supprimer
            </Button>
          )}
        </div>
      </div>

      {/* Layout 2 colonnes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colonne gauche: Infos vehicule */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="w-5 h-5 text-slate-600" />
              Informations vehicule
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500 mb-1">Immatriculation</p>
                <p className="text-lg font-bold font-mono text-blue-600">{vehicle.immat}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-sm text-slate-500 mb-1">Type</p>
                <p className="text-lg font-semibold">{vehicle.type}</p>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg col-span-2">
                <p className="text-sm text-slate-500 mb-1">Marque / Modele</p>
                <p className="text-lg font-semibold">{vehicle.marque}</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm text-slate-500 mb-3">Controles requis pour ce type</p>
              <div className="flex flex-wrap gap-2">
                {controls.requiresCT && (
                  <Badge variant="outline" className="gap-1">
                    <Shield className="w-3 h-3" />
                    CT annuel
                  </Badge>
                )}
                {controls.requiresTachy && (
                  <Badge variant="outline" className="gap-1">
                    <Gauge className="w-3 h-3" />
                    Tachygraphe
                  </Badge>
                )}
                {controls.requiresATP && (
                  <Badge variant="outline" className="gap-1">
                    <Thermometer className="w-3 h-3" />
                    ATP
                  </Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Colonne droite: Echeances */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-slate-600" />
              Echeances
            </CardTitle>
            <CardDescription>
              Dates de validite des controles reglementaires
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* CT annuel */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white rounded-lg shadow-sm">
                  <Shield className="w-5 h-5 text-slate-600" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">CT annuel</p>
                  <p className="text-sm text-slate-500">
                    {vehicle.date_ct
                      ? format(parseISO(vehicle.date_ct), "d MMMM yyyy", { locale: fr })
                      : "Non defini"}
                  </p>
                </div>
              </div>
              <Badge variant={ctStatus.variant} className={ctStatus.className}>
                {ctStatus.icon}
                <span className="ml-1">{ctStatus.label}</span>
              </Badge>
            </div>

            {/* Tachygraphe */}
            {controls.requiresTachy && (
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Gauge className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">Tachygraphe</p>
                    <p className="text-sm text-slate-500">
                      {vehicle.date_tachy
                        ? format(parseISO(vehicle.date_tachy), "d MMMM yyyy", { locale: fr })
                        : "Non defini"}
                    </p>
                  </div>
                </div>
                <Badge variant={tachyStatus.variant} className={tachyStatus.className}>
                  {tachyStatus.icon}
                  <span className="ml-1">{tachyStatus.label}</span>
                </Badge>
              </div>
            )}

            {/* ATP */}
            {controls.requiresATP && (
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Thermometer className="w-5 h-5 text-slate-600" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-900">ATP (Frigo)</p>
                    <p className="text-sm text-slate-500">
                      {vehicle.date_atp
                        ? format(parseISO(vehicle.date_atp), "d MMMM yyyy", { locale: fr })
                        : "Non defini"}
                    </p>
                  </div>
                </div>
                <Badge variant={atpStatus.variant} className={atpStatus.className}>
                  {atpStatus.icon}
                  <span className="ml-1">{atpStatus.label}</span>
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabs: Interventions / Details */}
      <Tabs defaultValue="interventions" className="w-full">
        <TabsList>
          <TabsTrigger value="interventions" className="gap-2">
            <Wrench className="w-4 h-4" />
            Interventions ({interventions.length})
          </TabsTrigger>
          <TabsTrigger value="details" className="gap-2">
            <FileText className="w-4 h-4" />
            Details
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-2">
            <FileText className="w-4 h-4" />
            Documents ({documents.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab Interventions */}
        <TabsContent value="interventions" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Historique des interventions</CardTitle>
              <CardDescription>
                Toutes les interventions de maintenance pour ce vehicule
              </CardDescription>
            </CardHeader>
            <CardContent>
              {interventions.length === 0 ? (
                <div className="text-center py-12">
                  <Wrench className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <p className="text-slate-500 font-medium">Aucune intervention</p>
                  <p className="text-sm text-slate-400 mt-2">
                    Les interventions de maintenance apparaitront ici
                  </p>
                  <Button variant="outline" className="mt-6" asChild>
                    <Link href="/maintenance">
                      Creer une demande
                    </Link>
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Statut</TableHead>
                        <TableHead>Lieu / Garage</TableHead>
                        <TableHead className="text-right">Montant</TableHead>
                        <TableHead>Devis</TableHead>
                        {permissions.canDeleteIntervention && (
                          <TableHead className="text-right">Action</TableHead>
                        )}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {interventions.map((intervention) => {
                        const statusBadge = getInterventionStatusBadge(intervention.status);
                        return (
                          <TableRow key={intervention.id} className="hover:bg-slate-50">
                           <TableCell>
                              <div>
                                  <p className="font-medium">{safeFormatInterventionDate(intervention)}</p>

                                      {intervention.rdv_date && (
                                        <p className="text-xs text-green-600 flex items-center gap-1 mt-1">
                                          <Calendar className="w-3 h-3" />
                                          RDV: {safeFormatRdvDate(intervention.rdv_date) || "-"}
                                        </p>
                                      )}
                              </div>
                            </TableCell>

                            <TableCell>
                              <p className="font-medium text-slate-900">
                                {intervention.description}
                              </p>
                            </TableCell>
                            <TableCell>
                              <Badge className={statusBadge.className}>
                                {statusBadge.label}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-start gap-1">
                                <MapPin className="w-3 h-3 text-slate-400 mt-0.5 shrink-0" />
                                <span className="text-sm text-slate-600">
                                  {intervention.rdv_lieu || intervention.garage || "-"}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="font-semibold">
                                {(intervention.montant || 0).toLocaleString()} EUR
                              </span>
                            </TableCell>
                            <TableCell>
                              {intervention.devis_path ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="gap-1 text-blue-700 border-blue-300 hover:bg-blue-50"
                                  onClick={() => handleDownloadDevis(intervention)}
                                  disabled={downloading === intervention.id}
                                >
                                  {downloading === intervention.id ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Download className="w-4 h-4" />
                                  )}
                                  PDF
                                </Button>
                              ) : (
                                <span className="text-xs text-slate-400">—</span>
                              )}
                            </TableCell>
                            {permissions.canDeleteIntervention && (
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => setDeleteInterventionTarget(intervention)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Details */}
        <TabsContent value="details" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Details techniques</CardTitle>
              <CardDescription>
                Informations complementaires sur le vehicule
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-500">Identifiant unique</p>
                    <p className="font-mono text-sm text-slate-700">{vehicle.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Date d&apos;ajout au parc</p>
                    <p className="font-medium">
                      {vehicle.created_at
                        ? format(parseISO(vehicle.created_at), "d MMMM yyyy 'a' HH:mm", { locale: fr })
                        : "Non disponible"}
                    </p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-slate-500">Nombre total d&apos;interventions</p>
                    <p className="text-2xl font-bold">{interventions.length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-500">Coût total maintenance</p>
                    <p className="text-2xl font-bold">
                      {interventions.reduce((sum, i) => sum + (i.montant || 0), 0).toLocaleString()} EUR
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab Documents */}
        <TabsContent value="documents" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Documents</CardTitle>
              <CardDescription>
                Pièces jointes du véhicule (carte grise, photos, etc.)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <DocumentUpload
                entityType="vehicle"
                entityId={vehicle.id}
                documents={documents}
                onChange={fetchDocuments}
                canDelete={permissions.canEditVehicle}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialog Confirm Delete Vehicle */}
      <Dialog open={deleteVehicleOpen} onOpenChange={setDeleteVehicleOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Supprimer le véhicule</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer définitivement{" "}
              <strong className="text-slate-900">{vehicle?.immat}</strong> ?
              <br /><br />
              Cette action est <strong>irréversible</strong>. Toutes les interventions
              liées ({interventions.length}) et leurs devis seront également supprimés.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setDeleteVehicleOpen(false)} disabled={isDeletingVehicle}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteVehicle} disabled={isDeletingVehicle}>
              {isDeletingVehicle && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Supprimer définitivement
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirm Delete Intervention */}
      <Dialog open={!!deleteInterventionTarget} onOpenChange={(open) => { if (!open) setDeleteInterventionTarget(null); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Supprimer l&apos;intervention</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer définitivement cette intervention ?
              <br /><br />
              <strong className="text-slate-900">{deleteInterventionTarget?.description}</strong>
              <br />
              Cette action est <strong>irréversible</strong>.
              {deleteInterventionTarget?.devis_path && " Le devis PDF associé sera aussi supprimé."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setDeleteInterventionTarget(null)} disabled={isDeletingIntervention}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteIntervention} disabled={isDeletingIntervention}>
              {isDeletingIntervention && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Supprimer définitivement
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
