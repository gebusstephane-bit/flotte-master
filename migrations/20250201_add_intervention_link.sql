-- Migration: Ajouter le lien entre inspection et intervention
-- Date: 2026-02-01

-- Ajouter la colonne intervention_id si elle n'existe pas
ALTER TABLE vehicle_inspections 
ADD COLUMN IF NOT EXISTS intervention_id UUID REFERENCES interventions(id) ON DELETE SET NULL;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_intervention ON vehicle_inspections(intervention_id);

-- Commentaire
COMMENT ON COLUMN vehicle_inspections.intervention_id IS 'Référence vers l''intervention créée pour traiter les défauts';
