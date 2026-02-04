# 🔷 CONFIGURATION STRIPE - FleetFlow

Ce guide explique comment configurer Stripe pour la gestion des abonnements FleetFlow.

---

## 📋 PRÉREQUIS

- Un compte Stripe (https://stripe.com)
- Accès au dashboard Stripe
- L'application FleetFlow déployée (ou en local avec ngrok pour les webhooks)

---

## 🔧 ÉTAPE 1 : Créer les produits et prix dans Stripe

### 1.1 Se connecter au Dashboard Stripe
- Allez sur https://dashboard.stripe.com
- Connectez-vous à votre compte

### 1.2 Créer les produits

Allez dans **Produits** → **Ajouter un produit**

#### Produit "Starter" (29€/mois)
- **Nom**: FleetFlow Starter
- **Description**: Pour les petites flottes
- **Prix**: 29.00 EUR
- **Facturation**: Mensuelle récurrente
- **Intervalle**: 1 mois

#### Produit "Pro" (79€/mois)
- **Nom**: FleetFlow Pro
- **Description**: Pour les flottes en croissance
- **Prix**: 79.00 EUR
- **Facturation**: Mensuelle récurrente
- **Intervalle**: 1 mois

#### Produit "Enterprise" (sur devis)
- **Nom**: FleetFlow Enterprise
- **Description**: Sur mesure - contacter les ventes
- **Prix**: Ne pas créer de prix (géré manuellement)

### 1.3 Récupérer les IDs de prix

Pour chaque produit créé, récupérez l'**API ID du prix** (format: `price_xxx`):
- Cliquez sur le produit
- Dans la section "Prix", copiez l'ID qui commence par `price_`

---

## 🔐 ÉTAPE 2 : Configuration des variables d'environnement

### 2.1 Récupérer les clés API Stripe

Dans le Dashboard Stripe:
- Allez dans **Développeurs** → **Clés API**
- Copiez la **Clé secrète**

### 2.2 Configurer le Webhook

Dans le Dashboard Stripe:
- Allez dans **Développeurs** → **Webhooks**
- Cliquez sur **Ajouter un endpoint**

**URL du endpoint**:
```
https://votre-domaine.com/api/stripe/webhook
```
Ou en local avec ngrok:
```
https://votre-ngrok-url.ngrok.io/api/stripe/webhook
```

**Événements à écouter** (sélectionner tous ces événements):
- `checkout.session.completed`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.updated`
- `customer.subscription.created`
- `customer.subscription.deleted`

Copiez la **Clé de signature** du webhook (elle commence par `whsec_`)

### 2.3 Mettre à jour le fichier .env.local

Ajoutez ces variables dans votre `.env.local`:

```env
# ============================================
# STRIPE CONFIGURATION
# ============================================

# Clé secrète Stripe (obligatoire)
STRIPE_SECRET_KEY=VOTRE_CLE_SECRETE_STRIPE

# Clé de signature du webhook (obligatoire)
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxxxxxx

# IDs des prix Stripe (obligatoire)
STRIPE_PRICE_STARTER=price_xxxxxxxxxxxxxxxx
STRIPE_PRICE_PRO=price_xxxxxxxxxxxxxxxx
STRIPE_PRICE_ENTERPRISE=price_xxxxxxxxxxxxxxxx

# URL de l'application (déjà configurée normalement)
NEXT_PUBLIC_APP_URL=https://votre-domaine.com
```

---

## 🗄️ ÉTAPE 3 : Vérifier la base de données

Assurez-vous que les tables suivantes existent dans Supabase:

### Table `organizations`
```sql
- id: uuid (PK)
- name: text
- plan: text (default: 'free')
- max_vehicles: int (default: 3)
- max_users: int (default: 1)
- ...
```

### Table `subscriptions`
```sql
- id: uuid (PK)
- organization_id: uuid (FK)
- stripe_customer_id: text
- stripe_subscription_id: text
- stripe_price_id: text
- plan: text
- status: text
- current_period_start: timestamp
- current_period_end: timestamp
- cancel_at_period_end: boolean
```

### Table `organization_members`
```sql
- id: uuid (PK)
- organization_id: uuid (FK)
- user_id: uuid (FK)
- role: text (owner, admin, member)
- status: text
```

Si ces tables n'existent pas, exécutez le fichier:
```bash
supabase-setup-v4-multitenant.sql
```

---

## 🧪 ÉTAPE 4 : Tester la configuration

### 4.1 Tester en mode test (recommandé)

1. Utilisez les clés de test dans `.env.local`
2. Utilisez les cartes de test Stripe:
   - **Carte valide**: `4242 4242 4242 4242`
   - **Date**: N'importe quelle date future
   - **CVC**: N'importe quel nombre à 3 chiffres

### 4.2 Redémarrer le serveur
```bash
npm run dev
```

### 4.3 Tester le flux de paiement
1. Allez sur `/dashboard/settings/billing`
2. Cliquez sur "Mettre à niveau" sur un plan payant
3. Complétez le paiement avec une carte de test
4. Vérifiez que l'abonnement est bien créé dans Supabase

---

## 🚀 ÉTAPE 5 : Passer en production

### 5.1 Activer le compte Stripe
- Complétez la vérification du compte Stripe
- Ajoutez vos informations bancaires pour recevoir les paiements

### 5.2 Passer aux clés live
1. Remplacez les clés de test par les clés live dans `.env.local`
2. Mettez à jour l'URL du webhook avec votre domaine de production
3. Redéployez l'application

### 5.3 Vérifier le domaine (pour les emails)
Si vous utilisez Resend pour les emails avec le domaine personnalisé:
- Vérifiez le domaine sur Resend
- Ou utilisez Gmail SMTP comme fallback (déjà configuré)

---

## 📁 STRUCTURE DES FICHIERS

```
app/
├── api/
│   └── stripe/
│       ├── checkout/route.ts      # Créer une session de paiement
│       ├── portal/route.ts        # Accès au portail client
│       └── webhook/route.ts       # Gestion des événements Stripe
├── dashboard/
│   └── settings/
│       └── billing/
│           └── page.tsx           # Page de gestion de l'abonnement
└── landing-components/
    └── LandingPageContent.tsx     # Page avec les prix

lib/
└── stripe.ts                     # Configuration et plans Stripe
```

---

## 🔧 ROUTES API DISPONIBLES

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/stripe/checkout` | POST | Crée une session de checkout Stripe |
| `/api/stripe/portal` | POST | Crée une session pour le portail client |
| `/api/stripe/webhook` | POST | Reçoit les événements Stripe |

---

## 🐛 DÉPANNAGE

### "Stripe n'est pas configuré"
- Vérifiez que `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` sont définis
- Redémarrez le serveur après modification du `.env.local`

### "Le domaine fleet-master.fr n'est pas vérifié"
- C'est un warning de Resend (l'envoi d'emails)
- Les emails tombent en fallback sur Gmail SMTP
- Pour corriger: vérifiez le domaine sur https://resend.com/domains

### Webhook non reçu
- Vérifiez l'URL du webhook dans Stripe
- En local: utilisez ngrok (`ngrok http 3000`)
- Vérifiez que `STRIPE_WEBHOOK_SECRET` correspond bien à la clé dans Stripe

### Paiement réussi mais pas mis à jour
- Vérifiez les logs du webhook (`console.log` dans `/api/stripe/webhook`)
- Assurez-vous que l'`organization_id` est bien passé dans les metadata

---

## 📚 RESSOURCES

- [Documentation Stripe](https://stripe.com/docs)
- [Checkout Stripe](https://stripe.com/docs/checkout/quickstart)
- [Webhooks Stripe](https://stripe.com/docs/webhooks)
- [Test Cards Stripe](https://stripe.com/docs/testing#cards)
