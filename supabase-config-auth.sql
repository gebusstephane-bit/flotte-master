-- ================================================
-- CONFIGURATION AUTH SUPABASE
-- Désactiver confirmation email pour les tests
-- ET s'assurer que l'organisation est créée à l'inscription
-- ================================================

-- ================================================
-- 1. DÉSACTIVER LA CONFIRMATION EMAIL (pour les tests)
-- ================================================
-- Dans Supabase Dashboard : 
-- Authentication > Settings > Email confirmations > OFF
-- 
-- Ou via SQL (si vous avez les droits admin) :
-- UPDATE auth.config SET enable_confirmations = false;

-- ================================================
-- 2. TRIGGER : CRÉER ORGANISATION À L'INSCRIPTION
-- ================================================

-- Fonction qui crée l'organisation quand un user s'inscrit
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  company_name TEXT;
  user_plan TEXT;
  max_veh INTEGER;
  max_users INTEGER;
BEGIN
  -- Récupérer les métadonnées
  company_name := COALESCE(
    NEW.raw_user_meta_data->>'company_name',
    split_part(NEW.email, '@', 1)
  );
  
  user_plan := COALESCE(NEW.raw_user_meta_data->>'plan', 'starter');
  
  -- Définir les limites selon le plan
  IF user_plan = 'starter' THEN
    max_veh := 10;
    max_users := 3;
  ELSIF user_plan = 'pro' THEN
    max_veh := 50;
    max_users := 10;
  ELSE
    max_veh := 999999;
    max_users := 999999;
  END IF;
  
  -- Créer l'organisation
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
    company_name,
    lower(regexp_replace(split_part(NEW.email, '@', 1), '[^a-zA-Z0-9]', '-', 'g')) || '-' || substr(md5(random()::text), 1, 6),
    NEW.id,
    user_plan,
    max_veh,
    max_users,
    'active'
  )
  RETURNING id INTO new_org_id;
  
  -- Ajouter l'utilisateur comme owner
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
  
  -- Créer le profil
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

-- Supprimer l'ancien trigger s'il existe
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Créer le trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ================================================
-- 3. VÉRIFICATION
-- ================================================

-- Vérifier que le trigger existe
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
