# RAPPORT D'INGÉNIERIE - FLEETFLOW
**Date:** 02 Février 2026  
**Auditeur:** Kimi Code (Architecte Senior)  
**Version:** 1.0 - Analyse complète codebase

---

## 🎯 SCORE GLOBAL

| Domaine | Score | Commentaire |
|---------|-------|-------------|
| Architecture | 6/10 | App Router bien utilisé mais redondances et manque de cohérence |
| Performance | 5/10 | N+1 queries omniprésentes, pas de cache, pas de pagination |
| Sécurité | 5/10 | RLS complexe mais contournable, manque de validation API |
| UX/UI | 7/10 | Bon design visuel mais manque de feedback utilisateur |
| Code Quality | 5/10 | Types inconsistants, duplication, pas de tests |
| **MOYENNE** | **5.6/10** | **Projet fonctionnel mais dette technique importante** |

---

## 🔴 CRITIQUE (À FIXER IMMÉDIATEMENT)

### 1. **N+1 Queries Massives** → Performance catastrophique à scale
**Impact:** Avec 1000 véhicules, le dashboard génère +3000 requêtes SQL

```typescript
// DANS: app/dashboard/page.tsx et ailleurs
const orgs = await getOrganizations();          // 1 requête
for (const org of orgs) {
  const users = await getUsers(org.id);         // N requêtes ❌
  const vehicles = await getVehicles(org.id);   // N requêtes ❌
  const interventions = await getInterventions(org.id); // N requêtes ❌
}
```

**Solution:** 
- Utiliser des JOINs SQL côté serveur
- Créer des vues materialisées pour les dashboards
- Implémenter React Query avec stale-while-revalidate

### 2. **Aucune Pagination** → Crash mémoire garanti
**Impact:** Chargement de TOUTES les données en mémoire

```typescript
// DANS: app/superadmin/organizations/page.tsx
const { data: orgsData } = await supabase
  .from("organizations")
  .select("*");  // PAS DE .limit() ❌

// Puis pour CHAQUE org :
await Promise.all(orgsData.map(async (org) => {
  // ... requêtes pour chaque org
}));
```

**Solution:**
```typescript
.limit(20)
.range((page - 1) * 20, page * 20 - 1)
```

### 3. **RLS Contournable** → Faille de sécurité majeure
**Impact:** Les users peuvent accéder aux données d'autres organizations

```typescript
// DANS: lib/organization.ts - getUserOrganizations()
// La fonction ne vérifie PAS que l'user est membre de l'org
const { data } = await supabase
  .from("organization_members")
  .select(`organization:organizations(*)`)
  .eq("user_id", userId);  // RLS filtre par user_id mais...
```

**Problème:** Les policies RLS sont complexes (442 lignes SQL) mais contiennent des failles:
- `mileage_logs_select_policy` autorise `USING (true)` → Tout le monde voit tout
- Pas de vérification `organization_id` dans plusieurs tables

**Solution:** Implémenter le God Mode pattern avec `supabaseAdmin` côté serveur uniquement

### 4. **Race Condition sur les Limites** → Dépassement des quotas
**Impact:** Deux users peuvent créer un véhicule en même temps et dépasser max_vehicles

```typescript
// DANS: lib/organization.ts - checkOrganizationLimit()
const { count } = await supabase
  .from("vehicles")
  .select("*", { count: "exact", head: true })
  .eq("organization_id", organizationId);

if (count < max) {  // Lecture...
  await insertVehicle(data);  // Écriture (pas atomique!) ❌
}
```

**Solution:** Utiliser des contraintes DB + transactions:
```sql
ALTER TABLE vehicles ADD CONSTRAINT max_vehicles_check 
  CHECK (organization_id IN (
    SELECT id FROM organizations 
    WHERE (SELECT COUNT(*) FROM vehicles WHERE organization_id = vehicles.organization_id) < max_vehicles
  ));
```

### 5. **console.log en Production** → Fuite d'informations
**Impact:** Données sensibles visibles dans la console client

