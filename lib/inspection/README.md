# 🔱 Module Vehicle Inspection

## Architecture

```
lib/inspection/
├── index.ts          # Exports publics
├── types.ts          # Types & Zod schemas
├── actions.ts        # Server Actions
├── scoring.ts        # Logique métier
└── __tests__/        # Tests unitaires
```

## Types Principaux

### VehicleInspectionInput
Données entrantes pour créer une inspection.

```typescript
{
  vehicle_id: string (UUID)
  mileage: number (0-9999999)
  fuel_gasoil: number (0-100, default: 50)
  fuel_gnr: number (0-100, default: 50)
  fuel_adblue: number (0-100, default: 50)
  defects: Defect[]
  ...
}
```

### Defect (Anomalie)
```typescript
{
  category: 'tires' | 'mechanical' | 'electrical' | 'body' | 'lights' | 'safety' | 'cleanliness' | 'fluids'
  severity: 'critical' | 'warning' | 'minor'
  description: string
  location: string
  reported_at: ISO8601
}
```

## Algorithmes

### Classification Auto
| Mot-clé dans description | Catégorie | Sévérité |
|-------------------------|-----------|----------|
| "cassé", "crevé", "fuite" | Critique | CRITICAL |
| "usé", "rayure", "sale" | Warning | WARNING |
| Autres | Mineur | MINOR |

### Health Score
- Base: 100 points
- -30 par défaut critique
- -10 par défaut warning
- -2 par défaut mineur
- Minimum: 0

## API Server Actions

### createInspection(input: VehicleInspectionInput)
Crée une nouvelle inspection avec validation Zod.

**Retour:**
- `success: true` + données
- `success: false` + message d'erreur

## Exemple d'utilisation

```typescript
import { createInspection, classifyDefect } from '@/lib/inspection';

// Classification auto
const severity = classifyDefect('tires', 'Pneu crevé');
// → 'critical'

// Création inspection
const result = await createInspection({
  vehicle_id: 'uuid-123',
  mileage: 150000,
  fuel_gasoil: 75,
  fuel_gnr: 60,
  fuel_adblue: 80,
  defects: [{
    category: 'tires',
    severity: 'critical',
    description: 'Pneu crevé',
    location: 'Roue avant gauche',
    reported_at: new Date().toISOString()
  }]
});
```

## Tests
```bash
npm test -- lib/inspection
```
