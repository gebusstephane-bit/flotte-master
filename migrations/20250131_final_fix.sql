-- ============================================================================
-- MIGRATION FINALE : Corrections Inspection Form
-- Date: 2026-01-31
-- ============================================================================

-- 1. SUPPRIMER LES CONTRAINTES EXISTANTES SI ELLES POSENT PROBLÈME
-- ----------------------------------------------------------------------------
alter table vehicle_inspections 
  alter column fuel_level drop not null;

-- 2. AJOUTER LES COLONNES CARBURANT (avec valeurs par défaut)
-- ----------------------------------------------------------------------------
alter table vehicle_inspections 
  add column if not exists fuel_gasoil integer default 50 check (fuel_gasoil between 0 and 100),
  add column if not exists fuel_gnr integer default 50 check (fuel_gnr between 0 and 100),
  add column if not exists fuel_adblue integer default 50 check (fuel_adblue between 0 and 100);

-- 3. S'ASSURER QUE DEFECTS EST BIEN JSONB
-- ----------------------------------------------------------------------------
-- Vérifier si defects existe et est du bon type
DO $$
BEGIN
  -- Si defects n'existe pas, le créer
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name = 'vehicle_inspections' 
                 AND column_name = 'defects') THEN
    ALTER TABLE vehicle_inspections ADD COLUMN defects jsonb default '[]'::jsonb;
  END IF;
END $$;

-- 4. MIGRER LES DONNÉES EXISTANTES
-- ----------------------------------------------------------------------------
update vehicle_inspections 
set fuel_gasoil = coalesce(fuel_level, 50)
where fuel_gasoil is null;

update vehicle_inspections 
set fuel_gnr = 50 
where fuel_gnr is null;

update vehicle_inspections 
set fuel_adblue = 50 
where fuel_adblue is null;

-- 5. METTRE À JOUR LA VUE ANALYTIQUE
-- ----------------------------------------------------------------------------
drop view if exists vehicle_inspection_summary;

create view vehicle_inspection_summary as
with latest_inspections as (
  select distinct on (vehicle_id) 
    vehicle_id,
    mileage,
    fuel_level,
    fuel_gasoil,
    fuel_gnr,
    fuel_adblue,
    defects,
    status,
    inspection_type,
    created_at,
    case 
      when coalesce(jsonb_array_length(defects), 0) > 0 
           and defects @> '[{"severity":"critical"}]' then 'danger'
      when coalesce(jsonb_array_length(defects), 0) > 0 
           and defects @> '[{"severity":"warning"}]' then 'warning'
      when coalesce(jsonb_array_length(defects), 0) > 0 then 'minor'
      else 'good'
    end as health_status
  from vehicle_inspections
  order by vehicle_id, created_at desc
),
inspection_stats as (
  select 
    vehicle_id,
    count(*) as total_inspections,
    count(*) filter (where created_at > now() - interval '30 days') as inspections_last_30d,
    count(*) filter (where status = 'requires_action') as open_defects
  from vehicle_inspections
  group by vehicle_id
)
select 
  v.id as vehicle_id,
  v.immat,
  v.marque,
  v.type,
  v.status as vehicle_status,
  li.mileage as last_mileage,
  li.fuel_level as last_fuel_level,
  li.fuel_gasoil as last_fuel_gasoil,
  li.fuel_gnr as last_fuel_gnr,
  li.fuel_adblue as last_fuel_adblue,
  li.health_status,
  li.inspection_type as last_inspection_type,
  li.created_at as last_inspection_date,
  case 
    when li.health_status = 'danger' then 0
    when li.health_status = 'warning' then 50
    when li.health_status = 'minor' then 80
    else 100
  end as health_score,
  coalesce(stats.total_inspections, 0) as total_inspections,
  coalesce(stats.inspections_last_30d, 0) as inspections_last_30d,
  coalesce(stats.open_defects, 0) as open_defects,
  case 
    when li.mileage is null then false
    when stats.total_inspections = 0 then false
    when li.created_at < now() - interval '15 days' then true
    else false
  end as inspection_overdue
from vehicles v
left join latest_inspections li on li.vehicle_id = v.id
left join inspection_stats stats on stats.vehicle_id = v.id;

-- 6. COMMENTAIRES
-- ----------------------------------------------------------------------------
comment on column vehicle_inspections.fuel_gasoil is 'Niveau de gasoil routier (0-100%). Par défaut: 50';
comment on column vehicle_inspections.fuel_gnr is 'Niveau de GNR (0-100%). Par défaut: 50';
comment on column vehicle_inspections.fuel_adblue is 'Niveau de AdBlue (0-100%). Par défaut: 50';
comment on column vehicle_inspections.defects is 'JSON array des anomalies: [{category, severity, description, location, reported_at}]';

-- 7. VÉRIFICATION FINALE
-- ----------------------------------------------------------------------------
select 
  'STRUCTURE TABLE' as info,
  column_name,
  data_type,
  column_default,
  is_nullable
from information_schema.columns 
where table_name = 'vehicle_inspections' 
  and table_schema = 'public'
  and column_name in ('fuel_gasoil', 'fuel_gnr', 'fuel_adblue', 'defects', 'fuel_level')
order by ordinal_position;