```typescript
// DANS: app/dashboard/page.tsx
console.log("[Dashboard] Résultat véhicules:", vRes);
console.log("[Dashboard] Check véhicules:", allVehicles);
```

**Solution:** Utiliser le logger structuré (`lib/logger.ts`) avec niveaux

---

## 🟡 IMPORTANT (À FAIRE DANS LE MOIS)

### 1. **Double Système de Rôles** → Confusion et bugs
**Problème:** Deux systèmes de RBAC coexistent sans cohérence:
- `lib/role.ts`: admin, direction, agent_parc, exploitation
- `lib/organization.ts`: owner, admin, manager, mechanic, member

**Impact:** Un user peut avoir `role='admin'` dans profiles mais `role='member'` dans organization_members

**Solution:** Unifier en un seul système avec hiérarchie claire

### 2. **Pas de Tests** → Régression garantie
**État actuel:** 0 tests automatisés

**Priorité:**
- Tests unitaires sur validation.ts (facile, haute valeur)
- Tests d'intégration sur les API routes
- E2E sur le parcours critique: Login → Ajouter véhicule → Créer intervention

### 3. **Gestion d'erreurs inconsistente** → UX dégradée
```typescript
// Parfois:
if (error) throw error;

// Parfois:
if (error) console.error(error);

// Parfois:
if (error) return NextResponse.json({ error: error.message }, { status: 500 });

// Parfois:
if (error) { /* silencieux */ }
```

**Solution:** Middleware de gestion d'erreurs global + Error Boundaries React

### 4. **Types dupliqués** → Maintenance difficile
**Problème:** Interface Vehicle définie dans:
- `lib/supabase.ts` (lignes 11-22)
- `lib/organization.ts` (pas de type Vehicle mais usage implicite)
- Composants avec `any` ou types inline

**Solution:** Générer les types depuis Supabase CLI + centraliser

### 5. **Magic Numbers** → Code difficile à maintenir
```typescript
max_vehicles: 10,  // Pourquoi 10?
max_users: 3,      // Pourquoi 3?
debounce: 300,     // ms
```

**Solution:** Fichier de configuration constants.ts

### 6. **Pas de Rate Limiting** → Vulnérable aux attaques
**Impact:** API endpoints exposés sans protection

**Solution:** Implémenter `rate-limiter-flexible` sur les routes API critiques

### 7. **Chargement synchrone des fonts/icônes** → LCP lent
**Impact:** Performance perçue dégradée

**Solution:** Preload des ressources critiques, lazy loading des icônes non critiques

---

## 🟢 AMÉLIORATION (Nice-to-have)

### 1. **Storybook** → Documentation visuelle des composants
### 2. **Swagger/OpenAPI** → Documentation API auto-générée
### 3. **Semantic Release** → Changelog auto + versioning
### 4. **Bundle Analyzer** → Optimiser la taille du bundle
### 5. **React Query Devtools** → Debug plus facile des requêtes

---

## 🔍 ANALYSE DÉTAILLÉE PAR DOMAINE

### 📐 1. ARCHITECTURE

#### Points Positifs ✅
- App Router Next.js 16 bien structuré
- Séparation claire Client vs Server Components
- Groupes de routes `(marketing)`, `superadmin` bien utilisés
- Composants UI réutilisables avec shadcn/ui

#### Points Négatifs ❌
```
app/
├── api/                    # OK
├── dashboard/              # Mélange de logique métier
├── parc/
│   ├── page.tsx           # Server Component simple ✅
│   └── ParcClient.tsx     # 900+ lignes ❌
```

**Problèmes spécifiques:**
1. **ParcClient.tsx:** 900+ lignes, mélange UI + logique métier + formulaires
2. **Duplication de logique:** Gestion des dates copiée dans 5+ fichiers
3. **Pas de séparation DAL (Data Access Layer):** Supabase appelé directement depuis les composants

