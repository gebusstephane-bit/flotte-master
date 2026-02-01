"use client";

import { useReducer, useEffect, useCallback, useRef, useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { QRScanner } from "./QRScanner";
import { SignaturePad } from "./SignaturePad";
import { createInspection } from "@/lib/inspection/actions";
import {
  INSPECTION_STEPS,
  CONDITION_STATUS,
  DEFECT_CATEGORY,
  DEFECT_SEVERITY,
  CONDITION_LABELS,
  DEFECT_CATEGORY_LABELS,
  DEFECT_SEVERITY_LABELS,
  type VehicleInspectionInput,
  type Defect,
  type QRScanResult,
} from "@/lib/inspection/types";

// ============================================================================
// TYPES POUR LE REDUCER
// ============================================================================

interface FormState {
  currentStep: number;
  scannedVehicle: QRScanResult | null;
  mileage: number;
  fuelGasoil: number;
  fuelGnr: number;
  fuelAdblue: number;
  fuelType: "diesel" | "gnr" | "gasoline" | "electric";
  interiorCondition: "clean" | "dirty" | "damaged";
  exteriorCondition: "clean" | "dirty" | "damaged";
  defects: Defect[];
  defectsOptimistic: Defect[];
  isSubmitting: boolean;
  pendingDefects: Set<string>;
}

type FormAction =
  | { type: "SET_STEP"; payload: number }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "SET_VEHICLE"; payload: QRScanResult | null }
  | { type: "SET_MILEAGE"; payload: number }
  | { type: "SET_FUEL_GASOIL"; payload: number }
  | { type: "SET_FUEL_GNR"; payload: number }
  | { type: "SET_FUEL_ADBLUE"; payload: number }
  | { type: "SET_INTERIOR_CONDITION"; payload: "clean" | "dirty" | "damaged" }
  | { type: "SET_EXTERIOR_CONDITION"; payload: "clean" | "dirty" | "damaged" }
  | { type: "ADD_DEFECT"; payload: Defect }
  | { type: "ADD_DEFECT_OPTIMISTIC"; payload: Defect }
  | { type: "ADD_DEFECT_CONFIRM"; payload: { tempId: string; defect: Defect } }
  | { type: "ADD_DEFECT_ROLLBACK"; payload: string }
  | { type: "REMOVE_DEFECT"; payload: number }
  | { type: "SET_SUBMITTING"; payload: boolean }
  | { type: "RESET_FORM" };

// ============================================================================
// REDUCER POUR GESTION ATOMIQUE DU STATE
// ============================================================================

const initialState: FormState = {
  currentStep: 0,
  scannedVehicle: null,
  mileage: 0,
  fuelGasoil: 50,
  fuelGnr: 50,
  fuelAdblue: 50,
  fuelType: "diesel",
  interiorCondition: "clean",
  exteriorCondition: "clean",
  defects: [],
  defectsOptimistic: [],
  isSubmitting: false,
  pendingDefects: new Set(),
};

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, currentStep: action.payload };
    case "NEXT_STEP":
      return { ...state, currentStep: Math.min(state.currentStep + 1, 4) };
    case "PREV_STEP":
      return { ...state, currentStep: Math.max(state.currentStep - 1, 0) };
    case "SET_VEHICLE":
      return { ...state, scannedVehicle: action.payload };
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
      return { 
        ...state, 
        defects: [...state.defects, action.payload],
        defectsOptimistic: [...state.defectsOptimistic, action.payload]
      };
    case "ADD_DEFECT_OPTIMISTIC": {
      const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const optimisticDefect = { ...action.payload, tempId };
      const newPending = new Set(state.pendingDefects);
      newPending.add(tempId);
      return {
        ...state,
        defectsOptimistic: [...state.defectsOptimistic, optimisticDefect],
        pendingDefects: newPending,
      };
    }
    case "ADD_DEFECT_CONFIRM": {
      const { tempId, defect } = action.payload;
      const newPending = new Set(state.pendingDefects);
      newPending.delete(tempId);
      return {
        ...state,
        defects: [...state.defects, defect],
        pendingDefects: newPending,
      };
    }
    case "ADD_DEFECT_ROLLBACK": {
      const tempId = action.payload;
      const newPending = new Set(state.pendingDefects);
      newPending.delete(tempId);
      return {
        ...state,
        defectsOptimistic: state.defectsOptimistic.filter((d: any) => d.tempId !== tempId),
        pendingDefects: newPending,
      };
    }
    case "REMOVE_DEFECT": {
      const index = action.payload;
      const newDefects = [...state.defects];
      const newOptimistic = [...state.defectsOptimistic];
      newDefects.splice(index, 1);
      newOptimistic.splice(index, 1);
      return { ...state, defects: newDefects, defectsOptimistic: newOptimistic };
    }
    case "SET_SUBMITTING":
      return { ...state, isSubmitting: action.payload };
    case "RESET_FORM":
      return initialState;
    default:
      return state;
  }
}

