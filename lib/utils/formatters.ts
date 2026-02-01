/**
 * Utilitaires de formatage centralisés
 * Évite les duplications de logique de formatage dans toute l'application
 */

import { format, parseISO, isValid } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Normalise une immatriculation pour la recherche
 * "AB-123-CD" → "AB123CD"
 */
export function normalizeImmat(immat: string): string {
  return immat.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/**
 * Formate une immatriculation pour l'affichage (avec tirets)
 * "AB123CD" → "AB-123-CD" (format français standard)
 */
export function formatImmat(immat: string): string {
  const cleaned = normalizeImmat(immat);
  // Format XX-XXX-XX pour les plaques françaises
  if (cleaned.length === 7) {
    return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5)}`;
  }
  return cleaned;
}

/**
 * Formate une date ISO en format français lisible
 * "2026-01-31" → "31 janvier 2026"
 */
export function formatDateFR(
  dateString: string | null | undefined,
  formatStr: string = "d MMMM yyyy",
  fallback: string = "Non renseigné"
): string {
  if (!dateString) return fallback;
  try {
    const date = parseISO(dateString);
    if (!isValid(date)) return fallback;
    return format(date, formatStr, { locale: fr });
  } catch {
    return fallback;
  }
}

/**
 * Formate une date avec heure
 * "2026-01-31T14:30:00" → "31 janvier 2026 à 14:30"
 */
export function formatDateTimeFR(
  dateString: string | null | undefined,
  fallback: string = "Non renseigné"
): string {
  return formatDateFR(dateString, "d MMMM yyyy 'à' HH:mm", fallback);
}

/**
 * Formate un kilométrage avec séparateurs de milliers
 * 1234567 → "1 234 567 km"
 */
export function formatMileage(mileage: number | null | undefined): string {
  if (mileage === null || mileage === undefined) return "N/A";
  return `${mileage.toLocaleString("fr-FR")} km`;
}

/**
 * Formate un pourcentage
 * 85 → "85%"
 */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined) return "N/A";
  return `${Math.round(value)}%`;
}

/**
 * Tronque un texte avec ellipsis
 */
export function truncate(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text || "";
  return text.slice(0, maxLength - 3) + "...";
}

/**
 * Formate un numéro de téléphone français
 * 0612345678 → "06 12 34 56 78"
 */
export function formatPhone(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  return cleaned.match(/.{1,2}/g)?.join(" ") || phone;
}
