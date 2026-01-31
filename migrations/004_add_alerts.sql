-- Migration: Système d'alertes email pour échéances
-- Date: 2026-01-31

-- Table pour tracker les alertes envoyées (anti-doublon)
CREATE TABLE IF NOT EXISTS sent_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('ct_30', 'ct_7', 'ct_1', 'tachy_30', 'tachy_7', 'tachy_1', 'atp_30', 'atp_7', 'atp_1')),
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    recipient_email TEXT NOT NULL,
    UNIQUE(vehicle_id, alert_type)
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_sent_alerts_vehicle ON sent_alerts(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_sent_alerts_sent_at ON sent_alerts(sent_at);

-- Table pour les préférences d'alertes utilisateurs
CREATE TABLE IF NOT EXISTS user_alert_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    alert_days INTEGER[] DEFAULT ARRAY[30, 7, 1], -- Jours avant échéance
    email_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id)
);

-- RLS
ALTER TABLE sent_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_alert_preferences ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "sent_alerts_read_admin" ON sent_alerts
    FOR SELECT TO authenticated USING (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'direction'))
    );

CREATE POLICY "user_alert_prefs_own" ON user_alert_preferences
    FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_alert_prefs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS alert_prefs_updated_at ON user_alert_preferences;
CREATE TRIGGER alert_prefs_updated_at
    BEFORE UPDATE ON user_alert_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_alert_prefs_updated_at();
