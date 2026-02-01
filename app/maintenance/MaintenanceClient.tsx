"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase, type Intervention } from "@/lib/supabase";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Separator } from "@/components/ui/separator";

import {
  Check,
  X,
  Plus,
  Wrench,
  Building2,
  Euro,
  Calendar,
  History,
  FileText,
  Download,
  Loader2,
  Trash2,
  MapPin,
  Timer,
  Hash,
  FileDown,
  ArrowUpDown,
} from "lucide-react";
import { useSort } from "@/lib/useSort";
import { toast } from "sonner";
import { type InterventionStatus } from "@/lib/supabase";
import { INTERVENTIONS as MOCK_INTERVENTIONS } from "@/lib/data";
import { RoleSwitcher, useRole } from "@/components/RoleSwitcher";
import { exportRepairsPdf } from "@/lib/pdf";
import { exportInterventionsCsv } from "@/lib/export";
import { CommentSection } from "@/components/CommentSection";
import { getPermissions } from "@/lib/role";

type VehicleLite = {
  id: string;
  immat: string;
  marque?: string | null;
  type?: string | null;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const DEVIS_BUCKET = "devis-interventions";

async function sendNotify(
  type: string,
  interventionId: string,
  extra?: Record<string, any>
) {
  try {
    const res = await fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, interventionId, extra }),
    });
    const data = await res.json();
    if (!data.success) {
      console.warn("[NOTIFY] Échec:", data.message);
    } else {
    }
  } catch (err) {
    console.error("[NOTIFY] Erreur réseau:", err);
  }
}

function getStatusBadge(status: InterventionStatus) {
  switch (status) {
    case "pending":
      return {
        label: "En attente validation",
        variant: "default" as const,
        className: "bg-orange-500 hover:bg-orange-600 text-white",
      };
    case "approved_waiting_rdv":
      return {
        label: "Validé - RDV à planifier",
        variant: "default" as const,
        className: "bg-blue-500 hover:bg-blue-600 text-white",
      };
    case "planned":
      return {
        label: "RDV planifié",
        variant: "default" as const,
        className: "bg-green-600 hover:bg-green-700 text-white",
      };
    case "completed":
      return {
        label: "Terminé",
        variant: "secondary" as const,
        className: "bg-slate-500 text-white",
      };
    case "rejected":
      return {
        label: "Refusé",
        variant: "destructive" as const,
        className: "bg-red-600 hover:bg-red-700 text-white",
      };
    default:
      return {
        label: String(status),
        variant: "secondary" as const,
        className: "bg-slate-300 text-slate-900",
      };
  }
}