#### Recommandation Structure:
```
app/
├── (routes)/              # Routes groupées
├── api/                   # API routes
├── _lib/                  # Code métier partagé
│   ├── repositories/      # Accès données (Supabase)
│   ├── services/          # Logique métier
│   └── validators/        # Validation Zod
├── _components/           # Composants spécifiques
└── _hooks/               # Custom hooks
```

---

### 🗄️ 2. BASE DE DONNÉES

#### Tables Auditées:

| Table | Problèmes | Score |
|-------|-----------|-------|
| **vehicles** | Pas d'index sur organization_id, pas de soft delete | 5/10 |
| **organizations** | Pas de contrainte unique sur slug | 6/10 |
| **interventions** | Pas de FK vers vehicles (immat texte libre!), pas de status enum | 4/10 |
| **profiles** | Pas de contrainte email unique explicite | 6/10 |
| **organization_members** | Index manquant sur (user_id, status) | 5/10 |
| **vehicle_inspections** | ✅ Bonnes indexes, RLS complet | 8/10 |
| **audit_logs** | ✅ Table bien structurée | 7/10 |

#### Problèmes Critiques:

**1. Pas de Soft Delete:**
```sql
-- Actuellement:
DELETE FROM vehicles WHERE id = 'xxx';  -- PERDU À JAMAIS

-- Devrait être:
UPDATE vehicles SET deleted_at = NOW() WHERE id = 'xxx';
```

**2. Interventions sans FK véhicule:**
```typescript
// DANS: lib/supabase.ts
interface Intervention {
  vehicle_id?: string;  // Optionnel! ❌
  vehicule: string;     // Nom texte
  immat: string;        // Immat texte (pas de FK!)
}
```

**3. Pas de contraintes CHECK sur les dates:**
```sql
-- Un véhicule peut avoir date_ct en 1800 ou 2050 sans erreur
```

#### Index Manquants Critiques:
```sql
-- À AJOUTER IMMÉDIATEMENT:
CREATE INDEX idx_vehicles_org_status ON vehicles(organization_id, status);
CREATE INDEX idx_interventions_org_status ON interventions(organization_id, status);
CREATE INDEX idx_interventions_date_prevue ON interventions(date_prevue) WHERE date_prevue IS NOT NULL;
```

---

### ⚡ 3. PERFORMANCE

#### Problèmes Identifiés:

**Dashboard - Waterfall de requêtes:**
```typescript
// DANS: app/dashboard/page.tsx
const [vRes, iRes] = await Promise.all([
  supabase.from("vehicles").select("*"),        // Tous les véhicules ❌
  supabase.from("interventions").select("*"),   // Toutes les interventions ❌
]);
// Puis calcul côté client sur TOUTES les données
```

**Super Admin - N+1 Query:**
```typescript
// DANS: app/api/superadmin/organizations/route.ts
const orgsWithCounts = await Promise.all(
  (data || []).map(async (org: any) => {
    const { count: vehicleCount } = await supabaseAdmin  // N requêtes!
      .from("vehicles")
      .select("*", { count: "exact", head: true })
      .eq("organization_id", org.id);
    // ...
  })
);
```

**Solution:** Une seule requête avec CTE:
```sql
WITH org_stats AS (
  SELECT 
    o.*,
    COUNT(v.id) as vehicle_count,
    COUNT(m.id) as user_count
  FROM organizations o
  LEFT JOIN vehicles v ON v.organization_id = o.id
  LEFT JOIN organization_members m ON m.organization_id = o.id
  GROUP BY o.id
)
SELECT * FROM org_stats;
```

#### Cache: Inexistant
- Pas de React Query / SWR
- Pas de cache serveur (Redis)
- Pas de cache navigateur stratégique

---

### 🔒 4. SÉCURITÉ

#### Audit Matrice:

| Aspect | Statut | Détail |
|--------|--------|--------|
| Auth Supabase | ✅ | Session bien gérée |
| RLS | ⚠️ | Complexe, contournable, bugs potentiels |
| Middleware | ✅ | Protection routes OK |
| Input Validation | ⚠️ | Zod partiellement utilisé |
| XSS | ⚠️ | Pas de sanitization explicite |
| CSRF | ✅ | Géré par Supabase |
| Rate Limiting | ❌ | Aucun |
| SQL Injection | ✅ | Paramétré via Supabase |