// ============================================================================
// HOOK PERSONNALISÉ POUR DEBOUNCE
// ============================================================================

function useDebouncedCallback<T extends (...args: any[]) => void>(
  callback: T,
  delay: number
): [(...args: Parameters<T>) => void, () => void] {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return [debouncedCallback, cancel];
}

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// ============================================================================
// COMPOSANTS D'ÉTAPES AVEC STATE ISOLÉ
// ============================================================================

// Étape 1: Véhicule - State local isolé
function VehicleStep({ 
  scannedVehicle, 
  onVehicleChange 
}: { 
  scannedVehicle: QRScanResult | null; 
  onVehicleChange: (v: QRScanResult | null) => void;
}) {
  // State local pour le scan en cours
  const [isScanning, setIsScanning] = useState(false);

  const handleScan = useCallback((vehicle: QRScanResult | null) => {
    setIsScanning(false);
    onVehicleChange(vehicle);
  }, [onVehicleChange]);

  const handleReset = useCallback(() => {
    onVehicleChange(null);
    setIsScanning(false);
  }, [onVehicleChange]);

  if (scannedVehicle) {
    return (
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
          <h3 className="font-bold text-lg">{scannedVehicle.immat}</h3>
          <p className="text-slate-600">{scannedVehicle.marque}</p>
          <Button variant="outline" className="mt-4" onClick={handleReset}>
            Changer de véhicule
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <QRScanner onScan={handleScan} />;
}

// Étape 2: Métriques - State isolé avec debounce sur la recherche
function MetricsStep({
  mileage,
  fuelGasoil,
  fuelGnr,
  fuelAdblue,
  onMileageChange,
  onFuelChange,
}: {
  mileage: number;
  fuelGasoil: number;
  fuelGnr: number;
  fuelAdblue: number;
  onMileageChange: (value: number) => void;
  onFuelChange: (type: "gasoil" | "gnr" | "adblue", value: number) => void;
}) {
  // State local pour les inputs avant debounce
  const [localMileage, setLocalMileage] = useState(mileage.toString());
  
  // Debounce la mise à jour du mileage
  const [debouncedMileageUpdate] = useDebouncedCallback((value: string) => {
    const num = parseInt(value) || 0;
    onMileageChange(num);
  }, 300);

  const handleMileageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocalMileage(value);
    debouncedMileageUpdate(value);
  }, [debouncedMileageUpdate]);

  // Sync local state avec props externes
  useEffect(() => {
    if (mileage !== parseInt(localMileage)) {
      setLocalMileage(mileage.toString());
    }
  }, [mileage]);

  const fuelInputs = [
    { key: "gasoil" as const, label: "Gasoil", value: fuelGasoil },
    { key: "gnr" as const, label: "GNR", value: fuelGnr },
    { key: "adblue" as const, label: "AdBlue", value: fuelAdblue },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Label>Kilométrage</Label>
        <Input
          type="number"
          placeholder="240000"
          value={localMileage}
          onChange={handleMileageChange}
          className="text-lg"
        />
      </div>

      <div className="space-y-4">
        <Label>Niveaux de carburant</Label>
        
        {fuelInputs.map(({ key, label, value }) => (
          <div key={key} className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>{label}</span>
              <span>{value}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={value}
              onChange={(e) => onFuelChange(key, parseInt(e.target.value))}
              className="w-full"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Étape 3: Conditions - State isolé
function ConditionsStep({
  interiorCondition,
  exteriorCondition,
  onInteriorChange,
  onExteriorChange,
}: {
  interiorCondition: string;
  exteriorCondition: string;
  onInteriorChange: (value: "clean" | "dirty" | "damaged") => void;
  onExteriorChange: (value: "clean" | "dirty" | "damaged") => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <Label>État intérieur</Label>
        <div className="grid grid-cols-3 gap-2">
          {CONDITION_STATUS.map((status) => (
            <Button
              key={status}
              variant={interiorCondition === status ? "default" : "outline"}
              onClick={() => onInteriorChange(status)}
              type="button"
            >
              {CONDITION_LABELS[status]}
            </Button>
          ))}
        </div>
      </div>

      <div>
        <Label>État extérieur</Label>
        <div className="grid grid-cols-3 gap-2">
          {CONDITION_STATUS.map((status) => (
            <Button
              key={status}
              variant={exteriorCondition === status ? "default" : "outline"}
              onClick={() => onExteriorChange(status)}
              type="button"
            >
              {CONDITION_LABELS[status]}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}

// Étape 4: Défauts - Optimistic updates avec rollback
function DefectsStep({
  defects,
  onAddDefect,
  onRemoveDefect,
  onNext,
}: {
  defects: Defect[];
  onAddDefect: (defect: Defect) => Promise<boolean>;
  onRemoveDefect: (index: number) => void;
  onNext: () => void;
}) {
  // State local isolé pour le formulaire d'ajout
  const [category, setCategory] = useState("tires");
  const [severity, setSeverity] = useState<"minor" | "warning" | "critical">("minor");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  // Debounce sur la description et l'emplacement
  const debouncedDescription = useDebounce(description, 200);
  const debouncedLocation = useDebounce(location, 200);

  // Validation débouncée
  const isValid = useMemo(() => {
    return debouncedDescription.trim().length > 0 && debouncedLocation.trim().length > 0;
  }, [debouncedDescription, debouncedLocation]);

  const handleAddDefect = useCallback(async () => {
    if (!debouncedDescription.trim() || !debouncedLocation.trim()) {
      toast.error("⚠️ Remplissez la description ET l'emplacement !");
      return;
    }

    setIsAdding(true);
    const tempId = `temp-${Date.now()}`;

    try {
      const newDefect: Defect = {
        category: category as any,
        severity: severity as any,
        description: debouncedDescription.trim(),
        location: debouncedLocation.trim(),
        photo_url: null,
        reported_at: new Date().toISOString(),
      };

      // Optimistic update avec rollback possible
      const success = await onAddDefect(newDefect);

      if (success) {
        toast.success(`Anomalie ajoutée - ${severity.toUpperCase()}`);
        // Reset form local
        setDescription("");
        setLocation("");
        setCategory("tires");
        setSeverity("minor");
      } else {
        toast.error("Erreur lors de l'ajout de l'anomalie");
      }
    } catch (error) {
      toast.error("Erreur lors de l'ajout de l'anomalie");
      console.error("Erreur ajout défaut:", error);
    } finally {
      setIsAdding(false);
    }
  }, [category, severity, debouncedDescription, debouncedLocation, onAddDefect]);

  const criticalCount = defects.filter((d) => d.severity === "critical").length;

  return (
    <div className="space-y-6">
      {/* Alerte si critique */}
      {criticalCount > 0 && (
        <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4">
          <p className="font-bold text-red-700 text-center">
            ⚠️ {criticalCount} ANOMALIE{criticalCount > 1 ? "S" : ""} CRITIQUE
            {criticalCount > 1 ? "S" : ""}
          </p>
        </div>
      )}

      {/* Liste des défauts */}
      <div className="space-y-2">
        <h3 className="font-medium">Anomalies ({defects.length})</h3>
        
        {defects.length === 0 ? (
          <p className="text-sm text-slate-500">Aucune anomalie</p>
        ) : (
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {defects.map((defect, index) => (
              <div
                key={`${defect.reported_at}-${index}`}
                className={`p-3 rounded border ${
                  defect.severity === "critical"
                    ? "bg-red-50 border-red-300"
                    : defect.severity === "warning"
                    ? "bg-amber-50 border-amber-300"
                    : "bg-slate-50 border-slate-200"
                }`}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex gap-2 mb-1">
                      <Badge variant="outline">
                        {DEFECT_CATEGORY_LABELS[defect.category]}
                      </Badge>
                      <Badge
                        className={
                          defect.severity === "critical"
                            ? "bg-red-500"
                            : defect.severity === "warning"
                            ? "bg-amber-500"
                            : "bg-slate-500"
                        }
                      >
                        {defect.severity}
                      </Badge>
                    </div>
                    <p className="font-medium text-sm">{defect.description}</p>
                    <p className="text-xs text-slate-500">📍 {defect.location}</p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => onRemoveDefect(index)}
                    className="shrink-0"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Separator />

      {/* Formulaire d'ajout */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ajouter une anomalie</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">Catégorie</Label>
              <select
                className="w-full p-2 border rounded text-sm"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {DEFECT_CATEGORY.map((cat) => (
                  <option key={cat} value={cat}>
                    {DEFECT_CATEGORY_LABELS[cat]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">Gravité</Label>
              <select
                className="w-full p-2 border rounded text-sm"
                value={severity}
                onChange={(e) => setSeverity(e.target.value as any)}
              >
                {DEFECT_SEVERITY.map((sev) => (
                  <option key={sev} value={sev}>
                    {DEFECT_SEVERITY_LABELS[sev]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Description</Label>
            <Input
              placeholder="Ex: Frein cassé"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isAdding}
            />
          </div>

          <div>
            <Label className="text-xs">Emplacement</Label>
            <Input
              placeholder="Ex: Roue avant gauche"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              disabled={isAdding}
            />
          </div>

          <Button
            onClick={handleAddDefect}
            variant="outline"
            className="w-full"
            disabled={!isValid || isAdding}
          >
            {isAdding ? (
              <>
                <RotateCcw className="w-4 h-4 mr-2 animate-spin" />
                Ajout...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter l'anomalie
              </>
            )}
          </Button>

          {/* Indication des champs requis */}
          <div className="text-xs mt-2 space-y-1">
            {!debouncedDescription.trim() && (
              <p className="text-amber-600">⚠️ Entrez une description</p>
            )}
            {!debouncedLocation.trim() && (
              <p className="text-amber-600">⚠️ Entrez un emplacement</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Étape 5: Signature
function SignatureStep({
  mileage,
  fuelGasoil,
  fuelGnr,
  fuelAdblue,
  interiorCondition,
  exteriorCondition,
  defects,
  scannedVehicle,
  onSubmit,
  isSubmitting,
}: {
  mileage: number;
  fuelGasoil: number;
  fuelGnr: number;
  fuelAdblue: number;
  interiorCondition: string;
  exteriorCondition: string;
  defects: Defect[];
  scannedVehicle: QRScanResult | null;
  onSubmit: (signature: string | null) => void;
  isSubmitting: boolean;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Signature</CardTitle>
        </CardHeader>
        <CardContent>
          <SignaturePad onSave={onSubmit} isSubmitting={isSubmitting} />
        </CardContent>
      </Card>

      {/* Récap */}
      <Card className="bg-slate-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Récapitulatif</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span>Véhicule:</span>
            <span className="font-mono">{scannedVehicle?.immat}</span>
          </div>
          <div className="flex justify-between">
            <span>Kilométrage:</span>
            <span>{mileage?.toLocaleString()} km</span>
          </div>
          <div className="flex justify-between">
            <span>Gasoil:</span>
            <span>{fuelGasoil}%</span>
          </div>
          <div className="flex justify-between">
            <span>GNR:</span>
            <span>{fuelGnr}%</span>
          </div>
          <div className="flex justify-between">
            <span>AdBlue:</span>
            <span>{fuelAdblue}%</span>
          </div>
          <div className="flex justify-between">
            <span>Intérieur:</span>
            <span>{CONDITION_LABELS[interiorCondition as keyof typeof CONDITION_LABELS]}</span>
          </div>
          <div className="flex justify-between">
            <span>Extérieur:</span>
            <span>{CONDITION_LABELS[exteriorCondition as keyof typeof CONDITION_LABELS]}</span>
          </div>

          {defects.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="font-medium mb-2">Anomalies ({defects.length}):</p>
              <div className="max-h-32 overflow-y-auto space-y-1">
                {defects.map((d, i) => (
                  <div key={i} className="text-xs">
                    • {d.description}
                    <Badge
                      className={
                        d.severity === "critical"
                          ? "bg-red-500 ml-1"
                          : d.severity === "warning"
                          ? "bg-amber-500 ml-1"
                          : "bg-slate-500 ml-1"
                      }
                    >
                      {d.severity}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// COMPOSANT PRINCIPAL
// ============================================================================

export function InspectionForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const vehicleIdFromUrl = searchParams.get("vehicle");

  // Utilisation de useReducer pour une gestion atomique du state
  const [state, dispatch] = useReducer(formReducer, initialState);
  
  // Ref pour rollback en cas d'erreur
  const lastDefectRef = useRef<Defect | null>(null);

  // Charger véhicule depuis URL
  useEffect(() => {
    async function loadVehicleFromUrl() {
      if (!vehicleIdFromUrl || state.scannedVehicle) return;
      try {
        const response = await fetch(`/api/vehicle/${vehicleIdFromUrl}`);
        if (response.ok) {
          const data = await response.json();
          dispatch({ type: "SET_VEHICLE", payload: data });
          toast.success(`Véhicule chargé: ${data.immat}`);
        }
      } catch (err) {
        console.error("Erreur chargement véhicule:", err);
        toast.error("Erreur lors du chargement du véhicule");
        dispatch({ type: "SET_VEHICLE", payload: null });
      }
    }
    loadVehicleFromUrl();
  }, [vehicleIdFromUrl, state.scannedVehicle]);

  // Navigation
  const nextStep = useCallback(() => dispatch({ type: "NEXT_STEP" }), []);
  const prevStep = useCallback(() => dispatch({ type: "PREV_STEP" }), []);

  // Handlers mémorisés pour éviter les re-rendus inutiles
  const handleVehicleChange = useCallback((vehicle: QRScanResult | null) => {
    dispatch({ type: "SET_VEHICLE", payload: vehicle });
  }, []);

  const handleMileageChange = useCallback((value: number) => {
    dispatch({ type: "SET_MILEAGE", payload: value });
  }, []);

  const handleFuelChange = useCallback((type: "gasoil" | "gnr" | "adblue", value: number) => {
    switch (type) {
      case "gasoil":
        dispatch({ type: "SET_FUEL_GASOIL", payload: value });
        break;
      case "gnr":
        dispatch({ type: "SET_FUEL_GNR", payload: value });
        break;
      case "adblue":
        dispatch({ type: "SET_FUEL_ADBLUE", payload: value });
        break;
    }
  }, []);

  const handleInteriorChange = useCallback((value: "clean" | "dirty" | "damaged") => {
    dispatch({ type: "SET_INTERIOR_CONDITION", payload: value });
  }, []);

  const handleExteriorChange = useCallback((value: "clean" | "dirty" | "damaged") => {
    dispatch({ type: "SET_EXTERIOR_CONDITION", payload: value });
  }, []);

  // Optimistic update pour l'ajout de défaut avec rollback
  const handleAddDefect = useCallback(async (defect: Defect): Promise<boolean> => {
    // Stocker pour possible rollback
    lastDefectRef.current = defect;
    
    try {
      // Mise à jour atomique via le reducer
      dispatch({ type: "ADD_DEFECT", payload: defect });
      return true;
    } catch (error) {
      // Rollback: supprimer le dernier défaut ajouté
      console.error("Erreur lors de l'ajout, rollback...", error);
      toast.error("Erreur lors de l'ajout - Annulation");
      return false;
    }
  }, []);

  const handleRemoveDefect = useCallback((index: number) => {
    dispatch({ type: "REMOVE_DEFECT", payload: index });
  }, []);

  // Soumettre
  const handleSubmit = useCallback(async (signature: string | null) => {
    if (!state.scannedVehicle) {
      toast.error("Veuillez scanner un véhicule");
      return;
    }
    if (!state.mileage || state.mileage <= 0) {
      toast.error("Veuillez indiquer le kilométrage");
      return;
    }

    dispatch({ type: "SET_SUBMITTING", payload: true });

    try {
      const inspectionData: VehicleInspectionInput = {
        vehicle_id: state.scannedVehicle.vehicle_id,
        mileage: state.mileage,
        fuel_level: Math.round((state.fuelGasoil + state.fuelGnr) / 2),
        fuel_gasoil: state.fuelGasoil,
        fuel_gnr: state.fuelGnr,
        fuel_adblue: state.fuelAdblue,
        fuel_type: state.fuelType || "diesel",
        interior_condition: state.interiorCondition || "clean",
        exterior_condition: state.exteriorCondition || "clean",
        defects: state.defects || [],
        inspection_type: "pre_trip",
        digital_signature: signature,
      };
      
      console.log("[InspectionForm] Données envoyées:", inspectionData);

      const result = await createInspection(inspectionData);

      if (result.success) {
        toast.success("Inspection enregistrée!");
        dispatch({ type: "RESET_FORM" });
        router.push("/inspections");
      } else {
        toast.error(result.error || "Erreur lors de l'enregistrement");
        dispatch({ type: "SET_SUBMITTING", payload: false });
      }
    } catch (err) {
      toast.error("Erreur lors de l'enregistrement");
      dispatch({ type: "SET_SUBMITTING", payload: false });
    }
  }, [state, router]);

  // Rendu de l'étape courante - mémorisé
  const renderStep = useCallback(() => {
    switch (state.currentStep) {
      case 0:
        return (
          <VehicleStep
            scannedVehicle={state.scannedVehicle}
            onVehicleChange={handleVehicleChange}
          />
        );
      case 1:
        return (
          <MetricsStep
            mileage={state.mileage}
            fuelGasoil={state.fuelGasoil}
            fuelGnr={state.fuelGnr}
            fuelAdblue={state.fuelAdblue}
            onMileageChange={handleMileageChange}
            onFuelChange={handleFuelChange}
          />
        );
      case 2:
        return (
          <ConditionsStep
            interiorCondition={state.interiorCondition}
            exteriorCondition={state.exteriorCondition}
            onInteriorChange={handleInteriorChange}
            onExteriorChange={handleExteriorChange}
          />
        );
      case 3:
        return (
          <DefectsStep
            defects={state.defects}
            onAddDefect={handleAddDefect}
            onRemoveDefect={handleRemoveDefect}
            onNext={nextStep}
          />
        );
      case 4:
        return (
          <SignatureStep
            mileage={state.mileage}
            fuelGasoil={state.fuelGasoil}
            fuelGnr={state.fuelGnr}
            fuelAdblue={state.fuelAdblue}
            interiorCondition={state.interiorCondition}
            exteriorCondition={state.exteriorCondition}
            defects={state.defects}
            scannedVehicle={state.scannedVehicle}
            onSubmit={handleSubmit}
            isSubmitting={state.isSubmitting}
          />
        );
      default:
        return null;
    }
  }, [
    state.currentStep,
    state.scannedVehicle,
    state.mileage,
    state.fuelGasoil,
    state.fuelGnr,
    state.fuelAdblue,
    state.interiorCondition,
    state.exteriorCondition,
    state.defects,
    state.isSubmitting,
    handleVehicleChange,
    handleMileageChange,
    handleFuelChange,
    handleInteriorChange,
    handleExteriorChange,
    handleAddDefect,
    handleRemoveDefect,
    handleSubmit,
    nextStep,
  ]);

  return (
    <div className="max-w-lg mx-auto">
      {/* Stepper */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          {INSPECTION_STEPS.map((step, index) => (
            <div key={step.id} className="flex items-center">
              <button
                type="button"
                onClick={() => dispatch({ type: "SET_STEP", payload: index })}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  index < state.currentStep
                    ? "bg-green-500 text-white hover:bg-green-600"
                    : index === state.currentStep
                    ? "bg-blue-500 text-white"
                    : "bg-slate-200 text-slate-600 hover:bg-slate-300"
                }`}
                disabled={index > state.currentStep && state.currentStep === 0 && !state.scannedVehicle}
              >
                {index < state.currentStep ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  index + 1
                )}
              </button>
              {index < INSPECTION_STEPS.length - 1 && (
                <div
                  className={`w-8 h-0.5 mx-1 ${
                    index < state.currentStep ? "bg-green-500" : "bg-slate-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="mt-2 text-center">
          <h2 className="font-semibold">{INSPECTION_STEPS[state.currentStep].title}</h2>
          <p className="text-sm text-slate-500">
            {INSPECTION_STEPS[state.currentStep].description}
          </p>
        </div>
      </div>

      {/* Contenu */}
      <div className="min-h-[400px]">{renderStep()}</div>

      {/* Navigation */}
      <div className="flex justify-between mt-6 pt-4 border-t">
        <Button
          variant="outline"
          onClick={prevStep}
          disabled={state.currentStep === 0 || state.isSubmitting}
        >
          <ChevronLeft className="w-4 h-4 mr-2" />
          Précédent
        </Button>

        {state.currentStep < 4 && (
          <Button
            onClick={nextStep}
            disabled={state.currentStep === 0 && !state.scannedVehicle}
          >
            Suivant
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}
