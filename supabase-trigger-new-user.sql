-- ================================================
-- TRIGGER : CRÉER ORGANISATION VIDE POUR CHAQUE NOUVEL UTILISATEUR
-- ================================================

-- FONCTION APPELÉE QUAND UN UTILISATEUR S'INSCRIT
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  company_name TEXT;
  user_plan TEXT;
  max_veh INTEGER;
  max_users INTEGER;
BEGIN
  -- RÉCUPÉRER INFOS DU FORMULAIRE
  company_name := COALESCE(NEW.raw_user_meta_data->>'company_name', 'Mon Organisation');
  user_plan := COALESCE(NEW.raw_user_meta_data->>'plan', 'starter');
  
  -- LIMITES SELON PLAN
  IF user_plan = 'starter' THEN
    max_veh := 10; max_users := 3;
  ELSIF user_plan = 'pro' THEN
    max_veh := 50; max_users := 10;
  ELSE
    max_veh := 999999; max_users := 999999;
  END IF;
  
  -- CRÉER ORGANISATION VIDE POUR CET UTILISATEUR
  INSERT INTO public.organizations (name, slug, created_by, plan, max_vehicles, max_users, status)
  VALUES (company_name, 'org-' || substr(md5(NEW.id::text), 1, 8), NEW.id, user_plan, max_veh, max_users, 'active')
  RETURNING id INTO new_org_id;
  
  -- AJOUTER COMME OWNER
  INSERT INTO public.organization_members (organization_id, user_id, role, status, joined_at)
  VALUES (new_org_id, NEW.id, 'owner', 'active', NOW());
  
  -- CRÉER PROFIL
  INSERT INTO public.profiles (id, email, prenom, nom, role, current_organization_id)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'first_name', NEW.raw_user_meta_data->>'last_name', 'admin', new_org_id)
  ON CONFLICT (id) DO UPDATE SET current_organization_id = new_org_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- SUPPRIMER ANCIEN TRIGGER
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- CRÉER TRIGGER
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

SELECT '✅ Trigger créé' as status;
