"use client";

/**
 * PAGE PUBLIQUE - Formulaire d'inspection anonyme
 * 
 * URL: /inspection/[vehicleId]
 * Accès: Conducteurs anonymes (pas besoin de compte)
 */

import { useState, useEffect, useReducer, use } from "react";
import { useRouter } from "next/navigation";
import { 
  AlertTriangle, 
  CheckCircle2, 
  ChevronRight, 
  Plus, 
  Trash2,
  Fuel,
  Gauge,
  ClipboardCheck,
  Signature,
  ArrowLeft,
  CheckCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { SignaturePad } from "@/components/inspection/SignaturePad";
import { createAnonymousInspection, getVehicleById } from "@/lib/inspection/public-actions";
import { classifyDefect } from "@/lib/inspection/scoring";
import {
  DEFECT_CATEGORY_LABELS,
  DEFECT_SEVERITY_LABELS,
  CONDITION_LABELS,
  type Defect,
  type VehicleInfo,
} from "@/lib/inspection/types";

// ============================================================================
// TYPES & REDUCER
// ============================================================================

interface FormState {
  currentStep: number;
  vehicle: VehicleInfo | null;
  mileage: number;
  fuelGasoil: number;
  fuelGnr: number;
  fuelAdblue: number;
  interiorCondition: "clean" | "dirty" | "damaged";
  exteriorCondition: "clean" | "dirty" | "damaged";
  defects: Defect[];
  driverSignature: string | null;
  isSubmitting: boolean;
  driverName: string;
}

type FormAction =
  | { type: "SET_VEHICLE"; payload: VehicleInfo }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "SET_MILEAGE"; payload: number }
  | { type: "SET_FUEL_GASOIL"; payload: number }
  | { type: "SET_FUEL_GNR"; payload: number }
  | { type: "SET_FUEL_ADBLUE"; payload: number }
  | { type: "SET_INTERIOR_CONDITION"; payload: "clean" | "dirty" | "damaged" }
  | { type: "SET_EXTERIOR_CONDITION"; payload: "clean" | "dirty" | "damaged" }
  | { type: "ADD_DEFECT"; payload: Defect }
  | { type: "REMOVE_DEFECT"; payload: number }
  | { type: "SET_SIGNATURE"; payload: string | null }
  | { type: "SET_DRIVER_NAME"; payload: string }
  | { type: "SET_SUBMITTING"; payload: boolean };

