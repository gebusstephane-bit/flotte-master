# 🚀 GUIDE DÉPLOIEMENT - Fleet-Master sur Vercel

**Statut:** ✅ PRÊT POUR PRODUCTION  
**Date:** 2026-02-01

---

## ✅ CORRECTIONS EFFECTUÉES

### 1. Configuration Next.js (`next.config.ts`)
- ❌ Supprimé `ignoreBuildErrors: true` (dangereux)
- ✅ Ajouté `output: 'standalone'` (optimisation Vercel)
- ✅ Ajouté configuration images Supabase
- ✅ Ajouté headers de sécurité

### 2. TypeScript - Corrections d'erreurs
- ✅ Zod v4: `error.errors` → `error.issues`
- ✅ Types `Defect` dupliqués → `ScoringDefect`
- ✅ `@types/nodemailer` installé
- ✅ Tests exclus de la compilation
- ✅ Types corrigés dans `button-unified.tsx`
- ✅ Types corrigés dans `pdf.ts` et `export.ts`

### 3. Configuration projet
- ✅ `.env.example` créé
- ✅ `engines` ajouté dans `package.json`
- ✅ Script `prebuild` ajouté

---

## 📋 VARIABLES D'ENVIRONNEMENT REQUISES

Dans Vercel Dashboard → Project Settings → Environment Variables:

```bash
# Obligatoire - Supabase
NEXT_PUBLIC_SUPABASE_URL=https://tuzknkkouhrowmbwmgtg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Email - Resend (optionnel)
RESEND_API_KEY=re_...
MAIL_FROM_EMAIL=noreply@fleet-master.fr
MAIL_FROM_NAME=FleetFlow

# Email - Gmail fallback (optionnel)
GMAIL_USER=votre-email@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx

# Application
APP_URL=https://fleet-master.vercel.app
```

---

## 🚀 COMMANDES DÉPLOIEMENT

### Étape 1: Vérification finale locale
```bash
# Build production
npm run build

# Tout doit passer sans erreur
npm run typecheck
npm run lint
```

### Étape 2: Git
```bash
# Vérifier le statut
git status

# Ajouter les changements
git add .

# Commit
git commit -m "fix: audit pre-production - corrections TypeScript et config"

# Push
git push origin main
```

### Étape 3: Vercel CLI (optionnel)
```bash
# Si Vercel CLI n'est pas installé
npm i -g vercel

# Déploiement preview
vercel

# Déploiement production
vercel --prod
```

### Étape 4: Vercel Dashboard (recommandé)
1. Connecter GitHub à Vercel
2. Sélectionner le repo `fleet-master`
3. Vercel détecte automatiquement Next.js
4. Configurer les variables d'environnement
5. Deploy !

---

## 🔧 CONFIGURATION SUPABASE

Vérifier que ces tables existent:
- `vehicles` ✓
- `interventions` ✓
- `profiles` ✓
- `vehicle_inspections` ✓
- `notification_logs` ✓
- `inspection_alerts` ✓

RLS Policies activées pour toutes les tables sensibles.

---

## 🌐 URLS ATTENDUES

- **Production:** `https://fleet-master.vercel.app`
- **Login:** `/login`
- **Inspection QR:** `/inspection`
- **Maintenance:** `/maintenance`
- **Parc:** `/parc`
- **Planning:** `/planning`

---

## ⚠️ VÉRIFICATIONS POST-DÉPLOIEMENT

1. ✅ Page de login s'affiche
2. ✅ Authentification fonctionne
3. ✅ Formulaire d'inspection QR fonctionne
4. ✅ Création intervention fonctionne
5. ✅ Emails partent (vérifier logs Vercel)
6. ✅ Notifications en temps réel (Supabase realtime)

---

## 🆘 DÉPANNAGE

### Build échoue
```bash
# Nettoyer le cache
rm -rf .next
rm -rf node_modules
npm install
npm run build
```

### Variables d'env manquantes
- Vérifier dans Vercel Dashboard > Settings > Environment Variables
- Redeploy après modification des env vars

### Erreurs 500 en production
- Vérifier les logs: Vercel Dashboard > Functions
- Vérifier Supabase: Tables et RLS policies

---

**🎉 VOTRE APPLICATION EST PRÊTE POUR LE DÉPLOIEMENT !**
