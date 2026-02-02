-- ================================================
-- ISOLATION STRICTE - CORRECTION (POLITIQUES EXISTENT DÉJÀ)
-- ================================================

-- 1. SUPPRIMER TOUTES LES POLITIQUES EXISTANTES SUR VEHICULES ET INTERVENTIONS
DROP POLICY IF EXISTS "View own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Insert own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Update own vehicles" ON vehicles;
DROP POLICY IF EXISTS "Delete own vehicles" ON vehicles;

DROP POLICY IF EXISTS "View own interventions" ON interventions;
DROP POLICY IF EXISTS "Insert own interventions" ON interventions;
DROP POLICY IF EXISTS "Update own interventions" ON interventions;
DROP POLICY IF EXISTS "Delete own interventions" ON interventions;

DROP POLICY IF EXISTS "View own org vehicles" ON vehicles;
DROP POLICY IF EXISTS "View own org interventions" ON interventions;
DROP POLICY IF EXISTS "Allow all for authenticated" ON vehicles;
DROP POLICY IF EXISTS "Allow all for authenticated" ON interventions;

-- 2. AJOUTER created_by SI PAS DÉJÀ FAIT
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 3. DÉSACTIVER RLS TEMPORAIREMENT
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE interventions DISABLE ROW LEVEL SECURITY;

-- 4. ISOLER VOS DONNÉES (UTILISATEUR ORIGINAL)
DO $$
DECLARE
  original_user_id UUID;
  original_org_id UUID;
BEGIN
  -- UTILISATEUR LE PLUS ANCIEN = VOUS
  SELECT id INTO original_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  
  IF original_user_id IS NULL THEN
    RAISE EXCEPTION 'Aucun utilisateur trouvé';
  END IF;
  
  -- TROUVER VOTRE ORGANISATION
  SELECT o.id INTO original_org_id
  FROM organizations o
  JOIN organization_members om ON o.id = om.organization_id
  WHERE om.user_id = original_user_id
    AND om.role = 'owner'
  LIMIT 1;
  
  -- SI PAS D'ORG, EN CRÉER UNE
  IF original_org_id IS NULL THEN
    INSERT INTO organizations (name, slug, created_by, plan, max_vehicles, max_users, status)
    VALUES (
      'Organisation Principale',
      'org-principale-' || substr(md5(original_user_id::text), 1, 6),
      original_user_id,
      'enterprise',
      999999,
      999999,
      'active'
    )
    RETURNING id INTO original_org_id;
    
    INSERT INTO organization_members (organization_id, user_id, role, status, joined_at)
    VALUES (original_org_id, original_user_id, 'owner', 'active', NOW());
  END IF;
  
  -- METTRE À JOUR VOTRE PROFIL
  UPDATE profiles 
  SET current_organization_id = original_org_id 
  WHERE id = original_user_id;
  
  -- ASSIGNER VOS DONNÉES À VOTRE ORG
  UPDATE vehicles 
  SET created_by = original_user_id, 
      organization_id = original_org_id 
  WHERE created_by IS NULL OR created_by = original_user_id;
  
  UPDATE interventions 
  SET created_by = original_user_id, 
      organization_id = original_org_id 
  WHERE created_by IS NULL OR created_by = original_user_id;
  
  RAISE NOTICE '✅ DONNÉES ISOLÉES pour % dans org %', original_user_id, original_org_id;
END $$;

-- 5. FONCTION : RÉCUPÉRER L'ORGANISATION DE L'UTILISATEUR
CREATE OR REPLACE FUNCTION get_user_organization()
RETURNS UUID AS $$
DECLARE
  org_id UUID;
BEGIN
  SELECT current_organization_id INTO org_id
  FROM profiles
  WHERE id = auth.uid();
  
  IF org_id IS NULL THEN
    SELECT om.organization_id INTO org_id
    FROM organization_members om
    WHERE om.user_id = auth.uid()
      AND om.status = 'active'
    LIMIT 1;
  END IF;
  
  RETURN org_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. CRÉER LES POLITIQUES RLS (NOMS UNIQUES)
CREATE POLICY " vehicles_isolation" ON vehicles
  FOR SELECT USING (organization_id = get_user_organization());

CREATE POLICY "vehicles_insert_iso" ON vehicles
  FOR INSERT WITH CHECK (organization_id = get_user_organization());

CREATE POLICY "vehicles_update_iso" ON vehicles
  FOR UPDATE USING (organization_id = get_user_organization());

CREATE POLICY "vehicles_delete_iso" ON vehicles
  FOR DELETE USING (organization_id = get_user_organization());

CREATE POLICY "interventions_isolation" ON interventions
  FOR SELECT USING (organization_id = get_user_organization());

CREATE POLICY "interventions_insert_iso" ON interventions
  FOR INSERT WITH CHECK (organization_id = get_user_organization());

CREATE POLICY "interventions_update_iso" ON interventions
  FOR UPDATE USING (organization_id = get_user_organization());

CREATE POLICY "interventions_delete_iso" ON interventions
  FOR DELETE USING (organization_id = get_user_organization());

-- 7. RÉACTIVER RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

-- 8. VÉRIFICATION
SELECT 
  'Organisations' as element, COUNT(*)::text as count FROM organizations
UNION ALL
SELECT 'Vos véhicules', COUNT(*)::text FROM vehicles WHERE created_by = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1)
UNION ALL
SELECT 'Véhicules sans créateur', COUNT(*)::text FROM vehicles WHERE created_by IS NULL;
