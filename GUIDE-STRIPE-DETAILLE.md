# 🎯 GUIDE ULTRA-DÉTAILLÉ - Configuration Stripe FleetFlow

Suivez ce guide pas à pas pour configurer Stripe.

---

## 📍 ÉTAPE 0 : Créer un compte Stripe (5 min)

### 0.1 Inscription
1. Allez sur https://dashboard.stripe.com/register
2. Remplissez :
   - **Email** : votre email professionnel
   - **Nom complet** : votre nom
   - **Mot de passe** : choisissez un mot de passe sécurisé
3. Cliquez sur **"Créer un compte"**

### 0.2 Vérifier l'email
1. Allez dans votre boîte mail
2. Cherchez l'email de Stripe
3. Cliquez sur **"Confirmer mon adresse email"**

### 0.3 Activer le mode test
- Par défaut, vous êtes en mode **TEST** (c'est parfait pour commencer)
- Vous verrez un bandeau orange "Test mode" en haut à droite

---

## 📍 ÉTAPE 1 : Créer les produits (10 min)

### 1.1 Aller dans la section Produits
1. Dans le Dashboard Stripe, cliquez sur **"Produits"** dans le menu de gauche
2. Cliquez sur le bouton **"+ Ajouter un produit"** (en haut à droite)

### 1.2 Créer le produit "Starter"

**Informations du produit :**
```
Nom : FleetFlow Starter
Description : Pour les petites flottes - Jusqu'à 10 véhicules
```

**Configuration du prix :**
- Cochez **"Ajouter un prix"**
- **Modèle de prix** : Standard
- **Montant** : 29.00
- **Devise** : EUR (€)
- **Modèle de facturation** : Récurrent
- **Intervalle de facturation** : 1 mois

Cliquez sur **"Enregistrer le produit"**

**📝 IMPORTANT : Récupérer l'ID du prix**
1. Vous êtes redirigé vers la page du produit
2. Dans la section "Prix", vous voyez un tableau
3. Cliquez sur le prix (la ligne avec "29,00 € / mois")
4. En haut à droite, vous voyez : **"API ID : price_xxxxxx"**
5. **COPIEZ CET ID** (il ressemble à : `price_1QXXXXXXXXXXXXXXXX`)
6. Notez-le dans un fichier temporaire : `PRIX_STARTER = price_xxxx`

---

### 1.3 Créer le produit "Pro"

Retournez sur **Produits** → **+ Ajouter un produit**

**Informations du produit :**
```
Nom : FleetFlow Pro
Description : Pour les flottes en croissance - Jusqu'à 50 véhicules
```

**Configuration du prix :**
- Montant : **79.00** EUR
- Facturation : Récurrent
- Intervalle : 1 mois

Cliquez sur **"Enregistrer le produit"**

**Récupérer l'ID du prix :**
- Même procédure que ci-dessus
- Notez : `PRIX_PRO = price_xxxx`

---

### 1.4 Créer le produit "Enterprise" (sans prix)

**Informations du produit :**
```
Nom : FleetFlow Enterprise
Description : Sur mesure - Contactez nos ventes
```

**Configuration :**
- NE COCHEZ PAS "Ajouter un prix"
- Ce produit est géré manuellement (sur devis)

Cliquez sur **"Enregistrer le produit"**

---

## 📍 ÉTAPE 2 : Récupérer les clés API (5 min)

### 2.1 Clé secrète
1. Dans le Dashboard Stripe, cliquez sur **"Développeurs"** (en haut à droite)
2. Cliquez sur **"Clés API"**
3. Vous voyez la section **"Clés secrètes"**
4. Cliquez sur **"Révéler la clé en mode test"** (ou cliquez sur "Créer une clé secrète" si aucune n'existe)
5. **COPIEZ** la clé secrète (elle commence par `sk_test_` en mode test)
6. Notez-la pour plus tard

⚠️ **ATTENTION** : Cette clé est SECRÈTE. Ne la partagez jamais.

---

## 📍 ÉTAPE 3 : Configurer le Webhook (15 min)

### 3.1 En production (Vercel)

Si votre app est déployée sur Vercel :

1. Dans Stripe, allez dans **"Développeurs"** → **"Webhooks"**
2. Cliquez sur **"Ajouter un endpoint"**

**Configuration :**
```
URL du endpoint : https://votre-app.vercel.app/api/stripe/webhook
Description : FleetFlow Webhook
```

**Sélectionner les événements :**
Cliquez sur **"Sélectionner des événements"** puis cochez :
- [x] `checkout.session.completed`
- [x] `invoice.payment_succeeded`
- [x] `invoice.payment_failed`
- [x] `customer.subscription.created`
- [x] `customer.subscription.updated`
- [x] `customer.subscription.deleted`

Cliquez sur **"Ajouter un endpoint"**

**Récupérer la clé de signature :**
1. Vous êtes sur la page du webhook créé
2. Cliquez sur **"Révéler"** à côté de "Clé de signature"
3. **COPIEZ** la clé qui commence par `whsec_`
4. Notez : `STRIPE_WEBHOOK_SECRET = whsec_xxxx`

---

### 3.2 En local (développement)

Pour tester en local, vous avez 2 options :

#### Option A : Utiliser Stripe CLI (recommandé)

**Installation Stripe CLI :**
```bash
# Windows (avec PowerShell en admin)
winget install Stripe.StripeCLI

# Mac
brew install stripe/stripe-cli/stripe

# Linux
brew install stripe/stripe-cli/stripe
```

**Connexion à Stripe :**
```bash
stripe login
```
- Une page web s'ouvre
- Connectez-vous à votre compte Stripe
- Autorisez l'accès

**Démarrer le forwarding des webhooks :**
```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Vous verrez :
```
> Ready! You are using Stripe API Version [2024-...]
> Your webhook signing secret is whsec_xxxxxx (^C to quit)
```

**📝 COPIEZ** le `whsec_xxxxxx` affiché, c'est votre `STRIPE_WEBHOOK_SECRET` pour le local.

---

#### Option B : Utiliser ngrok

**Installation ngrok :**
```bash
# Windows
winget install ngrok

# Mac
brew install ngrok
```

**Créer un compte ngrok :**
1. Allez sur https://ngrok.com
2. Créez un compte gratuit
3. Récupérez votre authtoken dans le dashboard

**Configurer ngrok :**
```bash
ngrok config add-authtoken VOTRE_TOKEN
```

**Démarrer ngrok :**
```bash
ngrok http 3000
```

Vous verrez :
```
Forwarding  https://xxxx-xx-xx-xxx-xx.ngrok.io -> http://localhost:3000
```

**Dans Stripe Dashboard :**
1. Créez un endpoint webhook
2. URL : `https://xxxx-xx-xx-xxx-xx.ngrok.io/api/stripe/webhook`
3. Sélectionnez les mêmes événements que ci-dessus
4. Récupérez la clé `whsec_xxx`

⚠️ **Note** : Avec ngrok, l'URL change à chaque redémarrage. Vous devez mettre à jour le webhook dans Stripe.

---

## 📍 ÉTAPE 4 : Configurer l'application (5 min)

### 4.1 Créer/Modifier le fichier .env.local

Dans le dossier racine de votre projet FleetFlow, créez/modifiez `.env.local` :

```env
# ============================================
# SUPABASE (déjà configuré normalement)
# ============================================
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# ============================================
# STRIPE - COLLEZ VOS CLÉS ICI
# ============================================

# Clé secrète (Étape 2.1)
STRIPE_SECRET_KEY=VOTRE_CLE_SECRETE_ICI

# Webhook secret (Étape 3.1 ou 3.2)
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxx

# IDs des prix (Étape 1.2 et 1.3)
STRIPE_PRICE_STARTER=price_xxxxxxxxxxxxxxxx
STRIPE_PRICE_PRO=price_xxxxxxxxxxxxxxxx
STRIPE_PRICE_ENTERPRISE=price_xxxxxxxxxxxxxxxx

# URL de l'app
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 4.2 Redémarrer le serveur

**Arrêtez** le serveur si il tourne (Ctrl+C)

**Redémarrez :**
```bash
npm run dev
```

---

## 📍 ÉTAPE 5 : Tester le paiement (10 min)

### 5.1 Accéder à la page billing

1. Connectez-vous à votre application FleetFlow
2. Allez sur : http://localhost:3000/dashboard/settings/billing

### 5.2 Tester l'upgrade

1. Vous voyez votre plan actuel (normalement "Gratuit")
2. Cliquez sur **"Commencer"** sur le plan Starter
3. Vous êtes redirigé vers Stripe Checkout

### 5.3 Payer avec une carte de test

**Utilisez ces coordonnées :**
```
Numéro de carte : 4242 4242 4242 4242
Date d'expiration : 12/30 (n'importe quelle date future)
CVC : 123 (n'importe quel nombre à 3 chiffres)
Nom : Test User
```

Cliquez sur **"Payer"**

### 5.4 Vérifier le résultat

1. Vous êtes redirigé vers le dashboard
2. Rafraîchissez la page `/dashboard/settings/billing`
3. Votre plan doit maintenant afficher **"Starter"**

**Dans le Dashboard Stripe :**
- Allez dans **"Clients"**
- Vous devez voir un nouveau client
- Allez dans **"Abonnements"**
- Vous devez voir un abonnement actif

**Dans Supabase :**
- Table `subscriptions` : nouvelle ligne créée
- Table `organizations` : votre org a le plan "starter"

---

## 📍 ÉTAPE 6 : Passer en production (optionnel)

Quand vous êtes prêt à recevoir de vrais paiements :

### 6.1 Activer le compte Stripe
1. Dans Stripe Dashboard, cliquez sur **"Activer le paiement"**
2. Remplissez :
   - Informations de l'entreprise
   - IBAN pour les virements
   - Documents justificatifs
3. Attendez la validation (quelques heures à 2 jours)

### 6.2 Passer aux clés Live
1. Basculez le toggle **"Test mode"** en haut à droite vers **OFF**
2. Récupérez les nouvelles clés live (format différent des clés test)
3. Mettez à jour votre `.env.local` avec les clés live
4. Redéployez sur Vercel avec les nouvelles variables d'environnement

### 6.3 Mettre à jour le webhook
1. Dans Stripe (mode Live), créez un nouveau webhook
2. URL : `https://votre-app.vercel.app/api/stripe/webhook`
3. Mêmes événements que précédemment
4. Récupérez la nouvelle clé `whsec_` (mode live)

---

## 🔧 DÉPANNAGE

### Problème : "Stripe n'est pas configuré"
**Solution :**
- Vérifiez que `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` sont bien dans `.env.local`
- Redémarrez le serveur
- Vérifiez qu'il n'y a pas d'espaces dans les clés

### Problème : "Signature invalide" (webhook)
**Solution :**
- Vérifiez que `STRIPE_WEBHOOK_SECRET` correspond bien à la clé dans Stripe
- Si vous utilisez ngrok, l'URL a peut-être changé
- Avec Stripe CLI, redémarrez `stripe listen`

### Problème : Paiement réussi mais pas mis à jour dans l'app
**Solution :**
1. Vérifiez les logs du serveur :
   ```
   [Stripe Webhook] checkout.session.completed
   ```
2. Si pas de log, le webhook n'arrive pas → vérifiez ngrok/Stripe CLI
3. Si log présent mais erreur → vérifiez la console pour l'erreur exacte

### Problème : "Aucune organisation trouvée"
**Solution :**
- Vérifiez que vous êtes bien connecté
- Vérifiez que votre utilisateur a un `current_organization_id` dans la table `profiles`

---

## 📞 CARTES DE TEST STRIPE

| Numéro | Résultat |
|--------|----------|
| `4242 4242 4242 4242` | ✅ Succès |
| `4000 0000 0000 0002` | ❌ Refusée |
| `4000 0000 0000 9995` | ❌ Solde insuffisant |
| `4000 0000 0000 9987` | ❌ CVC incorrect |

---

## ✅ CHECKLIST FINAL

- [ ] Compte Stripe créé
- [ ] Produits Starter et Pro créés avec prix
- [ ] IDs des prix notés (`price_xxx`)
- [ ] Clé secrète récupérée
- [ ] Webhook configuré (local ou production)
- [ ] Clé webhook récupérée (`whsec_xxx`)
- [ ] Fichier `.env.local` mis à jour
- [ ] Serveur redémarré
- [ ] Test de paiement réussi
- [ ] Abonnement visible dans Supabase

---

**🎉 Une fois tous les éléments cochés, Stripe est configuré !**
