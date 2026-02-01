# Guide de Dépannage Mobile

## Problème : Inspection impossible depuis un smartphone

### Symptômes
- Le scan du QR code fonctionne mais affiche "Véhicule non trouvé"
- La saisie manuelle de l'immatriculation ne fonctionne pas non plus
- Le problème n'apparaît que sur mobile (iOS/Android)

### Causes possibles

1. **ID encodé dans l'URL** - L'ID du véhicule peut contenir des caractères spéciaux qui sont encodés différemment sur mobile
2. **CORS/Permissions** - Problème de connexion à Supabase depuis un réseau mobile
3. **Rate Limiting** - Trop de requêtes depuis la même IP mobile (partagée)

### Solutions appliquées

#### 1. Décodage URL (✓ Corrigé)
```typescript
// Dans lib/inspection/public-actions.ts
const id = decodeURIComponent(rawId).trim();
```

#### 2. Logs de debug ajoutés
- Vérifier la console du navigateur sur mobile pour voir les logs
- Les logs affichent l'ID reçu et sa longueur

#### 3. Messages d'erreur améliorés
- Bouton "Réessayer" pour recharger la page
- Affichage de l'ID dans le message d'erreur

### Tests à effectuer

1. **Tester sur desktop** d'abord pour confirmer que l'ID fonctionne
2. **Sur mobile**, ouvrir les outils de développement (Chrome DevTools via USB)
3. Vérifier les logs dans la console

### Si le problème persiste

Vérifier les logs Vercel :
```bash
vercel logs fleet-master.vercel.app
```

Vérifier les logs Supabase :
1. Aller sur https://app.supabase.com
2. Sélectionner le projet
3. Aller dans "Logs" > "API"

## Configuration du Domaine

### Ajouter fleet-master.fr sur Vercel

1. Aller sur https://vercel.com/dashboard
2. Sélectionner le projet fleet-master
3. Aller dans "Settings" > "Domains"
4. Ajouter `fleet-master.fr`
5. Suivre les instructions DNS

### Configuration DNS

Chez votre registrar (OVH, GoDaddy, etc.), ajouter :

**Enregistrement A :**
```
Nom : @
Valeur : 76.76.21.21
TTL : 3600
```

**Enregistrement CNAME (pour www) :**
```
Nom : www
Valeur : cname.vercel-dns.com
TTL : 3600
```

### Redirection HTTP → HTTPS

Vercel configure automatiquement SSL avec Let's Encrypt.

## Checklist Mobile

- [ ] Tester le scan QR depuis iOS (Safari/Chrome)
- [ ] Tester le scan QR depuis Android (Chrome)
- [ ] Tester la saisie manuelle d'immatriculation
- [ ] Vérifier que la sidebar s'affiche sur /inspections
- [ ] Vérifier que la sidebar est masquée sur /inspection
- [ ] Tester la soumission complète d'une inspection
