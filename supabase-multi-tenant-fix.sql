-- ================================================
-- FLEETFLOW - CORRECTION MULTI-TENANT (Phase 2.1)
-- Isolation stricte par organisation
-- ================================================
-- ⚠️  À exécuter dans Supabase SQL Editor
-- ✅  Ne supprime aucune donnée existante
-- ================================================

-- ================================================
-- 1. VÉRIFICATION PRÉALABLE ( Lecture seule )
-- ================================================
DO $$
DECLARE
  org_count INT;
  profile_no_org INT;
  vehicle_no_org INT;
  original_user_id UUID;
BEGIN
  SELECT COUNT(*) INTO org_count FROM organizations;
  SELECT COUNT(*) INTO profile_no_org FROM profiles WHERE current_organization_id IS NULL;
  SELECT COUNT(*) INTO vehicle_no_org FROM vehicles WHERE organization_id IS NULL;
  SELECT id INTO original_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
  
  RAISE NOTICE '=== VÉRIFICATION PRÉALABLE ===';
  RAISE NOTICE 'Organisations existantes: %', org_count;
  RAISE NOTICE 'Profils sans organisation: %', profile_no_org;
  RAISE NOTICE 'Véhicules sans organisation: %', vehicle_no_org;
  RAISE NOTICE 'Premier utilisateur (owner): %', original_user_id;
END $$;

-- ================================================
-- 2. S'ASSURER QUE LES COLONNES EXISTENT
-- ================================================

-- Colonnes pour vehicles
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Colonnes pour interventions  
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Colonne pour profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_organization_id UUID REFERENCES organizations(id);

-- ================================================
-- 3. CRÉER L'ORGANISATION PRINCIPALE (si inexistante)
-- ================================================
DO $$
DECLARE
  original_user_id UUID;
  original_email TEXT;
  main_org_id UUID;
BEGIN
  -- Trouver le premier utilisateur (propriétaire original)
  SELECT id, email INTO original_user_id, original_email
  FROM auth.users 
  ORDER BY created_at ASC 
  LIMIT 1;
  
  IF original_user_id IS NULL THEN
    RAISE EXCEPTION 'Aucun utilisateur trouvé dans auth.users';
  END IF;
  
  -- Vérifier s'il a déjà une organisation
  SELECT o.id INTO main_org_id
  FROM organizations o
  WHERE o.created_by = original_user_id
  LIMIT 1;
  
  -- Si pas d'org, la créer
  IF main_org_id IS NULL THEN
    INSERT INTO organizations (
      name, 
      slug, 
      created_by, 
      plan, 
      max_vehicles, 
      max_users, 
      status
    ) VALUES (
      'FleetFlow Principal',
      'org-principale',
      original_user_id,
      'enterprise',
      999999,
      999999,
      'active'
    )
    RETURNING id INTO main_org_id;
    
    RAISE NOTICE 'Organisation principale créée: %', main_org_id;
  ELSE
    RAISE NOTICE 'Organisation principale existante: %', main_org_id;
  END IF;
  
  -- ================================================
  -- 4. LIER TOUS LES PROFILS EXISTANTS À CETTE ORG
  -- ================================================
  
  -- Mettre à jour le profil du propriétaire
  UPDATE profiles 
  SET current_organization_id = main_org_id
  WHERE id = original_user_id;
  
  -- Mettre à jour tous les profils sans org (les employés)
  UPDATE profiles 
  SET current_organization_id = main_org_id
  WHERE current_organization_id IS NULL;
  
  -- S'assurer que le propriétaire est dans organization_members
  INSERT INTO organization_members (organization_id, user_id, role, status, joined_at)
  VALUES (main_org_id, original_user_id, 'owner', 'active', NOW())
  ON CONFLICT (organization_id, user_id) DO NOTHING;
  
  -- ================================================
  -- 5. LIER TOUTES LES DONNÉES EXISTANTES À CETTE ORG
  -- ================================================
  
  -- Véhicules
  UPDATE vehicles 
  SET organization_id = main_org_id,
      created_by = COALESCE(created_by, original_user_id)
  WHERE organization_id IS NULL;
  
  -- Interventions
  UPDATE interventions 
  SET organization_id = main_org_id,
      created_by = COALESCE(created_by, original_user_id)
  WHERE organization_id IS NULL;
  
  RAISE NOTICE '=== MIGRATION TERMINÉE ===';
  RAISE NOTICE 'Organisation principale: %', main_org_id;
  RAISE NOTICE 'Profils mis à jour: %', (SELECT COUNT(*) FROM profiles WHERE current_organization_id = main_org_id);
  RAISE NOTICE 'Véhicules mis à jour: %', (SELECT COUNT(*) FROM vehicles WHERE organization_id = main_org_id);
  RAISE NOTICE 'Interventions mises à jour: %', (SELECT COUNT(*) FROM interventions WHERE organization_id = main_org_id);
  
