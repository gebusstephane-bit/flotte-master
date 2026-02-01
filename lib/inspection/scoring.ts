/**
 * Système de Scoring & Classification des Anomalies
 * Classification automatique basée sur des règles métier
 */

export type SeverityLevel = 'critical' | 'warning' | 'minor' | 'none';

export interface ScoringDefect {
  category: string;
  description: string;
  severity?: SeverityLevel;
}

// MOTS-CLÉS CRITIQUES (Danger immédiat - Véhicule bloqué)
const CRITICAL_KEYWORDS = [
  // Français
  'crevé', 'cassé', 'fuite', 'frein', 'panne', 'impossible', 
  'dangereux', 'fumée', 'feu', 'explosion', 'perte', 'rupture',
  'essieu', 'direction', 'suspension', 'fuite gasoil', 'fuite huile',
  'ne freine plus', 'perte de liquide', 'bruit anormal', 'surprise',
  'bloqué', 'coincé', 'arraché', 'explosé', 'en feu', 'fumée',
  'plus de frein', 'pedale frein', 'volant', 'direction assistée',
  // Anglais (pour compatibilité)
  'flat', 'broken', 'leak', 'brake', 'failure', 'impossible',
  'dangerous', 'smoke', 'fire', 'explosion', 'loss', 'rupture',
  'axle', 'steering', 'suspension', 'leak fuel', 'leak oil',
  'no brake', 'fluid loss', 'noise', 'stuck', 'jammed', 'torn',
  'exploded', 'on fire', 'no braking', 'brake pedal', 'steering wheel'
];

// MOTS-CLÉS WARNING (À contrôler rapidement)
const WARNING_KEYWORDS = [
  // Français
  'usé', 'rayure', 'graffiti', 'sale', 'bruyant', 'vibration',
  'clignote', 'faible', 'corrosion', 'fissure', 'jeu', 'mou',
  'defaut', 'anomalie', 'alarme', 'témoin', 'voyant', 'allumé',
  'usure', 'limite', 'proche', 'entretien', 'revision', 'reglage',
  'desaligné', 'mal fermé', 'difficile', 'dur', 'raide', 'couine',
  // Anglais
  'worn', 'scratch', 'dirty', 'noisy', 'vibration', 'flashing',
  'weak', 'corrosion', 'crack', 'play', 'loose', 'fault', 'anomaly',
  'alarm', 'warning light', 'light on', 'wear', 'limit', 'close',
  'service', 'maintenance', 'adjustment', 'misaligned', 'hard to',
  'difficult', 'stiff', 'squeak'
];

// Catégories critiques (en français et anglais)
const CRITICAL_CATEGORIES = [
  // Français
  'frein', 'pneu', 'roue', 'direction', 'suspension', 'essieu', 'moteur',
  // Anglais (correspond aux valeurs du formulaire)
  'tires', 'mechanical', 'safety', 'electrical', 'lights'
];

/**
 * Algorithme de classification métier des défauts
 * Analyse la catégorie et la description pour déterminer la gravité
 */
// Type pour compatibilité (alias vers le nouveau nom)
export type Defect = ScoringDefect;

export function classifyDefect(category: string, description: string): SeverityLevel {
  const desc = description.toLowerCase();
  const cat = category.toLowerCase();
  
  // Règles métier strictes par catégorie critique
  const isCriticalCategory = CRITICAL_CATEGORIES.some(c => cat.includes(c));
  
  if (isCriticalCategory) {
    // Dans une catégorie critique, chercher les mots critiques
    const foundCritical = CRITICAL_KEYWORDS.filter(k => desc.includes(k));
    const foundWarning = WARNING_KEYWORDS.filter(k => desc.includes(k));
    
    if (foundCritical.length > 0) return 'critical';
    if (foundWarning.length > 0) return 'warning';
    // Mention d'une catégorie critique sans détail = warning minimum
    return 'warning';
  }
  
  // Catégories structurelles
  if (['chassis', 'cadre', 'structure'].some(c => cat.includes(c))) {
    if (CRITICAL_KEYWORDS.some(k => desc.includes(k))) return 'critical';
    return 'warning';
  }
  
  // Carrosserie et portes
  if (['carrosserie', 'porte', 'vitre', 'pare-brise', 'glace'].some(c => cat.includes(c))) {
    if (CRITICAL_KEYWORDS.some(k => desc.includes(k))) return 'critical';
    if (desc.includes('cassé') || desc.includes('fêlé') || desc.includes('bris')) return 'warning';
    return 'minor';
  }
  
  // Éclairage
  if (['eclairage', 'phare', 'feu', 'clignotant', 'lampe'].some(c => cat.includes(c))) {
    if (desc.includes('arriere') || desc.includes('stop') || desc.includes('frein')) {
      if (CRITICAL_KEYWORDS.some(k => desc.includes(k))) return 'critical';
      return 'warning';
    }
    return 'minor';
  }
  
  // Électricité
  if (['electricite', 'batterie', 'alternateur', 'demarreur'].some(c => cat.includes(c))) {
    if (CRITICAL_KEYWORDS.some(k => desc.includes(k))) return 'critical';
    return 'warning';
  }
  
  // Intérieur / Confort
  if (['interieur', 'siege', 'climatisation', 'radio', 'gps'].some(c => cat.includes(c))) {
    if (CRITICAL_KEYWORDS.some(k => desc.includes(k))) return 'warning';
    return 'minor';
  }
  
  // Contrôle par mot-clés génériques
  if (CRITICAL_KEYWORDS.some(k => desc.includes(k))) return 'critical';
  if (WARNING_KEYWORDS.some(k => desc.includes(k))) return 'warning';
  
  return 'minor';
}