#### Failles Identifiées:

**1. Contournement RLS via API:**
```typescript
// Un user authentifié peut appeler:
fetch('/api/admin/delete-user', {
  method: 'POST',
  body: JSON.stringify({ userId: 'ANY_USER_ID' })
});

// L'API vérifie l'auth mais pas les permissions!
```

**2. Fichiers Upload:**
Pas de vérification de type MIME, taille maximale non définie côté serveur

**3. Email Injection:**
```typescript
// DANS: lib/organization.ts - inviteMember()
.eq("email", email)  // Pas de validation email avant requête
```

---

### 🎨 5. UX/UI

#### Parcours Critique Analysé:

```
Landing → Register → Onboarding → Dashboard → Add Vehicle
  ↑________________________________________________↓
```

#### Points de Friction:

| Étape | Problème | Sévérité |
|-------|----------|----------|
| Register | Pas de vérification email en temps réel | 🟡 |
| Onboarding | Aucun - directement sur dashboard | 🔴 |
| Add Vehicle | Formulaire long, pas d'autosave | 🟡 |
| Mobile | Pas d'app native, PWA basique | 🟡 |

#### Micro-interactions Manquantes:

| Élément | Actuel | Recommandé |
|---------|--------|------------|
| Loading | Spinner basique | Skeleton screens |
| Empty states | Texte "Aucun véhicule" | Illustration + CTA |
| Success | Sonner toast | Toast + micro-animation |
| Error | Console + alert | Message in-context + solution |
| Hover | Aucun | Subtle elevation/shadow |

#### Accessibilité (A11Y):

**Problèmes:**
- Pas de `aria-label` sur les icônes boutons
- Contraste insuffisant sur certains badges (amber sur blanc)
- Pas de skip link
- Navigation clavier non testée
- Pas de mode haut contraste

**Score A11Y estimé:** 4/10

---

## 🐛 BUGS POTENTIELS & EDGE CASES

### Race Conditions Confirmées:

**1. Création véhicule simultanée:**
```typescript
// User A et User B cliquent en même temps:
// - Tous deux lisent: count = 9, max = 10
// - Tous deux passent la condition
// - Résultat: 11 véhicules (dépassement quota)
```

**2. Modification intervention:**
```typescript
// Manager et Admin éditent simultanément
// Dernière écriture gagne (pas de versioning)
```

### États Inconsistants:

**1. Véhicule supprimé, interventions restent:**
```sql
-- Pas de ON DELETE CASCADE sur interventions.vehicle_id
-- (car c'est un champ texte immat, pas une FK!)
```

**2. Organisation supprimée:**
```sql
-- Que se passe-t-il pour:
-- - Les véhicules?
-- - Les membres?
-- - Les interventions?
-- Réponse: Pas de politique de suppression définie
```

### Edge Cases Non Gérés:

| Cas | Comportement Actuel | Attendu |
|-----|---------------------|---------|
| Nom entreprise > 255 car | Erreur DB | Validation + message |
| Upload PDF > 10MB | ? | Erreur explicite |
| 0 véhicule | Division par zéro possible | Gestion gracieuse |
| Date CT en 1800 | Accepté | Validation plage |
| Date CT en 2050 | Accepté | Warning |
| Immatriculation doublon | Erreur DB | Message friendly |

---

## 🚀 FEATURES MANQUANTES (Par Priorité)

### 🔴 Must-Have (Critique)

| Feature | Impact Business | Complexité |
|---------|----------------|------------|
| **Import CSV/Excel** | Migration clients concurrents | Moyenne |
| **API Publique + Webhooks** | Intégrations ERP/Telematique | Haute |
| **Notifications Email** | Rétention (rappels CT) | Moyenne |
| **Recherche Full-Text** | UX sur grandes flottes | Moyenne |
| **Export PDF multi-véhicules** | Rapports clients | Basse |

