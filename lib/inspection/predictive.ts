/**
 * 🔱 PILIER 4: GOD MODE
 * Module: Prédiction d'anomalies basée sur l'historique
 * 
 * Analyse les patterns historiques pour prédire les pannes
 */

import { supabaseAdmin } from '@/lib/supabaseAdmin';

export interface PredictionResult {
  risk: 'high' | 'medium' | 'low';
  probability: number; // 0-100
  recommendedActions: string[];
  estimatedCost: number;
}

/**
 * Analyse l'historique d'un véhicule pour prédire les risques
 */
export async function predictVehicleIssues(vehicleId: string): Promise<PredictionResult> {
  // Récupérer les 6 derniers mois d'inspections
  const { data: inspections } = await supabaseAdmin
    .from('vehicle_inspections')
    .select('*')
    .eq('vehicle_id', vehicleId)
    .gte('created_at', new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString())
    .order('created_at', { ascending: false });

  if (!inspections || inspections.length === 0) {
    return {
      risk: 'low',
      probability: 10,
      recommendedActions: ['Effectuer une inspection de routine'],
      estimatedCost: 0
    };
  }

  // Analyse des patterns
  const criticalCount = inspections.filter(i => 
    i.defects?.some((d: any) => d.severity === 'critical')
  ).length;

  const warningCount = inspections.filter(i =>
    i.defects?.some((d: any) => d.severity === 'warning')
  ).length;

  const totalInspections = inspections.length;
  const criticalRate = criticalCount / totalInspections;
  const warningRate = warningCount / totalInspections;

  // Calcul du risque
  let risk: 'high' | 'medium' | 'low' = 'low';
  let probability = 10;
  let actions: string[] = [];
  let cost = 0;

  if (criticalRate > 0.3) {
    risk = 'high';
    probability = 75;
    actions = [
      'Inspection complète immédiate',
      'Vérification des systèmes de sécurité',
      'Remplacement des pièces usées préventif'
    ];
    cost = 1500;
  } else if (warningRate > 0.5 || criticalRate > 0.1) {
    risk = 'medium';
    probability = 45;
    actions = [
      'Inspection approfondie dans les 7 jours',
      'Surveillance des points d\'usure identifiés'
    ];
    cost = 500;
  } else {
    risk = 'low';
    probability = 15;
    actions = ['Maintenance régulière suffisante'];
    cost = 0;
  }

  return {
    risk,
    probability,
    recommendedActions: actions,
    estimatedCost: cost
  };
}

/**
 * Détecte les anomalies dans les données kilométriques
 * (fraude possible ou erreur de saisie)
 */
export function detectOdometerAnomaly(
  previousMileage: number,
  currentMileage: number,
  daysSinceLastInspection: number
): { isAnomaly: boolean; reason?: string } {
  // Taux moyen de conduite: 300km/jour max pour poids lourd
  const maxExpectedMileage = 300 * daysSinceLastInspection;
  
  if (currentMileage < previousMileage) {
    return { isAnomaly: true, reason: 'Kilométrage inférieur au précédent (fraude?)' };
  }

  const mileageDiff = currentMileage - previousMileage;
  
  if (mileageDiff > maxExpectedMileage * 2) {
    return { 
      isAnomaly: true, 
      reason: `Kilométrage anormalement élevé (${mileageDiff}km en ${daysSinceLastInspection}j)` 
    };
  }

  if (mileageDiff < 10 && daysSinceLastInspection > 7) {
    return { 
      isAnomaly: true, 
      reason: 'Véhicule inutilisé ou odomètre bloqué' 
    };
  }

  return { isAnomaly: false };
}
