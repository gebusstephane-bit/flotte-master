-- ================================================
-- RÉPARATION ISOLATION DONNÉES - MULTI-TENANT
-- Ce script assure que chaque utilisateur ne voit QUE ses données
-- ================================================

-- ================================================
-- 1. SUPPRIMER TOUTES LES POLITIQUES RLS EXISTANTES
-- ================================================
DROP POLICY IF EXISTS "View org vehicles" ON vehicles;
DROP POLICY IF EXISTS "Modify org vehicles" ON vehicles;
DROP POLICY IF EXISTS "View vehicles without org fallback" ON vehicles;
DROP POLICY IF EXISTS "Modify vehicles without org fallback" ON vehicles;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON vehicles;
DROP POLICY IF EXISTS "Allow all operations for authenticated" ON vehicles;
DROP POLICY IF EXISTS "Allow all for authenticated" ON vehicles;

DROP POLICY IF EXISTS "View org interventions" ON interventions;
DROP POLICY IF EXISTS "Modify org interventions" ON interventions;
DROP POLICY IF EXISTS "View interventions without org fallback" ON interventions;
DROP POLICY IF EXISTS "Modify interventions without org fallback" ON interventions;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON interventions;
DROP POLICY IF EXISTS "Allow all operations for authenticated" ON interventions;
DROP POLICY IF EXISTS "Allow all for authenticated" ON interventions;

-- ================================================
-- 2. DÉSACTIVER RLS TEMPORAIREMENT
-- ================================================
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE interventions DISABLE ROW LEVEL SECURITY;

-- ================================================
-- 3. CORRIGER LES DONNÉES EXISTANTES
-- S'assurer que chaque utilisateur a UNE SEULE organisation
-- ================================================

-- Pour chaque utilisateur qui a des données sans organization_id
DO $$
DECLARE
  user_record RECORD;
  user_org_id UUID;
  user_email TEXT;
BEGIN
  FOR user_record IN 
    SELECT DISTINCT u.id, u.email 
    FROM auth.users u
    JOIN vehicles v ON v.organization_id IS NULL
    WHERE v.created_at IS NOT NULL
  LOOP
    -- Vérifier si l'utilisateur a déjà une organisation
    SELECT o.id INTO user_org_id
    FROM organizations o
    JOIN organization_members om ON o.id = om.organization_id
    WHERE om.user_id = user_record.id
    LIMIT 1;
    
    -- Si pas d'org, en créer une
    IF user_org_id IS NULL THEN
      INSERT INTO organizations (name, slug, created_by, plan, max_vehicles, max_users, status)
      VALUES (
        'Organisation ' || split_part(user_record.email, '@', 1),
        'org-' || substr(md5(user_record.id::text), 1, 8),
        user_record.id,
        'enterprise',
        999999,
        999999,
        'active'
      )
      RETURNING id INTO user_org_id;
      
      INSERT INTO organization_members (organization_id, user_id, role, status, joined_at)
      VALUES (user_org_id, user_record.id, 'owner', 'active', NOW());
      
      UPDATE profiles SET current_organization_id = user_org_id WHERE id = user_record.id;
    END IF;
    
    -- Lier les véhicules sans org à cette org
    UPDATE vehicles SET organization_id = user_org_id WHERE organization_id IS NULL;
    
  END LOOP;
END $$;

-- Lier les interventions aux orgs des véhicules correspondants
UPDATE interventions i
SET organization_id = v.organization_id
FROM vehicles v
WHERE i.vehicle_id = v.id
  AND i.organization_id IS NULL;

-- Pour les interventions restantes (sans véhicule lié), les lier à la première org
DO $$
DECLARE
  first_org_id UUID;
BEGIN
  SELECT id INTO first_org_id FROM organizations ORDER BY created_at LIMIT 1;
  
  IF first_org_id IS NOT NULL THEN
    UPDATE interventions SET organization_id = first_org_id WHERE organization_id IS NULL;
  END IF;
END $$;

-- ================================================
-- 4. CRÉER DES POLITIQUES RLS STRICTES
-- ================================================

-- Politique pour vehicles : on ne voit que les véhicules de son organisation
CREATE POLICY "View own org vehicles" ON vehicles
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Insert own org vehicles" ON vehicles
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Update own org vehicles" ON vehicles
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Delete own org vehicles" ON vehicles
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Politique pour interventions : on ne voit que les interventions de son organisation
CREATE POLICY "View own org interventions" ON interventions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Insert own org interventions" ON interventions
  FOR INSERT WITH CHECK (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Update own org interventions" ON interventions
  FOR UPDATE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

CREATE POLICY "Delete own org interventions" ON interventions
  FOR DELETE USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- ================================================
-- 5. RÉACTIVER RLS
-- ================================================
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 6. VÉRIFICATION
-- ================================================
SELECT 
  'Organisations' as element, COUNT(*)::text as count FROM organizations
UNION ALL
SELECT 'Membres', COUNT(*)::text FROM organization_members
UNION ALL
SELECT 'Véhicules avec org', COUNT(*)::text FROM vehicles WHERE organization_id IS NOT NULL
UNION ALL
SELECT 'Véhicules SANS org (⚠️)', COUNT(*)::text FROM vehicles WHERE organization_id IS NULL
UNION ALL
SELECT 'Interventions avec org', COUNT(*)::text FROM interventions WHERE organization_id IS NOT NULL
UNION ALL
SELECT 'Interventions SANS org (⚠️)', COUNT(*)::text FROM interventions WHERE organization_id IS NULL;
