/**
 * Export CSV pour Fleet-Master
 * Format: séparateur ; (FR), UTF-8 avec BOM pour Excel
 */

import type { Vehicle, Intervention } from "@/lib/supabase";

// Helper pour échapper les champs CSV
function escapeCsv(value: string | number | null | undefined): string {
  if (value == null) return "";
  const str = String(value);
  // Si contient des caractères spéciaux, entourer de guillemets et doubler les guillemets
  if (str.includes(";") || str.includes('"') || str.includes("\n") || str.includes("\r")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

// Helper pour créer le contenu CSV
function createCsv(rows: string[][]): string {
  // BOM UTF-8 pour Excel
  const BOM = "\uFEFF";
  const lines = rows.map((row) => row.map(escapeCsv).join(";"));
  return BOM + lines.join("\r\n");
}

// Helper pour télécharger
function downloadCsv(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", filename);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Format date pour CSV
function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("fr-FR");
  } catch {
    return dateStr;
  }
}

/**
 * Export véhicules au format CSV
 */
export function exportVehiclesCsv(vehicles: Vehicle[]) {
  const headers = [
    "Immatriculation",
    "Marque",
    "Type",
    "Statut",
    "Date CT",
    "Date Tachygraphe",
    "Date ATP",
    "Date création",
  ];

  const rows = vehicles.map((v) => [
    v.immat,
    v.marque,
    v.type,
    v.status,
    formatDate(v.date_ct),
    formatDate(v.date_tachy),
    formatDate(v.date_atp),
    formatDate(v.created_at),
  ]);

  const csv = createCsv([headers, ...rows]);
  const date = new Date().toISOString().slice(0, 10);
  downloadCsv(csv, `fleet-master_vehicules_${date}.csv`);
}

/**
 * Export interventions au format CSV
 */
export function exportInterventionsCsv(interventions: Intervention[]) {
  const headers = [
    "ID",
    "Véhicule",
    "Immatriculation",
    "Description",
    "Garage",
    "Montant (EUR)",
    "Statut",
    "Date création",
    "Date RDV",
    "Lieu RDV",
    "Devis",
  ];

  const statusLabels: Record<string, string> = {
    pending: "En attente",
    approved_waiting_rdv: "Validé - RDV à planifier",
    planned: "Planifié",
    completed: "Terminé",
    rejected: "Refusé",
  };

  const rows = interventions.map((i) => [
    i.id,
    i.vehicule,
    i.immat,
    i.description,
    i.garage,
    String(i.montant),
    statusLabels[i.status] || i.status,
    formatDate(i.date_creation || i.created_at),
    formatDate(i.rdv_date),
    i.rdv_lieu || "",
    i.devis_path ? "Oui" : "Non",
  ]);

  const csv = createCsv([headers, ...rows]);
  const date = new Date().toISOString().slice(0, 10);
  downloadCsv(csv, `fleet-master_interventions_${date}.csv`);
}

/**
 * Export contrôles réglementaires (vue alertes)
 */
export function exportControlsCsv(vehicles: Vehicle[]) {
  const today = new Date();
  
  const headers = [
    "Immatriculation",
    "Marque",
    "Type",
    "CT Annuel",
    "Jours restants CT",
    "Tachygraphe",
    "Jours restants Tachy",
    "ATP",
    "Jours restants ATP",
    "Alerte",
  ];

  function getDaysUntil(dateStr: string | null): number | null {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const diff = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  }

  function getAlert(days: number | null): string {
    if (days == null) return "Non défini";
    if (days < 0) return `PÉRIMÉ (${Math.abs(days)}j)`;
    if (days < 7) return `CRITIQUE (${days}j)`;
    if (days < 30) return `Bientôt (${days}j)`;
    return `OK (${days}j)`;
  }

  const rows = vehicles.map((v) => {
    const daysCT = getDaysUntil(v.date_ct);
    const daysTachy = getDaysUntil(v.date_tachy);
    const daysATP = getDaysUntil(v.date_atp);
    
    const hasAlert = 
      (daysCT != null && daysCT < 30) ||
      (daysTachy != null && daysTachy < 30) ||
      (daysATP != null && daysATP < 30);

    return [
      v.immat,
      v.marque,
      v.type,
      formatDate(v.date_ct),
      daysCT != null ? daysCT.toString() : "",
      formatDate(v.date_tachy),
      daysTachy != null ? daysTachy.toString() : "",
      formatDate(v.date_atp),
      daysATP != null ? daysATP.toString() : "",
      hasAlert ? "ALERTE" : "OK",
    ];
  });

  const csv = createCsv([headers, ...rows]);
  const date = new Date().toISOString().slice(0, 10);
  downloadCsv(csv, `fleet-master_controles_${date}.csv`);
}
