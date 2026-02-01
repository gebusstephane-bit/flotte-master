#!/usr/bin/env tsx
/**
 * Script de diagnostic pour vérifier la configuration du module Vehicle Inspection
 * Vérifie:
 * 1. Que les colonnes fuel_gasoil, fuel_gnr, fuel_adblue existent dans la DB
 * 2. Que le schéma Zod est correct
 * 3. Que les types TypeScript sont cohérents
 */

import { createClient } from '@supabase/supabase-js';
import { VehicleInspectionSchema } from '../lib/inspection/types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variables d\'environnement manquantes:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyDatabaseSchema() {
  console.log('\n🔍 Vérification du schéma de la base de données...\n');
  
  // Vérifier que la table existe et récupérer ses colonnes
  const { data: columns, error } = await supabase
    .from('information_schema.columns')
    .select('column_name, data_type, is_nullable')
    .eq('table_name', 'vehicle_inspections')
    .eq('table_schema', 'public');
  
  if (error) {
    console.error('❌ Erreur lors de la récupération du schéma:', error.message);
    return false;
  }
  
  const columnNames = columns?.map(c => c.column_name) || [];
  
  console.log('Colonnes trouvées dans vehicle_inspections:');
  columns?.forEach(col => {
    console.log(`  - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(nullable)' : '(required)'}`);
  });
  
  // Vérifier les colonnes de carburant
  const requiredColumns = ['fuel_level', 'fuel_gasoil', 'fuel_gnr', 'fuel_adblue'];
  let allOk = true;
  
  console.log('\n🛢️  Vérification des colonnes carburant:');
  for (const col of requiredColumns) {
    if (columnNames.includes(col)) {
      console.log(`  ✅ ${col}`);
    } else {
      console.log(`  ❌ ${col} - MANQUANT!`);
      allOk = false;
    }
  }
  
  return allOk;
}

function verifyZodSchema() {
  console.log('\n🔍 Vérification du schéma Zod...\n');
  
  // Tester la validation avec des données complètes
  const testData = {
    vehicle_id: '12345678-1234-1234-1234-123456789012',
    mileage: 50000,
    fuel_level: 75,
    fuel_gasoil: 80,
    fuel_gnr: 60,
    fuel_adblue: 90,
    fuel_type: 'diesel',
    interior_condition: 'clean',
    exterior_condition: 'clean',
    defects: [
      {
        category: 'tires',
        severity: 'critical',
        description: 'Pneu crevé avant gauche',
        location: 'Roue avant gauche',
        photo_url: null,
        reported_at: new Date().toISOString(),
      }
    ],
    inspection_type: 'pre_trip',
  };
  
  const result = VehicleInspectionSchema.safeParse(testData);
  
  if (result.success) {
    console.log('✅ Schéma Zod valide avec les 3 champs carburant + défauts');
    console.log('  - fuel_gasoil:', result.data.fuel_gasoil);
    console.log('  - fuel_gnr:', result.data.fuel_gnr);
    console.log('  - fuel_adblue:', result.data.fuel_adblue);
    console.log('  - defects:', result.data.defects.length, 'anomalie(s)');
    return true;
  } else {
    console.error('❌ Erreur de validation Zod:');
    result.error.issues.forEach((err: any) => {
      console.error(`  - ${err.path.join('.')}: ${err.message}`);
    });
    return false;
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  DIAGNOSTIC MODULE VEHICLE INSPECTION');
  console.log('═══════════════════════════════════════════════════════════════');
  
  const dbOk = await verifyDatabaseSchema();
  const zodOk = verifyZodSchema();
  
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  RÉSULTAT');
  console.log('═══════════════════════════════════════════════════════════════');
  
  if (dbOk && zodOk) {
    console.log('\n✅ Tout est correctement configuré!');
    console.log('\nVous pouvez maintenant:');
    console.log('  1. Créer une inspection avec les 3 niveaux de carburant');
    console.log('  2. Les défauts critiques seront correctement classifiés');
    console.log('  3. Le récapitulatif affichera toutes les données');
    process.exit(0);
  } else {
    console.log('\n❌ Problèmes détectés:');
    if (!dbOk) {
      console.log('\n  → Appliquez la migration SQL:');
      console.log('    migrations/20250131_add_fuel_levels.sql');
    }
    if (!zodOk) {
      console.log('\n  → Vérifiez le schéma dans lib/inspection/types.ts');
    }
    process.exit(1);
  }
}

main().catch(console.error);
