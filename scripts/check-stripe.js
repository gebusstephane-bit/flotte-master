#!/usr/bin/env node
/**
 * Script de vérification de la configuration Stripe
 * Usage: node scripts/check-stripe.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Vérification de la configuration Stripe...\n');

// Lire le fichier .env.local
const envPath = path.join(process.cwd(), '.env.local');

if (!fs.existsSync(envPath)) {
  console.error('❌ Fichier .env.local non trouvé !');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');

// Vérifier les variables requises
const requiredVars = [
  'STRIPE_SECRET_KEY',
  'STRIPE_WEBHOOK_SECRET',
  'STRIPE_PRICE_STARTER',
  'STRIPE_PRICE_PRO',
];

const optionalVars = [
  'STRIPE_PRICE_ENTERPRISE',
];

let allGood = true;

console.log('📋 Variables obligatoires :\n');
for (const varName of requiredVars) {
  const regex = new RegExp(`^${varName}=.+`, 'm');
  const match = envContent.match(regex);
  
  if (match && match[0].split('=')[1].trim()) {
    const value = match[0].split('=')[1].trim();
    const masked = value.length > 10 
      ? value.substring(0, 8) + '...' + value.substring(value.length - 4)
      : value;
    console.log(`  ✅ ${varName}=${masked}`);
  } else {
    console.log(`  ❌ ${varName} manquante ou vide`);
    allGood = false;
  }
}

console.log('\n📋 Variables optionnelles :\n');
for (const varName of optionalVars) {
  const regex = new RegExp(`^${varName}=.+`, 'm');
  const match = envContent.match(regex);
  
  if (match && match[0].split('=')[1].trim()) {
    const value = match[0].split('=')[1].trim();
    console.log(`  ✅ ${varName}=${value}`);
  } else {
    console.log(`  ⚠️  ${varName} non définie`);
  }
}

console.log('\n📋 Vérification du format des clés :\n');

// Vérifier le format de STRIPE_SECRET_KEY
const skMatch = envContent.match(/^STRIPE_SECRET_KEY=(.+)$/m);
if (skMatch) {
  const sk = skMatch[1].trim();
  if (sk.startsWith('sk_test_')) {
    console.log('  ✅ STRIPE_SECRET_KEY est une clé de TEST');
  } else if (sk.startsWith('sk_live_')) {
    console.log('  ⚠️  STRIPE_SECRET_KEY est une clé LIVE (attention !)');
  } else {
    console.log('  ❌ STRIPE_SECRET_KEY format invalide (doit commencer par sk_test_ ou sk_live_)');
    allGood = false;
  }
}

// Vérifier le format de STRIPE_WEBHOOK_SECRET
const whMatch = envContent.match(/^STRIPE_WEBHOOK_SECRET=(.+)$/m);
if (whMatch) {
  const wh = whMatch[1].trim();
  if (wh.startsWith('whsec_')) {
    console.log('  ✅ STRIPE_WEBHOOK_SECRET format valide');
  } else {
    console.log('  ❌ STRIPE_WEBHOOK_SECRET format invalide (doit commencer par whsec_)');
    allGood = false;
  }
}

// Vérifier le format des price IDs
const priceVars = ['STRIPE_PRICE_STARTER', 'STRIPE_PRICE_PRO', 'STRIPE_PRICE_ENTERPRISE'];
for (const varName of priceVars) {
  const match = envContent.match(new RegExp(`^${varName}=(.+)$`, 'm'));
  if (match) {
    const priceId = match[1].trim();
    if (priceId.startsWith('price_')) {
      console.log(`  ✅ ${varName} format valide`);
    } else if (priceId === '') {
      console.log(`  ⚠️  ${varName} vide`);
    } else {
      console.log(`  ❌ ${varName} format invalide (doit commencer par price_)`);
      allGood = false;
    }
  }
}

console.log('\n' + '='.repeat(50));
if (allGood) {
  console.log('🎉 Tous les éléments obligatoires sont configurés !');
  console.log('\nProchaines étapes :');
  console.log('  1. Redémarrez le serveur : npm run dev');
  console.log('  2. Allez sur http://localhost:3000/dashboard/settings/billing');
  console.log('  3. Testez un paiement avec la carte 4242 4242 4242 4242');
} else {
  console.log('❌ Configuration incomplète !');
  console.log('\nSuivez le guide : GUIDE-STRIPE-DETAILLE.md');
  process.exit(1);
}
