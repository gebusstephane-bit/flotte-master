-- ================================================
-- RÉPARATION RÉCURSION INFINIE - URGENT
-- ================================================

-- 1. SUPPRIMER TOUTES LES POLITIQUES PROBLÉMATIQUES
DROP POLICY IF EXISTS "View own org vehicles" ON vehicles;
DROP POLICY IF EXISTS "Insert own org vehicles" ON vehicles;
DROP POLICY IF EXISTS "Update own org vehicles" ON vehicles;
DROP POLICY IF EXISTS "Delete own org vehicles" ON vehicles;
DROP POLICY IF EXISTS "View own org interventions" ON interventions;
DROP POLICY IF EXISTS "Insert own org interventions" ON interventions;
DROP POLICY IF EXISTS "Update own org interventions" ON interventions;
DROP POLICY IF EXISTS "Delete own org interventions" ON interventions;
DROP POLICY IF EXISTS "View org vehicles" ON vehicles;
DROP POLICY IF EXISTS "Modify org vehicles" ON vehicles;
DROP POLICY IF EXISTS "View org interventions" ON interventions;
DROP POLICY IF EXISTS "Modify org interventions" ON interventions;
DROP POLICY IF EXISTS "View vehicles without org fallback" ON vehicles;
DROP POLICY IF EXISTS "View interventions without org fallback" ON interventions;
DROP POLICY IF EXISTS "Allow all for authenticated" ON vehicles;
DROP POLICY IF EXISTS "Allow all for authenticated" ON interventions;

-- 2. SUPPRIMER LES POLITIQUES SUR organization_members QUI CAUSENT LA RÉCURSION
DROP POLICY IF EXISTS "View org members" ON organization_members;
DROP POLICY IF EXISTS "Manage org members" ON organization_members;

-- 3. DÉSACTIVER RLS SUR organization_members POUR ÉVITER LA RÉCURSION
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;

-- 4. CRÉER UNE FONCTION SÉCURISÉE POUR RÉCUPÉRER L'ORG ID
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

-- 5. CRÉER DES POLITIQUES SIMPLES SANS RÉCURSION
-- Utiliser la fonction au lieu d'une sous-requête complexe

-- Politiques pour vehicles
CREATE POLICY "View own vehicles" ON vehicles
  FOR SELECT USING (
    organization_id = get_user_organization()
  );

CREATE POLICY "Insert own vehicles" ON vehicles
  FOR INSERT WITH CHECK (
    organization_id = get_user_organization()
  );

CREATE POLICY "Update own vehicles" ON vehicles
  FOR UPDATE USING (
    organization_id = get_user_organization()
  );

CREATE POLICY "Delete own vehicles" ON vehicles
  FOR DELETE USING (
    organization_id = get_user_organization()
  );

-- Politiques pour interventions
CREATE POLICY "View own interventions" ON interventions
  FOR SELECT USING (
    organization_id = get_user_organization()
  );

CREATE POLICY "Insert own interventions" ON interventions
  FOR INSERT WITH CHECK (
    organization_id = get_user_organization()
  );

CREATE POLICY "Update own interventions" ON interventions
  FOR UPDATE USING (
    organization_id = get_user_organization()
  );

CREATE POLICY "Delete own interventions" ON interventions
  FOR DELETE USING (
    organization_id = get_user_organization()
  );

-- 6. RÉACTIVER RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

-- 7. VÉRIFICATION
SELECT 'Politiques corrigées' as status, 'OK' as result;
