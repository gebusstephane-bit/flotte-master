/**
 * 🔱 PILIER 4: GOD MODE
 * Composant: Widget de prédiction prédictive
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, TrendingUp, CheckCircle, DollarSign } from 'lucide-react';
import { predictVehicleIssues } from '@/lib/inspection/predictive';

interface PredictiveWidgetProps {
  vehicleId: string;
}

export function PredictiveWidget({ vehicleId }: PredictiveWidgetProps) {
  const [prediction, setPrediction] = useState<{
    risk: 'high' | 'medium' | 'low';
    probability: number;
    recommendedActions: string[];
    estimatedCost: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadPrediction() {
      try {
        const result = await predictVehicleIssues(vehicleId);
        setPrediction(result);
      } catch (err) {
        console.error('Erreur prédiction:', err);
        setPrediction(null);
      } finally {
        setLoading(false);
      }
    }
    loadPrediction();
  }, [vehicleId]);

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardContent className="h-32" />
      </Card>
    );
  }

  if (!prediction) return null;

  const riskConfig = {
    high: {
      color: 'text-red-600 bg-red-50 border-red-200',
      icon: AlertTriangle,
      label: 'RISQUE ÉLEVÉ'
    },
    medium: {
      color: 'text-amber-600 bg-amber-50 border-amber-200',
      icon: TrendingUp,
      label: 'SURVEILLANCE'
    },
    low: {
      color: 'text-green-600 bg-green-50 border-green-200',
      icon: CheckCircle,
      label: 'RISQUE FAIBLE'
    }
  };

  const config = riskConfig[prediction.risk];
  const Icon = config.icon;

  return (
    <Card className={config.color}>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <Icon className="w-5 h-5" />
          Prédiction Maintenance - {config.label}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Barre de probabilité */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Probabilité de panne</span>
            <span className="font-bold">{prediction.probability}%</span>
          </div>
          <div className="h-2 bg-white/50 rounded-full overflow-hidden">
            <div 
              className={`h-full rounded-full transition-all ${
                prediction.risk === 'high' ? 'bg-red-500' :
                prediction.risk === 'medium' ? 'bg-amber-500' : 'bg-green-500'
              }`}
              style={{ width: `${prediction.probability}%` }}
            />
          </div>
        </div>

        {/* Actions recommandées */}
        <div className="space-y-1">
          <p className="text-sm font-medium">Actions recommandées:</p>
          <ul className="text-sm space-y-1">
            {prediction.recommendedActions.map((action, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-blue-600">→</span>
                {action}
              </li>
            ))}
          </ul>
        </div>

        {/* Coût estimé */}
        {prediction.estimatedCost > 0 && (
          <div className="flex items-center gap-2 text-sm border-t pt-2">
            <DollarSign className="w-4 h-4" />
            <span>Coût préventif estimé: </span>
            <span className="font-bold">{prediction.estimatedCost.toLocaleString()} €</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
