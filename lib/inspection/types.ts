/**
 * Types du module Vehicle Inspection
 * QR Checklist - Inspections pré/post-départ
 */

import { z } from "zod";

// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================

export const INSPECTION_TYPE = [
  "pre_trip",
  "post_trip",
  "emergency",
] as const;

export const FUEL_TYPE = [
  "diesel",
  "gnr",
  "gasoline",
  "electric",
] as const;

export const CONDITION_STATUS = [
  "clean",
  "dirty",
  "damaged",
] as const;

export const DEFECT_CATEGORY = [
  "tires",
  "body",
  "mechanical",
  "electrical",
  "cleanliness",
  "lights",
  "fluids",
  "safety",
] as const;

export const DEFECT_SEVERITY = [
  "critical",
  "warning",
  "minor",
] as const;

export const INSPECTION_STATUS = [
  "pending_review",
  "validated",
  "requires_action",
  "archived",
] as const;

export const WEATHER_CONDITIONS = [
  "sunny",
  "cloudy",
  "rainy",
  "snowy",
  "foggy",
] as const;

export const HEALTH_STATUS = [
  "good",
  "minor",
  "warning",
  "danger",
] as const;

// Labels pour l'UI
export const INSPECTION_TYPE_LABELS: Record<InspectionType, string> = {
  pre_trip: "Pré-départ",
  post_trip: "Post-départ",
  emergency: "Urgence",
};

export const FUEL_TYPE_LABELS: Record<FuelType, string> = {
  diesel: "Diesel",
  gnr: "GNR (Gasoil Non Routier)",
  gasoline: "Essence",
  electric: "Électrique",
};

export const CONDITION_LABELS: Record<ConditionStatus, string> = {
  clean: "Propre",
  dirty: "Sale",
  damaged: "Endommagé",
};

export const DEFECT_CATEGORY_LABELS: Record<DefectCategory, string> = {
  tires: "Pneumatiques",
  body: "Carrosserie",
  mechanical: "Mécanique",
  electrical: "Électrique",
  cleanliness: "Propreté",
  lights: "Éclairage",
  fluids: "Fluides",
  safety: "Sécurité",
};

export const DEFECT_SEVERITY_LABELS: Record<DefectSeverity, string> = {
  critical: "Critique",
  warning: "Attention",
  minor: "Mineur",
};

// Labels raccourcis pour le formulaire
export const CATEGORY_LABELS: Record<string, string> = {
  tires: "Pneus",
  body: "Carrosserie",
  mechanical: "Mécanique",
  electrical: "Électrique",
  cleanliness: "Propreté",
  lights: "Éclairage",
  fluids: "Fluides",
  safety: "Sécurité",
};

export const SEVERITY_LABELS: Record<string, string> = {
  critical: "Critique",
  warning: "Avertissement",
  minor: "Mineur",
};

export const INSPECTION_STATUS_LABELS: Record<InspectionStatus, string> = {
  pending_review: "En attente de validation",
  validated: "Validé",
  requires_action: "Action requise",
  archived: "Archivé",
};

export const WEATHER_LABELS: Record<WeatherCondition, string> = {
  sunny: "Ensoleillé",
  cloudy: "Nuageux",
  rainy: "Pluvieux",
  snowy: "Neigeux",
  foggy: "Brouillard",
};

// Couleurs pour l'UI
export const SEVERITY_COLORS: Record<DefectSeverity, { bg: string; text: string; border: string }> = {
  critical: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  warning: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  minor: { bg: "bg-yellow-50", text: "text-yellow-700", border: "border-yellow-200" },
};

export const HEALTH_COLORS: Record<HealthStatus, { bg: string; text: string; icon: string }> = {
  good: { bg: "bg-green-500", text: "text-green-700", icon: "text-green-500" },
  minor: { bg: "bg-yellow-400", text: "text-yellow-700", icon: "text-yellow-500" },
  warning: { bg: "bg-orange-500", text: "text-orange-700", icon: "text-orange-500" },
  danger: { bg: "bg-red-500", text: "text-red-700", icon: "text-red-500" },
};

// ============================================================================
// TYPES PRIMITIFS
// ============================================================================

export type InspectionType = (typeof INSPECTION_TYPE)[number];
export type FuelType = (typeof FUEL_TYPE)[number];
export type ConditionStatus = (typeof CONDITION_STATUS)[number];
export type DefectCategory = (typeof DEFECT_CATEGORY)[number];
export type DefectSeverity = (typeof DEFECT_SEVERITY)[number];
export type InspectionStatus = (typeof INSPECTION_STATUS)[number];
export type WeatherCondition = (typeof WEATHER_CONDITIONS)[number];
export type HealthStatus = (typeof HEALTH_STATUS)[number];

// ============================================================================
// SCHEMAS ZOD (Validation)
// ============================================================================

export const GeolocationSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  accuracy: z.number().min(0).optional(),
  timestamp: z.string().datetime().optional(),
});

