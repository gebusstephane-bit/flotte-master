-- ================================================
-- SCRIPT SQL FLEETFLOW - VERSION 4: MULTI-TENANT + STRIPE
-- Isolation des données par organisation
-- ================================================

-- ================================================
-- 1. TABLE ORGANIZATIONS (Tenants)
-- ================================================

CREATE TABLE IF NOT EXISTS organizations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  description TEXT,
  -- Contact
  email TEXT,
  phone TEXT,
  address TEXT,
  -- Branding
  logo_url TEXT,
  primary_color TEXT DEFAULT '#0066FF',
  
  -- Plan et limites
  plan TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  max_vehicles INTEGER DEFAULT 10,
  max_users INTEGER DEFAULT 3,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Créateur (référence optionnelle)
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Index pour les recherches par slug
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);

-- ================================================
-- 2. TABLE SUBSCRIPTIONS (Stripe)
-- ================================================

CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  
  -- Stripe IDs
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  stripe_price_id TEXT,
  
  -- Plan details
  plan TEXT NOT NULL CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  status TEXT NOT NULL DEFAULT 'incomplete' CHECK (status IN (
    'incomplete', 'incomplete_expired', 'trialing', 'active', 
    'past_due', 'canceled', 'unpaid', 'paused'
  )),
  
  -- Billing
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  cancel_at_period_end BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index Stripe
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_subscription ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_organization ON subscriptions(organization_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);

-- ================================================
-- 3. TABLE ORGANIZATION_MEMBERS (Users <-> Organizations)
-- ================================================

CREATE TABLE IF NOT EXISTS organization_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Role dans l'organisation
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'manager', 'mechanic', 'member')),
  
  -- Status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'invited', 'suspended')),
  
  -- Timestamps
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  invited_at TIMESTAMP WITH TIME ZONE,
  invited_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Unique constraint: un user ne peut être qu'une fois dans une org
  UNIQUE(organization_id, user_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_members_organization ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_role ON organization_members(role);

-- ================================================
-- 4. AJOUTER ORGANIZATION_ID AUX TABLES EXISTANTES
-- ================================================

-- Véhicules
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Interventions
ALTER TABLE interventions 
ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;

-- Inspections (si la table existe)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'inspections'
  ) THEN
    ALTER TABLE inspections 
    ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE;
  END IF;
END $$;

-- Profiles (ajouter lien vers org)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS current_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- ================================================
-- 5. INDEXES POUR PERFORMANCES
-- ================================================

CREATE INDEX IF NOT EXISTS idx_vehicles_organization ON vehicles(organization_id);
CREATE INDEX IF NOT EXISTS idx_interventions_organization ON interventions(organization_id);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'inspections'
  ) THEN
    CREATE INDEX IF NOT EXISTS idx_inspections_organization ON inspections(organization_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_profiles_current_org ON profiles(current_organization_id);

-- ================================================
-- 6. ROW LEVEL SECURITY (RLS) - ISOLATION DES DONNÉES
-- ================================================

-- Activer RLS sur organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Politique: les membres peuvent voir leur organisation
DROP POLICY IF EXISTS "Organization members can view their org" ON organizations;
CREATE POLICY "Organization members can view their org" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = organizations.id 
      AND user_id = auth.uid()
      AND status = 'active'
    )
  );

-- Politique: seul le owner peut modifier
DROP POLICY IF EXISTS "Organization owners can update" ON organizations;
CREATE POLICY "Organization owners can update" ON organizations
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM organization_members 
      WHERE organization_id = organizations.id 
      AND user_id = auth.uid()
      AND role = 'owner'
      AND status = 'active'
    )
  );

-- Activer RLS sur organization_members
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

-- Politique: voir les membres de son org
DROP POLICY IF EXISTS "View org members" ON organization_members;
CREATE POLICY "View org members" ON organization_members
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Politique: admin/owner peuvent gérer les membres
DROP POLICY IF EXISTS "Manage org members" ON organization_members;
CREATE POLICY "Manage org members" ON organization_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
    )
  );

-- Activer RLS sur subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Politique: voir les subs de son org
DROP POLICY IF EXISTS "View org subscriptions" ON subscriptions;
CREATE POLICY "View org subscriptions" ON subscriptions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Politique: seuls admin/owner peuvent voir les détails stripe
DROP POLICY IF EXISTS "Manage org subscriptions" ON subscriptions;
CREATE POLICY "Manage org subscriptions" ON subscriptions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = subscriptions.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
      AND om.status = 'active'
    )
  );

