/**
 * 🔱 PILIER 4: GOD MODE
 * Module: Export automatique des inspections
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface InspectionExportData {
  vehicle: {
    immat: string;
    marque: string;
    type: string;
  };
  inspection: {
    created_at: string;
    mileage: number;
    fuel_gasoil: number;
    fuel_gnr: number;
    fuel_adblue: number;
    inspector_name?: string;
    defects: any[];
    health_score: number;
  };
}

/**
 * Génère un PDF professionnel de l'inspection
 */
export function generateInspectionPDF(data: InspectionExportData): Uint8Array {
  const doc = new jsPDF();
  const { vehicle, inspection } = data;

  // En-tête
  doc.setFontSize(20);
  doc.text('RAPPORT D\'INSPECTION VÉHICULE', 105, 20, { align: 'center' });
  
  // Ligne de séparation
  doc.setDrawColor(0, 102, 204);
  doc.setLineWidth(2);
  doc.line(20, 25, 190, 25);

  // Informations véhicule
  doc.setFontSize(14);
  doc.text('Informations Véhicule', 20, 40);
  
  doc.setFontSize(11);
  doc.text(`Immatriculation: ${vehicle.immat}`, 20, 50);
  doc.text(`Marque: ${vehicle.marque}`, 20, 57);
  doc.text(`Type: ${vehicle.type}`, 20, 64);
  doc.text(`Date d'inspection: ${new Date(inspection.created_at).toLocaleDateString('fr-FR')}`, 20, 71);
  doc.text(`Inspecteur: ${inspection.inspector_name || 'Non spécifié'}`, 20, 78);

  // Métriques
  doc.setFontSize(14);
  doc.text('Métriques', 20, 95);
  
  doc.setFontSize(11);
  doc.text(`Kilométrage: ${inspection.mileage.toLocaleString()} km`, 20, 105);
  doc.text(`Niveau Gasoil: ${inspection.fuel_gasoil}%`, 20, 112);
  doc.text(`Niveau GNR: ${inspection.fuel_gnr}%`, 20, 119);
  doc.text(`Niveau AdBlue: ${inspection.fuel_adblue}%`, 20, 126);

  // Score de santé
  const scoreColor = inspection.health_score >= 80 ? '#22c55e' : 
                     inspection.health_score >= 50 ? '#f59e0b' : '#ef4444';
  
  doc.setFillColor(scoreColor);
  doc.roundedRect(140, 100, 50, 30, 5, 5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(16);
  doc.text(`${inspection.health_score}/100`, 165, 115, { align: 'center' });
  doc.setTextColor(0, 0, 0);

  // Anomalies
  doc.setFontSize(14);
  doc.text('Anomalies Signalées', 20, 145);

  if (inspection.defects.length === 0) {
    doc.setFontSize(11);
    doc.setTextColor(34, 197, 94);
    doc.text('✓ Aucune anomalie signalée - Véhicule conforme', 20, 155);
    doc.setTextColor(0, 0, 0);
  } else {
    const tableData = inspection.defects.map((d: any) => [
      d.category.toUpperCase(),
      d.severity.toUpperCase(),
      d.description,
      d.location
    ]);

    autoTable(doc, {
      startY: 155,
      head: [['Catégorie', 'Gravité', 'Description', 'Emplacement']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [0, 102, 204], textColor: 255 },
      styles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 25 },
        2: { cellWidth: 70 },
        3: { cellWidth: 45 }
      }
    });
  }

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Document généré automatiquement - FleetFlow © ${new Date().getFullYear()}`,
      105,
      290,
      { align: 'center' }
    );
  }

  return new Uint8Array(doc.output('arraybuffer'));
}

/**
 * Télécharge le PDF côté client
 */
export function downloadInspectionPDF(data: InspectionExportData, filename?: string) {
  const pdfBytes = generateInspectionPDF(data);
  const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = filename || `inspection-${data.vehicle.immat}-${Date.now()}.pdf`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
