// Mock data — fallback uniquement si Supabase est indisponible
// Les types réels sont dans lib/supabase.ts

export const INTERVENTIONS = [
  {
    id: "1",
    vehicule: "Renault Trucks T",
    immat: "AB-123-CD",
    description: "Changement Pare-brise",
    garage: "Garage Renault Trucks - Lyon",
    montant: 450,
    status: "pending",
    dateCreation: "24/01/2026",
  },
  {
    id: "2",
    vehicule: "MAN TGX",
    immat: "EF-456-GH",
    description: "Révision 50 000km complète",
    garage: "MAN Service Center - Marseille",
    montant: 1250,
    status: "approved_waiting_rdv",
    dateCreation: "23/01/2026",
  },
  {
    id: "3",
    vehicule: "Scania R450",
    immat: "IJ-789-KL",
    description: "Remplacement plaquettes de frein avant",
    garage: "Scania Atelier - Paris",
    montant: 680,
    status: "planned",
    dateCreation: "20/01/2026",
    rdv_date: "2026-01-30T09:00:00",
    rdv_lieu: "Scania Atelier - Paris, 15 rue de la Mécanique",
  },
  {
    id: "4",
    vehicule: "Volvo FH16",
    immat: "MN-012-OP",
    description: "Diagnostic moteur - Voyant actif",
    garage: "Volvo Trucks Service - Lille",
    montant: 320,
    status: "completed",
    dateCreation: "18/01/2026",
    rdv_date: "2026-01-20T14:00:00",
    rdv_lieu: "Volvo Trucks Service - Lille",
  },
];