export default function MaintenanceClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") || "all";

  const { role, setRole } = useRole();
  const permissions = getPermissions(role);

  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [vehicles, setVehicles] = useState<VehicleLite[]>([]);
  const [loading, setLoading] = useState(true);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(initialTab);

  // Form Nouvelle Demande
  const [newVehicule, setNewVehicule] = useState("");
  const [newImmat, setNewImmat] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newGarage, setNewGarage] = useState("");
  const [newMontant, setNewMontant] = useState<string>("0");
  const [newVehicleId, setNewVehicleId] = useState<string | null>(null);
  const [devisFile, setDevisFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Modal RDV
  const [rdvModalOpen, setRdvModalOpen] = useState(false);
  const [selectedIntervention, setSelectedIntervention] = useState<Intervention | null>(null);
  const [rdvDate, setRdvDate] = useState("");
  const [rdvTime, setRdvTime] = useState("");
  const [rdvLieu, setRdvLieu] = useState("");

  // Detail sheet
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailIntervention, setDetailIntervention] = useState<Intervention | null>(null);

  // Download state
  const [downloading, setDownloading] = useState<string | null>(null);

  // Reject dialog
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<Intervention | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Delete intervention dialog
  const [deleteTarget, setDeleteTarget] = useState<Intervention | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ---------- Data fetching ----------
  const fetchVehicles = useCallback(async () => {
    const { data, error } = await supabase
      .from("vehicles")
      .select("id, immat, marque, type")
      .order("immat", { ascending: true });

    if (error) {
      console.error("Erreur chargement vehicles:", error);
      return;
    }
    setVehicles((data || []) as VehicleLite[]);
  }, []);

  const fetchInterventions = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from("interventions")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erreur Supabase:", error);
        const mockData = MOCK_INTERVENTIONS.map((m: any) => ({
          ...m,
          date_creation: m.dateCreation,
        }));
        setInterventions(mockData as unknown as Intervention[]);
        toast.error("DB non disponible - Mode démo");
        return;
      }

      if (!data || data.length === 0) {
        setInterventions([]);
      } else {
        setInterventions(data as Intervention[]);
      }
    } catch (err: any) {
      console.error("Erreur chargement interventions:", err);
      const mockData = MOCK_INTERVENTIONS.map((m: any) => ({
        ...m,
        date_creation: m.dateCreation,
      }));
      setInterventions(mockData as unknown as Intervention[]);
      toast.error("Erreur de chargement - Mode démo");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchVehicles();
    fetchInterventions();
  }, [fetchVehicles, fetchInterventions]);

  // Gérer le paramètre ?edit=xxx pour ouvrir directement une intervention
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId && interventions.length > 0) {
      const intervention = interventions.find(i => i.id === editId);
      if (intervention) {
        // Ouvrir le detail sheet
        setDetailIntervention(intervention);
        setDetailOpen(true);
        // Nettoyer l'URL
        router.replace("/maintenance", { scroll: false });
      }
    }
  }, [searchParams, interventions, router]);

  // Auto-match vehicle_id
  const matchedVehicle = useMemo(() => {
    const immat = newImmat.trim();
    if (!immat) return null;
    return vehicles.find((v) => v.immat?.toLowerCase() === immat.toLowerCase()) || null;
  }, [newImmat, vehicles]);

  useEffect(() => {
    if (matchedVehicle) {
      setNewVehicleId(matchedVehicle.id);
      if (!newVehicule.trim()) {
        const label = [matchedVehicle.marque, matchedVehicle.type].filter(Boolean).join(" - ");
        setNewVehicule(label || "");
      }
    } else {
      setNewVehicleId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchedVehicle]);

  // Stats
  const pendingCount = interventions.filter((i: unknown) => (i as Intervention).status === "pending").length;
  const waitingRdvCount = interventions.filter((i: unknown) => (i as Intervention).status === "approved_waiting_rdv").length;
  const plannedCount = interventions.filter((i: unknown) => (i as Intervention).status === "planned").length;
  const completedCount = interventions.filter((i: unknown) => (i as Intervention).status === "completed").length;
  const rejectedCount = interventions.filter((i: unknown) => (i as Intervention).status === "rejected").length;
  const historyCount = completedCount + rejectedCount;

  const getFilteredInterventions = () => {
    switch (activeTab) {
      case "validation":
        return interventions.filter((i: unknown) => (i as Intervention).status === "pending");
      case "planning":
        return interventions.filter((i: unknown) => (i as Intervention).status === "approved_waiting_rdv");
      case "planned":
        return interventions.filter((i: unknown) => (i as Intervention).status === "planned");
      case "history":
        return interventions.filter((i: unknown) => ["completed", "rejected"].includes((i as Intervention).status));
      default:
        return interventions.filter((i: unknown) => !["completed", "rejected"].includes((i as Intervention).status));
    }
  };
  
  // Tri des interventions
  const filteredInterventions = getFilteredInterventions();
  const { sortedData: sortedInterventions, requestSort, getSortIndicator } = useSort(filteredInterventions, {
    key: "created_at",
    direction: "desc",
  });

  // ---------- Devis upload helper ----------
  async function uploadDevis(
    interventionId: string,
    file: File
  ): Promise<{ ok: boolean; path?: string }> {
    const timestamp = Date.now();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const storagePath = `interventions/${interventionId}/${timestamp}-${safeName}`;

    const { error: uploadError } = await supabase.storage
      .from(DEVIS_BUCKET)
      .upload(storagePath, file, {
        contentType: file.type || "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.error("[UPLOAD] error", uploadError);
      toast.error("Erreur upload devis", { description: uploadError.message });
      return { ok: false };
    }

    const { error: updateError } = await supabase
      .from("interventions")
      .update({
        devis_path: storagePath,
        devis_filename: file.name,
        devis_uploaded_at: new Date().toISOString(),
      })
      .eq("id", interventionId);

    if (updateError) {
      console.error("[DEVIS] Update intervention error:", updateError);
      toast.error("Devis uploadé mais erreur enregistrement", { description: updateError.message });
      return { ok: false };
    }

    return { ok: true, path: storagePath };
  }

  // ---------- Devis download ----------
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

  // ---------- Create intervention ----------
  const handleCreateIntervention = async () => {
    try {
      const vehicule = newVehicule.trim();
      const immat = newImmat.trim();
      const description = newDescription.trim();
      const garage = newGarage.trim();

      if (!vehicule || !immat || !description || !garage) {
        toast.error("Veuillez remplir tous les champs");
        return;
      }

      const montantNumber = Number(newMontant || 0);
      if (Number.isNaN(montantNumber) || montantNumber < 0) {
        toast.error("Montant invalide");
        return;
      }

      // Validate devis file if present
      if (devisFile && !devisFile.type.includes("pdf")) {
        toast.error("Le devis doit être un fichier PDF");
        return;
      }

      setIsCreating(true);

      // 1. Insert intervention
      const payload: any = {
        vehicule,
        immat,
        description,
        garage,
        montant: montantNumber,
        status: "pending" as InterventionStatus,
        date_creation: new Date().toISOString(),
        vehicle_id: newVehicleId,
      };

      const { data, error } = await supabase
        .from("interventions")
        .insert(payload)
        .select("*")
        .single();

      if (error) throw error;

      const created = data as Intervention;

      // 2. Upload devis if file selected
      if (devisFile) {
        const result = await uploadDevis(created.id, devisFile);
        if (result.ok && result.path) {
          created.devis_path = result.path;
          created.devis_filename = devisFile.name;
          created.devis_uploaded_at = new Date().toISOString();
        } else if (!result.ok) {
          toast.warning("Intervention créée mais devis non envoyé");
        }
      }

      setInterventions((prev) => [created, ...prev]);

      toast.success("Demande créée", {
        description: devisFile
          ? "Intervention enregistrée avec devis PDF"
          : newVehicleId
          ? "Intervention enregistrée et liée au véhicule"
          : "Intervention enregistrée (immat non trouvée dans le parc)",
      });

      // Notifications (non bloquantes)
      sendNotify("INTERVENTION_CREATED", created.id);
      if (devisFile && created.devis_path) {
        sendNotify("DEVIS_UPLOADED", created.id);
      }

      // Reset
      setIsDialogOpen(false);
      setNewVehicule("");
      setNewImmat("");
      setNewDescription("");
      setNewGarage("");
      setNewMontant("0");
      setNewVehicleId(null);
      setDevisFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";

      // Refetch to get actual devis_path from DB
      fetchInterventions();
    } catch (err: any) {
      console.error("Erreur création intervention:", err);
      toast.error("Impossible de créer l'intervention", { description: err?.message });
    } finally {
      setIsCreating(false);
    }
  };

  // ---------- Other actions ----------
  const handleApproveDevis = async (id: string) => {
    if (!UUID_REGEX.test(id)) {
      toast.error("Mode démo : action non disponible");
      return;
    }

    const { error } = await supabase
      .from("interventions")
      .update({ status: "approved_waiting_rdv" })
      .eq("id", id);

    if (error) {
      console.error("Erreur validation devis:", error);
      toast.error("Erreur validation devis", { description: error.message });
      return;
    }

    setInterventions((prev) =>
      prev.map((it: any) =>
        it.id === id ? { ...it, status: "approved_waiting_rdv" as InterventionStatus } : it
      )
    );
    toast.success("Devis validé", { description: "En attente de planification du RDV" });
    sendNotify("INTERVENTION_APPROVED", id);
  };

  const openRejectModal = (intervention: Intervention) => {
    setRejectTarget(intervention);
    setRejectReason("");
    setRejectModalOpen(true);
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    const id = rejectTarget.id;

    if (!UUID_REGEX.test(id)) {
      toast.error("Mode démo : action non disponible");
      return;
    }

    setRejecting(true);
    try {
      const res = await fetch("/api/interventions/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interventionId: id, reason: rejectReason.trim() || null }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);

      // Update local state
      setInterventions((prev) =>
        prev.map((it) =>
          it.id === id
            ? {
                ...it,
                status: "rejected" as InterventionStatus,
                rejected_reason: rejectReason.trim() || null,
                rejected_at: new Date().toISOString(),
              }
            : it
        )
      );

      toast.success("Devis refusé", {
        description: `"${rejectTarget.description}" — déplacé dans l'historique`,
      });

      sendNotify("INTERVENTION_REJECTED", id);
      setRejectModalOpen(false);
      setRejectTarget(null);
    } catch (err: any) {
      console.error("[REJECT] Erreur:", err);
      toast.error("Erreur lors du refus", { description: err?.message });
    } finally {
      setRejecting(false);
    }
  };

  const openRdvModal = (intervention: Intervention) => {
    setSelectedIntervention(intervention);
    setRdvLieu((intervention as any).garage || "");
    setRdvModalOpen(true);
  };

  const handlePlanRdv = async () => {
    if (!selectedIntervention || !rdvDate || !rdvTime || !rdvLieu) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }

    if (!UUID_REGEX.test(String((selectedIntervention as any).id))) {
      toast.error("Mode démo : action non disponible");
      return;
    }

    const rdvDateTime = `${rdvDate}T${rdvTime}:00`;

    const { error } = await supabase
      .from("interventions")
      .update({
        rdv_date: rdvDateTime,
        rdv_lieu: rdvLieu,
        status: "planned",
      })
      .eq("id", (selectedIntervention as any).id);

    if (error) {
      console.error("Erreur planification:", error);
      toast.error("Erreur lors de la planification", { description: error.message });
      return;
    }

    setInterventions((prev) =>
      prev.map((it: any) =>
        it.id === (selectedIntervention as any).id
          ? { ...it, status: "planned" as InterventionStatus, rdv_date: rdvDateTime, rdv_lieu: rdvLieu }
          : it
      )
    );
    toast.success("RDV planifié");
    sendNotify("RDV_PLANNED", (selectedIntervention as any).id);
    setRdvModalOpen(false);
    setSelectedIntervention(null);
    setRdvDate("");
    setRdvTime("");
    setRdvLieu("");
    router.push("/planning");
    router.refresh();
  };

  const handleComplete = async (id: string) => {
    if (!UUID_REGEX.test(id)) {
      toast.error("Mode démo : action non disponible");
      return;
    }

    const { error } = await supabase
      .from("interventions")
      .update({ status: "completed" })
      .eq("id", id);

    if (error) {
      console.error("Erreur fin intervention:", error);
      toast.error("Erreur lors de la clôture", { description: error.message });
      return;
    }

    toast.success("Intervention terminée", { description: "Déplacée dans l'historique" });
    sendNotify("INTERVENTION_COMPLETED", id);
    await fetchInterventions();
    setActiveTab("history");
  };

  const openDetail = (intervention: Intervention) => {
    setDetailIntervention(intervention);
    setDetailOpen(true);
  };

  // Delete intervention
  const handleDeleteIntervention = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch("/api/admin/delete-intervention", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ interventionId: deleteTarget.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      toast.success("Intervention supprimée définitivement");
      setDeleteTarget(null);
      setInterventions((prev) => prev.filter((i) => i.id !== deleteTarget.id));
    } catch (err: any) {
      toast.error("Erreur de suppression", { description: err?.message });
    } finally {
      setDeleting(false);
    }
  };

  // ---------- Render ----------
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Maintenance</h1>
          <p className="text-slate-600 mt-2">Gestion des interventions et validations</p>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={() => {
              try {
                exportRepairsPdf(filteredInterventions, { title: "Rapport Réparations", filter: activeTab === "history" ? "Historique" : "En cours" });
                toast.success("PDF exporté");
              } catch (err: any) {
                console.error("[PDF]", err);
                toast.error("Erreur export PDF");
              }
            }}
            disabled={sortedInterventions.length === 0}
          >
            <FileDown className="w-4 h-4 mr-2" />
            Exporter PDF
          </Button>

          <RoleSwitcher onRoleChange={setRole} />

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Nouvelle demande
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>Nouvelle demande d&apos;intervention</DialogTitle>
                <DialogDescription>
                  Créez une demande de maintenance pour un véhicule du parc.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="immat">Immatriculation (doit exister dans Vehicles)</Label>
                  <Input
                    id="immat"
                    value={newImmat}
                    onChange={(e) => setNewImmat(e.target.value)}
                    placeholder="Ex: AB-123-CD"
                    list="vehicles-immats"
                  />
                  <datalist id="vehicles-immats">
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.immat} />
                    ))}
                  </datalist>
                  {newImmat.trim() && (
                    <p className="text-xs text-slate-500">
                      {matchedVehicle
                        ? "✓ Véhicule trouvé : liaison vehicle_id OK"
                        : "⚠️ Immat inconnue : intervention non liée au parc"}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vehicule">Véhicule</Label>
                  <Input
                    id="vehicule"
                    value={newVehicule}
                    onChange={(e) => setNewVehicule(e.target.value)}
                    placeholder="Ex: Renault Trucks T - Tracteur"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={newDescription}
                    onChange={(e) => setNewDescription(e.target.value)}
                    placeholder="Ex: Révision 50 000 km"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="garage">Garage</Label>
                  <Input
                    id="garage"
                    value={newGarage}
                    onChange={(e) => setNewGarage(e.target.value)}
                    placeholder="Nom du garage..."
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="montant">Montant estimé (EUR)</Label>
                  <Input
                    id="montant"
                    type="number"
                    value={newMontant}
                    onChange={(e) => setNewMontant(e.target.value)}
                    placeholder="0"
                    min="0"
                  />
                </div>

                {/* Devis PDF upload */}
                {permissions.canUploadDevis && (
                  <div className="space-y-2">
                    <Label htmlFor="devis-pdf">Devis PDF (optionnel)</Label>
                    <div className="flex items-center gap-3">
                      <Input
                        ref={fileInputRef}
                        id="devis-pdf"
                        type="file"
                        accept="application/pdf"
                        onChange={(e) => setDevisFile(e.target.files?.[0] || null)}
                        className="flex-1"
                      />
                      {devisFile && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setDevisFile(null);
                            if (fileInputRef.current) fileInputRef.current.value = "";
                          }}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                    {devisFile && (
                      <p className="text-xs text-blue-600 flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {devisFile.name} ({(devisFile.size / 1024).toFixed(0)} Ko)
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Annuler
                </Button>
                <Button onClick={handleCreateIntervention} disabled={isCreating}>
                  {isCreating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {isCreating ? "Création…" : "Créer la demande"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-orange-100 rounded-lg">
                <Wrench className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{pendingCount}</p>
                <p className="text-sm text-slate-600">À valider</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{waitingRdvCount}</p>
                <p className="text-sm text-slate-600">RDV à planifier</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-green-100 rounded-lg">
                <Check className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">{plannedCount}</p>
                <p className="text-sm text-slate-600">Planifiés</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-slate-100 rounded-lg">
                <Euro className="w-6 h-6 text-slate-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-slate-900">
                  {interventions
                    .filter((i: any) => i.status !== "pending" && i.status !== "rejected")
                    .reduce((sum: number, i: any) => sum + (Number(i.montant) || 0), 0)
                    .toLocaleString()}{" "}
                  EUR
                </p>
                <p className="text-sm text-slate-600">Budget validé</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Onglets */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            Toutes ({interventions.filter((i: any) => !["completed", "rejected"].includes(i.status)).length})
          </TabsTrigger>
          <TabsTrigger value="validation">À valider ({pendingCount})</TabsTrigger>
          <TabsTrigger value="planning">À planifier ({waitingRdvCount})</TabsTrigger>
          <TabsTrigger value="planned">Planifiés ({plannedCount})</TabsTrigger>
          <TabsTrigger value="history">
            <History className="w-4 h-4 mr-1" />
            Historique ({historyCount})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {loading ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-slate-500">Chargement…</p>
              </CardContent>
            </Card>
          ) : sortedInterventions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-slate-500">Aucune intervention dans cette catégorie</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Contrôles de tri */}
              <div className="flex items-center justify-end gap-2 mb-4">
                <span className="text-sm text-slate-500">Trier par:</span>
                <select
                  className="text-sm border border-slate-200 rounded-md px-2 py-1 bg-white dark:bg-slate-800"
                  onChange={(e) => {
                    const [key, direction] = e.target.value.split(":");
                    if (key) requestSort(key as keyof Intervention);
                  }}
                >
                  <option value="created_at:desc">Date création (récent)</option>
                  <option value="created_at:asc">Date création (ancien)</option>
                  <option value="montant:desc">Montant (élevé)</option>
                  <option value="montant:asc">Montant (faible)</option>
                  <option value="immat:asc">Immatriculation (A-Z)</option>
                  <option value="vehicule:asc">Véhicule (A-Z)</option>
                </select>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {sortedInterventions.map((intervention: Intervention) => {
                const statusBadge = getStatusBadge(intervention.status);

                return (
                  <Card
                    key={intervention.id}
                    className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => openDetail(intervention)}
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg">{intervention.vehicule}</CardTitle>
                          <p className="text-sm font-mono font-semibold text-blue-600">
                            {intervention.immat}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {intervention.devis_path && (
                            <Badge variant="outline" className="gap-1 text-blue-600 border-blue-300">
                              <FileText className="w-3 h-3" />
                              PDF
                            </Badge>
                          )}
                          <Badge variant={statusBadge.variant} className={statusBadge.className}>
                            {statusBadge.label}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-4" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-start gap-3">
                        <Wrench className="w-5 h-5 text-slate-400 mt-0.5" />
                        <div>
                          <p className="font-medium text-slate-900">{intervention.description}</p>
                          <p className="text-sm text-slate-500 mt-1">
                            Créé le {intervention.date_creation || "-"}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Building2 className="w-5 h-5 text-slate-400" />
                        <p className="text-sm text-slate-700">{intervention.garage}</p>
                      </div>

                      {intervention.rdv_date && (
                        <div className="flex items-center gap-3 p-2 bg-green-50 rounded-lg">
                          <Calendar className="w-5 h-5 text-green-600" />
                          <div>
                            <p className="text-sm font-medium text-green-800">
                              {new Date(intervention.rdv_date).toLocaleString("fr-FR")}
                            </p>
                            <p className="text-xs text-green-600">{intervention.rdv_lieu}</p>
                          </div>
                        </div>
                      )}

                      <div className="flex items-center gap-3">
                        <Euro className="w-5 h-5 text-slate-400" />
                        <p className="text-lg font-bold text-slate-900">
                          {(Number(intervention.montant) || 0).toLocaleString()} EUR
                        </p>
                      </div>

                      {/* Devis download button */}
                      {intervention.devis_path && permissions.canDownloadDevis && (
                        <div className="pt-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full gap-2 text-blue-700 border-blue-300 hover:bg-blue-50"
                            onClick={() => handleDownloadDevis(intervention)}
                            disabled={downloading === intervention.id}
                          >
                            {downloading === intervention.id ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Download className="w-4 h-4" />
                            )}
                            Télécharger le devis
                            {intervention.devis_filename && (
                              <span className="text-xs text-slate-400 ml-1 truncate max-w-[120px]">
                                ({intervention.devis_filename})
                              </span>
                            )}
                          </Button>
                        </div>
                      )}

                      {/* Action buttons */}
                      {intervention.status === "pending" && permissions.canValidateDevis && (
                        <div className="flex gap-3 pt-4 border-t border-slate-100">
                          <Button
                            variant="default"
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            onClick={() => handleApproveDevis(intervention.id)}
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Valider devis
                          </Button>
                          <Button
                            variant="destructive"
                            className="flex-1"
                            onClick={() => openRejectModal(intervention)}
                          >
                            <X className="w-4 h-4 mr-2" />
                            Refuser
                          </Button>
                        </div>
                      )}

                      {intervention.status === "approved_waiting_rdv" && permissions.canPlanRdv && (
                        <div className="pt-4 border-t border-slate-100">
                          <Button
                            variant="default"
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            onClick={() => openRdvModal(intervention)}
                          >
                            <Calendar className="w-4 h-4 mr-2" />
                            Planifier RDV
                          </Button>
                        </div>
                      )}

                      {intervention.status === "planned" && permissions.canCompleteIntervention && (
                        <div className="pt-4 border-t border-slate-100">
                          <Button variant="default" className="w-full" onClick={() => handleComplete(intervention.id)}>
                            <Check className="w-4 h-4 mr-2" />
                            Terminer l&apos;intervention
                          </Button>
                        </div>
                      )}

                      {permissions.canDeleteIntervention && (
                        <div className="pt-4 border-t border-slate-100">
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => setDeleteTarget(intervention)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Supprimer définitivement
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              </div>
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal Planifier RDV */}
      <Dialog open={rdvModalOpen} onOpenChange={setRdvModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Planifier le RDV</DialogTitle>
            <DialogDescription>
              {(selectedIntervention as any)?.vehicule} - {(selectedIntervention as any)?.immat}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rdv-date">Date</Label>
              <Input id="rdv-date" type="date" value={rdvDate} onChange={(e) => setRdvDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rdv-time">Heure</Label>
              <Input id="rdv-time" type="time" value={rdvTime} onChange={(e) => setRdvTime(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rdv-lieu">Lieu / Adresse</Label>
              <Input id="rdv-lieu" value={rdvLieu} onChange={(e) => setRdvLieu(e.target.value)} placeholder="Adresse du garage" required />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRdvModalOpen(false)}>Annuler</Button>
            <Button onClick={handlePlanRdv}>Confirmer le RDV</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Refuser Devis */}
      <Dialog open={rejectModalOpen} onOpenChange={setRejectModalOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle>Refuser le devis</DialogTitle>
            <DialogDescription>
              {rejectTarget?.vehicule} - {rejectTarget?.immat}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="reject-reason">Motif du refus (optionnel)</Label>
              <Input
                id="reject-reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Ex: Montant trop élevé, devis incomplet…"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setRejectModalOpen(false)}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleRejectConfirm} disabled={rejecting}>
              {rejecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmer le refus
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal Supprimer Intervention */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <DialogContent className="sm:max-w-[420px]">
          <DialogHeader>
            <DialogTitle className="text-red-600">Supprimer l&apos;intervention</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer définitivement cette intervention ?
              <br /><br />
              <strong className="text-slate-900">{deleteTarget?.description}</strong>
              {" — "}{deleteTarget?.immat}
              <br /><br />
              Cette action est <strong>irréversible</strong>.
              {deleteTarget?.devis_path && " Le devis PDF associé sera aussi supprimé."}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Annuler
            </Button>
            <Button variant="destructive" onClick={handleDeleteIntervention} disabled={deleting}>
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Supprimer définitivement
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sheet Detail Intervention */}
      <Sheet open={detailOpen} onOpenChange={setDetailOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader className="pb-0">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <SheetTitle className="text-xl">{(detailIntervention as any)?.vehicule}</SheetTitle>
                <SheetDescription className="font-mono text-base font-semibold text-blue-600">
                  {(detailIntervention as any)?.immat}
                </SheetDescription>
              </div>
              {detailIntervention && (
                <Badge className={`shrink-0 ${getStatusBadge((detailIntervention as any).status).className}`}>
                  {getStatusBadge((detailIntervention as any).status).label}
                </Badge>
              )}
            </div>
          </SheetHeader>

          {detailIntervention && (
            <div className="mt-6 space-y-6">
              {/* Résumé */}
              <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Résumé</h3>
                <div className="grid gap-3">
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <Wrench className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500">Description</p>
                      <p className="font-medium text-slate-900">{(detailIntervention as any).description}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <Building2 className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500">Garage</p>
                      <p className="font-medium text-slate-900">{(detailIntervention as any).garage}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <Euro className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-slate-500">Montant</p>
                      <p className="text-lg font-bold text-slate-900">
                        {(Number((detailIntervention as any).montant) || 0).toLocaleString("fr-FR")} EUR
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Rendez-vous */}
              {(detailIntervention as any).rdv_date && (
                <>
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Rendez-vous</h3>
                    <div className="p-4 bg-green-50 rounded-lg border border-green-200 space-y-2">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-green-600 shrink-0" />
                        <p className="font-semibold text-green-800">
                          {new Date((detailIntervention as any).rdv_date).toLocaleString("fr-FR", {
                            weekday: "long",
                            day: "numeric",
                            month: "long",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                      {(detailIntervention as any).rdv_lieu && (
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-green-600 shrink-0" />
                          <p className="text-green-700">{(detailIntervention as any).rdv_lieu}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Refus */}
              {(detailIntervention as any).status === "rejected" && (
                <>
                  <div className="space-y-3">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-red-400">Refus</h3>
                    <div className="p-4 bg-red-50 rounded-lg border border-red-200 space-y-2">
                      <p className="text-sm font-semibold text-red-800">Devis refusé</p>
                      {(detailIntervention as any).rejected_reason && (
                        <p className="text-sm text-red-700">
                          <span className="font-medium">Motif :</span> {(detailIntervention as any).rejected_reason}
                        </p>
                      )}
                      {(detailIntervention as any).rejected_at && (
                        <p className="text-xs text-red-500">
                          Refusé le {new Date((detailIntervention as any).rejected_at).toLocaleString("fr-FR")}
                        </p>
                      )}
                    </div>
                  </div>
                  <Separator />
                </>
              )}

              {/* Devis */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Devis</h3>
                {detailIntervention.devis_path ? (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <FileText className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-blue-900">Devis joint</p>
                        <p className="text-xs text-blue-600 truncate">
                          {detailIntervention.devis_filename || "document.pdf"}
                        </p>
                        {detailIntervention.devis_uploaded_at && (
                          <p className="text-xs text-blue-500">
                            Ajouté le {new Date(detailIntervention.devis_uploaded_at).toLocaleString("fr-FR")}
                          </p>
                        )}
                      </div>
                    </div>
                    {permissions.canDownloadDevis && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 text-blue-700 border-blue-300 hover:bg-blue-100"
                        onClick={() => handleDownloadDevis(detailIntervention)}
                        disabled={downloading === detailIntervention.id}
                      >
                        {downloading === detailIntervention.id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        Ouvrir le devis
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                    <p className="text-sm text-slate-500 flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      Aucun devis joint
                    </p>
                  </div>
                )}
              </div>

              <Separator />

              {/* Informations */}
              <div className="space-y-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Informations</h3>
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center gap-2 text-slate-600">
                    <Timer className="w-3.5 h-3.5 text-slate-400" />
                    <span>Créé le {(detailIntervention as any).date_creation
                      ? new Date((detailIntervention as any).date_creation).toLocaleString("fr-FR")
                      : "-"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <Hash className="w-3.5 h-3.5" />
                    <span className="font-mono text-xs select-all">{detailIntervention.id}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Commentaires */}
              <CommentSection interventionId={detailIntervention.id} />

              {/* Actions bas de panneau */}
              <div className="pt-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setDetailOpen(false)}
                >
                  Fermer
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