export const DefectSchema = z.object({
  category: z.enum(DEFECT_CATEGORY),
  severity: z.enum(DEFECT_SEVERITY),
  description: z.string().min(5).max(500),
  location: z.string().min(2).max(100),
  photo_url: z.string().url().nullable().optional(),
  reported_at: z.string().datetime().default(() => new Date().toISOString()),
});

export const VehicleInspectionSchema = z.object({
  // Identification
  vehicle_id: z.string().uuid(),
  
  // Métriques
  mileage: z.number().int().min(0).max(9999999),
  fuel_level: z.number().int().min(0).max(100).optional(),
  fuel_gasoil: z.number().int().min(0).max(100).optional(),
  fuel_gnr: z.number().int().min(0).max(100).optional(),
  fuel_adblue: z.number().int().min(0).max(100).optional(),
  fuel_type: z.enum(FUEL_TYPE),
  
  // Conditions
  interior_condition: z.enum(CONDITION_STATUS),
  exterior_condition: z.enum(CONDITION_STATUS),
  
  // Températures (optionnelles)
  temp_compartment_1: z.number().min(-50).max(50).nullable().optional(),
  temp_compartment_2: z.number().min(-50).max(50).nullable().optional(),
  
  // Anomalies
  defects: z.array(DefectSchema).default([]),
  
  // Géolocalisation
  geolocation: GeolocationSchema.nullable().optional(),
  
  // Métadonnées
  inspection_type: z.enum(INSPECTION_TYPE).default("pre_trip"),
  weather_conditions: z.enum(WEATHER_CONDITIONS).nullable().optional(),
  digital_signature: z.string().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

export const InspectionStatusUpdateSchema = z.object({
  inspection_id: z.string().uuid(),
  status: z.enum(["validated", "requires_action", "archived"]),
  review_notes: z.string().max(500).optional(),
});

// Types inférés de Zod
export type GeolocationData = z.infer<typeof GeolocationSchema>;
export type Defect = z.infer<typeof DefectSchema>;
export type VehicleInspectionInput = z.infer<typeof VehicleInspectionSchema>;
export type InspectionStatusUpdate = z.infer<typeof InspectionStatusUpdateSchema>;

// Type pour les informations véhicule (QR scan / recherche)
export interface VehicleInfo {
  id: string;
  immat: string;
  marque: string;
  type: string;
}

// ============================================================================
// TYPES BASE DE DONNÉES
// ============================================================================

export interface VehicleInspection {
  id: string;
  vehicle_id: string;
  driver_id: string;
  
  mileage: number;
  fuel_level: number | null;
  fuel_gasoil: number | null;
  fuel_gnr: number | null;
  fuel_adblue: number | null;
  fuel_type: FuelType;
  
  interior_condition: ConditionStatus;
  exterior_condition: ConditionStatus;
  
  temp_compartment_1: number | null;
  temp_compartment_2: number | null;
  
  defects: Defect[];
  geolocation: GeolocationData | null;
  
  inspection_type: InspectionType;
  weather_conditions: WeatherCondition | null;
  digital_signature: string | null;
  notes: string | null;
  
  status: InspectionStatus;
  reviewed_by: string | null;
  reviewed_at: string | null;
  
  created_at: string;
  updated_at: string;
}

export interface VehicleInspectionSummary {
  vehicle_id: string;
  immat: string;
  marque: string;
  type: string;
  vehicle_status: string;
  
  last_mileage: number | null;
  last_fuel_level: number | null;
  health_status: HealthStatus;
  last_inspection_type: InspectionType | null;
  last_inspection_date: string | null;
  health_score: number;
  
  total_inspections: number;
  inspections_last_30d: number;
  open_defects: number;
  inspection_overdue: boolean;
}

export interface OpenDefect {
  inspection_id: string;
  vehicle_id: string;
  immat: string;
  marque: string;
  driver_id: string;
  driver_name: string | null;
  reported_at: string;
  category: DefectCategory;
  severity: DefectSeverity;
  description: string;
  location: string;
  photo_url: string | null;
  inspection_status: InspectionStatus;
}

// ============================================================================
// TYPES UI / COMPONENTS
// ============================================================================

export interface InspectionFormStep {
  id: string;
  title: string;
  description: string;
  isOptional?: boolean;
}

export const INSPECTION_STEPS: InspectionFormStep[] = [
  { id: "vehicle", title: "Véhicule", description: "Scan et identification" },
  { id: "metrics", title: "Métriques", description: "Kilométrage et carburant" },
  { id: "conditions", title: "États", description: "Intérieur et extérieur" },
  { id: "defects", title: "Anomalies", description: "Déclaration des problèmes", isOptional: true },
  { id: "signature", title: "Signature", description: "Validation finale" },
];

export interface QRScanResult {
  vehicle_id: string;
  immat: string;
  marque: string;
  type: string;
}

export interface InspectionStats {
  totalInspections: number;
  criticalDefects: number;
  warningDefects: number;
  averageHealthScore: number;
  inspectionsToday: number;
  pendingReviews: number;
}
