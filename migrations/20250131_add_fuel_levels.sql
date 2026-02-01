-- ============================================================================
-- MIGRATION: Ajout des 3 niveaux de carburant distincts
-- Date: 2026-01-31
-- Description: Gasoil, GNR et AdBlue séparés pour les poids lourds
-- ============================================================================

-- 1. Ajouter les nouvelles colonnes de carburant
-- ----------------------------------------------------------------------------
alter table vehicle_inspections 
  add column if not exists fuel_gasoil integer check (fuel_gasoil between 0 and 100),
  add column if not exists fuel_gnr integer check (fuel_gnr between 0 and 100),
  add column if not exists fuel_adblue integer check (fuel_adblue between 0 and 100);

-- Rendre fuel_level optionnel (pour compatibilité arrière)
alter table vehicle_inspections 
  alter column fuel_level drop not null;

-- 2. Valeurs par défaut pour les enregistrements existants
-- ----------------------------------------------------------------------------
update vehicle_inspections 
set fuel_gasoil = fuel_level 
where fuel_gasoil is null and fuel_level is not null;

-- 3. Mettre à jour la vue analytique avec les nouveaux champs
-- ----------------------------------------------------------------------------
create or replace view vehicle_inspection_summary as
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
      when jsonb_array_length(defects) > 0 and defects @> '[{"severity":"critical"}]' then 'danger'
      when jsonb_array_length(defects) > 0 and defects @> '[{"severity":"warning"}]' then 'warning'
      when jsonb_array_length(defects) > 0 then 'minor'
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

-- 4. Commentaires
-- ----------------------------------------------------------------------------
comment on column vehicle_inspections.fuel_gasoil is 'Niveau de gasoil routier (0-100%)';
comment on column vehicle_inspections.fuel_gnr is 'Niveau de GNR Gasoil Non Routier (0-100%)';
comment on column vehicle_inspections.fuel_adblue is 'Niveau de AdBlue (0-100%)';