-- Mettre à jour RLS sur vehicles (isolation par organization)
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON vehicles;
DROP POLICY IF EXISTS "Allow all operations for authenticated" ON vehicles;
DROP POLICY IF EXISTS "View org vehicles" ON vehicles;
DROP POLICY IF EXISTS "Modify org vehicles" ON vehicles;

-- Nouvelle politique: voir uniquement les véhicules de son org
CREATE POLICY "View org vehicles" ON vehicles
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Politique: modifier uniquement si admin/manager
CREATE POLICY "Modify org vehicles" ON vehicles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = vehicles.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'manager')
      AND om.status = 'active'
    )
  );

-- Mettre à jour RLS sur interventions
DROP POLICY IF EXISTS "Enable all access for authenticated users" ON interventions;
DROP POLICY IF EXISTS "Allow all operations for authenticated" ON interventions;
DROP POLICY IF EXISTS "View org interventions" ON interventions;
DROP POLICY IF EXISTS "Modify org interventions" ON interventions;

-- Nouvelle politique: voir uniquement les interventions de son org
CREATE POLICY "View org interventions" ON interventions
  FOR SELECT USING (
    organization_id IN (
      SELECT organization_id FROM organization_members 
      WHERE user_id = auth.uid() AND status = 'active'
    )
  );

-- Politique: modifier uniquement si admin/manager/mecanico
CREATE POLICY "Modify org interventions" ON interventions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members om
      WHERE om.organization_id = interventions.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin', 'manager', 'mechanic')
      AND om.status = 'active'
    )
  );

-- ================================================
-- 7. FONCTIONS TRIGGERS
-- ================================================

-- Fonction pour mettre à jour updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers pour updated_at
DROP TRIGGER IF EXISTS update_organizations_updated_at ON organizations;
CREATE TRIGGER update_organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- 8. FONCTION: CRÉER ORGANISATION À L'INSCRIPTION
-- ================================================

CREATE OR REPLACE FUNCTION create_organization_for_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID;
  user_email TEXT;
  org_name TEXT;
BEGIN
  -- Récupérer l'email de l'utilisateur
  SELECT email INTO user_email FROM auth.users WHERE id = NEW.id;
  
  -- Créer un nom d'org basé sur l'email
  org_name := COALESCE(NEW.raw_user_meta_data->>'company_name', split_part(user_email, '@', 1));
  
  -- Créer l'organisation
  INSERT INTO organizations (name, slug, created_by, plan, max_vehicles, max_users)
  VALUES (
    org_name,
    lower(regexp_replace(split_part(user_email, '@', 1), '[^a-zA-Z0-9]', '-', 'g')) || '-' || substr(md5(random()::text), 1, 6),
    NEW.id,
    'free',
    3,
    1
  )
  RETURNING id INTO new_org_id;
  
  -- Ajouter l'utilisateur comme owner
  INSERT INTO organization_members (organization_id, user_id, role, status, joined_at)
  VALUES (new_org_id, NEW.id, 'owner', 'active', NOW());
  
  -- Mettre à jour le profil avec l'org courante
  UPDATE profiles 
  SET current_organization_id = new_org_id
  WHERE id = NEW.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ================================================
-- 9. FONCTION: VÉRIFIER LES LIMITES DU PLAN
-- ================================================

CREATE OR REPLACE FUNCTION check_organization_limits()
RETURNS TRIGGER AS $$
DECLARE
  vehicle_count INTEGER;
  max_allowed INTEGER;
BEGIN
  -- Compter les véhicules actuels de l'org
  SELECT COUNT(*) INTO vehicle_count
  FROM vehicles
  WHERE organization_id = NEW.organization_id;
  
  -- Récupérer la limite
  SELECT max_vehicles INTO max_allowed
  FROM organizations
  WHERE id = NEW.organization_id;
  
  -- Vérifier
  IF vehicle_count >= max_allowed THEN
    RAISE EXCEPTION 'Limite de véhicules atteinte pour cette organisation. Passez à un plan supérieur.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour vérifier les limites avant insert
DROP TRIGGER IF EXISTS check_vehicle_limit ON vehicles;
CREATE TRIGGER check_vehicle_limit
  BEFORE INSERT ON vehicles
  FOR EACH ROW EXECUTE FUNCTION check_organization_limits();
