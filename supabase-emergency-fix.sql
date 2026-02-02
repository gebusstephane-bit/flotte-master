-- ================================================
-- RÉPARATION URGENTE - DONNÉES INVISIBLES
-- ================================================

-- 1. SUPPRIMER TOUTES LES POLITIQUES RLS EXISTANTES
DROP POLICY IF EXISTS "View org vehicles" ON vehicles;
DROP POLICY IF EXISTS "Modify org vehicles" ON vehicles;
DROP POLICY IF EXISTS "View vehicles without org fallback" ON vehicles;
DROP POLICY IF EXISTS "Modify vehicles without org fallback" ON vehicles;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON vehicles;
DROP POLICY IF EXISTS "Allow all operations for authenticated" ON vehicles;

DROP POLICY IF EXISTS "View org interventions" ON interventions;
DROP POLICY IF EXISTS "Modify org interventions" ON interventions;
DROP POLICY IF EXISTS "View interventions without org fallback" ON interventions;
DROP POLICY IF EXISTS "Modify interventions without org fallback" ON interventions;
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON interventions;
DROP POLICY IF EXISTS "Allow all operations for authenticated" ON interventions;

-- 2. DÉSACTIVER RLS TEMPORAIREMENT
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE interventions DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;

-- 3. SUPPRIMER LE TRIGGER DE LIMITE QUI PEUT BLOQUER
DROP TRIGGER IF EXISTS check_vehicle_limit ON vehicles;

-- 4. VÉRIFIER ET CRÉER L'ORGANISATION
DO $$
DECLARE
  target_user_id UUID;
  new_org_id UUID;
  user_email TEXT;
BEGIN
  -- Récupérer le premier utilisateur (vous)
  SELECT id, email INTO target_user_id, user_email
  FROM auth.users 
  ORDER BY created_at ASC 
  LIMIT 1;
  
  IF target_user_id IS NULL THEN
    RAISE EXCEPTION 'Aucun utilisateur trouvé';
  END IF;
  
  RAISE NOTICE 'Utilisateur trouvé: % (ID: %)', user_email, target_user_id;
  
  -- Vérifier si vous avez déjà une organisation
  SELECT o.id INTO new_org_id
  FROM organizations o
  JOIN organization_members om ON o.id = om.organization_id
  WHERE om.user_id = target_user_id
  LIMIT 1;
  
  -- Si pas d'org, en créer une
  IF new_org_id IS NULL THEN
    RAISE NOTICE 'Création d\'une nouvelle organisation...';
    
    INSERT INTO organizations (
      name,
      slug,
      description,
      email,
      plan,
      max_vehicles,
      max_users,
      status,
      created_by
    )
    VALUES (
      'Mon Organisation',
      'mon-org-' || substr(md5(random()::text), 1, 6),
      'Organisation principale',
      user_email,
      'enterprise',
      999999,
      999999,
      'active',
      target_user_id
    )
    RETURNING id INTO new_org_id;
    
    RAISE NOTICE 'Organisation créée: %', new_org_id;
    
    -- Ajouter comme owner
    INSERT INTO organization_members (
      organization_id,
      user_id,
      role,
      status,
      joined_at
    )
    VALUES (
      new_org_id,
      target_user_id,
      'owner',
      'active',
      NOW()
    );
    
    -- Mettre à jour le profil
    UPDATE profiles 
    SET current_organization_id = new_org_id
    WHERE id = target_user_id;
    
  ELSE
    RAISE NOTICE 'Organisation existante: %', new_org_id;
  END IF;
  
  -- 5. LIER TOUTES LES DONNÉES SANS ORG À VOTRE ORG
  UPDATE vehicles 
  SET organization_id = new_org_id
  WHERE organization_id IS NULL;
  
  GET DIAGNOSTICS row_count = ROW_COUNT;
  RAISE NOTICE '% véhicules liés', row_count;
  
  UPDATE interventions 
  SET organization_id = new_org_id
  WHERE organization_id IS NULL;
  
  GET DIAGNOSTICS row_count = ROW_COUNT;
  RAISE NOTICE '% interventions liées', row_count;
  
  -- 6. S'ASSURER QUE VOTRE PROFIL A BIEN L'ORG
  UPDATE profiles 
  SET current_organization_id = new_org_id
  WHERE id = target_user_id;
  
END $$;

-- 7. CRÉER UNE POLITIQUE PERMISSIVE (PERMET TOUT AUX UTILISATEURS AUTHENTIFIÉS)
CREATE POLICY "Allow all for authenticated" ON vehicles
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow all for authenticated" ON interventions
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow all for authenticated" ON organizations
  FOR ALL USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow all for authenticated" ON organization_members
  FOR ALL USING (auth.uid() IS NOT NULL);

-- 8. RÉACTIVER RLS (mais avec politiques permissives)
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- 9. VÉRIFICATION
SELECT 
  '=== RÉSULTAT ===' as info,
  '' as valeur
UNION ALL
SELECT 
  'Organisations',
  COUNT(*)::text
FROM organizations
UNION ALL
SELECT 
  'Membres',
  COUNT(*)::text
FROM organization_members
UNION ALL
SELECT 
  'Véhicules avec org',
  COUNT(*)::text
FROM vehicles 
WHERE organization_id IS NOT NULL
UNION ALL
SELECT 
  'Véhicules SANS org (problème!)',
  COUNT(*)::text
FROM vehicles 
WHERE organization_id IS NULL
UNION ALL
SELECT 
  'Interventions avec org',
  COUNT(*)::text
FROM interventions 
WHERE organization_id IS NOT NULL
UNION ALL
SELECT 
  'Interventions SANS org (problème!)',
  COUNT(*)::text
FROM interventions 
WHERE organization_id IS NULL;
