-- ============================================================
-- PERMETTRE L'ACCÈS ANONYME AUX VÉHICULES (POUR MOBILE/QR)
-- ============================================================
-- Ce script crée une politique RLS qui permet aux utilisateurs
-- non connectés (anon) de lire les informations des véhicules
-- nécessaire pour les formulaires d'inspection publiques

-- 1. Activer RLS sur la table vehicles (si pas déjà fait)
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- 2. Supprimer la politique existante si elle existe (pour éviter les doublons)
DROP POLICY IF EXISTS "Allow anon read access to vehicles" ON vehicles;

-- 3. Créer la politique permettant aux anonymes de lire
CREATE POLICY "Allow anon read access to vehicles"
  ON vehicles
  FOR SELECT
  TO anon
  USING (true);

-- 4. Vérifier que la politique est bien créée
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'vehicles';

-- ============================================================
-- NOTE: Les autres tables (inspections, interventions, etc.)
-- gardent leurs politiques RLS strictes. Seule la lecture
-- des véhicules est publique pour permettre l'identification
-- via QR code ou plaque d'immatriculation.
-- ============================================================
