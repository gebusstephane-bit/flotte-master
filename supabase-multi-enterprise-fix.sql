-- ================================================
-- CORRECTION MULTI-ENTREPRISE FLEETFLOW
-- Chaque Profil = Une Entreprise Isolée
-- ================================================

-- ================================================
-- 1. SUPPRIMER TOUTES LES POLITIQUES EXISTANTES
-- ================================================
DO $$
DECLARE
  pol RECORD;
BEGIN
  FOR pol IN 
    SELECT policyname, tablename 
    FROM pg_policies 
    WHERE tablename IN ('vehicles', 'interventions', 'organizations', 'organization_members', 'profiles', 'inspections')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- ================================================
-- 2. SUPPRIMER ET RECRÉER LE TRIGGER
-- ================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- ================================================
-- 3. S'ASSURER QUE LES COLONNES EXISTENT
-- ================================================
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);
ALTER TABLE interventions ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS current_organization_id UUID REFERENCES organizations(id);

-- ================================================
-- 4. DÉSACTIVER RLS POUR MODIFICATIONS
-- ================================================
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE interventions DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members DISABLE ROW LEVEL SECURITY;

-- ================================================
-- 5. CORRIGER LES DONNÉES EXISTANTES
-- ================================================
-- S'assurer que chaque utilisateur a UNE organisation
-- Et que ses données sont liées à cette organisation

DO $$
DECLARE
  user_record RECORD;
  user_org_id UUID;
BEGIN
  FOR user_record IN 
    SELECT id, email, created_at 
    FROM auth.users 
    ORDER BY created_at ASC
  LOOP
    -- Vérifier si l'utilisateur a une organisation
    SELECT o.id INTO user_org_id
    FROM organizations o
    WHERE o.created_by = user_record.id
    LIMIT 1;
    
    -- Si pas d'org, en créer une
    IF user_org_id IS NULL THEN
      INSERT INTO organizations (name, slug, created_by, plan, max_vehicles, max_users, status)
      VALUES (
        'Entreprise ' || split_part(user_record.email, '@', 1),
        'ent-' || substr(md5(user_record.id::text), 1, 8),
        user_record.id,
        'enterprise',
        999999,
        999999,
        'active'
      )
      RETURNING id INTO user_org_id;
      
      -- Lier l'utilisateur comme owner
      INSERT INTO organization_members (organization_id, user_id, role, status, joined_at)
      VALUES (user_org_id, user_record.id, 'owner', 'active', NOW());
    END IF;
    
    -- Mettre à jour le profil
    UPDATE profiles 
    SET current_organization_id = user_org_id 
    WHERE id = user_record.id;
    
    -- Lier les véhicules de cet utilisateur à son org
    UPDATE vehicles 
    SET organization_id = user_org_id,
        created_by = user_record.id
    WHERE created_by = user_record.id 
       OR (created_by IS NULL AND organization_id IS NULL);
    
    -- Lier les interventions
    UPDATE interventions 
    SET organization_id = user_org_id,
        created_by = user_record.id
    WHERE created_by = user_record.id 
       OR (created_by IS NULL AND organization_id IS NULL);
       
  END LOOP;
END $$;

