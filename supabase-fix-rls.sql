-- ================================================
-- RÉPARATION RLS - PERMETTRE L'ACCÈS AUX DONNÉES SANS ORGANISATION
-- ================================================

-- 1. AJOUTER UNE POLITIQUE FALLBACK POUR LES VÉHICULES SANS ORG
-- Cette politique permet de voir les véhicules qui n'ont pas encore d'organization_id

DROP POLICY IF EXISTS "View vehicles without org fallback" ON vehicles;
CREATE POLICY "View vehicles without org fallback" ON vehicles
  FOR SELECT USING (
    organization_id IS NULL OR
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Modify vehicles without org fallback" ON vehicles;
CREATE POLICY "Modify vehicles without org fallback" ON vehicles
  FOR ALL USING (
    organization_id IS NULL OR
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = vehicles.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'manager')
      AND om.status = 'active'
    )
  );

-- 2. IDEM POUR LES INTERVENTIONS
DROP POLICY IF EXISTS "View interventions without org fallback" ON interventions;
CREATE POLICY "View interventions without org fallback" ON interventions
  FOR SELECT USING (
    organization_id IS NULL OR
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

DROP POLICY IF EXISTS "Modify interventions without org fallback" ON interventions;
CREATE POLICY "Modify interventions without org fallback" ON interventions
  FOR ALL USING (
    organization_id IS NULL OR
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = interventions.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'manager', 'mechanic')
      AND om.status = 'active'
    )
  );

-- 3. DÉSACTIVER LE TRIGGER DE LIMITE POUR L'ADMIN
-- Permet d'ajouter des véhicules même sans organisation
ALTER TABLE vehicles DISABLE TRIGGER check_vehicle_limit;

-- ================================================
-- 4. SCRIPT DE MIGRATION DES DONNÉES EXISTANTES
-- ================================================

-- Créer une organisation par défaut si aucune n'existe
DO $$
DECLARE
  default_org_id UUID;
  first_user_id UUID;
BEGIN
  -- Vérifier s'il y a des véhicules sans organization_id
  IF EXISTS (SELECT 1 FROM vehicles WHERE organization_id IS NULL LIMIT 1) THEN
    
    -- Récupérer le premier utilisateur
    SELECT id INTO first_user_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
    
    IF first_user_id IS NOT NULL THEN
      -- Créer une organisation par défaut
      INSERT INTO organizations (
        name,
        slug,
        created_by,
        plan,
        max_vehicles,
        max_users,
        status
      )
      VALUES (
        'Mon Organisation',
        'default-org-' || substr(md5(random()::text), 1, 8),
        first_user_id,
        'enterprise',
        999999,
        999999,
        'active'
      )
      RETURNING id INTO default_org_id;
      
      -- Ajouter l'utilisateur comme owner
      INSERT INTO organization_members (organization_id, user_id, role, status, joined_at)
      VALUES (default_org_id, first_user_id, 'owner', 'active', NOW())
      ON CONFLICT DO NOTHING;
      
      -- Mettre à jour le profil
      UPDATE profiles 
      SET current_organization_id = default_org_id
      WHERE id = first_user_id;
      
      -- Lier tous les véhicules sans org à cette organisation
      UPDATE vehicles 
      SET organization_id = default_org_id
      WHERE organization_id IS NULL;
      
      -- Lier toutes les interventions sans org
      UPDATE interventions 
      SET organization_id = default_org_id
      WHERE organization_id IS NULL;
      
      RAISE NOTICE '✅ Organisation créée (ID: %) et données migrées', default_org_id;
    END IF;
  END IF;
END $$;

-- 5. VÉRIFICATION FINALE
SELECT 
  'Véhicules avec org' as statut,
  COUNT(*) as count
FROM vehicles 
WHERE organization_id IS NOT NULL
UNION ALL
SELECT 
  'Véhicules sans org',
  COUNT(*)
FROM vehicles 
WHERE organization_id IS NULL
UNION ALL
SELECT 
  'Organisations',
  COUNT(*)
FROM organizations;
