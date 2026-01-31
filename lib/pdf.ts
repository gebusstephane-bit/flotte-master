import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import type { Vehicle, Intervention } from "@/lib/supabase";
import { VEHICLE_CONTROLS } from "@/lib/supabase";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function now(): string {
  return new Date().toLocaleString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("fr-FR");
  } catch {
    return d;
  }
}

function fmtMontant(n: number | null | undefined): string {
  return `${(n || 0).toLocaleString("fr-FR")} EUR`;
}

function controlLabel(dateStr: string | null): string {
  if (!dateStr) return "Non défini";
  const date = new Date(dateStr);
  const today = new Date();
  const diffDays = Math.floor((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return `EXPIRÉ (${Math.abs(diffDays)}j)`;
  if (diffDays < 7) return `Critique (${diffDays}j)`;
  if (diffDays < 30) return `Bientôt (${diffDays}j)`;
  return `OK (${diffDays}j)`;
}

function statusLabel(status: string): string {
  switch (status) {
    case "pending": return "En attente";
    case "approved_waiting_rdv": return "RDV à planifier";
    case "planned": return "Planifié";
    case "completed": return "Terminé";
    case "rejected": return "Refusé";
    default: return status;
  }
}

function vehicleStatusLabel(status: string): string {
  switch (status) {
    case "actif": return "Actif";
    case "maintenance": return "En maintenance";
    case "garage": return "Au garage";
    default: return status;
  }
}

function addHeader(doc: jsPDF, title: string, subtitle?: string) {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Brand bar
  doc.setFillColor(15, 23, 42); // slate-900
  doc.rect(0, 0, pageWidth, 28, "F");

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("FLEETFLOW", 14, 12);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(title, 14, 20);

  doc.setFontSize(8);
  doc.text(`Généré le ${now()}`, pageWidth - 14, 20, { align: "right" });

  if (subtitle) {
    doc.setFontSize(8);
    doc.text(subtitle, pageWidth - 14, 12, { align: "right" });
  }

  // Reset
  doc.setTextColor(0, 0, 0);
  doc.setFont("helvetica", "normal");
}

function addFooter(doc: jsPDF) {
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    const pageHeight = doc.internal.pageSize.getHeight();
    const pageWidth = doc.internal.pageSize.getWidth();
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(`FleetFlow — Page ${i}/${pageCount}`, pageWidth / 2, pageHeight - 8, { align: "center" });
  }
}

// ---------------------------------------------------------------------------
// 1) Export Fiche Véhicule
// ---------------------------------------------------------------------------

export function exportVehiclePdf(vehicle: Vehicle, interventions: Intervention[]) {
  const doc = new jsPDF();
  addHeader(doc, "Fiche Véhicule", vehicle.immat);

  let y = 36;
  const controls = VEHICLE_CONTROLS[vehicle.type] || { requiresCT: true, requiresTachy: true, requiresATP: true };

  // Bloc véhicule
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Véhicule", 14, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 } },
    body: [
      ["Immatriculation", vehicle.immat],
      ["Marque / Modèle", vehicle.marque],
      ["Type", vehicle.type],
      ["Statut", vehicleStatusLabel(vehicle.status)],
    ],
  });

  y = (doc as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Bloc contrôles
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Contrôles réglementaires", 14, y);
  y += 2;

  const controlRows: string[][] = [];
  if (controls.requiresCT) {
    controlRows.push(["CT annuel", fmtDate(vehicle.date_ct), controlLabel(vehicle.date_ct)]);
  }
  if (controls.requiresTachy) {
    controlRows.push(["Tachygraphe", fmtDate(vehicle.date_tachy), controlLabel(vehicle.date_tachy)]);
  }
  if (controls.requiresATP) {
    controlRows.push(["ATP (Frigo)", fmtDate(vehicle.date_atp), controlLabel(vehicle.date_atp)]);
  }

  autoTable(doc, {
    startY: y,
    head: [["Contrôle", "Échéance", "Statut"]],
    body: controlRows,
    theme: "striped",
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold" },
  });

  y = (doc as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Bloc maintenance summary
  const totalCost = interventions.reduce((sum, i) => sum + (i.montant || 0), 0);
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Maintenance", 14, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 50 } },
    body: [
      ["Interventions", String(interventions.length)],
      ["Coût total", fmtMontant(totalCost)],
    ],
  });

  y = (doc as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8;

  // Tableau interventions
  if (interventions.length > 0) {
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Historique des interventions", 14, y);
    y += 2;

    autoTable(doc, {
      startY: y,
      head: [["Date", "Description", "Statut", "Garage / Lieu", "Montant", "Devis"]],
      body: interventions.map((i) => [
        fmtDate(i.date_creation || i.created_at),
        i.description,
        statusLabel(i.status),
        i.rdv_lieu || i.garage,
        fmtMontant(i.montant),
        i.devis_path ? "Oui" : "Non",
      ]),
      theme: "striped",
      styles: { fontSize: 8, cellPadding: 2.5 },
      headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold" },
      columnStyles: { 4: { halign: "right" } },
    });
  }

  addFooter(doc);
  doc.save(`FleetFlow_Vehicule_${vehicle.immat}_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ---------------------------------------------------------------------------
// 2) Export Rapport Réparations
// ---------------------------------------------------------------------------

export interface RepairExportMeta {
  title?: string;
  filter?: string;
}

export function exportRepairsPdf(rows: Intervention[], meta?: RepairExportMeta) {
  const doc = new jsPDF({ orientation: "landscape" });
  const title = meta?.title || "Rapport Réparations";
  addHeader(doc, title, meta?.filter || "Toutes dates");

  let y = 36;
  const total = rows.reduce((sum, i) => sum + (i.montant || 0), 0);

  // Summary line
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`${rows.length} intervention(s) — Total : ${fmtMontant(total)}`, 14, y);
  y += 6;

  // Table
  autoTable(doc, {
    startY: y,
    head: [["Véhicule", "Immat", "Description", "Statut", "Date RDV", "Garage / Lieu", "Montant"]],
    body: rows.map((i) => [
      i.vehicule,
      i.immat,
      i.description,
      statusLabel(i.status),
      i.rdv_date ? fmtDate(i.rdv_date) : "-",
      i.rdv_lieu || i.garage,
      fmtMontant(i.montant),
    ]),
    theme: "striped",
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold" },
    columnStyles: { 6: { halign: "right" } },
  });

  // Total row
  const finalY = (doc as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6;
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Total : ${fmtMontant(total)}`, doc.internal.pageSize.getWidth() - 14, finalY, { align: "right" });

  addFooter(doc);
  doc.save(`FleetFlow_Reparations_${new Date().toISOString().slice(0, 10)}.pdf`);
}

