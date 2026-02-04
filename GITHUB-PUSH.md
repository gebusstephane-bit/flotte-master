# 🚀 GUIDE - Pousser sur GitHub

Votre projet est déjà lié au repository : `https://github.com/gebusstephane-bit/flotte-master.git`

## 📋 Commandes à exécuter

Ouvrez un terminal dans le dossier du projet et exécutez :

```bash
# 1. Se placer dans le dossier (si pas déjà fait)
cd c:\Users\gebus\fleet-master

# 2. Vérifier l'état
git status

# 3. Ajouter tous les fichiers modifiés
git add .

# 4. Créer un commit
git commit -m "feat: modernisation landing page, fix notifications, intégration Stripe"

# 5. Pousser sur GitHub
git push origin main
```

## 🔍 Vérification

Si vous voyez une erreur, essayez :

```bash
# Voir la branche actuelle
git branch

# Si vous êtes sur 'master' et pas 'main'
git push origin master
```

## 📁 Fichiers inclus dans ce push

| Fichier | Description |
|---------|-------------|
| `app/landing-components/LandingPageContent.tsx` | Landing page modernisée (dark mode) |
| `app/api/notify/route.ts` | Fix notifications multi-tenant |
| `app/inspections/page.tsx` | Fix scrollbar historique |
| `components/AppSidebar.tsx` | Menu avec lien Abonnement |
| `components/LayoutShell.tsx` | Fix routes publiques |
| `app/dashboard/settings/billing/page.tsx` | Page de gestion Stripe |
| `STRIPE-SETUP.md` | Documentation Stripe |
| `GUIDE-STRIPE-DETAILLE.md` | Guide ultra-détaillé Stripe |
| `scripts/check-stripe.js` | Script vérification config |
| `.gitignore` | Fichiers ignorés mis à jour |
| `README.md` | Documentation projet |

## ⚠️ Fichiers NON inclus (sécurité)

Ces fichiers sont ignorés par `.gitignore` :
- `.env.local` (vos clés API secrètes)
- `node_modules/` (dépendances)
- `.next/` (build)

## ✅ Vérifier sur GitHub

Après le push, allez sur :
```
https://github.com/gebusstephane-bit/flotte-master
```

Vous devriez voir vos modifications avec le message de commit.

## 🆘 En cas de problème

### Erreur "fatal: not a git repository"
```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/gebusstephane-bit/flotte-master.git
git push -u origin main
```

### Erreur "Permission denied"
Vérifiez que vous êtes connecté à GitHub :
```bash
git config user.name "Votre Nom"
git config user.email "votre@email.com"
```

### Erreur "Updates were rejected"
Forcez le push (attention, écrase les changements distants) :
```bash
git push origin main --force
```

---

**Besoin d'aide ?** Vérifiez les logs d'erreur et envoyez-les moi.