/**
 * Calcule le score de santé d'un véhicule (0-100)
 * Basé sur les défauts et leur sévérité
 */
export function calculateVehicleHealthScore(defects: ScoringDefect[]): number {
  if (!defects || defects.length === 0) return 100;
  
  let penalty = 0;
  
  defects.forEach(defect => {
    const severity = defect.severity || classifyDefect(defect.category, defect.description);
    
    switch (severity) {
      case 'critical':
        penalty += 30; // Pénalité lourde pour critique
        break;
      case 'warning':
        penalty += 10; // Pénalité moyenne pour warning
        break;
      case 'minor':
        penalty += 2;  // Pénalité légère pour mineur
        break;
      case 'none':
      default:
        penalty += 0;
    }
  });
  
  // Score minimum de 0
  return Math.max(0, Math.round(100 - penalty));
}

/**
 * Détermine le statut global d'une inspection
 * Retourne le statut, le score et le nombre de problèmes critiques
 */
export function getInspectionStatus(defects: ScoringDefect[]): {
  status: 'danger' | 'warning' | 'ok';
  score: number;
  criticalCount: number;
  warningCount: number;
  minorCount: number;
} {
  // Classifier tous les défauts
  const classifiedDefects = defects.map(d => ({
    ...d,
    severity: d.severity || classifyDefect(d.category, d.description)
  }));
  
  const criticalCount = classifiedDefects.filter(d => d.severity === 'critical').length;
  const warningCount = classifiedDefects.filter(d => d.severity === 'warning').length;
  const minorCount = classifiedDefects.filter(d => d.severity === 'minor').length;
  
  const score = calculateVehicleHealthScore(classifiedDefects);
  
  // Logique de statut
  if (criticalCount > 0 || score < 50) {
    return { status: 'danger', score, criticalCount, warningCount, minorCount };
  }
  
  if (warningCount > 0 || score < 80) {
    return { status: 'warning', score, criticalCount, warningCount, minorCount };
  }
  
  return { status: 'ok', score, criticalCount, warningCount, minorCount };
}

/**
 * Obtient le label et la couleur associés à un statut
 */
export function getStatusMeta(status: 'danger' | 'warning' | 'ok' | SeverityLevel) {
  const meta = {
    danger: {
      label: 'DANGER',
      description: 'Action immédiate requise',
      color: '#dc2626',
      bgColor: '#fef2f2',
      borderColor: '#fecaca',
      icon: 'AlertOctagon',
      priority: 1
    },
    critical: {
      label: 'CRITIQUE',
      description: 'Danger immédiat',
      color: '#dc2626',
      bgColor: '#fef2f2',
      borderColor: '#fecaca',
      icon: 'AlertOctagon',
      priority: 1
    },
    warning: {
      label: 'ATTENTION',
      description: 'À contrôler rapidement',
      color: '#f59e0b',
      bgColor: '#fffbeb',
      borderColor: '#fcd34d',
      icon: 'AlertTriangle',
      priority: 2
    },
    ok: {
      label: 'OK',
      description: 'Véhicule en bon état',
      color: '#16a34a',
      bgColor: '#f0fdf4',
      borderColor: '#bbf7d0',
      icon: 'CheckCircle',
      priority: 3
    },
    minor: {
      label: 'MINEUR',
      description: 'À noter',
      color: '#6b7280',
      bgColor: '#f9fafb',
      borderColor: '#e5e7eb',
      icon: 'Info',
      priority: 4
    },
    none: {
      label: 'AUCUN',
      description: 'Pas de défaut',
      color: '#16a34a',
      bgColor: '#f0fdf4',
      borderColor: '#bbf7d0',
      icon: 'CheckCircle',
      priority: 5
    }
  };
  
  return meta[status] || meta.minor;
}

/**
 * Calcule la tendance du score entre deux inspections
 */
export function calculateScoreTrend(
  previousScore: number | null, 
  currentScore: number
): { trend: 'up' | 'down' | 'stable'; diff: number } {
  if (previousScore === null) {
    return { trend: 'stable', diff: 0 };
  }
  
  const diff = currentScore - previousScore;
  
  if (diff > 5) return { trend: 'up', diff };
  if (diff < -5) return { trend: 'down', diff };
  
  return { trend: 'stable', diff };
}