// ---------------------------------------------------------------------------
// 3) Export Liste Contrôles
// ---------------------------------------------------------------------------

export function exportControlsPdf(vehicles: Vehicle[]) {
  const doc = new jsPDF({ orientation: "landscape" });
  addHeader(doc, "Liste des contrôles réglementaires", `${vehicles.length} véhicule(s)`);

  let y = 36;

  autoTable(doc, {
    startY: y,
    head: [["Immat", "Marque", "Type", "Statut", "CT annuel", "CT Statut", "Tachygraphe", "Tachy Statut", "ATP", "ATP Statut"]],
    body: vehicles.map((v) => {
      const c = VEHICLE_CONTROLS[v.type] || { requiresCT: true, requiresTachy: true, requiresATP: true };
      return [
        v.immat,
        v.marque,
        v.type,
        vehicleStatusLabel(v.status),
        c.requiresCT ? fmtDate(v.date_ct) : "N/A",
        c.requiresCT ? controlLabel(v.date_ct) : "N/A",
        c.requiresTachy ? fmtDate(v.date_tachy) : "N/A",
        c.requiresTachy ? controlLabel(v.date_tachy) : "N/A",
        c.requiresATP ? fmtDate(v.date_atp) : "N/A",
        c.requiresATP ? controlLabel(v.date_atp) : "N/A",
      ];
    }),
    theme: "striped",
    styles: { fontSize: 7, cellPadding: 2 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: "bold", fontSize: 7 },
  });

  addFooter(doc);
  doc.save(`FleetFlow_Controles_${new Date().toISOString().slice(0, 10)}.pdf`);
}