-- ================================================
-- 6. RECRÉER LE TRIGGER POUR NOUVEAUX UTILISATEURS
-- ================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
BEGIN
  -- CRÉER UNE NOUVELLE ENTREPRISE VIDE POUR CET UTILISATEUR
  INSERT INTO public.organizations (
    name, 
    slug, 
    created_by, 
    plan, 
    max_vehicles, 
    max_users, 
    status
  )
  VALUES (
    COALESCE(NEW.raw_user_meta_data->>'company_name', 'Mon Entreprise'),
    'ent-' || substr(md5(NEW.id::text), 1, 10),
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'plan', 'starter'),
    CASE 
      WHEN NEW.raw_user_meta_data->>'plan' = 'starter' THEN 10
      WHEN NEW.raw_user_meta_data->>'plan' = 'pro' THEN 50
      ELSE 999999
    END,
    CASE 
      WHEN NEW.raw_user_meta_data->>'plan' = 'starter' THEN 3
      WHEN NEW.raw_user_meta_data->>'plan' = 'pro' THEN 10
      ELSE 999999
    END,
    'active'
  )
  RETURNING id INTO new_org_id;
  
  -- L'UTILISATEUR DEVIENT OWNER DE SON ENTREPRISE
  INSERT INTO public.organization_members (
    organization_id, 
    user_id, 
    role, 
    status, 
    joined_at
  )
  VALUES (
    new_org_id, 
    NEW.id, 
    'owner', 
    'active', 
    NOW()
  );
  
  -- CRÉER SON PROFIL LIÉ À SON ENTREPRISE
  INSERT INTO public.profiles (
    id, 
    email, 
    prenom, 
    nom, 
    role, 
    current_organization_id
  )
  VALUES (
    NEW.id, 
    NEW.email, 
    NEW.raw_user_meta_data->>'first_name',
    NEW.raw_user_meta_data->>'last_name',
    'admin',
    new_org_id
  )
  ON CONFLICT (id) DO UPDATE SET 
    current_organization_id = new_org_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Activer le trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================================================
-- 7. CRÉER LES POLITIQUES RLS POUR ISOLATION
-- ================================================

-- FONCTION AUXILIAIRE : Récupérer l'org ID de l'utilisateur courant
CREATE OR REPLACE FUNCTION get_current_user_org()
RETURNS UUID AS $$
  SELECT current_organization_id FROM profiles WHERE id = auth.uid();
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- POLITIQUES POUR VEHICULES
-- On ne voit/modifie que les véhicules de SON entreprise
CREATE POLICY veh_isolation_select ON vehicles
  FOR SELECT USING (organization_id = get_current_user_org());
  
CREATE POLICY veh_isolation_insert ON vehicles
  FOR INSERT WITH CHECK (organization_id = get_current_user_org());
  
CREATE POLICY veh_isolation_update ON vehicles
  FOR UPDATE USING (organization_id = get_current_user_org());
  
CREATE POLICY veh_isolation_delete ON vehicles
  FOR DELETE USING (organization_id = get_current_user_org());

-- POLITIQUES POUR INTERVENTIONS
CREATE POLICY int_isolation_select ON interventions
  FOR SELECT USING (organization_id = get_current_user_org());
  
CREATE POLICY int_isolation_insert ON interventions
  FOR INSERT WITH CHECK (organization_id = get_current_user_org());
  
CREATE POLICY int_isolation_update ON interventions
  FOR UPDATE USING (organization_id = get_current_user_org());
  
CREATE POLICY int_isolation_delete ON interventions
  FOR DELETE USING (organization_id = get_current_user_org());

-- POLITIQUES POUR PROFILES
-- On ne voit que les profils de SA propre entreprise
CREATE POLICY prof_isolation_select ON profiles
  FOR SELECT USING (
    id = auth.uid() 
    OR current_organization_id = get_current_user_org()
  );

-- POLITIQUES POUR ORGANIZATION_MEMBERS
-- On ne voit que les membres de SON entreprise
CREATE POLICY mem_isolation_select ON organization_members
  FOR SELECT USING (
    user_id = auth.uid()
    OR organization_id = get_current_user_org()
  );

-- ================================================
-- 8. ACTIVER RLS SUR TOUTES LES TABLES
-- ================================================
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE interventions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- ================================================
-- 9. VÉRIFICATION
-- ================================================
SELECT 
  '=== RÉSULTAT ===' as section, '' as info
UNION ALL
SELECT 'Entreprises (organizations)', COUNT(*)::text FROM organizations
UNION ALL
SELECT 'Membres liés', COUNT(*)::text FROM organization_members
UNION ALL
SELECT 'Profils avec org', COUNT(*)::text FROM profiles WHERE current_organization_id IS NOT NULL
UNION ALL
SELECT 'Profils SANS org', COUNT(*)::text FROM profiles WHERE current_organization_id IS NULL
UNION ALL
SELECT 'Véhicules avec org', COUNT(*)::text FROM vehicles WHERE organization_id IS NOT NULL
UNION ALL
SELECT 'Véhicules SANS org', COUNT(*)::text FROM vehicles WHERE organization_id IS NULL;
