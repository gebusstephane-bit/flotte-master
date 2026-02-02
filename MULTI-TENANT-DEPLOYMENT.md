# Déploiement Multi-Tenant FleetFlow

## 🎯 Objectif
Isolation stricte des données par organisation. Chaque client inscrit = une organisation vide et isolée.

---

## 📋 Étapes de déploiement

### Étape 1 : Exécuter le script SQL dans Supabase

1. Ouvrir Supabase Dashboard → SQL Editor
2. Créer une "New query"
3. Copier-coller le contenu de `supabase-multi-tenant-fix.sql`
4. Cliquer sur **Run**

**Ce que fait le script :**
- Crée l'organisation principale pour tes données existantes
- Lie tous tes profils/véhicules/interventions à cette organisation
- Active RLS avec politiques strictes d'isolation
- Prépare le système pour les nouveaux clients

### Étape 2 : Vérifier les résultats

Dans Supabase SQL Editor, exécuter :
```sql
-- Vérifier l'isolation
SELECT 
  o.name as organisation,
  COUNT(DISTINCT p.id) as profils,
  COUNT(DISTINCT v.id) as vehicules,
  COUNT(DISTINCT i.id) as interventions
FROM organizations o
LEFT JOIN profiles p ON p.current_organization_id = o.id
LEFT JOIN vehicles v ON v.organization_id = o.id
LEFT JOIN interventions i ON i.organization_id = o.id
GROUP BY o.id, o.name;
```

**Résultat attendu :**
- 1 organisation "FleetFlow Principal" (ou ton entreprise)
- X profils (toi + tes employés)
- Y véhicules (tes véhicules actuels)
- Z interventions (tes interventions actuelles)

### Étape 3 : Tester l'isolation

#### Test A - Ton compte (admin)
1. Te connecter avec ton compte (gebus.stephane@gmail.com)
2. Aller sur /admin/users
3. **Tu dois voir UNIQUEMENT tes employés** (pas les nouveaux inscrits)
4. Aller sur /parc
5. **Tu dois voir tes véhicules actuels**

#### Test B - Créer un nouveau compte
1. Aller sur /register
2. Créer un compte avec un autre email (ex: test-client@gmail.com)
3. Choisir "Starter"
4. Compléter l'inscription
5. **Le nouveau client doit voir une base VIDE** (0 véhicules)

#### Test C - Vérifier la séparation
1. Avec le nouveau compte, essayer d'accéder à /admin/users
2. **Ne doit voir aucun utilisateur** (car organisation vide)
3. Ajouter un véhicule "TEST-123-AB"
4. Te reconnecter avec ton compte admin
5. **Tu ne dois PAS voir "TEST-123-AB" dans ton parc**

### Étape 4 : Déployer le code

```bash
# Commit et push
git add -A
git commit -m "fix: isolation multi-tenant complète"
git push origin main

# Vercel se déploie automatiquement
```

---

## 🔧 Fichiers modifiés

| Fichier | Modification |
|---------|-------------|
| `supabase-multi-tenant-fix.sql` | Migration SQL complète |
| `app/api/admin/list-profiles/route.ts` | Filtre par organisation |
| `app/api/admin/create-user/route.ts` | Crée user dans même org |
| `app/api/admin/delete-user/route.ts` | Vérifie org avant suppression |
| `app/api/admin/delete-vehicle/route.ts` | Vérifie org avant suppression |
| `app/api/admin/delete-intervention/route.ts` | Vérifie org avant suppression |
| `app/api/admin/update-user-role/route.ts` | Vérifie org avant modification |
| `app/api/interventions/reject/route.ts` | Vérifie org avant rejet |
| `app/api/public/vehicle/route.ts` | Utilise service role |

---

## 🚨 Vérifications post-déploiement

### Checklist critique