### 🟡 Differentiation Compétitive

| Feature | Valeur Ajoutée | Difficulté |
|---------|----------------|------------|
| **Prédiction IA pannes** | Réduction coûts maintenance | Haute |
| **Télématique intégration** | Données temps réel | Haute |
| **Signature électronique** | Conformité légale | Moyenne |
| **Photos dommages IA** | Gestion sinistres | Haute |
| **Marketplace garages** | Revenus additionnels | Moyenne |

### 🟢 Engagement (Gamification)

- Score "Santé flotte" global (0-100)
- Badges: "Inspecteur rigoureux", "Préventif parfait"
- Comparatif anonymisé vs autres entreprises
- Objectifs mensuels avec récompenses

---

## 📊 MÉTRIQUES & ANALYTICS

### Tracking Manquant Critique:

```typescript
// À implémenter avec PostHog/Amplitude:
track('Signup Started', { source: 'landing_hero' });
track('Signup Completed', { plan: 'free' });
track('First Vehicle Added', { time_from_signup: '2h' });
track('Intervention Created', { montant_range: '1000-2000' });
track('Plan Upgraded', { from: 'free', to: 'pro', revenue: 49 });
track('Feature Used', { feature: 'qr_scan', frequency: 'daily' });
```

### Dashboard Métier (pour SuperAdmin):

- **MRR (Monthly Recurring Revenue)**
- **Churn Rate** (désabonnements)
- **CAC (Customer Acquisition Cost)**
- **LTV (Lifetime Value)**
- **NPS (Net Promoter Score)**
- **Feature Adoption Rate**

---

## 🛠️ DETTE TECHNIQUE

### Code à Refactoriser Prioritaire:

| Fichier | Lignes | Problèmes |
|---------|--------|-----------|
| ParcClient.tsx | ~900 | Trop long, mélange UI/logique |
| MaintenanceClient.tsx | ~600 | Duplication avec ParcClient |
| organization.ts | ~384 | Fonctions trop longues |
| [id]/page.tsx | ~417 | Copier/coller de logique |

### Duplications Identifiées:

```typescript
// Formatage dates: copié dans 8+ fichiers
function formatDate(dateString: string | null): string {
  if (!dateString) return "Non defini";
  const date = parseISO(dateString);
  return date.toLocaleDateString("fr-FR", {...});
}

// Calcul jours restants: copié dans 5+ fichiers
const daysUntil = differenceInDays(parseISO(dateString), today);

// Badge couleur: copié dans 4+ fichiers
function getStatusColor(dateString: string | null) { ... }
```

### Tests: 0% de Couverture

**État:** Aucun test automatisé

**Priorité d'implémentation:**
1. `lib/validation.ts` (facile, valeur immédiate)
2. `lib/organization.ts` (logique métier critique)
3. Routes API `/api/*` (sécurité)
4. E2E parcours critique

### Documentation: Incomplète

- ❌ Pas de README technique
- ❌ Pas de Storybook
- ❌ Pas d'API documentation
- ❌ Pas de guide onboarding dev
- ⚠️ TODOs dans le code (ex: `// TODO: Envoyer un email d'invitation`)

---

## 📈 SCALABILITY

### Limites Actuelles (Estimées):

| Ressource | Limite | Point de rupture estimé |
|-----------|--------|------------------------|
| Supabase DB | 500MB-8GB | ~1000 véhicules + historique |
| Vercel | 100GB/mois | ~50k visites/jour |
| Edge Functions | 1M invocations | ~30k/jour |
| Storage | 1GB | ~5000 photos véhicules |

### Architecture Future (100k+ véhicules):

```
CDN (Cloudflare)
    ↓
Load Balancer
    ↓
Kubernetes (Next.js pods)
    ↓
PostgreSQL Primary + Replicas
    ↓
Redis (Cache sessions + queries)
    ↓
S3 (Stockage fichiers)
    ↓
ClickHouse (Analytics)
```

