-- ================================================
-- ISOLATION STRICTE - CHAQUE UTILISATEUR = SES PROPRES DONNÉES
-- ================================================

-- 1. AJOUTER created_by POUR TRACER QUI CRÉE QUOI
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 2. DÉSACTIVER RLS TEMPORAIREMENT POUR MODIFICATIONS
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE interventions DISABLE ROW LEVEL SECURITY;

-- 3. SUPPRIMER TOUTES LES ANCIENNES POLITIQUES
DROP POLICY IF EXISTS "View own org vehicles" ON vehicles;
DROP POLICY IF EXISTS "View own org interventions" ON interventions;
DROP POLICY IF EXISTS "Allow all for authenticated" ON vehicles;
DROP POLICY IF EXISTS "Allow all for authenticated" ON interventions;

-- 4. ISOLER LES DONNÉES EXISTANTES DE L'UTILISATEUR ORIGINAL (VOUS)
DO $$
DECLARE
  original_user_id UUID;
  original_org_id UUID;
BEGIN
  -- TROUVER L'UTILISATEUR LE PLUS ANCIEN (VOUS)
  SELECT id INTO original_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  
  IF original_user_id IS NULL THEN
    RAISE EXCEPTION 'Aucun utilisateur trouvé';
  END IF;
  
  -- TROUVER OU CRÉER VOTRE ORGANISATION PERSONNELLE
  SELECT o.id INTO original_org_id
  FROM organizations o
  JOIN organization_members om ON o.id = om.organization_id
  WHERE om.user_id = original_user_id
    AND om.role = 'owner'
  LIMIT 1;
  
  -- SI VOUS N'AVEZ PAS D'ORG, EN CRÉER UNE
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
    
    -- VOUS ÊTES OWNER
    INSERT INTO organization_members (organization_id, user_id, role, status, joined_at)
    VALUES (original_org_id, original_user_id, 'owner', 'active', NOW());
  END IF;
  
  -- METTRE À JOUR VOTRE PROFIL
  UPDATE profiles 
  SET current_organization_id = original_org_id 
  WHERE id = original_user_id;
  
  -- ASSIGNER TOUS LES VÉHICULES SANS CRÉATEUR À VOUS
  UPDATE vehicles 
  SET created_by = original_user_id, 
      organization_id = original_org_id 
  WHERE created_by IS NULL;
  
  -- ASSIGNER TOUTES LES INTERVENTIONS À VOUS
  UPDATE interventions 
  SET created_by = original_user_id, 
      organization_id = original_org_id 
  WHERE created_by IS NULL;
  
  RAISE NOTICE '✅ DONNÉES ISOLÉES : Organisation % pour utilisateur %', original_org_id, original_user_id;
END $$;

-- 5. FONCTION : RÉCUPÉRER L'ORGANISATION DE L'UTILISATEUR CONNECTÉ
-- CETTE FONCTION EST UTILISÉE PAR LES POLITIQUES RLS
CREATE OR REPLACE FUNCTION get_user_organization()
RETURNS UUID AS $$
DECLARE
  org_id UUID;
BEGIN
  -- RÉCUPÉRER L'ORG DEPUIS LE PROFIL
  SELECT current_organization_id INTO org_id
  FROM profiles
  WHERE id = auth.uid();
  
  -- FALLBACK : PRENDRE LA PREMIÈRE ORG ACTIVE DE L'UTILISATEUR
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

-- 6. CRÉER LES POLITIQUES RLS STRICTES
-- CHAQUE UTILISATEUR NE VOIT QUE LES DONNÉES DE SON ORGANISATION

-- VÉHICULES
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

-- INTERVENTIONS
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

-- 7. RÉACTIVER RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;

-- 8. VÉRIFICATION FINALE
SELECT 
  '=== VÉRIFICATION ===' as info,
  '' as valeur
UNION ALL
SELECT 
  'Organisations créées',
  COUNT(*)::text
FROM organizations
UNION ALL
SELECT 
  'Votre organisation (ID)',
  (SELECT id::text FROM organizations ORDER BY created_at ASC LIMIT 1)
UNION ALL
SELECT 
  'Vos véhicules',
  COUNT(*)::text
FROM vehicles 
WHERE created_by = (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1)
UNION ALL
SELECT 
  'Véhicules sans créateur (⚠️ doit être 0)',
  COUNT(*)::text
FROM vehicles 
WHERE created_by IS NULL
UNION ALL
SELECT 
  'Autres utilisateurs',
  COUNT(*)::text
FROM auth.users 
WHERE id != (SELECT id FROM auth.users ORDER BY created_at ASC LIMIT 1);
