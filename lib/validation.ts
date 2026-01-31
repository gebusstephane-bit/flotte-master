// Validation centralisée pour les formulaires métier

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// Validation d'une immatriculation française (format simplifié)
export function validateImmat(immat: string): boolean {
  if (!immat || typeof immat !== "string") return false;
  // Formats acceptés: AB-123-CD, AB 123 CD, AB123CD
  const cleaned = immat.trim().toUpperCase().replace(/\s/g, "-");
  return /^[A-Z]{1,2}-?\d{1,4}-?[A-Z]{1,2}$/.test(cleaned) && cleaned.length >= 4;
}

// Validation d'un montant positif
export function validateMontant(montant: number | string): boolean {
  const num = typeof montant === "string" ? Number(montant) : montant;
  return !Number.isNaN(num) && num >= 0 && num < 1000000; // Max 1M EUR
}

// Validation d'une date (format ISO ou Date valide)
export function validateDate(dateStr: string | null): boolean {
  if (!dateStr) return true; // null est valide (optionnel)
  const d = new Date(dateStr);
  return !Number.isNaN(d.getTime());
}

// Validation création intervention
export interface InterventionInput {
  vehicule: string;
  immat: string;
  description: string;
  garage: string;
  montant: number;
}

export function validateInterventionInput(
  input: Partial<InterventionInput>
): ValidationResult<InterventionInput> {
  const { vehicule, immat, description, garage, montant } = input;

  if (!vehicule || vehicule.trim().length < 2) {
    return { success: false, error: "Le nom du véhicule est requis (min 2 caractères)" };
  }

  if (!immat || !validateImmat(immat)) {
    return { success: false, error: "L'immatriculation est invalide" };
  }

  if (!description || description.trim().length < 5) {
    return { success: false, error: "La description est requise (min 5 caractères)" };
  }

  if (!garage || garage.trim().length < 2) {
    return { success: false, error: "Le nom du garage est requis" };
  }

  if (montant === undefined || !validateMontant(montant)) {
    return { success: false, error: "Le montant doit être un nombre positif" };
  }

  return {
    success: true,
    data: {
      vehicule: vehicule.trim(),
      immat: immat.trim().toUpperCase(),
      description: description.trim(),
      garage: garage.trim(),
      montant: Number(montant),
    },
  };
}

// Validation création véhicule
export interface VehicleInput {
  immat: string;
  marque: string;
  type: "Porteur" | "Remorque" | "Tracteur";
  date_ct?: string | null;
  date_tachy?: string | null;
  date_atp?: string | null;
}

export function validateVehicleInput(
  input: Partial<VehicleInput>
): ValidationResult<VehicleInput> {
  const { immat, marque, type, date_ct, date_tachy, date_atp } = input;

  if (!immat || !validateImmat(immat)) {
    return { success: false, error: "L'immatriculation est invalide" };
  }

  if (!marque || marque.trim().length < 2) {
    return { success: false, error: "La marque/modèle est requise" };
  }

  if (!type || !["Porteur", "Remorque", "Tracteur"].includes(type)) {
    return { success: false, error: "Le type de véhicule est invalide" };
  }

  // Validation des dates si fournies
  if (date_ct && !validateDate(date_ct)) {
    return { success: false, error: "Date de contrôle technique invalide" };
  }
  if (date_tachy && !validateDate(date_tachy)) {
    return { success: false, error: "Date de tachygraphe invalide" };
  }
  if (date_atp && !validateDate(date_atp)) {
    return { success: false, error: "Date ATP invalide" };
  }

  return {
    success: true,
    data: {
      immat: immat.trim().toUpperCase(),
      marque: marque.trim(),
      type,
      date_ct: date_ct || null,
      date_tachy: date_tachy || null,
      date_atp: date_atp || null,
    },
  };
}