- [ ] Tes données existantes sont préservées
- [ ] Tu vois tes employés dans /admin/users
- [ ] Tu vois tes véhicules dans /parc
- [ ] Nouveau client voit une base vide
- [ ] Nouveau client peut ajouter un véhicule
- [ ] Toi (admin) tu ne vois PAS les véhicules du nouveau client
- [ ] Le nouveau client ne voit PAS tes véhicules
- [ ] API publique (/api/public/vehicle) fonctionne pour inspection QR

### Commandes SQL de vérification

```sql
-- Vérifier les organisations
SELECT id, name, created_by, plan FROM organizations;

-- Vérifier les profils et leurs orgs
SELECT p.email, p.role, p.current_organization_id, o.name as org_name
FROM profiles p
LEFT JOIN organizations o ON o.id = p.current_organization_id;

-- Vérifier les véhicules par org
SELECT o.name, COUNT(v.id) as vehicle_count
FROM organizations o
LEFT JOIN vehicles v ON v.organization_id = o.id
GROUP BY o.id, o.name;

-- Vérifier les politiques RLS
SELECT tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename IN ('vehicles', 'interventions', 'profiles')
ORDER BY tablename;
```

---

## 🔍 Dépannage

### Problème : "Aucun véhicule trouvé" après migration

**Cause possible :** Les véhicules n'ont pas été liés à l'organisation.

**Solution :**
```sql
-- Trouver l'ID de ton organisation
SELECT id FROM organizations WHERE name = 'FleetFlow Principal';

-- Lier les véhicules manuellement (remplacer ORG_ID)
UPDATE vehicles SET organization_id = 'ORG_ID' WHERE organization_id IS NULL;
```

### Problème : "Accès interdit" sur /admin/users

**Cause possible :** Ton profil n'a pas de current_organization_id.

**Solution :**
```sql
-- Vérifier ton profil
SELECT id, email, current_organization_id FROM profiles WHERE email = 'gebus.stephane@gmail.com';

-- Mettre à jour si null (remplacer ORG_ID par l'ID de ton organisation)
UPDATE profiles SET current_organization_id = 'ORG_ID' WHERE email = 'gebus.stephane@gmail.com';
```

### Problème : Nouveau client voit tes données

**Cause possible :** Le trigger n'a pas créé d'organisation pour le nouveau client.

**Solution :**
1. Vérifier que le trigger existe :
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

2. Si absent, le recréer (voir section Trigger dans le fichier SQL)

3. Créer manuellement l'organisation pour le nouveau client :
```sql
-- Trouver le user_id du nouveau client
SELECT id, email FROM auth.users WHERE email = 'test-client@gmail.com';

-- Créer son organisation
INSERT INTO organizations (name, slug, created_by, plan, max_vehicles, max_users, status)
VALUES (
  'Entreprise Test',
  'ent-test-' || substr(md5(gen_random_uuid()::text), 1, 8),
  'USER_ID',
  'starter',
  10,
  3,
  'active'
)
RETURNING id;

-- Lier le profil à cette org
UPDATE profiles SET current_organization_id = 'ORG_ID' WHERE id = 'USER_ID';

-- Lier comme owner dans organization_members
INSERT INTO organization_members (organization_id, user_id, role, status, joined_at)
VALUES ('ORG_ID', 'USER_ID', 'owner', 'active', NOW());
```

---

## 📞 Support

En cas de problème majeur :
1. Vérifier les logs Supabase (Logs → PostgREST)
2. Vérifier les logs Vercel (Deployments)
3. Exécuter les requêtes SQL de vérification ci-dessus
4. Documenter les erreurs exactes

---

## ✅ Validation finale

Le système est correctement configuré quand :
1. **Données préservées** : Tu vois tes données existantes
2. **Isolation** : Nouveau client = base vide
3. **Partage interne** : Tes employés voient tes données
4. **Sécurité** : Les clients ne se voient pas entre eux
5. **Scalabilité** : Chaque nouveau client = nouvelle org auto
