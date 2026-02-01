-- ============================================================================
-- MIGRATION: Fix vehicle_mileage_logs pour inspections anonymes
-- Date: 2026-01-31
-- Description: Permettre recorded_by NULL pour les inspections anonymes
-- ============================================================================

-- 1. Rendre recorded_by nullable
alter table vehicle_mileage_logs 
  alter column recorded_by drop not null;

-- 2. Supprimer la contrainte FK existante (si elle existe)
alter table vehicle_mileage_logs 
  drop constraint if exists vehicle_mileage_logs_recorded_by_fkey;

-- 3. Recréer la contrainte FK avec ON DELETE SET NULL
alter table vehicle_mileage_logs 
  add constraint vehicle_mileage_logs_recorded_by_fkey 
  foreign key (recorded_by) references auth.users(id) 
  on delete set null;

-- 4. Mettre à jour le trigger pour gérer les inspections anonymes
-- Si driver_id est NULL, on n'insère pas dans mileage_logs
-- OU on insère avec recorded_by = NULL

create or replace function log_mileage_on_inspection()
returns trigger as $$
begin
  -- Si c'est une inspection anonyme (driver_id NULL), on insère quand même
  -- mais avec recorded_by = NULL
  insert into vehicle_mileage_logs (
    vehicle_id, 
    inspection_id, 
    mileage, 
    recorded_by
  ) values (
    new.vehicle_id, 
    new.id, 
    new.mileage, 
    new.driver_id  -- Sera NULL pour les inspections anonymes
  );
  return new;
end;
$$ language plpgsql;

-- 5. Vérification
select 
  column_name,
  is_nullable,
  data_type
from information_schema.columns 
where table_name = 'vehicle_mileage_logs' 
  and column_name = 'recorded_by';
