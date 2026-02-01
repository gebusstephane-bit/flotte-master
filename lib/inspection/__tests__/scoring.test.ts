/**
 * 🔱 PILIER 2: Tests de Non-Régression
 * Module: Scoring & Classification
 */

import { classifyDefect, calculateVehicleHealthScore, getInspectionStatus } from '../scoring';

describe('🎯 Classification des défauts', () => {
  test('"Frein cassé" doit être CRITIQUE', () => {
    const result = classifyDefect('mechanical', 'Frein cassé');
    expect(result).toBe('critical');
  });

  test('"Pneu crevé" doit être CRITIQUE', () => {
    const result = classifyDefect('tires', 'Pneu crevé');
    expect(result).toBe('critical');
  });

  test('"Rayure" doit être MINEUR', () => {
    const result = classifyDefect('body', 'Petite rayure sur la porte');
    expect(result).toBe('minor');
  });
});

describe('🎯 Calcul du Health Score', () => {
  test('Aucun défaut = 100 points', () => {
    const score = calculateVehicleHealthScore([]);
    expect(score).toBe(100);
  });

  test('1 défaut critique = 70 points', () => {
    const score = calculateVehicleHealthScore([{
      category: 'mechanical',
      description: 'Frein cassé',
      severity: 'critical'
    }]);
    expect(score).toBe(70);
  });

  test('Score minimum = 0', () => {
    const score = calculateVehicleHealthScore([
      { category: 'tires', description: 'Pneu crevé', severity: 'critical' },
      { category: 'mechanical', description: 'Frein mort', severity: 'critical' },
      { category: 'electrical', description: 'Batterie morte', severity: 'critical' },
      { category: 'safety', description: 'Ceinture cassée', severity: 'critical' }
    ]);
    expect(score).toBe(0);
  });
});
