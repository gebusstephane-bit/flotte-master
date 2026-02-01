"use client";

/**
 * Modal de validation d'inspection avec gestion défaut par défaut
 * - Coche "Réparé" + description réparation
 * - Si pas coché → création automatique d'intervention
 */

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2, CheckCircle2, AlertTriangle, ShieldCheck, Wrench, Car, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { validateInspectionWithDefects } from "@/lib/inspection/validation-actions";

interface Defect {
  category: string;
  severity: "critical" | "warning" | "minor";
  description: string;
  location: string;
}

interface ValidationModalProps {
  inspectionId: string;
  inspectionStatus: string;
  vehicleId: string;
  vehicleInfo?: { immat?: string; marque?: string; type?: string };
  defects: Defect[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userName?: string;
}

interface DefectValidation {
  repaired: boolean;
  repairDescription: string;
}

export function ValidationModal({
  inspectionId,
  inspectionStatus,
  vehicleId,
  vehicleInfo,
  defects,
  isOpen,
  onClose,
  onSuccess,
  userName,
}: ValidationModalProps) {
  const router = useRouter();
  const [defectValidations, setDefectValidations] = useState<Record<number, DefectValidation>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdInterventionId, setCreatedInterventionId] = useState<string | null>(null);

  // Vérifier si l'inspection est validable
  const isValidatable = ["pending_review", "requires_action"].includes(inspectionStatus);
  
  // Calculer combien de défauts sont réparés / à réparer
  const repairedCount = Object.values(defectValidations).filter(v => v.repaired).length;
  const toRepairCount = defects.length - repairedCount;

  const handleDefectChange = (index: number, field: keyof DefectValidation, value: boolean | string) => {
    setDefectValidations(prev => ({
      ...prev,
      [index]: {
        ...prev[index],
        [field]: value,
      },
    }));
  };

