-- ================================================
-- CORRECTION URGENTE : Ajouter les colonnes manquantes
-- Exécutez ce script dans Supabase SQL Editor
-- ================================================

-- 1. Ajouter la colonne date_atp si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'date_atp'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN date_atp DATE;
    RAISE NOTICE 'Colonne date_atp ajoutée avec succès';
  ELSE
    RAISE NOTICE 'Colonne date_atp existe déjà';
  END IF;
END $$;

-- 2. Ajouter la colonne date_ct si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'date_ct'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN date_ct DATE;
    RAISE NOTICE 'Colonne date_ct ajoutée avec succès';
  ELSE
    RAISE NOTICE 'Colonne date_ct existe déjà';
  END IF;
END $$;

-- 3. Ajouter la colonne date_tachy si elle n'existe pas
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'date_tachy'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN date_tachy DATE;
    RAISE NOTICE 'Colonne date_tachy ajoutée avec succès';
  ELSE
    RAISE NOTICE 'Colonne date_tachy existe déjà';
  END IF;
END $$;

-- 4. Supprimer date_mines si elle existe encore
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'vehicles' AND column_name = 'date_mines'
  ) THEN
    ALTER TABLE vehicles DROP COLUMN date_mines;
    RAISE NOTICE 'Colonne date_mines supprimée';
  ELSE
    RAISE NOTICE 'Colonne date_mines n''existe pas';
  END IF;
END $$;

-- 5. Standardiser les types de véhicules existants
UPDATE vehicles SET type = 'Porteur' WHERE type LIKE '%Porteur%' OR type LIKE '%porteur%';
UPDATE vehicles SET type = 'Tracteur' WHERE type LIKE '%Tracteur%' OR type LIKE '%tracteur%';
UPDATE vehicles SET type = 'Remorque' WHERE type LIKE '%Remorque%' OR type LIKE '%remorque%';

-- 6. Ajouter la contrainte sur le type (supprime l'ancienne si elle existe)
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_type_check;
ALTER TABLE vehicles ADD CONSTRAINT vehicles_type_check
  CHECK (type IN ('Porteur', 'Remorque', 'Tracteur'));

-- 7. Vérifier la structure finale
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'vehicles'
ORDER BY ordinal_position;

-- 8. Afficher les véhicules existants
SELECT id, immat, marque, type, date_ct, date_tachy, date_atp, status
FROM vehicles
ORDER BY created_at DESC;