const initialState: FormState = {
  currentStep: 0,
  vehicle: null,
  mileage: 0,
  fuelGasoil: 50,
  fuelGnr: 50,
  fuelAdblue: 50,
  interiorCondition: "clean",
  exteriorCondition: "clean",
  defects: [],
  driverSignature: null,
  isSubmitting: false,
  driverName: "",
};

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET_VEHICLE":
      return { ...state, vehicle: action.payload };
    case "NEXT_STEP":
      return { ...state, currentStep: Math.min(state.currentStep + 1, 4) };
    case "PREV_STEP":
      return { ...state, currentStep: Math.max(state.currentStep - 1, 0) };
    case "SET_MILEAGE":
      return { ...state, mileage: action.payload };
    case "SET_FUEL_GASOIL":
      return { ...state, fuelGasoil: action.payload };
    case "SET_FUEL_GNR":
      return { ...state, fuelGnr: action.payload };
    case "SET_FUEL_ADBLUE":
      return { ...state, fuelAdblue: action.payload };
    case "SET_INTERIOR_CONDITION":
      return { ...state, interiorCondition: action.payload };
    case "SET_EXTERIOR_CONDITION":
      return { ...state, exteriorCondition: action.payload };
    case "ADD_DEFECT":
      return { ...state, defects: [...state.defects, action.payload] };
    case "REMOVE_DEFECT": {
      const newDefects = [...state.defects];
      newDefects.splice(action.payload, 1);
      return { ...state, defects: newDefects };
    }
    case "SET_SIGNATURE":
      return { ...state, driverSignature: action.payload };
    case "SET_DRIVER_NAME":
      return { ...state, driverName: action.payload };
    case "SET_SUBMITTING":
      return { ...state, isSubmitting: action.payload };
    default:
      return state;
  }
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export default function PublicInspectionForm({ 
  params 
}: { 
  params: Promise<{ vehicleId: string }> 
}) {
  const { vehicleId } = use(params);
  const router = useRouter();
  const [state, dispatch] = useReducer(formReducer, initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadVehicle() {
      console.log("[PublicInspectionForm] Loading vehicle ID:", vehicleId);
      console.log("[PublicInspectionForm] UserAgent:", navigator.userAgent);
      try {
        const result = await getVehicleById(vehicleId);
        console.log("[PublicInspectionForm] Result:", result);
        if (!result.success) {
          setError((result as any).error || "Véhicule non trouvé");
          return;
        }
        if (!result.data) {
          setError("Véhicule non trouvé");
          return;
        }
        dispatch({ type: "SET_VEHICLE", payload: result.data });
      } catch (err: any) {
        console.error("[PublicInspectionForm] Error:", err);
        setError(`Erreur lors du chargement: ${err.message || "Unknown error"}`);
      } finally {
        setIsLoading(false);
      }
    }

    loadVehicle();
  }, [vehicleId]);

  const handleSubmit = async () => {
    console.log("[handleSubmit] Début soumission");
    if (!state.vehicle) {
      console.error("[handleSubmit] Pas de véhicule");
      return;
    }
    if (!state.driverName.trim()) {
      toast.error("Veuillez saisir votre nom");
      return;
    }
    if (!state.driverSignature) {
      toast.error("Veuillez signer pour confirmer");
      return;
    }

    dispatch({ type: "SET_SUBMITTING", payload: true });

    const payload: any = {
      vehicleId: state.vehicle.id,
      mileage: state.mileage,
      fuelGasoil: state.fuelGasoil,
      fuelGnr: state.fuelGnr,
      fuelAdblue: state.fuelAdblue,
      interiorCondition: state.interiorCondition,
      exteriorCondition: state.exteriorCondition,
      defects: state.defects,
      driverSignature: state.driverSignature,
      driverName: state.driverName,
    };
    console.log("[handleSubmit] Payload:", payload);

    try {
      const result = await createAnonymousInspection(payload);
      console.log("[handleSubmit] Résultat:", result);

      if (!result.success) {
        toast.error(result.error || "Erreur lors de l'enregistrement");
        dispatch({ type: "SET_SUBMITTING", payload: false });
        return;
      }

      router.push("/inspection/merci");
    } catch (err) {
      console.error("[handleSubmit] Erreur:", err);
      toast.error("Erreur lors de l'enregistrement");
      dispatch({ type: "SET_SUBMITTING", payload: false });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Erreur</h2>
            <p className="text-slate-600 mb-4">{error}</p>
            <p className="text-xs text-slate-400 mb-4 break-all">ID: {vehicleId}</p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => window.location.reload()}>
                Réessayer
              </Button>
              <Button onClick={() => router.push("/inspection")}>
                Retour
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-lg mx-auto px-4 py-3 safe-area-top flex items-center justify-between">
          <button 
            onClick={() => state.currentStep === 0 ? router.push("/inspection") : dispatch({ type: "PREV_STEP" })}
            className="flex items-center gap-1 text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="text-sm">{state.currentStep === 0 ? "Retour" : "Précédent"}</span>
          </button>
          
          <div className="text-center">
            <h1 className="font-semibold text-slate-900">Inspection</h1>
            {state.vehicle && (
              <p className="text-xs text-slate-500">{state.vehicle.immat}</p>
            )}
          </div>

          <div className="w-16" />
        </div>

        <div className="h-1 bg-slate-100">
          <div 
            className="h-full bg-blue-600 transition-all duration-300"
            style={{ width: `${((state.currentStep + 1) / 5) * 100}%` }}
          />
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 safe-area-x safe-area-bottom pb-24">
        {state.currentStep === 0 && (
          <StepMetrics 
            mileage={state.mileage}
            fuelGasoil={state.fuelGasoil}
            fuelGnr={state.fuelGnr}
            fuelAdblue={state.fuelAdblue}
            onMileageChange={(v) => dispatch({ type: "SET_MILEAGE", payload: v })}
            onFuelGasoilChange={(v) => dispatch({ type: "SET_FUEL_GASOIL", payload: v })}
            onFuelGnrChange={(v) => dispatch({ type: "SET_FUEL_GNR", payload: v })}
            onFuelAdblueChange={(v) => dispatch({ type: "SET_FUEL_ADBLUE", payload: v })}
            onNext={() => dispatch({ type: "NEXT_STEP" })}
          />
        )}

        {state.currentStep === 1 && (
          <StepConditions
            interior={state.interiorCondition}
            exterior={state.exteriorCondition}
            onInteriorChange={(v) => dispatch({ type: "SET_INTERIOR_CONDITION", payload: v })}
            onExteriorChange={(v) => dispatch({ type: "SET_EXTERIOR_CONDITION", payload: v })}
            onNext={() => dispatch({ type: "NEXT_STEP" })}
          />
        )}

        {state.currentStep === 2 && (
          <StepDefects
            defects={state.defects}
            onAddDefect={(d) => dispatch({ type: "ADD_DEFECT", payload: d })}
            onRemoveDefect={(i) => dispatch({ type: "REMOVE_DEFECT", payload: i })}
            onNext={() => dispatch({ type: "NEXT_STEP" })}
          />
        )}

        {state.currentStep === 3 && (
          <StepSignature
            driverName={state.driverName}
            signature={state.driverSignature}
            onNameChange={(v) => dispatch({ type: "SET_DRIVER_NAME", payload: v })}
            onSignatureChange={(v) => dispatch({ type: "SET_SIGNATURE", payload: v })}
            onNext={() => dispatch({ type: "NEXT_STEP" })}
          />
        )}

        {state.currentStep === 4 && (
          <StepRecap
            state={state}
            onSubmit={handleSubmit}
            isSubmitting={state.isSubmitting}
          />
        )}
      </main>
    </div>
  );
}

