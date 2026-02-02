-- ================================================
-- MIGRATION: RÉPARATION DES DONNÉES EXISTANTES
-- Ce script crée une organisation pour l'utilisateur existant
-- et lie toutes ses données à cette organisation
-- ================================================

-- ================================================
-- 1. CRÉER UNE ORGANISATION POUR L'UTILISATEUR EXISTANT
-- ================================================

DO $$
DECLARE
  user_record RECORD;
  new_org_id UUID;
  user_email TEXT;
  org_name TEXT;
BEGIN
  -- Pour chaque utilisateur qui n'a pas encore d'organisation
  FOR user_record IN 
    SELECT u.id, u.email 
    FROM auth.users u
    LEFT JOIN organization_members om ON u.id = om.user_id
    WHERE om.id IS NULL
  LOOP
    -- Créer le nom de l'org
    org_name := split_part(user_record.email, '@', 1) || ' Organization';
    
    -- Créer l'organisation avec plan ENTERPRISE (illimité) et gratuit
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
      org_name,
      lower(regexp_replace(split_part(user_record.email, '@', 1), '[^a-zA-Z0-9]', '-', 'g')) || '-' || substr(md5(random()::text), 1, 6),
      user_record.id,
      'enterprise',  -- Plan illimité
      999999,        -- Véhicules illimités
      999999,        -- Utilisateurs illimités
      'active'
    )
    RETURNING id INTO new_org_id;
    
    -- Ajouter l'utilisateur comme OWNER
    INSERT INTO organization_members (
      organization_id, 
      user_id, 
      role, 
      status, 
      joined_at
    )
    VALUES (
      new_org_id, 
      user_record.id, 
      'owner', 
      'active', 
      NOW()
    );
    
    -- Mettre à jour le profil
    UPDATE profiles 
    SET current_organization_id = new_org_id
    WHERE id = user_record.id;
    
    RAISE NOTICE 'Organisation créée pour % (ID: %)', user_record.email, new_org_id;
  END LOOP;
END $$;

-- ================================================
-- 2. LIER LES VÉHICULES EXISTANTS À L'ORGANISATION
-- ================================================

-- Mettre à jour les véhicules qui n'ont pas d'organization_id
UPDATE vehicles v
SET organization_id = (
  SELECT o.id 
  FROM organizations o
  JOIN organization_members om ON o.id = om.organization_id
  WHERE om.user_id = (
    SELECT created_by 
    FROM organizations 
    WHERE created_by IN (SELECT id FROM auth.users)
    LIMIT 1
  )
  LIMIT 1
)
WHERE v.organization_id IS NULL;

-- Si la méthode ci-dessus ne marche pas, on fait une mise à jour directe
-- en liant tous les véhicules sans org à la première org disponible
UPDATE vehicles
SET organization_id = (
  SELECT id FROM organizations ORDER BY created_at LIMIT 1
)
WHERE organization_id IS NULL;

-- ================================================
-- 3. LIER LES INTERVENTIONS EXISTANTES
-- ================================================

UPDATE interventions
SET organization_id = (
  SELECT v.organization_id 
  FROM vehicles v 
  WHERE v.immat = interventions.immat 
  LIMIT 1
)
WHERE organization_id IS NULL;

-- Pour les interventions qui n'ont pas de véhicule correspondant,
-- les lier à la première org
UPDATE interventions
SET organization_id = (
  SELECT id FROM organizations ORDER BY created_at LIMIT 1
)
WHERE organization_id IS NULL;

-- ================================================
-- 4. CRÉER UN ABONNEMENT GRATUIT ENTERPRISE
-- ================================================

INSERT INTO subscriptions (
  organization_id,
  plan,
  status,
  current_period_start,
  current_period_end,
  cancel_at_period_end,
  metadata
)
SELECT 
  o.id,
  'enterprise',
  'active',
  NOW(),
  NOW() + INTERVAL '100 years',  -- Valide 100 ans :-)
  FALSE,
  '{"is_free": true, "developer_account": true}'::jsonb
FROM organizations o
LEFT JOIN subscriptions s ON o.id = s.organization_id
WHERE s.id IS NULL;

-- ================================================
-- 5. VÉRIFICATION
-- ================================================

-- Afficher les stats
SELECT 
  'Organizations' as table_name, 
  COUNT(*) as count 
FROM organizations
UNION ALL
SELECT 
  'Organization Members', 
  COUNT(*) 
FROM organization_members
UNION ALL
SELECT 
  'Vehicles with org', 
  COUNT(*) 
FROM vehicles 
WHERE organization_id IS NOT NULL
UNION ALL
SELECT 
  'Vehicles without org', 
  COUNT(*) 
FROM vehicles 
WHERE organization_id IS NULL
UNION ALL
SELECT 
  'Interventions with org', 
  COUNT(*) 
FROM interventions 
WHERE organization_id IS NOT NULL
UNION ALL
SELECT 
  'Subscriptions', 
  COUNT(*) 
FROM subscriptions;
