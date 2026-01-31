# Résolution de l'erreur "Failed to fetch"

## Cause probable
Les variables d'environnement `NEXT_PUBLIC_*` ne sont pas chargées correctement. Next.js "compile" ces variables au démarrage du serveur, donc si vous les modifiez, **vous DEVEZ redémarrer le serveur**.

---

## Solution : ÉTAPE PAR ÉTAPE

### 1️⃣ ARRÊTER le serveur Next.js

Dans le terminal où `npm run dev` tourne :
- Appuyez sur `Ctrl+C` pour arrêter le serveur

### 2️⃣ VÉRIFIER le fichier .env.local

Assurez-vous que le fichier `.env.local` contient exactement ceci (sans espaces, sans guillemets) :

```env
NEXT_PUBLIC_SUPABASE_URL=https://tuzknnkkouhrowmbwmgtg.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR1emtua2tvdWhyb3dtYndtZ3RnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk0OTAxMTMsImV4cCI6MjA4NTA2NjExM30.8pdUoV98RbmyG5kjIxIZTCH9K1c77l5A8T27EYryJVI
```

✅ Le fichier est correct dans votre projet actuel.

### 3️⃣ REDÉMARRER le serveur

```bash
npm run dev
```

**IMPORTANT** : Attendez que le message "Ready" apparaisse avant de continuer.

### 4️⃣ TESTER la connexion

Ouvrez votre navigateur et allez sur :

```
http://localhost:3000/api/test-supabase
```

**Résultat attendu :**
```json
{
  "success": true,
  "message": "Connexion à Supabase réussie !",
  "envCheck": {
    "hasUrl": true,
    "hasKey": true,
    "url": "https://tuzknnkkouhrowmbwmgtg.supabase.co",
    "keyPreview": "eyJhbGciOiJIUzI1NiIsI..."
  },
  "vehicleCount": 3
}
```

**Si vous voyez "success": true** → Connexion OK, passez à l'étape 5

**Si vous voyez une erreur** → Notez le message et partagez-le

### 5️⃣ TESTER l'ajout d'un véhicule

1. Allez sur http://localhost:3000/parc
2. Ouvrez la console du navigateur (F12)
3. Cliquez sur "Ajouter un véhicule"
4. Remplissez le formulaire :
   - Immat : `TEST-001-XX`
   - Marque : `Mercedes Actros`
   - Type : `Tracteur 25T`
   - Dates : (facultatif)
   - Statut : Actif
5. Cliquez sur "Enregistrer"

**Dans la console, vous devriez voir :**
```
Tentative d'insertion: {immat: 'TEST-001-XX', marque: 'Mercedes Actros', ...}
Véhicule créé avec succès: [{...}]
```

---

## Si ça ne fonctionne toujours pas

### Vérifier dans Supabase directement

1. Allez sur https://supabase.com/dashboard
2. Votre projet → **Table Editor**
3. Sélectionnez la table `vehicles`
4. Cliquez sur **Insert** → **Insert row**
5. Essayez d'ajouter un véhicule manuellement

**Si ça fonctionne manuellement mais pas depuis l'app** → Problème de connexion/permissions
**Si ça ne fonctionne pas manuellement** → RLS bloque les insertions

### Vérifier les politiques RLS

Dans Supabase :
1. Table Editor → `vehicles`
2. Cliquez sur le cadenas à côté du nom de la table
3. Vérifiez que vous voyez la politique **"Enable all access for vehicles"**
4. Si elle n'existe pas, ré-exécutez le script SQL

---

## Checklist de débogage

- [ ] Serveur Next.js redémarré après modification du .env.local
- [ ] `/api/test-supabase` retourne `"success": true`
- [ ] Script SQL exécuté dans Supabase (3 véhicules de test visibles)
- [ ] Politique RLS "Enable all access for vehicles" active
- [ ] Console du navigateur ouverte (F12) pour voir les logs

---

## Si l'erreur persiste après tout ça

Partagez-moi :
1. Le résultat de `/api/test-supabase`
2. Le message d'erreur complet dans la console du navigateur
3. Une capture d'écran de la page Supabase Table Editor montrant la table vehicles
