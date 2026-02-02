"use client";

import React, { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  Eye,
  Pencil,
  Plus,
  Loader2,
  History,
  Wrench,
  Trash2,
  FileDown,
  ChevronUp,
  ChevronDown,
  Search,
} from "lucide-react";
import { useSort } from "@/lib/useSort";
import { useDebounce } from "@/lib/useDebounce";
import { differenceInDays, isPast, parseISO } from "date-fns";
import {
  supabase,
  type Vehicle,
  type VehicleType,
  type Intervention,
  VEHICLE_CONTROLS,
} from "@/lib/supabase";
import { toast } from "sonner";
import { RoleSwitcher, useRole } from "@/components/RoleSwitcher";
import { getPermissions } from "@/lib/role";
import { exportControlsPdf } from "@/lib/pdf";
import { exportVehiclesCsv, exportControlsCsv } from "@/lib/export";

const today = new Date();

// Fonction helper pour determiner la couleur du badge selon la date
function getStatusColor(dateString: string | null): {
  variant: "destructive" | "default" | "secondary";
  className?: string;
  showAlert: boolean;
  isCritical: boolean;
} {
  if (!dateString) {
    return {
      variant: "secondary",
      className: "bg-slate-200 text-slate-600",
      showAlert: false,
      isCritical: false,
    };
  }

  const date = parseISO(dateString);
  const daysUntil = differenceInDays(date, today);

  // Date passee ou < 7 jours : CRITIQUE (Rouge)
  if (isPast(date) || daysUntil < 7) {
    return {
      variant: "destructive",
      showAlert: true,
      isCritical: true,
    };
  }

  // Date < 30 jours : ATTENTION (Orange)
  if (daysUntil < 30) {
    return {
      variant: "default",
      className: "bg-orange-500 hover:bg-orange-600 text-white",
      showAlert: true,
      isCritical: false,
    };
  }

  // Sinon : OK (Vert/Gris)
  return {
    variant: "secondary",
    className: "bg-green-100 text-green-800 hover:bg-green-200",
    showAlert: false,
    isCritical: false,
  };
}

