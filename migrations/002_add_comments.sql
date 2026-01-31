-- Migration: Ajout table comments pour interventions
-- Date: 2026-01-31

-- Table des commentaires sur interventions
CREATE TABLE IF NOT EXISTS comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intervention_id UUID NOT NULL REFERENCES interventions(id) ON DELETE CASCADE,
    author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL CHECK (length(trim(content)) > 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_comments_intervention_id ON comments(intervention_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at DESC);

-- RLS Policies
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Policy: tout utilisateur authentifié peut lire
CREATE POLICY "comments_read_all" ON comments
    FOR SELECT TO authenticated USING (true);

-- Policy: insertion par utilisateur authentifié
CREATE POLICY "comments_insert_own" ON comments
    FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);

-- Policy: suppression uniquement par l'auteur ou admin
CREATE POLICY "comments_delete_own" ON comments
    FOR DELETE TO authenticated USING (
        auth.uid() = author_id 
        OR EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('admin', 'direction')
        )
    );

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS comments_updated_at ON comments;
CREATE TRIGGER comments_updated_at
    BEFORE UPDATE ON comments
    FOR EACH ROW
    EXECUTE FUNCTION update_comments_updated_at();
