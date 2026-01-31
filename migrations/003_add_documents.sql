-- Migration: Table documents pour véhicules et interventions
-- Date: 2026-01-31

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- Polymorphic: soit vehicle_id, soit intervention_id
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
    intervention_id UUID REFERENCES interventions(id) ON DELETE CASCADE,
    -- L'un des deux doit être renseigné
    uploader_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    filename TEXT NOT NULL,
    original_name TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'pdf', 'image', 'other'
    mime_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    storage_path TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    -- Contrainte: au moins un parent
    CONSTRAINT check_parent CHECK (
        (vehicle_id IS NOT NULL AND intervention_id IS NULL) OR
        (vehicle_id IS NULL AND intervention_id IS NOT NULL)
    ),
    -- Contrainte taille max (10MB = 10*1024*1024)
    CONSTRAINT check_size CHECK (size_bytes <= 10485760)
);

-- Index
CREATE INDEX IF NOT EXISTS idx_documents_vehicle ON documents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_documents_intervention ON documents(intervention_id);
CREATE INDEX IF NOT EXISTS idx_documents_created ON documents(created_at DESC);

-- RLS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Lecture: tout authentifié
CREATE POLICY "documents_read" ON documents
    FOR SELECT TO authenticated USING (true);

-- Insertion: tout authentifié
CREATE POLICY "documents_insert" ON documents
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = uploader_id);

-- Suppression: uploader ou admin/direction
CREATE POLICY "documents_delete" ON documents
    FOR DELETE TO authenticated USING (
        auth.uid() = uploader_id 
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'direction', 'agent_parc')
        )
    );

-- Bucket storage si pas existant (à exécuter dans Supabase Dashboard)
-- insert into storage.buckets (id, name, public) 
-- values ('documents', 'documents', false)
-- on conflict do nothing;
