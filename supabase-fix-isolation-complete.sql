-- ================================================
-- RÉPARATION COMPLÈTE ISOLATION DONNÉES
-- Chaque utilisateur doit avoir SA PROPRE organisation vide
-- ================================================

-- 1. AJOUTER created_by AUX VÉHICULES SI PAS DÉJÀ FAIT
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 2. DÉSACTIVER RLS TEMPORAIREMENT
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE interventions DISABLE ROW LEVEL SECURITY;

-- 3. SUPPRIMER TOUTES LES POLITIQUES EXISTANTES
DROP POLICY IF EXISTS "View own vehicles" ON vehicles;
DROP POLICY IF EXISTS "View own interventions" ON interventions;
DROP POLICY IF EXISTS "View own org vehicles" ON vehicles;
DROP POLICY IF EXISTS "View own org interventions" ON interventions;
DROP POLICY IF EXISTS "Allow all for authenticated" ON vehicles;
DROP POLICY IF EXISTS "Allow all for authenticated" ON interventions;

-- 4. ASSIGNER LES VÉHICULES EXISTANTS AU PREMIER UTILISATEUR (VOUS)
-- Basé sur l'utilisateur le plus ancien
DO $$
DECLARE
  first_user_id UUID;
  first_org_id UUID;
BEGIN
  -- Trouver l'utilisateur le plus ancien (vous)
  SELECT id INTO first_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  
  IF first_user_id IS NOT NULL THEN
    -- Trouver ou créer l'organisation du premier utilisateur
    SELECT o.id INTO first_org_id
    FROM organizations o
    WHERE o.created_by = first_user_id
    LIMIT 1;
    
    -- Si pas d'org, en créer une
    IF first_org_id IS NULL THEN
      INSERT INTO organizations (name, slug, created_by, plan, max_vehicles, max_users, status)
      VALUES (
        'Mon Organisation',
        'mon-org',
        first_user_id,
        'enterprise',
        999999,
        999999,
        'active'
      )
      RETURNING id INTO first_org_id;
      
      INSERT INTO organization_members (organization_id, user_id, role, status, joined_at)
      VALUES (first_org_id, first_user_id, 'owner', 'active', NOW());
    END IF;
    
    -- Assigner TOUS les véhicules sans created_by au premier utilisateur
    UPDATE vehicles 
    SET created_by = first_user_id, 
        organization_id = first_org_id 
    WHERE created_by IS NULL;
    
    -- Assigner TOUTES les interventions
    UPDATE interventions 
    SET created_by = first_user_id, 
        organization_id = first_org_id 
    WHERE created_by IS NULL;
    
    RAISE NOTICE 'Données assignées au premier utilisateur (ID: %)', first_user_id;
  END IF;
END $$;

-- 5. CRÉER UNE FONCTION POUR RÉCUPÉRER L'ORGANISATION DE L'UTILISATEUR
CREATE OR REPLACE FUNCTION get_user_organization()
RETURNS UUID AS $$
DECLARE
  org_id UUID;
BEGIN
  SELECT o.id INTO org_id
  FROM organizations o
  JOIN organization_members om ON o.id = om.organization_id
  WHERE om.user_id = auth.uid()
    AND om.status = 'active'
  LIMIT 1;
  
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. CRÉER DES POLITIQUES RLS STRICTES
-- On ne voit que les véhicules de SON organisation
CREATE POLICY "View own org vehicles" ON vehicles
  FOR SELECT USING (
    organization_id = get_user_organization()
  );

CREATE POLICY "Insert own org vehicles" ON vehicles
  FOR INSERT WITH CHECK (
    organization_id = get_user_organization()
  );

CREATE POLICY "Update own org vehicles" ON vehicles
  FOR UPDATE USING (
    organization_id = get_user_organization()
  );

CREATE POLICY "Delete own org vehicles" ON vehicles
  FOR DELETE USING (
    organization_id = get_user_organization()
  );

-- Idem pour interventions
CREATE POLICY "View own org interventions" ON interventions
  FOR SELECT USING (
    organization_id = get_user_organization()
  );

CREATE POLICY "Insert own org interventions" ON interventions
  FOR INSERT WITH CHECK (
    organization_id = get_user_organization()
  );

CREATE POLICY "Update own org interventions" ON interventions
  FOR UPDATE USING (
    organization_id = get_user_organization()
  );

CREATE POLICY "Delete own org interventions" ON interventions
  FOR DELETE USING (
    organization_id = get_user_organization()
  );

-- 7. RÉACTIVER RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

-- 8. VÉRIFICATION
SELECT 
  '=== STATISTIQUES ===' as info, '' as valeur
UNION ALL
SELECT 'Vos organisations', COUNT(*)::text FROM organizations WHERE created_by = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1)
UNION ALL
SELECT 'Vos véhicules', COUNT(*)::text FROM vehicles WHERE created_by = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1)
UNION ALL
SELECT 'Vos interventions', COUNT(*)::text FROM interventions WHERE created_by = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1)
UNION ALL
SELECT 'Véhicules sans créateur', COUNT(*)::text FROM vehicles WHERE created_by IS NULL;
