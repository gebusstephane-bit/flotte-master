import { createBrowserClient } from '@supabase/ssr';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createBrowserClient(supabaseUrl, supabaseAnonKey);

// Types pour la base de données
export type VehicleType = 'Porteur' | 'Remorque' | 'Tracteur';

export interface Vehicle {
  id: string;
  immat: string;
  marque: string;
  type: VehicleType;
  date_ct: string | null;
  date_tachy: string | null;
  date_atp: string | null;
  status: 'actif' | 'maintenance' | 'garage';
  created_at?: string;
}

// Règles métier : quels contrôles pour quel type
export const VEHICLE_CONTROLS = {
  Porteur: {
    requiresCT: true,
    requiresTachy: true,
    requiresATP: true,
  },
  Remorque: {
    requiresCT: true,
    requiresTachy: false,
    requiresATP: true,
  },
  Tracteur: {
    requiresCT: true,
    requiresTachy: true,
    requiresATP: false,
  },
} as const;

export type InterventionStatus = 'pending' | 'approved_waiting_rdv' | 'planned' | 'completed' | 'rejected';

export interface Intervention {
  id: string;
  vehicle_id?: string;
  vehicule: string;
  immat: string;
  description: string;
  garage: string;
  montant: number;
  status: InterventionStatus;
  date_creation: string;
  date_prevue?: string | null;
  rdv_date?: string | null;
  rdv_lieu?: string | null;
  devis_path?: string | null;
  devis_filename?: string | null;
  devis_uploaded_at?: string | null;
  rejected_reason?: string | null;
  rejected_at?: string | null;
  created_at?: string;
}

export interface Profile {
  id: string;
  email: string;
  prenom: string;
  nom: string;
  role: import('@/lib/role').UserRole;
  created_at?: string;
}
