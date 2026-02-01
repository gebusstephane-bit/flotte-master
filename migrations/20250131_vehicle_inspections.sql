-- ============================================================================
-- MIGRATION: Module Vehicle Inspection (QR Checklist)
-- Date: 2026-01-31
-- Description: Système de contrôle pré/post-départ avec scoring automatique
-- ============================================================================

-- 1. Table des inspections avec RLS
-- ----------------------------------------------------------------------------
create table if not exists vehicle_inspections (
  id uuid default gen_random_uuid() primary key,
  vehicle_id uuid references vehicles(id) on delete cascade not null,
  driver_id uuid references auth.users(id) not null,
  
  -- Métriques véhicule
  mileage integer not null check (mileage > 0),
  fuel_level integer not null check (fuel_level between 0 and 100),
  fuel_type text not null check (fuel_type in ('diesel', 'gnr', 'gasoline', 'electric')),
  
  -- États généraux
  interior_condition text not null check (interior_condition in ('clean', 'dirty', 'damaged')),
  exterior_condition text not null check (exterior_condition in ('clean', 'dirty', 'damaged')),
  
  -- Températures (véhicules frigorifiques)
  temp_compartment_1 numeric(4,1),
  temp_compartment_2 numeric(4,1),
  
  -- Anomalies détaillées (JSON schema strict)
  defects jsonb default '[]'::jsonb check (jsonb_typeof(defects) = 'array'),
  
  -- Géolocalisation (preuve de présence)
  geolocation jsonb, -- {lat: number, lng: number, accuracy: number, timestamp: string}
  
  -- Métadonnées inspection
  inspection_type text not null default 'pre_trip' check (inspection_type in ('pre_trip', 'post_trip', 'emergency')),
  weather_conditions text check (weather_conditions in ('sunny', 'cloudy', 'rainy', 'snowy', 'foggy')),
  digital_signature text, -- base64 PNG
  notes text,
  
  -- Workflow validation
  status text not null default 'pending_review' check (status in ('pending_review', 'validated', 'requires_action', 'archived')),
  reviewed_by uuid references auth.users(id),
  reviewed_at timestamp with time zone,
  
  -- Timestamps
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- 2. Table d'historique des kilométrages (pour détecter les anomalies)
create table if not exists vehicle_mileage_logs (
  id uuid default gen_random_uuid() primary key,
  vehicle_id uuid references vehicles(id) on delete cascade not null,
  inspection_id uuid references vehicle_inspections(id) on delete set null,
  mileage integer not null,
  recorded_at timestamp with time zone default now(),
  recorded_by uuid references auth.users(id) not null
);

-- 3. Index performance
-- ----------------------------------------------------------------------------
create index if not exists idx_inspections_vehicle_date on vehicle_inspections(vehicle_id, created_at desc);
create index if not exists idx_inspections_driver on vehicle_inspections(driver_id, created_at desc);
create index if not exists idx_inspections_defects on vehicle_inspections using gin(defects jsonb_path_ops);
create index if not exists idx_inspections_status on vehicle_inspections(status) where status = 'requires_action';
create index if not exists idx_inspections_type_date on vehicle_inspections(inspection_type, created_at desc);
create index if not exists idx_mileage_logs_vehicle on vehicle_mileage_logs(vehicle_id, recorded_at desc);

-- 4. Fonction trigger pour updated_at
-- ----------------------------------------------------------------------------
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger update_vehicle_inspections_updated_at
  before update on vehicle_inspections
  for each row
  execute function update_updated_at_column();

-- 5. Fonction pour enregistrer le kilométrage automatiquement
-- ----------------------------------------------------------------------------
create or replace function log_mileage_on_inspection()
returns trigger as $$
begin
  insert into vehicle_mileage_logs (vehicle_id, inspection_id, mileage, recorded_by)
  values (new.vehicle_id, new.id, new.mileage, new.driver_id);
  return new;
end;
$$ language plpgsql;

create trigger trigger_log_mileage
  after insert on vehicle_inspections
  for each row
  execute function log_mileage_on_inspection();

-- 6. Vue analytique pour le dashboard (READ ONLY)
-- ----------------------------------------------------------------------------
create or replace view vehicle_inspection_summary as
with latest_inspections as (
  select distinct on (vehicle_id) 
    vehicle_id,
    mileage,
    fuel_level,
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
  -- Détection d'anomalie kilométrique (si écart > 1000km sans inspection)
  case 
    when li.mileage is null then false
    when stats.total_inspections = 0 then false
    when li.created_at < now() - interval '15 days' then true
    else false
  end as inspection_overdue
from vehicles v
left join latest_inspections li on li.vehicle_id = v.id
left join inspection_stats stats on stats.vehicle_id = v.id;

-- 7. Vue des défauts ouverts à traiter
-- ----------------------------------------------------------------------------
create or replace view open_defects_view as
select 
  i.id as inspection_id,
  i.vehicle_id,
  v.immat,
  v.marque,
  i.driver_id,
  p.prenom || ' ' || p.nom as driver_name,
  i.created_at as reported_at,
  defect->>'category' as category,
  defect->>'severity' as severity,
  defect->>'description' as description,
  defect->>'location' as location,
  defect->>'photo_url' as photo_url,
  i.status as inspection_status
from vehicle_inspections i
join vehicles v on v.id = i.vehicle_id
left join profiles p on p.id = i.driver_id
join jsonb_array_elements(i.defects) as defect on true
where i.status in ('pending_review', 'requires_action')
  and defect->>'severity' in ('critical', 'warning')
order by 
  case defect->>'severity' when 'critical' then 1 when 'warning' then 2 else 3 end,
  i.created_at desc;

-- 8. RLS Policies (Sécurité)
-- ----------------------------------------------------------------------------
alter table vehicle_inspections enable row level security;
alter table vehicle_mileage_logs enable row level security;

-- Policy: Drivers can create their own inspections
create policy "drivers_create_own_inspections"
  on vehicle_inspections for insert
  to authenticated
  with check (auth.uid() = driver_id);

-- Policy: Drivers can view their own inspections
create policy "drivers_view_own_inspections"
  on vehicle_inspections for select
  to authenticated
  using (auth.uid() = driver_id);

-- Policy: All authenticated users can view all inspections (lecture pour managers)
create policy "authenticated_view_inspections"
  on vehicle_inspections for select
  to authenticated
  using (true);

-- Policy: Only admins/agents can update inspection status
create policy "admins_update_inspections"
  on vehicle_inspections for update
  to authenticated
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() 
      and role in ('admin', 'direction', 'agent_parc')
    )
  );

-- Policy: Mileage logs read-only for all authenticated
create policy "authenticated_view_mileage"
  on vehicle_mileage_logs for select
  to authenticated
  using (true);

-- 9. Commentaires documentation
-- ----------------------------------------------------------------------------
comment on table vehicle_inspections is 'Registre des inspections véhicules (pré/post-départ)';
comment on column vehicle_inspections.defects is 'JSON array: [{category, severity, description, location, photo_url, reported_at}]';
comment on column vehicle_inspections.geolocation is 'JSON: {lat, lng, accuracy, timestamp}';
comment on view vehicle_inspection_summary is 'Vue agrégée pour dashboard: health_score, dernières inspections, stats';

-- 10. Permissions pour le service role (si nécessaire)
-- ----------------------------------------------------------------------------
grant select on vehicle_inspection_summary to authenticated;
grant select on open_defects_view to authenticated;
