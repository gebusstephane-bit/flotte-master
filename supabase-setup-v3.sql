-- ================================================
-- SCRIPT SQL POUR FLEETMASTER PRO - VERSION 3
-- Suppression de date_mines + Types de véhicules standardisés
-- À exécuter dans Supabase SQL Editor
-- ================================================

-- 1. Créer la table vehicles (si elle n'existe pas déjà)
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  immat TEXT NOT NULL UNIQUE,
  marque TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('Porteur', 'Remorque', 'Tracteur')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Ajouter les colonnes de dates si elles n'existent pas
DO $$
BEGIN
  -- Colonne date_ct (CT annuel - OBLIGATOIRE pour tous)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'date_ct'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN date_ct DATE;
  END IF;

  -- Colonne date_tachy (Tachygraphe - Porteur & Tracteur uniquement)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'date_tachy'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN date_tachy DATE;
  END IF;

  -- Colonne date_atp (ATP - Porteur & Remorque uniquement)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'date_atp'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN date_atp DATE;
  END IF;

  -- Colonne status
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'status'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN status TEXT NOT NULL DEFAULT 'actif' CHECK (status IN ('actif', 'maintenance', 'garage'));
  END IF;
END $$;

-- 3. Supprimer l'ancienne colonne date_mines si elle existe
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'date_mines'
  ) THEN
    ALTER TABLE vehicles DROP COLUMN date_mines;
  END IF;
END $$;

-- 4. Activer RLS (Row Level Security)
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- 5. Créer une politique pour PERMETTRE TOUTES LES OPÉRATIONS (pour le développement)
DROP POLICY IF EXISTS "Enable all access for vehicles" ON vehicles;
CREATE POLICY "Enable all access for vehicles" ON vehicles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 6. Créer la table interventions (si elle n'existe pas déjà)
CREATE TABLE IF NOT EXISTS interventions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicule TEXT NOT NULL,
  immat TEXT NOT NULL,
  description TEXT NOT NULL,
  garage TEXT NOT NULL,
  montant NUMERIC(10, 2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  date_creation TEXT NOT NULL,
  date_prevue TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Activer RLS pour interventions
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

-- 8. Créer une politique pour interventions
DROP POLICY IF EXISTS "Enable all access for interventions" ON interventions;
CREATE POLICY "Enable all access for interventions" ON interventions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 9. Nettoyer les anciennes données et ajouter de nouveaux exemples
DELETE FROM vehicles;

INSERT INTO vehicles (immat, marque, type, date_ct, date_tachy, date_atp, status)
VALUES
  -- Porteur : CT + Tachy + ATP
  ('AB-123-CD', 'Renault Trucks D 12T', 'Porteur', '2026-02-15', '2026-03-20', '2026-06-10', 'actif'),

  -- Tracteur : CT + Tachy (PAS d'ATP)
  ('EF-456-GH', 'Scania R450', 'Tracteur', '2026-01-30', '2026-02-25', NULL, 'actif'),

  -- Remorque : CT + ATP (PAS de Tachy)
  ('IJ-789-KL', 'Schmitz Cargobull', 'Remorque', '2026-05-15', NULL, '2026-08-20', 'actif'),

  -- Porteur avec dates critiques
  ('MN-012-OP', 'MAN TGL 8T', 'Porteur', '2026-01-28', '2026-02-02', '2026-02-05', 'actif'),

  -- Tracteur
  ('QR-345-ST', 'Volvo FH16', 'Tracteur', '2026-07-10', '2026-09-15', NULL, 'actif');

-- 10. Mettre à jour les véhicules existants sans status
UPDATE vehicles SET status = 'actif' WHERE status IS NULL;

-- 11. Vérifier que tout fonctionne
SELECT id, immat, marque, type, date_ct, date_tachy, date_atp, status, created_at
FROM vehicles
ORDER BY type, created_at DESC;

-- ================================================
-- RÈGLES MÉTIER :
-- ================================================
-- Porteur  : CT (annuel) + Tachygraphe + ATP
-- Remorque : CT (annuel) + ATP
-- Tracteur : CT (annuel) + Tachygraphe
-- ================================================
