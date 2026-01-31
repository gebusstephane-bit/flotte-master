-- ================================================
-- SCRIPT SQL POUR FLEETMASTER PRO - VERSION 2
-- Ajout du CT annuel et de l'ATP
-- À exécuter dans Supabase SQL Editor
-- ================================================

-- 1. Créer la table vehicles (si elle n'existe pas déjà)
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  immat TEXT NOT NULL UNIQUE,
  marque TEXT NOT NULL,
  type TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Ajouter toutes les colonnes de dates si elles n'existent pas
DO $$
BEGIN
  -- Colonne date_mines (CT Mines)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'date_mines'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN date_mines DATE;
  END IF;

  -- Colonne date_ct (CT annuel - valable 1 an)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'date_ct'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN date_ct DATE;
  END IF;

  -- Colonne date_tachy (Tachygraphe)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'date_tachy'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN date_tachy DATE;
  END IF;

  -- Colonne date_atp (ATP - Transport Denrées Périssables)
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

-- 3. Activer RLS (Row Level Security)
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- 4. Créer une politique pour PERMETTRE TOUTES LES OPÉRATIONS (pour le développement)
-- IMPORTANT: En production, vous devriez restreindre cela par utilisateur
DROP POLICY IF EXISTS "Enable all access for vehicles" ON vehicles;
CREATE POLICY "Enable all access for vehicles" ON vehicles
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 5. Créer la table interventions (si elle n'existe pas déjà)
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

-- 6. Activer RLS pour interventions
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

-- 7. Créer une politique pour interventions
DROP POLICY IF EXISTS "Enable all access for interventions" ON interventions;
CREATE POLICY "Enable all access for interventions" ON interventions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- 8. Ajouter quelques données de test (optionnel)
INSERT INTO vehicles (immat, marque, type, date_mines, date_ct, date_tachy, date_atp, status)
VALUES
  ('AB-123-CD', 'Renault Trucks T', 'Porteur 19T', '2026-01-22', '2026-02-15', '2026-03-15', '2026-06-20', 'actif'),
  ('EF-456-GH', 'MAN TGX', 'Tracteur 44T', '2026-02-11', '2026-01-30', '2026-02-16', '2026-04-10', 'actif'),
  ('IJ-789-KL', 'Scania R450', 'Tracteur 44T', '2026-05-10', '2026-06-05', '2026-07-20', '2026-09-15', 'actif')
ON CONFLICT (immat) DO NOTHING;

-- 9. Mettre à jour les véhicules existants sans status
UPDATE vehicles SET status = 'actif' WHERE status IS NULL;

-- 10. Vérifier que tout fonctionne
SELECT id, immat, marque, type, date_mines, date_ct, date_tachy, date_atp, status, created_at
FROM vehicles
ORDER BY created_at DESC;

-- ================================================
-- LÉGENDE DES CONTRÔLES :
-- ================================================
-- date_mines : Contrôle Technique Mines (VGP)
-- date_ct : Contrôle Technique annuel (valable 1 an)
-- date_tachy : Contrôle Tachygraphe (2 ans)
-- date_atp : ATP - Transport Denrées Périssables
-- ================================================
