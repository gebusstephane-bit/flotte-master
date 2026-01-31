# ✅ Nouveaux contrôles ajoutés à FleetMaster

## 📋 Contrôles suivis

Votre application suit maintenant **4 types de contrôles** avec alertes automatiques :

### 1. **Mines (VGP)** - Vérification Générale Périodique
- Contrôle technique spécifique aux poids lourds
- Colonne : `date_mines`

### 2. **CT annuel** - Contrôle Technique annuel
- Valable 1 an
- Nouveau champ ajouté
- Colonne : `date_ct`

### 3. **Tachygraphe**
- Contrôle du tachygraphe
- Valable 2 ans
- Colonne : `date_tachy`

### 4. **ATP** - Accord Transport Denrées Périssables
- Pour les véhicules frigorifiques
- Nouveau champ ajouté
- Colonne : `date_atp`

---

## 🚀 Ce qui a été modifié

### 1. Base de données (Supabase)
- Nouveau script SQL : [supabase-setup-v2.sql](supabase-setup-v2.sql)
- Ajout des colonnes `date_ct` et `date_atp`
- Les données de test incluent maintenant toutes les dates

### 2. Types TypeScript
- [lib/supabase.ts](lib/supabase.ts) mis à jour
- Interface `Vehicle` inclut les 4 dates

### 3. Formulaire d'ajout de véhicule
- [app/parc/page.tsx](app/parc/page.tsx)
- 4 champs de date dans le formulaire :
  - Date Mines (VGP)
  - Date CT annuel
  - Date Tachygraphe
  - Date ATP

### 4. Tableau de liste des véhicules
- 4 colonnes de contrôles avec badges colorés
- Alertes automatiques pour chaque type de contrôle

### 5. Logique d'alertes améliorée
- Le calcul des "véhicules critiques" vérifie les 4 dates
- Alerte si **n'importe quelle date** est périmée ou < 7 jours

---

## ⚡ INSTALLATION

### Étape 1 : Exécuter le nouveau script SQL

1. Allez sur https://supabase.com/dashboard
2. Votre projet → **SQL Editor** → **New Query**
3. Copiez **tout** le contenu de [supabase-setup-v2.sql](supabase-setup-v2.sql)
4. Cliquez sur **Run**

Ce script va :
- Ajouter les colonnes `date_ct` et `date_atp` si elles n'existent pas
- Garder toutes vos données existantes
- Ajouter 3 véhicules de test avec toutes les dates

### Étape 2 : Redémarrer le serveur

```bash
Ctrl+C
npm run dev
```

### Étape 3 : Tester

1. Allez sur **/parc**
2. Vous devriez voir 6 colonnes de contrôles :
   - Véhicule
   - Type
   - **Mines (VGP)** 🟢🟠🔴
   - **CT annuel** 🟢🟠🔴
   - **Tachy** 🟢🟠🔴
   - **ATP** 🟢🟠🔴
   - Statut
   - Actions

3. Ajoutez un nouveau véhicule pour tester le formulaire

---

## 🎨 Système d'alertes

Les badges changent de couleur selon l'échéance :

- **🔴 ROUGE** : Date périmée OU < 7 jours
  - `variant="destructive"`
  - Icône ⚠️ AlertTriangle

- **🟠 ORANGE** : Date < 30 jours
  - `className="bg-orange-500"`
  - Icône ⚠️ AlertTriangle

- **🟢 VERT** : Date > 30 jours
  - `className="bg-green-100"`
  - Aucune icône

- **⚪ GRIS** : Date non définie
  - `className="bg-slate-200"`
  - Affiche "Non défini"

---

## 📊 Exemple de résultat

Après l'exécution du script SQL, vous aurez 3 véhicules de test :

| Immat | Mines | CT annuel | Tachy | ATP |
|-------|-------|-----------|-------|-----|
| AB-123-CD | 22/01/2026 | 15/02/2026 | 15/03/2026 | 20/06/2026 |
| EF-456-GH | 11/02/2026 | 30/01/2026 | 16/02/2026 | 10/04/2026 |
| IJ-789-KL | 10/05/2026 | 05/06/2026 | 20/07/2026 | 15/09/2026 |

Les dates en rouge/orange (< 30 jours) déclencheront l'alerte "véhicules critiques".

---

## ✅ Checklist

- [ ] Script SQL v2 exécuté dans Supabase
- [ ] Serveur redémarré
- [ ] Page /parc affiche 6 colonnes de contrôles
- [ ] Formulaire contient 4 champs de date
- [ ] Les badges sont colorés correctement
- [ ] L'alerte "véhicules critiques" fonctionne

---

**Votre système de suivi des contrôles est maintenant complet et professionnel ! 🚛✨**
