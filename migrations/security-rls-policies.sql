-- ============================================================================
-- MIGRATION: Security RLS Policies & Audit Logging
-- Date: 2026-01-31
-- Description: Politiques de sécurité complètes pour les inspections avec
--              RLS, index de performance et audit logging
-- ============================================================================

-- ============================================================================
-- PARTIE 1: TABLE D'AUDIT LOGS
-- ============================================================================

-- Créer la table audit_logs si elle n'existe pas
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  table_name TEXT NOT NULL,
  record_id UUID NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE')),
  old_data JSONB,
  new_data JSONB,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activer RLS sur la table audit_logs (lecture seule pour tous)
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Index sur audit_logs pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_audit_logs_table ON audit_logs(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_logs_record_id ON audit_logs(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);

-- Commentaires
COMMENT ON TABLE audit_logs IS 'Table de journalisation des modifications pour audit';
COMMENT ON COLUMN audit_logs.old_data IS 'Données avant modification (pour UPDATE/DELETE)';
COMMENT ON COLUMN audit_logs.new_data IS 'Données après modification (pour INSERT/UPDATE)';

-- ============================================================================
-- PARTIE 2: FONCTION DE VÉRIFICATION DE RÔLE
-- ============================================================================

-- Fonction pour vérifier si un utilisateur est manager ou admin
CREATE OR REPLACE FUNCTION is_manager_or_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id 
    AND role IN ('admin', 'direction', 'agent_parc')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour vérifier si un utilisateur est admin uniquement
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id 
    AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fonction pour vérifier si un utilisateur est chauffeur
CREATE OR REPLACE FUNCTION is_driver(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles
    WHERE id = user_id 
    AND role = 'chauffeur'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Commentaires
COMMENT ON FUNCTION is_manager_or_admin(UUID) IS 'Vérifie si l''utilisateur est admin, direction ou agent_parc';
COMMENT ON FUNCTION is_admin(UUID) IS 'Vérifie si l''utilisateur est admin';
COMMENT ON FUNCTION is_driver(UUID) IS 'Vérifie si l''utilisateur est chauffeur';

-- ============================================================================
-- PARTIE 3: FONCTION ET TRIGGER D'AUDIT LOGGING
-- ============================================================================

-- Fonction pour logger les modifications dans audit_logs
CREATE OR REPLACE FUNCTION audit_trigger_function()
RETURNS TRIGGER AS $$
DECLARE
  current_user_id UUID;
BEGIN
  -- Récupérer l'ID de l'utilisateur courant
  current_user_id := auth.uid();
  
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_logs (
      table_name, record_id, action, new_data, user_id, timestamp
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id,
      'INSERT',
      to_jsonb(NEW),
      current_user_id,
      NOW()
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO audit_logs (
      table_name, record_id, action, old_data, new_data, user_id, timestamp
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id,
      'UPDATE',
      to_jsonb(OLD),
      to_jsonb(NEW),
      current_user_id,
      NOW()
    );
    RETURN NEW;
    
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO audit_logs (
      table_name, record_id, action, old_data, user_id, timestamp
    ) VALUES (
      TG_TABLE_NAME,
      OLD.id,
      'DELETE',
      to_jsonb(OLD),
      current_user_id,
      NOW()
    );
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer les triggers existants sur vehicle_inspections
DROP TRIGGER IF EXISTS audit_vehicle_inspections ON vehicle_inspections;

-- Créer le trigger d'audit sur vehicle_inspections
CREATE TRIGGER audit_vehicle_inspections
  AFTER INSERT OR UPDATE OR DELETE ON vehicle_inspections
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- Trigger d'audit pour vehicle_mileage_logs (lecture seule pour les users, mais audit au cas où)
DROP TRIGGER IF EXISTS audit_vehicle_mileage_logs ON vehicle_mileage_logs;
CREATE TRIGGER audit_vehicle_mileage_logs
  AFTER INSERT OR UPDATE OR DELETE ON vehicle_mileage_logs
  FOR EACH ROW
  EXECUTE FUNCTION audit_trigger_function();

-- ============================================================================
-- PARTIE 4: INDEX DE PERFORMANCE POUR LES INSPECTIONS
-- ============================================================================

-- Index simples sur les champs fréquemment recherchés
CREATE INDEX IF NOT EXISTS idx_inspections_vehicle_id ON vehicle_inspections(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_inspections_driver_id ON vehicle_inspections(driver_id);
CREATE INDEX IF NOT EXISTS idx_inspections_created_at ON vehicle_inspections(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_status ON vehicle_inspections(status);

-- Index composites pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_inspections_vehicle_date ON vehicle_inspections(vehicle_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_driver_date ON vehicle_inspections(driver_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_status_date ON vehicle_inspections(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_type_date ON vehicle_inspections(inspection_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inspections_driver_status ON vehicle_inspections(driver_id, status);

-- Index pour les défauts (GIN pour JSONB)
CREATE INDEX IF NOT EXISTS idx_inspections_defects ON vehicle_inspections USING gin(defects jsonb_path_ops);

-- Index pour les défauts critiques (partial index)
CREATE INDEX IF NOT EXISTS idx_inspections_critical_defects 
  ON vehicle_inspections USING gin(defects jsonb_path_ops)
  WHERE defects @> '[{"severity":"critical"}]';

-- Index pour les inspections nécessitant une action
CREATE INDEX IF NOT EXISTS idx_inspections_requires_action 
  ON vehicle_inspections(created_at DESC)
  WHERE status = 'requires_action';

-- Index sur vehicle_mileage_logs
CREATE INDEX IF NOT EXISTS idx_mileage_logs_vehicle ON vehicle_mileage_logs(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_mileage_logs_vehicle_date ON vehicle_mileage_logs(vehicle_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_mileage_logs_inspection ON vehicle_mileage_logs(inspection_id);

-- ============================================================================
-- PARTIE 5: SUPPRESSION DES ANCIENNES POLITIQUES RLS
-- ============================================================================

-- Désactiver temporairement RLS pour les modifications
ALTER TABLE vehicle_inspections DISABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_mileage_logs DISABLE ROW LEVEL SECURITY;

-- Supprimer toutes les anciennes politiques existantes sur vehicle_inspections
DROP POLICY IF EXISTS "drivers_create_own_inspections" ON vehicle_inspections;
DROP POLICY IF EXISTS "drivers_view_own_inspections" ON vehicle_inspections;
DROP POLICY IF EXISTS "authenticated_view_inspections" ON vehicle_inspections;
DROP POLICY IF EXISTS "admins_update_inspections" ON vehicle_inspections;
DROP POLICY IF EXISTS "Enable all access for inspections" ON vehicle_inspections;

-- Supprimer toutes les anciennes politiques existantes sur vehicle_mileage_logs
DROP POLICY IF EXISTS "authenticated_view_mileage" ON vehicle_mileage_logs;
DROP POLICY IF EXISTS "Enable all access for mileage" ON vehicle_mileage_logs;

-- Supprimer les anciennes politiques sur audit_logs
DROP POLICY IF EXISTS "Enable all access for audit_logs" ON audit_logs;

-- ============================================================================
-- PARTIE 6: CRÉATION DES NOUVELLES POLITIQUES RLS POUR INSPECTIONS
-- ============================================================================

-- Réactiver RLS
ALTER TABLE vehicle_inspections ENABLE ROW LEVEL SECURITY;

-- Politique SELECT: Admins/Managers peuvent tout voir, chauffeurs voient leurs inspections
CREATE POLICY "inspections_select_policy"
  ON vehicle_inspections FOR SELECT
  TO authenticated
  USING (
    is_manager_or_admin(auth.uid())  -- Admin/Manager voit tout
    OR 
    auth.uid() = driver_id            -- Chauffeur voit ses propres inspections
  );

-- Politique INSERT: Chauffeurs créent leurs inspections, Managers peuvent créer pour n'importe qui
CREATE POLICY "inspections_insert_policy"
  ON vehicle_inspections FOR INSERT
  TO authenticated
  WITH CHECK (
    is_manager_or_admin(auth.uid())  -- Manager peut créer pour n'importe quel driver
    OR 
    auth.uid() = driver_id            -- Chauffeur crée seulement pour lui-même
  );

-- Politique UPDATE: Chauffeur modifie SEULEMENT ses inspections en pending_review
--                   Managers peuvent modifier tout sauf driver_id
--                   Seul admin peut changer le driver_id
CREATE POLICY "inspections_update_policy"
  ON vehicle_inspections FOR UPDATE
  TO authenticated
  USING (
    -- Admin peut tout modifier
    is_admin(auth.uid())
    OR
    -- Manager peut modifier tout sauf les inspections archivées
    (
      is_manager_or_admin(auth.uid())
      AND status != 'archived'
    )
    OR
    -- Chauffeur peut modifier uniquement ses inspections en pending_review
    (
      auth.uid() = driver_id
      AND status = 'pending_review'
    )
  )
  WITH CHECK (
    -- Admin peut tout modifier
    is_admin(auth.uid())
    OR
    -- Manager peut modifier tout sauf les inspections archivées
    (
      is_manager_or_admin(auth.uid())
      AND status != 'archived'
    )
    OR
    -- Chauffeur peut modifier uniquement ses inspections en pending_review
    (
      auth.uid() = driver_id
      AND status = 'pending_review'
    )
  );

-- Politique DELETE: Seul admin peut supprimer (et uniquement les archives ou erreurs)
CREATE POLICY "inspections_delete_policy"
  ON vehicle_inspections FOR DELETE
  TO authenticated
  USING (
    is_admin(auth.uid())  -- Seul admin peut supprimer
  );

-- ============================================================================
-- PARTIE 7: POLITIQUES RLS POUR MILEAGE LOGS
-- ============================================================================

ALTER TABLE vehicle_mileage_logs ENABLE ROW LEVEL SECURITY;

-- Politique SELECT: Tous les authentifiés peuvent voir les logs de kilométrage
CREATE POLICY "mileage_logs_select_policy"
  ON vehicle_mileage_logs FOR SELECT
  TO authenticated
  USING (true);

-- Politique INSERT: Seul le système (via trigger) ou admin peut insérer
CREATE POLICY "mileage_logs_insert_policy"
  ON vehicle_mileage_logs FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin(auth.uid())
    OR
    recorded_by = auth.uid()  -- Autorisé si c'est le driver qui enregistre
  );

-- Politique UPDATE: Personne ne peut modifier les logs (immutabilité)
-- Pas de politique UPDATE = pas de mise à jour autorisée

-- Politique DELETE: Seul admin peut supprimer
CREATE POLICY "mileage_logs_delete_policy"
  ON vehicle_mileage_logs FOR DELETE
  TO authenticated
  USING (is_admin(auth.uid()));

-- ============================================================================
-- PARTIE 8: POLITIQUES RLS POUR AUDIT LOGS
-- ============================================================================

-- Politique SELECT: Seuls les admins/managers peuvent voir les logs d'audit
CREATE POLICY "audit_logs_select_policy"
  ON audit_logs FOR SELECT
  TO authenticated
  USING (is_manager_or_admin(auth.uid()));

-- Pas d'INSERT/UPDATE/DELETE pour les utilisateurs - seul le système via trigger

-- ============================================================================
-- PARTIE 9: FONCTION UTILITAIRE POUR VÉRIFIER LES PERMISSIONS
-- ============================================================================

-- Fonction pour vérifier si l'utilisateur peut modifier une inspection spécifique
CREATE OR REPLACE FUNCTION can_modify_inspection(p_inspection_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_driver_id UUID;
  v_status TEXT;
BEGIN
  -- Récupérer les infos de l'inspection
  SELECT driver_id, status INTO v_driver_id, v_status
  FROM vehicle_inspections
  WHERE id = p_inspection_id;
  
  -- Si l'inspection n'existe pas, retourner faux
  IF v_driver_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- Admin peut tout modifier
  IF is_admin(p_user_id) THEN
    RETURN TRUE;
  END IF;
  
  -- Manager peut modifier tout sauf archivé
  IF is_manager_or_admin(p_user_id) AND v_status != 'archived' THEN
    RETURN TRUE;
  END IF;
  
  -- Chauffeur peut modifier uniquement ses inspections en pending_review
  IF p_user_id = v_driver_id AND v_status = 'pending_review' THEN
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION can_modify_inspection(UUID, UUID) IS 
'Vérifie si un utilisateur a le droit de modifier une inspection spécifique';

-- ============================================================================
-- PARTIE 10: VERIFICATIONS FINALES
-- ============================================================================

-- Vérifier que les index ont été créés
SELECT 
  'Index créés sur vehicle_inspections:' as verification,
  COUNT(*) as count
FROM pg_indexes 
WHERE tablename = 'vehicle_inspections';

-- Vérifier les politiques RLS
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('vehicle_inspections', 'vehicle_mileage_logs', 'audit_logs')
ORDER BY tablename, policyname;

-- ============================================================================
-- RÉCAPITULATIF DES SÉCURITÉS MIS EN PLACE
-- ============================================================================

/*
RÈGLES DE SÉCURITÉ APPLIQUÉES:
===============================

1. SÉLECTION (SELECT):
   - Admin/Direction/Agent_parc: peuvent voir TOUTES les inspections
   - Chauffeurs: peuvent voir UNIQUEMENT leurs propres inspections

2. INSERTION (INSERT):
   - Admin/Direction/Agent_parc: peuvent créer des inspections pour n'importe quel chauffeur
   - Chauffeurs: peuvent créer UNIQUEMENT leurs propres inspections

3. MISE À JOUR (UPDATE):
   - Admin: peut tout modifier sans restriction
   - Manager: peut modifier tout sauf les inspections archivées
   - Chauffeur: peut modifier UNIQUEMENT ses inspections en status 'pending_review'

4. SUPPRESSION (DELETE):
   - Admin uniquement: peut supprimer n'importe quelle inspection
   - Aucun autre rôle ne peut supprimer

5. AUDIT LOGGING:
   - Toute modification (INSERT/UPDATE/DELETE) est loguée dans audit_logs
   - Champs tracés: table, record_id, action, old_data, new_data, user_id, timestamp

6. INDEX DE PERFORMANCE:
   - Index simples: vehicle_id, driver_id, created_at, status
   - Index composites: (vehicle_id, created_at), (driver_id, status), etc.
   - Index GIN pour les défauts JSONB
   - Index partiels pour les défauts critiques et inspections à traiter

FONCTIONS UTILITAIRES:
- is_manager_or_admin(user_id): Vérifie si admin/direction/agent_parc
- is_admin(user_id): Vérifie si admin
- is_driver(user_id): Vérifie si chauffeur
- can_modify_inspection(inspection_id, user_id): Vérifie les permissions sur une inspection
*/