// Fonction pour formater la date
function formatDate(dateString: string | null): string {
  if (!dateString) return "Non defini";

  const date = parseISO(dateString);
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// Fonction pour obtenir le label du badge avec le nombre de jours
function getDateLabel(dateString: string | null): string {
  if (!dateString) return "Non defini";

  const date = parseISO(dateString);
  const daysUntil = differenceInDays(date, today);

  if (isPast(date)) {
    return `${formatDate(dateString)} (PERIME)`;
  }

  if (daysUntil < 30) {
    return `${formatDate(dateString)} (${daysUntil}j)`;
  }

  return formatDate(dateString);
}

// Verifie si un vehicule est critique
function isVehicleCritical(vehicle: Vehicle): boolean {
  const datesToCheck = [vehicle.date_ct, vehicle.date_tachy, vehicle.date_atp];
  for (const dateStr of datesToCheck) {
    if (dateStr) {
      const date = parseISO(dateStr);
      if (isPast(date) || differenceInDays(date, today) < 7) {
        return true;
      }
    }
  }
  return false;
}

export default function ParcClient() {
  const searchParams = useSearchParams();
  const filterParam = searchParams.get("filter");
  const router = useRouter();

  const { role, setRole } = useRole();
  const permissions = getPermissions(role);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [allInterventions, setAllInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // View/Edit modals
  const [viewVehicle, setViewVehicle] = useState<Vehicle | null>(null);
  const [viewOpen, setViewOpen] = useState(false);
  const [editVehicle, setEditVehicle] = useState<Vehicle | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  // Delete confirmation
  const [deleteVehicle, setDeleteVehicle] = useState<Vehicle | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);

  // Form state for create
  const [formData, setFormData] = useState({
    immat: "",
    marque: "",
    type: "" as VehicleType | "",
    date_ct: "",
    date_tachy: "",
    date_atp: "",
    status: "actif" as Vehicle["status"],
  });

  // Edit form state
  const [editFormData, setEditFormData] = useState({
    immat: "",
    marque: "",
    type: "" as VehicleType,
    date_ct: "",
    date_tachy: "",
    date_atp: "",
    status: "actif" as Vehicle["status"],
  });

  // Recuperer les controles requis selon le type selectionne
  const controls = formData.type ? VEHICLE_CONTROLS[formData.type] : null;
  const editControls = editFormData.type
    ? VEHICLE_CONTROLS[editFormData.type]
    : null;

  // Recuperer les vehicules depuis Supabase
  const fetchVehicles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("vehicles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setVehicles(data || []);
    } catch (error) {
      console.error("Erreur lors de la recuperation des vehicules:", error);
      toast.error("Impossible de charger les vehicules");
    } finally {
      setLoading(false);
    }
  };

  const fetchInterventions = async () => {
    const { data } = await supabase
      .from("interventions")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setAllInterventions(data as Intervention[]);
  };

  // Charger les vehicules au montage du composant
  useEffect(() => {
    fetchVehicles();
    fetchInterventions();
  }, []);

  // Filtrer selon le parametre URL + recherche
  const getFilteredVehicles = () => {
    let result = vehicles;
    
    // Filtre URL (critiques)
    if (filterParam === "critical") {
      result = result.filter(isVehicleCritical);
    }
    
    // Recherche textuelle
    if (debouncedSearch.trim()) {
      const query = debouncedSearch.toLowerCase().trim();
      result = result.filter(
        (v) =>
          v.immat.toLowerCase().includes(query) ||
          v.marque.toLowerCase().includes(query) ||
          v.type.toLowerCase().includes(query)
      );
    }
    
    return result;
  };

  // Creer un nouveau vehicule
  const handleCreateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!formData.type) {
        toast.error("Type de vehicule requis");
        setIsSubmitting(false);
        return;
      }

      // Récupérer l'utilisateur courant
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Vous devez être connecté");
        setIsSubmitting(false);
        return;
      }

      // Récupérer l'organization_id de l'utilisateur
      const { data: profile } = await supabase
        .from("profiles")
        .select("current_organization_id")
        .eq("id", user.id)
        .single();

      const vehicleData = {
        immat: formData.immat.toUpperCase(),
        marque: formData.marque,
        type: formData.type,
        date_ct: formData.date_ct || null,
        date_tachy: formData.date_tachy || null,
        date_atp: formData.date_atp || null,
        status: formData.status,
        organization_id: profile?.current_organization_id,
        created_by: user.id,
      };

      const { error } = await supabase.from("vehicles").insert([vehicleData]);

      if (error) throw error;

      toast.success("Vehicule ajoute", {
        description: `${formData.immat} a ete ajoute au parc`,
      });

      await fetchVehicles();

      setFormData({
        immat: "",
        marque: "",
        type: "",
        date_ct: "",
        date_tachy: "",
        date_atp: "",
        status: "actif",
      });
      setIsDialogOpen(false);
    } catch (error: any) {
      console.error("Erreur complete:", error);
      toast.error("Erreur d'ajout", {
        description: error?.message || "Impossible d'ajouter le vehicule",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Ouvrir modal view
  const openViewModal = (vehicle: Vehicle) => {
    setViewVehicle(vehicle);
    setViewOpen(true);
  };

  // Ouvrir modal edit
  const openEditModal = (vehicle: Vehicle) => {
    setEditVehicle(vehicle);
    setEditFormData({
      immat: vehicle.immat,
      marque: vehicle.marque,
      type: vehicle.type,
      date_ct: vehicle.date_ct || "",
      date_tachy: vehicle.date_tachy || "",
      date_atp: vehicle.date_atp || "",
      status: vehicle.status,
    });
    setEditOpen(true);
  };

  // Sauvegarder modifications
  const handleUpdateVehicle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editVehicle) return;

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("vehicles")
        .update({
          immat: editFormData.immat.toUpperCase(),
          marque: editFormData.marque,
          type: editFormData.type,
          date_ct: editFormData.date_ct || null,
          date_tachy: editFormData.date_tachy || null,
          date_atp: editFormData.date_atp || null,
          status: editFormData.status,
        })
        .eq("id", editVehicle.id);

      if (error) throw error;

      toast.success("Vehicule mis a jour");
      await fetchVehicles();
      setEditOpen(false);
    } catch (error: any) {
      toast.error("Erreur de mise a jour", {
        description: error?.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Supprimer un vehicule
  const handleDeleteVehicle = async () => {
    if (!deleteVehicle) return;
    setIsDeleting(true);
    try {
      const res = await fetch("/api/admin/delete-vehicle", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vehicleId: deleteVehicle.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Véhicule supprimé", {
        description: `${deleteVehicle.immat} a été supprimé définitivement${
          json.deletedInterventions > 0
            ? ` (${json.deletedInterventions} intervention(s) supprimée(s))`
            : ""
        }`,
      });
      setDeleteOpen(false);
      setDeleteVehicle(null);
      await fetchVehicles();
      await fetchInterventions();
    } catch (err: any) {
      toast.error("Erreur de suppression", { description: err?.message });
    } finally {
      setIsDeleting(false);
    }
  };

  // Historique interventions pour un vehicule
  const getVehicleInterventions = (immat: string) => {
    return allInterventions.filter((i) => i.immat === immat);
  };

  // Statistiques + Tri
  const filteredVehicles = getFilteredVehicles();
  const vehiculesCritiques = vehicles.filter(isVehicleCritical).length;
  
  // Hook de tri pour le tableau
  const { sortedData: sortedVehicles, requestSort, getSortIndicator } = useSort(filteredVehicles, {
    key: "created_at",
    direction: "desc",
  });

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Mon Parc</h1>
          <p className="text-slate-600 mt-2">
            Gestion de vos {vehicles.length} vehicules
            {filterParam === "critical" && (
              <Badge variant="destructive" className="ml-2">
                Filtre: Critiques uniquement
              </Badge>
            )}
          </p>
        </div>

        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-64"
            />
          </div>
          
          <Button
            variant="outline"
            onClick={() => {
              try {
                exportControlsPdf(vehicles);
                toast.success("PDF contrôles exporté");
              } catch (err: unknown) {
                console.error("[PDF]", err);
                toast.error("Erreur export PDF");
              }
            }}
            disabled={vehicles.length === 0}
          >
            <FileDown className="w-4 h-4 mr-2" />
            PDF
          </Button>
          
          <Button
            variant="outline"
            onClick={() => {
              try {
                exportVehiclesCsv(sortedVehicles);
                toast.success("CSV exporté");
              } catch (err: unknown) {
                console.error("[CSV]", err);
                toast.error("Erreur export CSV");
              }
            }}
            disabled={sortedVehicles.length === 0}
          >
            <FileDown className="w-4 h-4 mr-2" />
            CSV
          </Button>

          <RoleSwitcher onRoleChange={setRole} />

          {/* Dialog Ajouter un vehicule */}
          {permissions.canEditVehicle && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Ajouter un vehicule
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Nouveau vehicule</DialogTitle>
                  <DialogDescription>
                    Ajoutez un vehicule a votre parc automobile
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateVehicle} className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="immat">
                      Immatriculation <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="immat"
                      placeholder="AB-123-CD"
                      value={formData.immat}
                      onChange={(e) =>
                        setFormData({ ...formData, immat: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="marque">
                      Marque et modele <span className="text-red-600">*</span>
                    </Label>
                    <Input
                      id="marque"
                      placeholder="Renault Trucks D 12T"
                      value={formData.marque}
                      onChange={(e) =>
                        setFormData({ ...formData, marque: e.target.value })
                      }
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="type">
                      Type de vehicule <span className="text-red-600">*</span>
                    </Label>
                    <select
                      id="type"
                      className="w-full px-3 py-2 border border-slate-200 rounded-md"
                      value={formData.type}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          type: e.target.value as VehicleType,
                        })
                      }
                      required
                    >
                      <option value="">Selectionnez un type...</option>
                      <option value="Porteur">Porteur</option>
                      <option value="Remorque">Remorque</option>
                      <option value="Tracteur">Tracteur</option>
                    </select>
                  </div>

                  {/* Champs de dates conditionnels selon le type */}
                  {formData.type && (
                    <>
                      {controls?.requiresCT && (
                        <div className="space-y-2">
                          <Label htmlFor="date_ct">Date CT annuel</Label>
                          <Input
                            id="date_ct"
                            type="date"
                            value={formData.date_ct}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                date_ct: e.target.value,
                              })
                            }
                          />
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        {controls?.requiresTachy && (
                          <div className="space-y-2">
                            <Label htmlFor="date_tachy">Date Tachygraphe</Label>
                            <Input
                              id="date_tachy"
                              type="date"
                              value={formData.date_tachy}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  date_tachy: e.target.value,
                                })
                              }
                            />
                          </div>
                        )}

                        {controls?.requiresATP && (
                          <div className="space-y-2">
                            <Label htmlFor="date_atp">Date ATP</Label>
                            <Input
                              id="date_atp"
                              type="date"
                              value={formData.date_atp}
                              onChange={(e) =>
                                setFormData({
                                  ...formData,
                                  date_atp: e.target.value,
                                })
                              }
                            />
                          </div>
                        )}
                      </div>
                    </>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="status">Statut</Label>
                    <select
                      id="status"
                      className="w-full px-3 py-2 border border-slate-200 rounded-md"
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: e.target.value as Vehicle["status"],
                        })
                      }
                    >
                      <option value="actif">Actif</option>
                      <option value="maintenance">En maintenance</option>
                      <option value="garage">Au garage</option>
                    </select>
                  </div>

                  <div className="flex justify-end gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsDialogOpen(false)}
                      disabled={isSubmitting}
                    >
                      Annuler
                    </Button>
                    <Button type="submit" disabled={isSubmitting || !formData.type}>
                      {isSubmitting && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      Enregistrer
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Alerte si vehicules critiques */}
      {vehiculesCritiques > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600" />
              <div>
                <p className="font-semibold text-red-900">
                  {vehiculesCritiques} vehicule{vehiculesCritiques > 1 ? "s" : ""}{" "}
                  necessite{vehiculesCritiques > 1 ? "nt" : ""} une attention
                  immediate
                </p>
                <p className="text-sm text-red-700">
                  Controles a echeance critique (CT annuel, Tachygraphe ou ATP)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tableau des vehicules */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des vehicules</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              <p className="ml-3 text-slate-600">Chargement des vehicules...</p>
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-500 font-medium">
                Aucun vehicule dans le parc
              </p>
              <p className="text-sm text-slate-400 mt-2">
                Cliquez sur &quot;Ajouter un vehicule&quot; pour commencer
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      onClick={() => requestSort("immat")}
                      className="flex items-center gap-1 font-semibold hover:text-blue-600 transition-colors"
                    >
                      Vehicule
                      {getSortIndicator("immat") === "asc" && <ChevronUp className="w-4 h-4" />}
                      {getSortIndicator("immat") === "desc" && <ChevronDown className="w-4 h-4" />}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => requestSort("type")}
                      className="flex items-center gap-1 font-semibold hover:text-blue-600 transition-colors"
                    >
                      Type
                      {getSortIndicator("type") === "asc" && <ChevronUp className="w-4 h-4" />}
                      {getSortIndicator("type") === "desc" && <ChevronDown className="w-4 h-4" />}
                    </button>
                  </TableHead>
                  <TableHead>CT annuel</TableHead>
                  <TableHead>Tachy</TableHead>
                  <TableHead>ATP</TableHead>
                  <TableHead>
                    <button
                      onClick={() => requestSort("status")}
                      className="flex items-center gap-1 font-semibold hover:text-blue-600 transition-colors"
                    >
                      Statut
                      {getSortIndicator("status") === "asc" && <ChevronUp className="w-4 h-4" />}
                      {getSortIndicator("status") === "desc" && <ChevronDown className="w-4 h-4" />}
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedVehicles.map((vehicle) => {
                  const ctStatus = getStatusColor(vehicle.date_ct);
                  const tachyStatus = getStatusColor(vehicle.date_tachy);
                  const atpStatus = getStatusColor(vehicle.date_atp);
                  const vehicleControls = VEHICLE_CONTROLS[vehicle.type] || {
                    requiresCT: true,
                    requiresTachy: true,
                    requiresATP: true,
                  };

                  return (
                    <TableRow
                      key={vehicle.id}
                      className="cursor-pointer hover:bg-slate-50"
                      onClick={() => router.push(`/parc/${vehicle.id}`)}
                    >
                      {/* Vehicule */}
                      <TableCell>
                        <div>
                          <p className="font-semibold text-blue-600 font-mono">
                            {vehicle.immat}
                          </p>
                          <p className="text-sm text-slate-500">
                            {vehicle.marque}
                          </p>
                        </div>
                      </TableCell>

                      {/* Type */}
                      <TableCell>
                        <Badge variant="outline" className="font-medium">
                          {vehicle.type}
                        </Badge>
                      </TableCell>

                      {/* CT annuel */}
                      <TableCell>
                        <Badge
                          variant={ctStatus.variant}
                          className={ctStatus.className}
                        >
                          {ctStatus.showAlert && (
                            <AlertTriangle className="w-3 h-3 mr-1" />
                          )}
                          {getDateLabel(vehicle.date_ct)}
                        </Badge>
                      </TableCell>

                      {/* Tachy */}
                      <TableCell>
                        {vehicleControls.requiresTachy ? (
                          <Badge
                            variant={tachyStatus.variant}
                            className={tachyStatus.className}
                          >
                            {tachyStatus.showAlert && (
                              <AlertTriangle className="w-3 h-3 mr-1" />
                            )}
                            {getDateLabel(vehicle.date_tachy)}
                          </Badge>
                        ) : (
                          <span className="text-slate-400 text-sm">N/A</span>
                        )}
                      </TableCell>

                      {/* ATP */}
                      <TableCell>
                        {vehicleControls.requiresATP ? (
                          <Badge
                            variant={atpStatus.variant}
                            className={atpStatus.className}
                          >
                            {atpStatus.showAlert && (
                              <AlertTriangle className="w-3 h-3 mr-1" />
                            )}
                            {getDateLabel(vehicle.date_atp)}
                          </Badge>
                        ) : (
                          <span className="text-slate-400 text-sm">N/A</span>
                        )}
                      </TableCell>

                      {/* Statut */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            vehicle.status === "actif"
                              ? "border-green-300 text-green-700"
                              : vehicle.status === "maintenance"
                              ? "border-orange-300 text-orange-700"
                              : "border-slate-300 text-slate-700"
                          }
                        >
                          {vehicle.status}
                        </Badge>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-right">
                        <div
                          className="flex justify-end gap-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openViewModal(vehicle)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {permissions.canEditVehicle && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditModal(vehicle)}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                          )}
                          {permissions.canDeleteVehicle && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() => {
                                setDeleteVehicle(vehicle);
                                setDeleteOpen(true);
                              }}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Sheet View Vehicle */}
      <Sheet open={viewOpen} onOpenChange={setViewOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="font-mono text-blue-600 text-xl">
              {viewVehicle?.immat}
            </SheetTitle>
            <SheetDescription>{viewVehicle?.marque}</SheetDescription>
          </SheetHeader>
          {viewVehicle && (
            <div className="mt-6 space-y-6">
              {/* Infos vehicule */}
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900">Informations</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-slate-500">Type</p>
                    <p className="font-medium">{viewVehicle.type}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Statut</p>
                    <Badge
                      variant="outline"
                      className={
                        viewVehicle.status === "actif"
                          ? "border-green-300 text-green-700"
                          : viewVehicle.status === "maintenance"
                          ? "border-orange-300 text-orange-700"
                          : "border-slate-300 text-slate-700"
                      }
                    >
                      {viewVehicle.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-slate-500">CT annuel</p>
                    <p className="font-medium">
                      {formatDate(viewVehicle.date_ct)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Tachygraphe</p>
                    <p className="font-medium">
                      {formatDate(viewVehicle.date_tachy)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">ATP</p>
                    <p className="font-medium">
                      {formatDate(viewVehicle.date_atp)}
                    </p>
                  </div>
                </div>
              </div>

              {/* Historique interventions */}
              <div className="space-y-3">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <History className="w-4 h-4" />
                  Historique interventions
                </h3>
                {getVehicleInterventions(viewVehicle.immat).length === 0 ? (
                  <p className="text-sm text-slate-500">Aucune intervention</p>
                ) : (
                  <div className="space-y-2">
                    {getVehicleInterventions(viewVehicle.immat).map((intervention) => (
                      <div
                        key={intervention.id}
                        className="p-3 bg-slate-50 rounded-lg border"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2">
                            <Wrench className="w-4 h-4 text-slate-400 mt-0.5" />
                            <div>
                              <p className="font-medium text-sm">
                                {intervention.description}
                              </p>
                              <p className="text-xs text-slate-500">
                                {intervention.garage}
                              </p>
                              <p className="text-xs text-slate-400">
                                {intervention.date_creation
                                  ? new Date(intervention.date_creation).toLocaleDateString("fr-FR")
                                  : "-"}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-sm">
                              {intervention.montant} EUR
                            </p>
                            <Badge
                              variant="outline"
                              className={
                                intervention.status === "completed"
                                  ? "bg-slate-100 text-slate-600"
                                  : intervention.status === "rejected"
                                  ? "bg-red-100 text-red-700"
                                  : intervention.status === "planned"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-orange-100 text-orange-700"
                              }
                            >
                              {intervention.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Dialog Confirm Delete Vehicle */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Supprimer le véhicule</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer définitivement le véhicule{" "}
              <strong className="text-slate-900">{deleteVehicle?.immat}</strong> ?
              <br />
              <br />
              Cette action est <strong>irréversible</strong>. Toutes les interventions
              liées et leurs devis seront également supprimés.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={isDeleting}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteVehicle}
              disabled={isDeleting}
            >
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Supprimer définitivement
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog Edit Vehicle */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Modifier le vehicule</DialogTitle>
            <DialogDescription>{editVehicle?.immat}</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateVehicle} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-immat">Immatriculation</Label>
              <Input
                id="edit-immat"
                value={editFormData.immat}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, immat: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-marque">Marque et modele</Label>
              <Input
                id="edit-marque"
                value={editFormData.marque}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, marque: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-type">Type</Label>
              <select
                id="edit-type"
                className="w-full px-3 py-2 border border-slate-200 rounded-md"
                value={editFormData.type}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    type: e.target.value as VehicleType,
                  })
                }
                required
              >
                <option value="Porteur">Porteur</option>
                <option value="Remorque">Remorque</option>
                <option value="Tracteur">Tracteur</option>
              </select>
            </div>

            {editControls?.requiresCT && (
              <div className="space-y-2">
                <Label htmlFor="edit-date_ct">Date CT annuel</Label>
                <Input
                  id="edit-date_ct"
                  type="date"
                  value={editFormData.date_ct}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      date_ct: e.target.value,
                    })
                  }
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {editControls?.requiresTachy && (
                <div className="space-y-2">
                  <Label htmlFor="edit-date_tachy">Date Tachygraphe</Label>
                  <Input
                    id="edit-date_tachy"
                    type="date"
                    value={editFormData.date_tachy}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        date_tachy: e.target.value,
                      })
                    }
                  />
                </div>
              )}

              {editControls?.requiresATP && (
                <div className="space-y-2">
                  <Label htmlFor="edit-date_atp">Date ATP</Label>
                  <Input
                    id="edit-date_atp"
                    type="date"
                    value={editFormData.date_atp}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        date_atp: e.target.value,
                      })
                    }
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-status">Statut</Label>
              <select
                id="edit-status"
                className="w-full px-3 py-2 border border-slate-200 rounded-md"
                value={editFormData.status}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    status: e.target.value as Vehicle["status"],
                  })
                }
              >
                <option value="actif">Actif</option>
                <option value="maintenance">En maintenance</option>
                <option value="garage">Au garage</option>
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditOpen(false)}
                disabled={isSubmitting}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
