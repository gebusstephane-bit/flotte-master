-- Migration: Table d'alertes pour les inspections validées avec anomalies
-- Date: 2026-02-01

-- Table pour tracker les alertes d'inspection (validation avec anomalie)
CREATE TABLE IF NOT EXISTS inspection_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    inspection_id UUID NOT NULL REFERENCES vehicle_inspections(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL DEFAULT 'anomaly_detected' CHECK (alert_type IN ('anomaly_detected', 'critical_defect', 'maintenance_required')),
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'cancelled')),
    created_by UUID NOT NULL REFERENCES profiles(id),
    resolved_by UUID REFERENCES profiles(id),
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index pour performance
CREATE INDEX IF NOT EXISTS idx_inspection_alerts_inspection ON inspection_alerts(inspection_id);
CREATE INDEX IF NOT EXISTS idx_inspection_alerts_vehicle ON inspection_alerts(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_inspection_alerts_status ON inspection_alerts(status);
CREATE INDEX IF NOT EXISTS idx_inspection_alerts_created_at ON inspection_alerts(created_at);

-- RLS
ALTER TABLE inspection_alerts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "inspection_alerts_read_all" ON inspection_alerts
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "inspection_alerts_insert_authenticated" ON inspection_alerts
    FOR INSERT TO authenticated WITH CHECK (
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid())
    );

CREATE POLICY "inspection_alerts_update_authorized" ON inspection_alerts
    FOR UPDATE TO authenticated USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'direction', 'agent_parc')
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('admin', 'direction', 'agent_parc')
        )
    );

-- Trigger pour updated_at
CREATE OR REPLACE FUNCTION update_inspection_alerts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS inspection_alerts_updated_at ON inspection_alerts;
CREATE TRIGGER inspection_alerts_updated_at
    BEFORE UPDATE ON inspection_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_inspection_alerts_updated_at();

-- Commentaires
COMMENT ON TABLE inspection_alerts IS 'Alertes générées lors de la validation d inspections avec anomalies';
COMMENT ON COLUMN inspection_alerts.alert_type IS 'Type d alerte: anomaly_detected, critical_defect, maintenance_required';
COMMENT ON COLUMN inspection_alerts.status IS 'Statut de l alerte: open, in_progress, resolved, cancelled';