END $$;

-- ================================================
-- 6. SUPPRIMER LES ANCIENNES POLITIQUES RLS
-- ================================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE tablename IN ('vehicles', 'interventions', 'profiles', 'organizations', 'organization_members')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ================================================
-- 7. FONCTION AUXILIAIRE POUR RLS
-- ================================================
CREATE OR REPLACE FUNCTION get_user_organization()
RETURNS UUID AS $$
  SELECT current_organization_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ================================================
-- 8. CRÉER LES NOUVELLES POLITIQUES RLS STRICTES
-- ================================================

-- VEHICLES : On ne voit que les véhicules de SON organisation
CREATE POLICY veh_org_isolation_select ON vehicles
  FOR SELECT USING (organization_id = get_user_organization());
  
CREATE POLICY veh_org_isolation_insert ON vehicles
  FOR INSERT WITH CHECK (organization_id = get_user_organization());
  
CREATE POLICY veh_org_isolation_update ON vehicles
  FOR UPDATE USING (organization_id = get_user_organization());
  
CREATE POLICY veh_org_isolation_delete ON vehicles
  FOR DELETE USING (organization_id = get_user_organization());

-- INTERVENTIONS : Même isolation
CREATE POLICY int_org_isolation_select ON interventions
  FOR SELECT USING (organization_id = get_user_organization());
  
CREATE POLICY int_org_isolation_insert ON interventions
  FOR INSERT WITH CHECK (organization_id = get_user_organization());
  
CREATE POLICY int_org_isolation_update ON interventions
  FOR UPDATE USING (organization_id = get_user_organization());
  
CREATE POLICY int_org_isolation_delete ON interventions
  FOR DELETE USING (organization_id = get_user_organization());

-- PROFILES : On voit les profils de SON organisation + soi-même
CREATE POLICY prof_org_isolation_select ON profiles
  FOR SELECT USING (
    id = auth.uid() 
    OR current_organization_id = get_user_organization()
  );

CREATE POLICY prof_self_update ON profiles
  FOR UPDATE USING (id = auth.uid());

-- ORGANIZATIONS : On voit uniquement SON organisation
CREATE POLICY org_self_select ON organizations
  FOR SELECT USING (
    id IN (
      SELECT current_organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ORGANIZATION_MEMBERS : On voit les membres de SON organisation
CREATE POLICY mem_org_isolation_select ON organization_members
  FOR SELECT USING (
    organization_id = get_user_organization()
  );

-- ================================================
-- 9. ACTIVER RLS SUR TOUTES LES TABLES
-- ================================================
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Forcer le bypass pour le service role (utilisé par les API admin)
ALTER TABLE vehicles FORCE ROW LEVEL SECURITY;
ALTER TABLE interventions FORCE ROW LEVEL SECURITY;
ALTER TABLE profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE organizations FORCE ROW LEVEL SECURITY;
ALTER TABLE organization_members FORCE ROW LEVEL SECURITY;

-- ================================================
-- 10. VÉRIFICATION FINALE
-- ================================================
SELECT 
  '=== RÉSULTAT FINAL ===' as section,
  '' as detail
UNION ALL
SELECT 
  'Total organisations',
  COUNT(*)::text 
FROM organizations
UNION ALL
SELECT 
  'Profils avec organisation',
  COUNT(*)::text || ' / ' || (SELECT COUNT(*) FROM profiles)::text
FROM profiles 
WHERE current_organization_id IS NOT NULL
UNION ALL
SELECT 
  'Véhicules avec organisation', 
  COUNT(*)::text || ' / ' || (SELECT COUNT(*) FROM vehicles)::text
FROM vehicles 
WHERE organization_id IS NOT NULL
UNION ALL
SELECT 
  'Interventions avec organisation',
  COUNT(*)::text || ' / ' || (SELECT COUNT(*) FROM interventions)::text  
FROM interventions 
WHERE organization_id IS NOT NULL
UNION ALL
SELECT 
  'Politiques RLS créées',
  COUNT(*)::text
FROM pg_policies 
WHERE tablename IN ('vehicles', 'interventions', 'profiles', 'organizations', 'organization_members');
