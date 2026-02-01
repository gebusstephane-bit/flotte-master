-- Migration: Ajout des colonnes de traçabilité pour la validation des inspections
-- Date: 2026-02-01

-- Ajouter les colonnes manquantes pour la traçabilité des validations
ALTER TABLE vehicle_inspections 
ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS review_notes TEXT;

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_reviewed_by ON vehicle_inspections(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_reviewed_at ON vehicle_inspections(reviewed_at);

-- Commentaires
COMMENT ON COLUMN vehicle_inspections.reviewed_by IS 'ID du validateur (référence profiles)';
COMMENT ON COLUMN vehicle_inspections.reviewed_at IS 'Date/heure de validation';
COMMENT ON COLUMN vehicle_inspections.review_notes IS 'Notes de validation (VALIDÉE_SANS_ANOMALIE ou VALIDÉE_AVEC_ANOMALIE: description)';
