-- ============================================================================
-- MIGRATION: Rendre driver_id nullable pour tous les types d'inspections
-- Date: 2026-01-31
-- Description: Permettre les inspections avec driver_id NULL
-- ============================================================================

-- Rendre driver_id nullable dans vehicle_inspections
alter table vehicle_inspections 
  alter column driver_id drop not null;

-- Vérifier la structure
select 
  column_name,
  is_nullable,
  data_type
from information_schema.columns 
where table_name = 'vehicle_inspections' 
  and column_name = 'driver_id';
