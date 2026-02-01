-- ============================================================================
-- MIGRATION: Table de logs des notifications
-- Date: 2026-02-01
-- Description: Traçabilité complète des envois d'emails du workflow
-- ============================================================================

-- 1. Table des logs de notification
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL CHECK (event_type IN (
    'INTERVENTION_CREATED',
    'INTERVENTION_APPROVED',
    'INTERVENTION_REJECTED',
    'DEVIS_UPLOADED',
    'DEVIS_VALIDATED',
    'DEVIS_REFUSED',
    'RDV_PLANNED',
    'INTERVENTION_COMPLETED',
    'INSPECTION_WORK_COMPLETED'
  )),
  recipients UUID[] DEFAULT '{}', -- Array des userIds destinataires
  recipient_emails TEXT[] DEFAULT '{}', -- Array des emails pour historique
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT NOT NULL DEFAULT 'sent' CHECK (status IN ('sent', 'error', 'pending')),
  error_message TEXT, -- En cas d'erreur d'envoi
  metadata JSONB DEFAULT '{}', -- Détails spécifiques (intervention_id, inspection_id, etc.)
  
  -- Relations optionnelles
  intervention_id UUID REFERENCES interventions(id) ON DELETE SET NULL,
  inspection_id UUID REFERENCES vehicle_inspections(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL
);

-- 2. Index pour performances
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_notification_logs_event ON notification_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_notification_logs_intervention ON notification_logs(intervention_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_inspection ON notification_logs(inspection_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_trigger_by ON notification_logs(trigger_by);

-- 3. Vue pour statistiques rapides
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW notification_stats AS
SELECT 
  event_type,
  status,
  COUNT(*) as count,
  DATE_TRUNC('day', sent_at) as date
FROM notification_logs
GROUP BY event_type, status, DATE_TRUNC('day', sent_at)
ORDER BY date DESC, count DESC;

-- 4. Fonction pour nettoyer les vieux logs (+1 an)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notification_logs 
  WHERE sent_at < NOW() - INTERVAL '1 year';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- 5. RLS Policies
-- ----------------------------------------------------------------------------
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;

-- Admin/Direction peuvent tout voir
CREATE POLICY "notification_logs_read_admin" ON notification_logs
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'direction'))
  );

-- Les utilisateurs peuvent voir les logs où ils sont destinataires
CREATE POLICY "notification_logs_read_own" ON notification_logs
  FOR SELECT TO authenticated USING (
    auth.uid() = ANY(recipients)
  );

-- Insertion réservée au service (via service_role)
CREATE POLICY "notification_logs_insert_service" ON notification_logs
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
  );

-- 6. Commentaires
-- ----------------------------------------------------------------------------
COMMENT ON TABLE notification_logs IS 'Historique complet des notifications email envoyées par le système';
COMMENT ON COLUMN notification_logs.event_type IS 'Type d''événement déclencheur (INTERVENTION_CREATED, etc.)';
COMMENT ON COLUMN notification_logs.recipients IS 'Array des UUIDs des profils destinataires';
COMMENT ON COLUMN notification_logs.recipient_emails IS 'Array des adresses email (snapshot au moment de l''envoi)';
COMMENT ON COLUMN notification_logs.metadata IS 'Données JSON additionnelles (liens, montants, etc.)';