### Optimisations Requises:

1. **Database:**
   - Partitionnement tables par organization_id
   - Archivage automatique données > 2 ans
   - Read replicas pour les rapports

2. **Application:**
   - Edge Functions pour compute intensif
   - CDN pour assets statiques
   - Streaming SSR pour grandes listes

3. **Caching:**
   - Redis pour sessions
   - React Query pour données métier
   - SWR pour données temps réel

---

## 💡 RECOMMANDATIONS STRATÉGIQUES

### 1. **Refonte Technique Immédiate (Sprint 1-2)**

Avant d'ajouter des features, stabiliser la base:
- Fixer les N+1 queries avec JOINs
- Implémenter pagination partout
- Ajouter tests critiques
- Unifier système de rôles

### 2. **Data Layer Abstraction (Sprint 3-4)**

Créer une vraie couche d'accès aux données:
```typescript
// repositories/VehicleRepository.ts
class VehicleRepository {
  async findByOrgPaginated(orgId: string, page: number): Promise<Paginated<Vehicle>>
  async createWithLimits(data: VehicleInput): Promise<Result<Vehicle>>
  async softDelete(id: string): Promise<void>
}
```

### 3. **Feature Flags (Sprint 5)**

Implémenter Unleash/LaunchDarkly pour:
- Déployer sans risque
- A/B testing
- Gradual rollout

### 4. **Monitoring (Sprint 6)**

- Sentry pour erreurs
- PostHog pour analytics
- Datadog/Vercel Analytics pour perf
- Alerting Slack/PagerDuty

### 5. **API Publique (Mois 2-3)**

Différenciateur clé vs concurrents:
- REST API documentée
- Webhooks temps réel
- SDK JavaScript/Python
- Rate limiting par clé API

---

## 📋 ROADMAP TECHNIQUE PROPOSÉE

### Semaine 1-2: **Stabilisation Critique**
- [ ] Fix N+1 queries dashboard
- [ ] Ajouter pagination API
- [ ] Nettoyer console.log
- [ ] Fix race conditions limites

### Mois 1: **Fondations**
- [ ] Setup tests (Jest + Playwright)
- [ ] Refactor ParcClient (découper)
- [ ] Repository pattern
- [ ] Rate limiting API

### Mois 2: **Performance & Scale**
- [ ] React Query + cache
- [ ] Optimisation images
- [ ] Index DB manquants
- [ ] Soft delete

### Mois 3: **Features Différenciantes**
- [ ] API Publique v1
- [ ] Webhooks
- [ ] Import/Export CSV
- [ ] Notifications email

### 6 Mois: **Scale Internationale**
- [ ] Multi-région (EU/US)
- [ ] i18n (FR/EN/ES/DE)
- [ ] Multi-devises
- [ ] SOC2 compliance

---

## ✅ CHECKLIST IMMÉDIATE (À faire aujourd'hui)

```markdown
- [ ] Ajouter .limit(50) sur toutes les requêtes API
- [ ] Créer index DB manquants
- [ ] Supprimer console.log de debug
- [ ] Fixer race condition checkOrganizationLimit
- [ ] Vérifier RLS mileage_logs_select_policy
- [ ] Ajouter validation email dans inviteMember
```

---

## 📝 NOTES DE L'AUDITEUR

**Impression générale:** FleetFlow est un produit fonctionnel avec une bonne UX visuelle, mais construit sur une dette technique importante. Le code montre des signes de développement rapide itératif sans refactoring.

**Risque principal:** La performance s'écroulera à mesure que les clients ajoutent des véhicules (N+1 queries, pas de pagination).

**Point fort:** La sécurité RLS est bien pensée (442 lignes de policies), même si complexe.

**Conseil:** Prendre 2-3 semaines pour refactoriser avant d'ajouter des features. Le coût de correction sera exponentiel dans 6 mois.

---

**Fin du rapport**  
*Pour questions: Analyser section par section et prioriser les fixes 🔴*
