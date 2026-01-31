# 🚨 Problème détecté : URL Supabase introuvable

## Le problème

L'URL `https://tuzknnkkouhrowmbwmgtg.supabase.co` ne résout pas (DNS lookup failed).

Cela signifie que :
- Le projet Supabase n'existe pas à cette URL
- Le projet a été supprimé ou suspendu
- L'URL est incorrecte

---

## ✅ SOLUTION : Récupérer la bonne URL Supabase

### Étape 1 : Vérifier votre projet Supabase

1. Allez sur **https://supabase.com/dashboard**
2. Connectez-vous à votre compte
3. **Vérifiez que vous voyez un projet dans la liste**

**Deux scénarios possibles :**

---

### 📌 SCÉNARIO A : Vous avez déjà un projet

Si vous voyez un projet dans la liste :

1. **Cliquez sur le projet**
2. Allez dans **Settings** (icône roue dentée) → **API**
3. Copiez les vraies valeurs :
   - **Project URL** (devrait ressembler à `https://xxxxx.supabase.co`)
   - **anon public** key (dans la section "Project API keys")

4. **Mettez à jour .env.local** avec les VRAIES valeurs :

```env
NEXT_PUBLIC_SUPABASE_URL=https://[VOTRE_VRAIE_URL].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[VOTRE_VRAIE_CLÉ_ANON]
```

5. **Redémarrez le serveur** :
```bash
Ctrl+C
npm run dev
```

6. **Exécutez le script SQL** dans SQL Editor pour créer les tables

---

### 📌 SCÉNARIO B : Vous n'avez pas de projet (ou il a été supprimé)

Si vous ne voyez aucun projet :

1. **Créez un nouveau projet** :
   - Cliquez sur **"New Project"**
   - Nom : `FleetMaster`
   - Database Password : Choisissez un mot de passe fort (NOTEZ-LE !)
   - Region : Choisissez la plus proche (Europe West par exemple)
   - Plan : Free
   - Cliquez sur **"Create new project"**

2. **Attendez 2-3 minutes** que le projet soit provisionné

3. **Récupérez les credentials** :
   - Une fois le projet créé, allez dans **Settings** → **API**
   - Copiez :
     - **Project URL**
     - **anon public** key

4. **Mettez à jour .env.local** :

```env
NEXT_PUBLIC_SUPABASE_URL=https://[NOUVELLE_URL].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[NOUVELLE_CLÉ_ANON]
```

5. **Redémarrez le serveur** :
```bash
Ctrl+C
npm run dev
```

6. **Exécutez le script SQL** :
   - Allez dans **SQL Editor** → **New Query**
   - Copiez tout le contenu de `supabase-setup.sql`
   - Cliquez sur **Run**

---

## 🔍 Comment vérifier que tout fonctionne après

1. Allez sur **http://localhost:3000/debug**
2. Section 2 devrait afficher **✅ Connexion réussie !**
3. Vous devriez voir le nombre de véhicules (3 si vous avez exécuté le script SQL)

4. Testez sur **/parc** :
   - La liste des véhicules devrait se charger
   - Vous pouvez ajouter un nouveau véhicule

---

## ⚠️ Note importante

L'URL que vous aviez (`tuzknnkkouhrowmbwmgtg.supabase.co`) semble avoir été générée mais le projet n'existe pas/plus à cette adresse.

Il faut **impérativement** récupérer l'URL correcte depuis le dashboard Supabase.
