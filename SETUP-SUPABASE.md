# Configuration Supabase pour FleetMaster Pro

## Problème actuel
Impossible d'ajouter des véhicules → Probablement un problème de permissions RLS (Row Level Security)

## Solution : Exécuter le script SQL

### Étape 1 : Ouvrir Supabase SQL Editor

1. Allez sur [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Sélectionnez votre projet **tuzknnkkouhrowmbwmgtg**
3. Dans le menu de gauche, cliquez sur **SQL Editor**
4. Cliquez sur **New Query**

### Étape 2 : Copier-coller le script

Copiez tout le contenu du fichier `supabase-setup.sql` et collez-le dans l'éditeur SQL.

### Étape 3 : Exécuter

Cliquez sur le bouton **Run** (ou `Ctrl+Enter`)

### Étape 4 : Vérifier

Vous devriez voir :
- Message de succès
- Une liste avec 2 véhicules de test affichés

## Ce que fait le script

1. **Crée la table `vehicles`** avec la bonne structure
2. **Active RLS** (Row Level Security)
3. **Crée une politique permissive** pour le développement
   - ⚠️ EN PRODUCTION : Cette politique devra être restreinte par utilisateur
4. **Crée la table `interventions`**
5. **Ajoute 2 véhicules de test** pour vérifier que tout fonctionne

## Après l'exécution

1. **Redémarrez votre serveur Next.js** :
   ```bash
   npm run dev
   ```

2. **Testez l'ajout d'un véhicule** :
   - Allez sur `/parc`
   - Cliquez sur "Ajouter un véhicule"
   - Remplissez le formulaire
   - Cliquez sur "Enregistrer"

3. **Vérifiez les logs** :
   - Ouvrez la console du navigateur (F12)
   - Vous devriez voir les logs de débogage :
     - "Tentative d'insertion: {...}"
     - "Véhicule créé avec succès: {...}"

## Si le problème persiste

Vérifiez dans la console du navigateur le message d'erreur exact. Il devrait maintenant s'afficher dans le toast ET dans la console.

Les erreurs courantes :
- **"new row violates row-level security policy"** → Le script SQL n'a pas été exécuté
- **"duplicate key value violates unique constraint"** → Un véhicule avec cette immatriculation existe déjà
- **"relation does not exist"** → La table n'existe pas

## Vérification manuelle dans Supabase

1. Allez dans **Table Editor**
2. Sélectionnez la table **vehicles**
3. Vérifiez que vous voyez les 2 véhicules de test
4. Essayez d'ajouter un véhicule manuellement via l'interface

Si ça fonctionne manuellement mais pas depuis l'app → Problème de code
Si ça ne fonctionne pas manuellement → Problème de permissions
