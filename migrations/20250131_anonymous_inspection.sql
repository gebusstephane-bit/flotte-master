-- ============================================================================
-- MIGRATION: Support des inspections anonymes
-- Date: 2026-01-31
-- Description: Permettre les inspections sans compte conducteur
-- ============================================================================

-- 1. Rendre driver_id nullable (pour inspections anonymes)
-- ----------------------------------------------------------------------------
alter table vehicle_inspections 
  alter column driver_id drop not null;

-- 2. Ajouter la colonne inspector_name (pour stocker le nom saisi par l'anonyme)
-- ----------------------------------------------------------------------------
alter table vehicle_inspections 
  add column if not exists inspector_name text;

-- 3. Ajouter 'anonymous_driver' aux valeurs possibles de inspection_type
-- ----------------------------------------------------------------------------
-- Supprimer la contrainte existante et la recréer avec la nouvelle valeur
alter table vehicle_inspections 
  drop constraint if exists vehicle_inspections_inspection_type_check;

alter table vehicle_inspections 
  add constraint vehicle_inspections_inspection_type_check 
  check (inspection_type in ('pre_trip', 'post_trip', 'emergency', 'anonymous_driver'));

-- 4. S'assurer que digital_signature existe (pour la signature)
-- ----------------------------------------------------------------------------
alter table vehicle_inspections 
  add column if not exists digital_signature text;

-- 5. Mettre à jour la fonction de log_mileage pour gérer driver_id NULL
-- ----------------------------------------------------------------------------
create or replace function log_mileage_on_inspection()
returns trigger as $$
begin
  insert into vehicle_mileage_logs (vehicle_id, inspection_id, mileage, recorded_by)
  values (
    new.vehicle_id, 
    new.id, 
    new.mileage, 
    coalesce(new.driver_id, '00000000-0000-0000-0000-000000000000'::uuid)
  );
  return new;
end;
$$ language plpgsql;

-- 6. Mettre à jour les RLS policies pour permettre l'insertion anonyme
-- ----------------------------------------------------------------------------
-- Policy pour permettre les insertions anonymes (via service role)
-- Note: Le service role (supabaseAdmin) bypass RLS de toute façon

-- 7. Commentaires
-- ----------------------------------------------------------------------------
comment on column vehicle_inspections.driver_id is 'ID du conducteur (NULL pour inspections anonymes)';
comment on column vehicle_inspections.inspector_name is 'Nom du conducteur saisi manuellement (pour anonymes)';
comment on column vehicle_inspections.digital_signature is 'Signature digitale en base64 PNG';

-- 8. Vérification
-- ----------------------------------------------------------------------------
select 
  'STRUCTURE TABLE' as info,
  column_name,
  data_type,
  is_nullable
from information_schema.columns 
where table_name = 'vehicle_inspections' 
  and table_schema = 'public'
  and column_name in ('driver_id', 'inspector_name', 'digital_signature', 'inspection_type')
order by ordinal_position;