// ============================================================================
// SOUS-COMPOSANTS
// ============================================================================

function StepMetrics({ 
  mileage, fuelGasoil, fuelGnr, fuelAdblue,
  onMileageChange, onFuelGasoilChange, onFuelGnrChange, onFuelAdblueChange, onNext 
}: {
  mileage: number;
  fuelGasoil: number;
  fuelGnr: number;
  fuelAdblue: number;
  onMileageChange: (v: number) => void;
  onFuelGasoilChange: (v: number) => void;
  onFuelGnrChange: (v: number) => void;
  onFuelAdblueChange: (v: number) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Gauge className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-lg font-semibold">Kilométrage & Carburants</h2>
        <p className="text-sm text-slate-500">Vérifiez les niveaux avant de commencer</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <Label className="text-base">Kilométrage actuel (km)</Label>
            <Input
              type="number"
              value={mileage || ""}
              onChange={(e) => onMileageChange(parseInt(e.target.value) || 0)}
              className="text-lg"
              placeholder="Ex: 45230"
            />
          </div>

          <Separator />

          <div className="space-y-4">
            <Label className="text-base flex items-center gap-2">
              <Fuel className="w-4 h-4" />
              Niveaux de carburant
            </Label>
            
            {[
              { label: "Gasoil", value: fuelGasoil, onChange: onFuelGasoilChange, color: "bg-red-500" },
              { label: "GNR", value: fuelGnr, onChange: onFuelGnrChange, color: "bg-orange-500" },
              { label: "AdBlue", value: fuelAdblue, onChange: onFuelAdblueChange, color: "bg-blue-500" },
            ].map((fuel) => (
              <div key={fuel.label} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{fuel.label}</span>
                  <span className="font-medium">{fuel.value}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={fuel.value}
                  onChange={(e) => fuel.onChange(parseInt(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full ${fuel.color} transition-all`} style={{ width: `${fuel.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Button onClick={onNext} className="w-full h-12" disabled={mileage <= 0}>
        Continuer <ChevronRight className="w-5 h-5 ml-2" />
      </Button>
    </div>
  );
}

function StepConditions({
  interior, exterior, onInteriorChange, onExteriorChange, onNext
}: {
  interior: string;
  exterior: string;
  onInteriorChange: (v: "clean" | "dirty" | "damaged") => void;
  onExteriorChange: (v: "clean" | "dirty" | "damaged") => void;
  onNext: () => void;
}) {
  const conditions: { value: "clean" | "dirty" | "damaged"; label: string; color: string }[] = [
    { value: "clean", label: "Propre", color: "bg-green-100 text-green-700 border-green-300" },
    { value: "dirty", label: "Sale", color: "bg-yellow-100 text-yellow-700 border-yellow-300" },
    { value: "damaged", label: "Endommagé", color: "bg-red-100 text-red-700 border-red-300" },
  ];

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <ClipboardCheck className="w-6 h-6 text-purple-600" />
        </div>
        <h2 className="text-lg font-semibold">État du véhicule</h2>
        <p className="text-sm text-slate-500">Notez l&apos;état général</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-6">
          <div>
            <Label className="text-base mb-3 block">Intérieur</Label>
            <div className="grid grid-cols-3 gap-2">
              {conditions.map((c) => (
                <button
                  key={c.value}
                  onClick={() => onInteriorChange(c.value)}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    interior === c.value ? c.color : "bg-white border-slate-200 text-slate-600"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label className="text-base mb-3 block">Extérieur</Label>
            <div className="grid grid-cols-3 gap-2">
              {conditions.map((c) => (
                <button
                  key={c.value}
                  onClick={() => onExteriorChange(c.value)}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    exterior === c.value ? c.color : "bg-white border-slate-200 text-slate-600"
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <Button onClick={onNext} className="w-full h-12">
        Continuer <ChevronRight className="w-5 h-5 ml-2" />
      </Button>
    </div>
  );
}

function StepDefects({
  defects, onAddDefect, onRemoveDefect, onNext
}: {
  defects: Defect[];
  onAddDefect: (d: Defect) => void;
  onRemoveDefect: (i: number) => void;
  onNext: () => void;
}) {
  const [category, setCategory] = useState("tires");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");

  const handleAdd = () => {
    if (!description.trim() || !location.trim()) {
      toast.error("Remplissez tous les champs");
      return;
    }

    const autoSeverity = classifyDefect(category, description);
    
    const newDefect: Defect = {
      category: category as any,
      severity: autoSeverity as "critical" | "warning" | "minor",
      description: description.trim(),
      location: location.trim(),
      photo_url: null,
      reported_at: new Date().toISOString(),
    };

    onAddDefect(newDefect);
    setDescription("");
    setLocation("");
    toast.success(`Anomalie ajoutée (${autoSeverity})`);
  };

  const criticalCount = defects.filter((d) => d.severity === "critical").length;

  return (
    <div className="space-y-4">
      <div className="text-center">
        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <AlertTriangle className="w-6 h-6 text-amber-600" />
        </div>
        <h2 className="text-lg font-semibold">Anomalies</h2>
        <p className="text-sm text-slate-500">Signalez les problèmes constatés ou confirmez que tout est OK</p>
      </div>

      {/* BOUTON PRINCIPAL: Tout est OK */}
      {defects.length === 0 && (
        <Button 
          onClick={onNext} 
          className="w-full h-14 text-lg bg-green-600 hover:bg-green-700"
        >
          <CheckCircle2 className="w-6 h-6 mr-2" />
          Tout est OK - Continuer
        </Button>
      )}

      {criticalCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-600 shrink-0" />
          <p className="text-sm text-red-800">
            <strong>{criticalCount} anomalie(s) critique(s)</strong> détectée(s)
          </p>
        </div>
      )}

      {defects.length > 0 && (
        <div className="space-y-2">
          {defects.map((defect, idx) => (
            <div key={idx} className="bg-white border rounded-lg p-3 flex items-start justify-between">
              <div>
                <Badge className={
                  defect.severity === "critical" ? "bg-red-100 text-red-800" :
                  defect.severity === "warning" ? "bg-amber-100 text-amber-800" :
                  "bg-blue-100 text-blue-800"
                }>
                  {DEFECT_SEVERITY_LABELS[defect.severity]}
                </Badge>
                <p className="font-medium text-sm mt-1">{defect.description}</p>
                <p className="text-xs text-slate-500">{defect.location}</p>
              </div>
              <button onClick={() => onRemoveDefect(idx)} className="text-red-500 hover:text-red-700">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="p-4 space-y-3">
          <h3 className="font-medium text-sm text-slate-600">Ou ajouter une anomalie :</h3>
          
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full p-2 border rounded-lg text-sm"
          >
            {Object.entries(DEFECT_CATEGORY_LABELS).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <Input placeholder="Description du problème" value={description} onChange={(e) => setDescription(e.target.value)} className="text-sm" />
          <Input placeholder="Localisation (ex: Pneu avant gauche)" value={location} onChange={(e) => setLocation(e.target.value)} className="text-sm" />

          <Button onClick={handleAdd} variant="outline" className="w-full" size="sm">
            <Plus className="w-4 h-4 mr-1" /> Ajouter
          </Button>
        </CardContent>
      </Card>

      <Button onClick={onNext} className="w-full h-12">
        {defects.length === 0 ? "Aucune anomalie" : `Continuer (${defects.length})`}
        <ChevronRight className="w-5 h-5 ml-2" />
      </Button>
    </div>
  );
}

function StepSignature({
  driverName, signature, onNameChange, onSignatureChange, onNext
}: {
  driverName: string;
  signature: string | null;
  onNameChange: (v: string) => void;
  onSignatureChange: (v: string | null) => void;
  onNext: () => void;
}) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <Signature className="w-6 h-6 text-green-600" />
        </div>
        <h2 className="text-lg font-semibold">Votre identité</h2>
        <p className="text-sm text-slate-500">Signez pour valider l&apos;inspection</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-4">
          <div>
            <Label>Votre nom complet</Label>
            <Input value={driverName} onChange={(e) => onNameChange(e.target.value)} placeholder="Prénom NOM" className="text-lg" />
          </div>

          <div>
            <Label>Signature</Label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-2">
              <SignaturePad onSave={onSignatureChange} />
            </div>
            {signature && (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Signature enregistrée
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Button onClick={onNext} className="w-full h-12" disabled={!driverName.trim() || !signature}>
        Voir le récapitulatif <ChevronRight className="w-5 h-5 ml-2" />
      </Button>
    </div>
  );
}

function StepRecap({
  state, onSubmit, isSubmitting
}: {
  state: FormState;
  onSubmit: () => void;
  isSubmitting: boolean;
}) {
  const criticalCount = state.defects.filter((d) => d.severity === "critical").length;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <CheckCircle2 className="w-6 h-6 text-blue-600" />
        </div>
        <h2 className="text-lg font-semibold">Récapitulatif</h2>
        <p className="text-sm text-slate-500">Vérifiez avant d&apos;envoyer</p>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-slate-500">Véhicule</span>
            <span className="font-medium">{state.vehicle?.immat}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Conducteur</span>
            <span className="font-medium">{state.driverName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Kilométrage</span>
            <span className="font-medium">{state.mileage.toLocaleString()} km</span>
          </div>
          
          <Separator />
          
          <div className="flex justify-between">
            <span className="text-slate-500">Carburants</span>
            <span className="font-medium">G:{state.fuelGasoil}% N:{state.fuelGnr}% A:{state.fuelAdblue}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">État</span>
            <span className="font-medium">
              {CONDITION_LABELS[state.interiorCondition as keyof typeof CONDITION_LABELS]} / {" "}
              {CONDITION_LABELS[state.exteriorCondition as keyof typeof CONDITION_LABELS]}
            </span>
          </div>

          <Separator />

          <div className="flex justify-between items-center">
            <span className="text-slate-500">Anomalies</span>
            {criticalCount > 0 ? (
              <Badge className="bg-red-100 text-red-800">{criticalCount} critique(s)</Badge>
            ) : state.defects.length > 0 ? (
              <Badge className="bg-amber-100 text-amber-800">{state.defects.length} signalée(s)</Badge>
            ) : (
              <Badge className="bg-green-100 text-green-800">Aucune</Badge>
            )}
          </div>

          {state.defects.length > 0 && (
            <div className="bg-slate-50 rounded p-2 space-y-1">
              {state.defects.map((d, i) => (
                <p key={i} className="text-xs text-slate-600">• {d.description} ({DEFECT_SEVERITY_LABELS[d.severity]})</p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {criticalCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
          <AlertTriangle className="w-6 h-6 text-red-600 mx-auto mb-2" />
          <p className="text-sm text-red-800">
            <strong>Attention :</strong> Des anomalies critiques sont signalées. Le véhicule pourrait être immobilisé.
          </p>
        </div>
      )}

      <Button onClick={onSubmit} className="w-full h-14 text-lg" disabled={isSubmitting}>
        {isSubmitting ? (
          <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" /> Envoi en cours...</>
        ) : (
          <><CheckCircle2 className="w-5 h-5 mr-2" /> Valider l&apos;inspection</>
        )}
      </Button>
    </div>
  );
}