  const handleSubmit = async () => {
    setError(null);

    // Validation : si réparé, il faut une description
    for (let i = 0; i < defects.length; i++) {
      const validation = defectValidations[i];
      if (validation?.repaired && (!validation.repairDescription || validation.repairDescription.trim() === "")) {
        setError(`Une description de réparation est requise pour le défaut #${i + 1}`);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      // Préparer les données des défauts
      const defectsData = defects.map((defect, index) => ({
        ...defect,
        repaired: defectValidations[index]?.repaired || false,
        repairDescription: defectValidations[index]?.repairDescription || "",
      }));

      const result = await validateInspectionWithDefects({
        inspection_id: inspectionId,
        vehicle_id: vehicleId,
        vehicle_info: vehicleInfo,
        defects: defectsData,
      });

      if (result.success) {
        if (result.data?.interventionCreated && result.data?.interventionId) {
          // Intervention créée - proposer d'aller la compléter
          setCreatedInterventionId(result.data.interventionId);
          toast.success(
            `${toRepairCount} défaut(s) à réparer. Intervention créée. Complétez les détails (garage, montant, devis).`,
            { duration: 5000 }
          );
          onSuccess(); // Rafraîchir la liste
        } else {
          toast.success("Inspection validée - Tous les défauts sont réparés", {
            icon: <CheckCircle2 className="w-4 h-4" />,
          });
          onSuccess();
          onClose();
          setDefectValidations({});
        }
      } else {
        setError(result.error || "Erreur lors de la validation");
        toast.error(result.error || "Erreur lors de la validation");
      }
    } catch (err: any) {
      setError(err.message || "Erreur technique");
      toast.error("Erreur technique lors de la validation");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setDefectValidations({});
      setError(null);
      onClose();
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case "critical":
        return <Badge variant="destructive">CRITIQUE</Badge>;
      case "warning":
        return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">ATTENTION</Badge>;
      default:
        return <Badge variant="outline" className="bg-slate-50 text-slate-700">MINEUR</Badge>;
    }
  };

  if (!isValidatable) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-slate-400" />
              Validation impossible
            </DialogTitle>
          </DialogHeader>
          <Alert variant="destructive">
            <AlertDescription>
              Cette inspection ne peut pas être validée (statut: {inspectionStatus})
            </AlertDescription>
          </Alert>
          <DialogFooter>
            <Button onClick={handleClose}>Fermer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  // Si aucun défaut, validation simple
  if (defects.length === 0) {
    return (
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-500" />
              Valider l&apos;inspection
            </DialogTitle>
            <DialogDescription>
              Aucune anomalie n&apos;a été détectée lors de cette inspection.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Le véhicule est conforme. Vous pouvez valider cette inspection.
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
              Annuler
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
              {isSubmitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Validation...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4 mr-2" />Confirmer validation</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ShieldCheck className="w-6 h-6 text-blue-500" />
            Valider l&apos;inspection - Gestion des anomalies
          </DialogTitle>
          <DialogDescription>
            Pour chaque anomalie, indiquez si elle est réparée ou si une intervention doit être créée.
            {vehicleInfo && (
              <span className="block mt-1 font-mono text-sm">
                <Car className="w-4 h-4 inline mr-1" />
                {vehicleInfo.immat} - {vehicleInfo.marque}
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Résumé */}
          <div className="flex gap-2 text-sm">
            <Badge variant="outline" className="bg-green-50">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {repairedCount} réparé(s)
            </Badge>
            <Badge variant="outline" className="bg-amber-50">
              <Wrench className="w-3 h-3 mr-1" />
              {toRepairCount} à réparer
            </Badge>
          </div>

          {/* Liste des défauts */}
          <div className="space-y-4">
            {defects.map((defect, index) => {
              const validation = defectValidations[index] || { repaired: false, repairDescription: "" };
              
              return (
                <div key={index} className="border rounded-lg p-4 space-y-3 bg-slate-50">
                  {/* Info défaut */}
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {getSeverityBadge(defect.severity)}
                        <span className="text-sm text-slate-500 capitalize">{defect.category}</span>
                      </div>
                      <p className="font-medium text-slate-900">{defect.description}</p>
                      <p className="text-sm text-slate-500">
                        <span className="text-slate-400">Emplacement:</span> {defect.location}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Choix réparation */}
                  <div className="space-y-3">
                    <Label className="text-sm font-semibold flex items-center gap-2">
                      <Wrench className="w-4 h-4" />
                      Action sur cette anomalie :
                    </Label>
                    
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        id={`repaired-${index}`}
                        checked={validation.repaired}
                        onCheckedChange={(checked) => 
                          handleDefectChange(index, "repaired", checked === true)
                        }
                        disabled={isSubmitting}
                      />
                      <div className="grid gap-1.5 leading-none flex-1">
                        <Label
                          htmlFor={`repaired-${index}`}
                          className="text-sm font-medium cursor-pointer"
                        >
                          Réparation effectuée
                        </Label>
                        <p className="text-xs text-slate-500">
                          Cochez si le problème est résolu
                        </p>
                      </div>
                    </div>

                    {/* Description réparation si coché */}
                    {validation.repaired && (
                      <div className="pl-7 space-y-2">
                        <Label htmlFor={`repair-desc-${index}`} className="text-sm">
                          Description de la réparation <span className="text-red-500">*</span>
                        </Label>
                        <Textarea
                          id={`repair-desc-${index}`}
                          placeholder="Décrivez la réparation effectuée..."
                          value={validation.repairDescription}
                          onChange={(e) => handleDefectChange(index, "repairDescription", e.target.value)}
                          disabled={isSubmitting}
                          className="min-h-[60px] text-sm"
                        />
                      </div>
                    )}

                    {/* Info création intervention */}
                    {!validation.repaired && (
                      <div className="pl-7 p-3 bg-amber-50 border border-amber-200 rounded text-sm">
                        <AlertTriangle className="w-4 h-4 inline mr-1 text-amber-600" />
                        <span className="text-amber-800">
                          Une fiche d&apos;intervention sera créée automatiquement pour cette anomalie
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Erreur */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Info traçabilité */}
          <div className="text-xs text-slate-500 bg-slate-100 p-3 rounded">
            <strong>Traçabilité :</strong> Cette validation sera enregistrée avec votre identifiant
            ({userName || "utilisateur connecté"}) et la date/heure actuelle.
          </div>
        </div>

        <DialogFooter className="gap-2">
          {createdInterventionId ? (
            // Intervention créée - proposer d'aller la compléter
            <>
              <Button variant="outline" onClick={() => {
                onClose();
                setCreatedInterventionId(null);
                setDefectValidations({});
              }}>
                Rester ici
              </Button>
              <Button 
                onClick={() => {
                  router.push(`/maintenance?edit=${createdInterventionId}`);
                  onClose();
                  setCreatedInterventionId(null);
                  setDefectValidations({});
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Compléter l'intervention
              </Button>
            </>
          ) : (
            // Formulaire normal
            <>
              <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
                Annuler
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={isSubmitting || defects.length === 0}
                className={toRepairCount > 0 ? "bg-amber-600 hover:bg-amber-700" : "bg-green-600 hover:bg-green-700"}
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Validation en cours...</>
                ) : toRepairCount > 0 ? (
                  <><Wrench className="w-4 h-4 mr-2" />Valider et créer intervention</>
                ) : (
                  <><CheckCircle2 className="w-4 h-4 mr-2" />Valider (tout réparé)</>
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
