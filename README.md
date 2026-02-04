# 🚛 FleetFlow - Gestion de Flotte Automobile

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Database-green)](https://supabase.com/)
[![Stripe](https://img.shields.io/badge/Stripe-Payments-635BFF)](https://stripe.com/)

FleetFlow est une solution SaaS moderne de gestion de flotte automobile pour les entreprises. Gérez vos véhicules, interventions, inspections QR et plannings en un seul outil.

![Landing Page](https://fleetflow.io/og-image.jpg)

## ✨ Fonctionnalités

- 📱 **Inspections QR Code** - Les conducteurs scannent et remplissent l'état des lieux
- 🔧 **Gestion des Interventions** - Devis, validations, suivi des travaux
- 📅 **Planning** - Calendrier des RDV avec les garages
- 🔔 **Alertes Temps Réel** - Notifications pour contrôles techniques et échéances
- 📊 **Dashboard Analytics** - Score de santé de la flotte, KPIs essentiels
- 💳 **Paiements Stripe** - Abonnements Starter, Pro et Enterprise
- 👥 **Multi-Tenant** - Gestion multi-organisations avec isolation des données
- 🌙 **Dark Mode** - Interface moderne avec thème sombre

## 🚀 Démarrage Rapide

### Prérequis

- Node.js 20+
- npm 10+
- Compte Supabase
- Compte Stripe (optionnel, pour les paiements)

### Installation

```bash
# Cloner le repository
git clone https://github.com/votre-org/fleetflow.git
cd fleetflow

# Installer les dépendances
npm install

# Configurer les variables d'environnement
cp .env.example .env.local
# Éditez .env.local avec vos clés

# Lancer le serveur de développement
npm run dev
```

Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

## ⚙️ Configuration

### Supabase

1. Créez un projet sur [Supabase](https://supabase.com)
2. Copiez l'URL et la clé anonyme dans `.env.local`
3. Exécutez le script SQL : `supabase-setup-v4-multitenant.sql`

### Stripe (Optionnel)

Pour activer les paiements :

1. Créez un compte sur [Stripe](https://stripe.com)
2. Suivez le guide : [STRIPE-SETUP.md](./STRIPE-SETUP.md)
3. Ajoutez vos clés dans `.env.local`

### Email

Choisissez votre provider :

**Option 1 - Resend (Recommandé)** :
```env
RESEND_API_KEY=re_xxxxxxxx
MAIL_FROM_EMAIL=noreply@votre-domaine.com
```

**Option 2 - Gmail SMTP** :
```env
GMAIL_USER=votre-email@gmail.com
GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
```

## 📁 Structure du Projet

```
app/
├── api/                    # Routes API (Next.js)
│   ├── stripe/            # Intégration Stripe
│   ├── notify/            # Notifications email
│   └── ...
├── dashboard/             # Interface admin
├── landing-components/    # Landing page
├── parc/                  # Gestion du parc
├── maintenance/           # Interventions
├── planning/              # Calendrier
└── ...

components/
├── ui/                    # Composants UI (shadcn)
├── inspection/            # Composants inspections
└── ...

lib/
├── stripe.ts             # Configuration Stripe
├── supabase.ts           # Client Supabase
└── ...

supabase-setup-v4-multitenant.sql  # Script de base de données
```

## 🛠️ Technologies

- **Framework** : [Next.js 16](https://nextjs.org/) (App Router)
- **Langage** : [TypeScript](https://www.typescriptlang.org/)
- **Styling** : [Tailwind CSS 4](https://tailwindcss.com/)
- **UI Components** : [shadcn/ui](https://ui.shadcn.com/)
- **Animations** : [Framer Motion](https://www.framer.com/motion/)
- **Database** : [Supabase](https://supabase.com/)
- **Auth** : Supabase Auth
- **Payments** : [Stripe](https://stripe.com/)
- **Emails** : Resend / Gmail SMTP

## 📝 Scripts Disponibles

```bash
npm run dev          # Développement
npm run build        # Production build
npm run start        # Démarrer production
npm run lint         # ESLint
npm run typecheck    # Vérification TypeScript
```

## 🐛 Dépannage

### Problèmes courants

**"Stripe n'est pas configuré"** :
- Vérifiez que `STRIPE_SECRET_KEY` et `STRIPE_WEBHOOK_SECRET` sont définis

**"Profil non trouvé"** :
- Assurez-vous que le trigger `handle_new_user()` est actif dans Supabase

**Erreurs RLS** :
- Vérifiez les politiques RLS dans Supabase pour chaque table

## 🤝 Contribution

Les contributions sont les bienvenues ! N'hésitez pas à ouvrir une issue ou une pull request.

## 📄 Licence

Ce projet est sous licence MIT. Voir le fichier [LICENSE](./LICENSE) pour plus de détails.

## 📞 Support

- 📧 Email : contact@fleetflow.io
- 🌐 Site web : https://fleetflow.io

---

<p align="center">Fait avec ❤️ en France</p>
