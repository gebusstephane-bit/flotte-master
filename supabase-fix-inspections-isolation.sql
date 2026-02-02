-- ============================================================================
-- CORRECTION : Isolation des inspections par organisation
-- ============================================================================

-- 1. Ajouter organization_id aux tables d'inspection
-- ----------------------------------------------------------------------------
ALTER TABLE vehicle_inspections 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

ALTER TABLE vehicle_mileage_logs 
  ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id);

-- 2. Mettre à jour les données existantes (lier à l'org du véhicule)
-- ----------------------------------------------------------------------------
UPDATE vehicle_inspections vi
SET organization_id = v.organization_id
FROM vehicles v
WHERE vi.vehicle_id = v.id
  AND vi.organization_id IS NULL;

UPDATE vehicle_mileage_logs vml
SET organization_id = v.organization_id
FROM vehicles v
WHERE vml.vehicle_id = v.id
  AND vml.organization_id IS NULL;

-- 3. Supprimer les anciennes politiques RLS sur vehicle_inspections
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "drivers_create_own_inspections" ON vehicle_inspections;
DROP POLICY IF EXISTS "drivers_view_own_inspections" ON vehicle_inspections;
DROP POLICY IF EXISTS "authenticated_view_inspections" ON vehicle_inspections;
DROP POLICY IF EXISTS "admins_update_inspections" ON vehicle_inspections;
DROP POLICY IF EXISTS "authenticated_view_mileage" ON vehicle_mileage_logs;

-- 4. Créer de nouvelles politiques avec isolation par organisation
-- ----------------------------------------------------------------------------

-- Voir les inspections de SON organisation
CREATE POLICY "inspections_org_select" ON vehicle_inspections
  FOR SELECT 
  TO authenticated
  USING (
    organization_id IN (
      SELECT current_organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Créer une inspection dans SON organisation
CREATE POLICY "inspections_org_insert" ON vehicle_inspections
  FOR INSERT 
  TO authenticated
  WITH CHECK (
    organization_id IN (
      SELECT current_organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Modifier une inspection de SON organisation (admin/agent)
CREATE POLICY "inspections_org_update" ON vehicle_inspections
  FOR UPDATE 
  TO authenticated
  USING (
    organization_id IN (
      SELECT current_organization_id FROM profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('admin', 'direction', 'agent_parc')
    )
  );

-- Supprimer une inspection de SON organisation (admin seulement)
CREATE POLICY "inspections_org_delete" ON vehicle_inspections
  FOR DELETE 
  TO authenticated
  USING (
    organization_id IN (
      SELECT current_organization_id FROM profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Mileage logs : voir ceux de SON organisation
CREATE POLICY "mileage_org_select" ON vehicle_mileage_logs
  FOR SELECT 
  TO authenticated
  USING (
    organization_id IN (
      SELECT current_organization_id FROM profiles WHERE id = auth.uid()
    )
  );

-- 5. Forcer RLS
-- ----------------------------------------------------------------------------
ALTER TABLE vehicle_inspections FORCE ROW LEVEL SECURITY;
ALTER TABLE vehicle_mileage_logs FORCE ROW LEVEL SECURITY;

-- 6. Vérification
-- ----------------------------------------------------------------------------
SELECT 
  'Inspections avec org' as label,
  COUNT(*)::text || ' / ' || (SELECT COUNT(*) FROM vehicle_inspections)::text as count
FROM vehicle_inspections 
WHERE organization_id IS NOT NULL
UNION ALL
SELECT 
  'Mileage logs avec org',
  COUNT(*)::text || ' / ' || (SELECT COUNT(*) FROM vehicle_mileage_logs)::text
FROM vehicle_mileage_logs 
WHERE organization_id IS NOT NULL;
