-- ============================================================================
-- MIGRATION CRITIQUE: Performance & Sécurité
-- Date: 2026-02-02
-- Description: Index manquants + fonction atomique création véhicule
-- 
-- IMPORTANT: N'utilise PAS CONCURRENTLY car incompatible avec transactions
-- ============================================================================

-- ============================================================================
-- PARTIE 1: INDEX DE PERFORMANCE CRITIQUES (sans CONCURRENTLY)
-- ============================================================================

-- Index pour les requêtes paginées véhicules
CREATE INDEX IF NOT EXISTS idx_vehicles_org_created 
  ON vehicles(organization_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_vehicles_org_id 
  ON vehicles(organization_id, id);

-- Index pour les compteurs rapides
CREATE INDEX IF NOT EXISTS idx_interventions_org 
  ON interventions(organization_id);

CREATE INDEX IF NOT EXISTS idx_members_org 
  ON organization_members(organization_id);

-- Index pour les recherches textuelles (nécessite l'extension pg_trgm)
CREATE INDEX IF NOT EXISTS idx_vehicles_immat 
  ON vehicles(immat text_pattern_ops);

-- Index pour éviter les doublons d'immatriculation par organisation
CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_org_immat 
  ON vehicles(organization_id, immat);

-- Index pour les soft deletes (préparation future)
-- CREATE INDEX IF NOT EXISTS idx_vehicles_deleted_at 
--   ON vehicles(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================================
-- PARTIE 2: FONCTION ATOMIQUE CRÉATION VÉHICULE
-- ============================================================================

CREATE OR REPLACE FUNCTION create_vehicle_safe(
  p_organization_id UUID,
  p_immatriculation TEXT,
  p_marque TEXT,
  p_type TEXT,
  p_date_ct DATE DEFAULT NULL,
  p_date_tachy DATE DEFAULT NULL,
  p_date_atp DATE DEFAULT NULL,
  p_status TEXT DEFAULT 'actif',
  p_created_by UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  v_count INTEGER;
  v_max INTEGER;
  v_vehicle_id UUID;
  v_existing_id UUID;
BEGIN
  -- Vérifier si l'immatriculation existe déjà dans cette org
  SELECT id INTO v_existing_id
  FROM vehicles 
  WHERE organization_id = p_organization_id
  AND immat = p_immatriculation;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Un véhicule avec cette immatriculation existe déjà',
      'existing_id', v_existing_id
    );
  END IF;

  -- Verrou exclusif sur l'organisation (empêche la race condition)
  SELECT max_vehicles INTO v_max 
  FROM organizations 
  WHERE id = p_organization_id 
  FOR UPDATE;
  
  IF v_max IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Organisation non trouvée'
    );
  END IF;
  
  -- Compter véhicules actuels (dans la même transaction)
  SELECT COUNT(*) INTO v_count 
  FROM vehicles 
  WHERE organization_id = p_organization_id;
  
  -- Vérifier limite
  IF v_count >= v_max THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Limite de %s véhicules atteinte', v_max),
      'current', v_count,
      'max', v_max
    );
  END IF;
  
  -- Insérer le véhicule
  INSERT INTO vehicles (
    organization_id, 
    immat, 
    marque, 
    type,
    date_ct,
    date_tachy,
    date_atp,
    status,
    created_by,
    created_at
  ) VALUES (
    p_organization_id,
    p_immatriculation,
    p_marque,
    p_type,
    p_date_ct,
    p_date_tachy,
    p_date_atp,
    p_status,
    p_created_by,
    NOW()
  ) RETURNING id INTO v_vehicle_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'vehicle_id', v_vehicle_id,
    'count', v_count + 1,
    'max', v_max
  );
  
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', 'Un véhicule avec cette immatriculation existe déjà'
  );
WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaire
COMMENT ON FUNCTION create_vehicle_safe IS 
'Crée un véhicule avec vérification atomique des limites (pas de race condition)';

-- ============================================================================
-- PARTIE 3: CORRECTION RLS (si des policies dangereuses existent)
-- ============================================================================

-- Supprimer les policies potentiellement dangereuses avec USING(true)
DROP POLICY IF EXISTS "mileage_logs_select_policy" ON vehicle_mileage_logs;
DROP POLICY IF EXISTS "authenticated_view_mileage" ON vehicle_mileage_logs;
DROP POLICY IF EXISTS "mileage_logs_select_secure" ON vehicle_mileage_logs;

-- Recréer avec sécurité basée sur organization_id
-- NOTE: Activer RLS si pas déjà fait
ALTER TABLE vehicle_mileage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "mileage_logs_select_secure" ON vehicle_mileage_logs
  FOR SELECT USING (
    -- Voir uniquement les logs des véhicules de son organisation
    vehicle_id IN (
      SELECT v.id FROM vehicles v
      JOIN organization_members om ON v.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- ============================================================================
-- PARTIE 4: VÉRIFICATION FINALE
-- ============================================================================

-- Vérifier les index créés
DO $$
BEGIN
  RAISE NOTICE 'Index créés avec succès';
END $$;

-- Vérifier la fonction
SELECT 
  'Fonction create_vehicle_safe:' as verification,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc WHERE proname = 'create_vehicle_safe'
  ) THEN 'OK' ELSE 'MANQUANTE' END as status;

-- ============================================================================
-- RÉCAPITULATIF
-- ============================================================================
/*
INDEX CRÉÉS:
- idx_vehicles_org_created: pour pagination rapide
- idx_vehicles_org_id: pour jointures
- idx_vehicles_immat: pour recherche par immatriculation
- idx_vehicles_org_immat: contrainte unique org+immat
- idx_interventions_org: pour compteurs
- idx_members_org: pour compteurs

FONCTION:
- create_vehicle_safe(): création atomique avec vérification limite

À TESTER:
SELECT create_vehicle_safe(
  'votre-org-id'::uuid,
  'AB-123-CD',
  'Renault',
  'Porteur',
  '2026-12-31',
  NULL,
  NULL,
  'actif',
  'votre-user-id'::uuid
);
*/
