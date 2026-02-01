# 📋 AUDIT COMPLET - SYSTÈME DE NOTIFICATIONS FLEET-MASTER

**Date d'audit :** 01/02/2026  
**Auditeur :** Kimi Code CLI  
**Portée :** Workflow "Travaux/Véhicules" - 4 étapes critiques

---

## 🎯 RÉSUMÉ EXÉCUTIF

| Étape | Statut | Couverture | Actions requises |
|-------|--------|------------|------------------|
| **Étape 1** : Demande créée | 🟡 **PARTIEL** | Notification existe mais destinataires incomplets | Ajouter EXPLOITANT |
| **Étape 2** : Validation/Refus Admin | 🟡 **PARTIEL** | Notifications existent mais noms trompeurs | Renommer + corriger flux |
| **Étape 3** : RDV Planifié | 🟢 **OK** | Implémenté correctement | ✅ Aucune action |
| **Étape 4** : Travaux terminés + Inspection | 🔴 **ABSENT** | Aucune notification liée à l'inspection | À implémenter |

**Score global :** 50% (2/4 étapes complètes)

---

## 📊 DÉTAIL PAR ÉTAPE

### ÉTAPE 1 : DEMANDE DE VALIDATION DE TRAVAUX

**Déclencheur attendu :** `status = "pending"` (création demande)

**Implémentation actuelle :**
```typescript
// Fichier: app/maintenance/MaintenanceClient.tsx:430
sendNotify("INTERVENTION_CREATED", created.id);

// Fichier: app/api/notify/route.ts:263-268
recipients = await getEmailsByRoles(["admin", "direction"]);
```

**Écart constaté :**
- ❌ Les **EXPLOITANTS** ne sont pas notifiés (seuls admin+direction le sont)
- ❌ Pas de log dans table `notification_logs`
- ✅ Email envoyé correctement via Resend
- ✅ Sujet formaté correctement

**Correction requise :**
```typescript
// AJOUTER "exploitation" dans les destinataires
recipients = await getEmailsByRoles(["admin", "direction", "exploitation"]);
```

---

### ÉTAPE 2 : VALIDATION/REFUS PAR L'ADMIN

**Déclencheur attendu :** 
- Validation : `status = "approved_waiting_rdv"`
- Refus : `status = "rejected"`

**Implémentation actuelle :**
```typescript
// Validation (maintenance/MaintenanceClient.tsx:480)
sendNotify("DEVIS_VALIDATED", id);

// Refus (maintenance/MaintenanceClient.tsx:526)
sendNotify("DEVIS_REFUSED", id);

// Fichier: app/api/notify/route.ts
recipients = await getEmailsByRoles(["agent_parc", "admin", "direction"]);
```

**Écart constaté :**
- ❌ **Noms des événements trompeurs** : `DEVIS_VALIDATED`/`DEVIS_REFUSED` suggèrent une action sur un devis, mais c'est la demande d'intervention qui est validée/refusée
- ❌ Les **EXPLOITANTS** ne sont pas notifiés du refus
- ❌ Pas de distinction claire entre validation avec/sans devis

**Correction requise :**
```typescript
// Renommer les événements pour plus de clarté :
"INTERVENTION_APPROVED" (au lieu de DEVIS_VALIDATED)
"INTERVENTION_REJECTED" (au lieu de DEVIS_REFUSED)

// Ajouter exploitation dans les destinataires du refus
recipients = await getEmailsByRoles(["agent_parc", "admin", "direction", "exploitation"]);
```

---

### ÉTAPE 3 : VALIDATION DU RDV PAR AGENT DE PARC

**Déclencheur attendu :** `status = "planned"` (RDV confirmé)

**Implémentation actuelle :**
```typescript
// Fichier: maintenance/MaintenanceClient.tsx:579
sendNotify("RDV_PLANNED", (selectedIntervention as any).id);

// Fichier: app/api/notify/route.ts:298-303
recipients = await getEmailsByRoles(["admin", "direction", "exploitation"]);
```

**Écart constaté :**
- ✅ **AUCUN** - Implémentation conforme aux spécifications
- ✅ Tous les rôles concernés sont notifiés
- ✅ Contenu email complet avec date, lieu, détails

---

### ÉTAPE 4 : TRAVAUX TERMINÉS + INSPECTION VALIDÉE

**Déclencheur attendu :**
- Statut intervention : `status = "completed"`
- ET inspection validée : `status = "validated"` (dans vehicle_inspections)

**Implémentation actuelle :**
```typescript
// Fichier: maintenance/MaintenanceClient.tsx:607
sendNotify("INTERVENTION_COMPLETED", id);

// Fichier: app/api/notify/route.ts:306-311
recipients = await getEmailsByRoles(["admin", "direction", "exploitation"]);
```

**Écart constaté :**
- ❌ **PAS DE LIEN avec le système d'inspection** - La notification est envoyée quand l'agent clique sur "Terminer", mais il n'y a pas de vérification que l'inspection post-travaux est validée
- ❌ **Pas de sous-cas** pour distinguer :
  - Inspection "VALIDÉE_SANS_ANOMALIE" → Email vert "Conforme"
  - Inspection "VALIDÉE_AVEC_ANOMALIE" → Email orange "Anomalies détectées"
- ❌ Pas de création automatique d'intervention si anomalie détectée

**Structure de données manquante :**
```typescript
// La table interventions devrait avoir :
interface Intervention {
  // ... champs existants
  inspection_id?: string;  // Lien vers vehicle_inspections
  source_inspection_id?: string; // Déjà présent !
}
```

---

## 🗃️ STRUCTURES DE DONNÉES EXISTANTES

### Table `interventions` (OK)
```sql
CREATE TABLE interventions (
  id UUID PRIMARY KEY,
  vehicule TEXT NOT NULL,
  immat TEXT NOT NULL,
  description TEXT NOT NULL,
  garage TEXT NOT NULL,
  montant NUMERIC(10,2),
  status TEXT CHECK (status IN ('pending', 'approved_waiting_rdv', 'planned', 'completed', 'rejected')),
  rdv_date TIMESTAMP,
  rdv_lieu TEXT,
  devis_path TEXT,
  rejected_reason TEXT,
  created_at TIMESTAMP
);
```

### Table `vehicle_inspections` (OK)
```sql
CREATE TABLE vehicle_inspections (
  id UUID PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id),
  status TEXT CHECK (status IN ('pending_review', 'validated', 'requires_action', 'archived')),
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  -- ... autres champs
);
```

### Table `notification_logs` (🔴 ABSENTE)
```sql
-- N'EXISTE PAS - À CRÉER
CREATE TABLE notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_by UUID REFERENCES profiles(id),
  event_type TEXT NOT NULL, -- INTERVENTION_CREATED, INTERVENTION_APPROVED, etc.
  recipients UUID[], -- Array des userIds destinataires
  sent_at TIMESTAMP DEFAULT NOW(),
  status TEXT CHECK (status IN ('sent', 'error')),
  metadata JSONB,
  intervention_id UUID REFERENCES interventions(id)
);
```

---

## 🔧 CORRECTIONS REQUISES

### 1. Mise à jour de `/api/notify/route.ts`

**AJOUTER les nouveaux types d'événements :**
```typescript
type NotifyType =
  | "INTERVENTION_CREATED"        // ✓ Existant
  | "INTERVENTION_APPROVED"       // 🆕 Remplace DEVIS_VALIDATED
  | "INTERVENTION_REJECTED"       // 🆕 Remplace DEVIS_REFUSED
  | "DEVIS_UPLOADED"              // ✓ Existant
  | "DEVIS_VALIDATED"             // ✓ Existant (vrai validation devis)
  | "DEVIS_REFUSED"               // ✓ Existant (vrai refus devis)
  | "RDV_PLANNED"                 // ✓ Existant
  | "INTERVENTION_COMPLETED"      // ✓ Existant
  | "INSPECTION_WORK_COMPLETED";  // 🆕 Nouveau - inspection après travaux
```

**MODIFIER les destinataires Étape 1 :**
```typescript
case "INTERVENTION_CREATED": {
  recipients = await getEmailsByRoles(["admin", "direction", "exploitation"]); // +exploitation
  // ...
}
```

**MODIFIER les destinataires Étape 2 (Refus) :**
```typescript
case "INTERVENTION_REJECTED": {
  recipients = await getEmailsByRoles(["agent_parc", "admin", "direction", "exploitation"]); // +exploitation
  // ...
}
```

### 2. Création migration `notification_logs`

```sql
-- migrations/20250201_add_notification_logs.sql
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trigger_by UUID REFERENCES profiles(id),
  event_type TEXT NOT NULL,
  recipients UUID[],
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT CHECK (status IN ('sent', 'error')),
  metadata JSONB,
  intervention_id UUID REFERENCES interventions(id),
  inspection_id UUID REFERENCES vehicle_inspections(id)
);

CREATE INDEX idx_notification_logs_event ON notification_logs(event_type);
CREATE INDEX idx_notification_logs_intervention ON notification_logs(intervention_id);
CREATE INDEX idx_notification_logs_sent_at ON notification_logs(sent_at);

-- Politique RLS
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notification_logs_read_admin" ON notification_logs
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'direction'))
  );
```

### 3. Modification du workflow Étape 4

**Dans `validation-actions.ts` (après validation inspection) :**
```typescript
// Si l'inspection est liée à une intervention
if (interventionId && newStatus === "validated") {
  // Notifier tous les rôles
  await fetch('/api/notify', {
    method: 'POST',
    body: JSON.stringify({
      type: "INSPECTION_WORK_COMPLETED",
      interventionId,
      inspectionId,
      extra: { hasAnomalies: toRepairDefects.length > 0 }
    })
  });
}
```

---

## 📈 RECOMMANDATIONS

### Priorité Haute (À implémenter immédiatement)
1. ✅ Créer la table `notification_logs` pour tracer tous les envois
2. ✅ Ajouter "exploitation" dans les destinataires Étape 1
3. ✅ Renommer DEVIS_VALIDATED → INTERVENTION_APPROVED (plus clair)
4. ✅ Créer la notification INSPECTION_WORK_COMPLETED pour l'Étape 4

### Priorité Moyenne (Améliorations)
5. 🟡 Ajouter un template email pour INSPECTION_WORK_COMPLETED avec distinction anomalie/conforme
6. 🟡 Ajouter des préférences utilisateur (désactiver notifications)
7. 🟡 Implémenter un système de retry en cas d'échec d'envoi

### Priorité Basse (Nice to have)
8. 🟢 Dashboard admin avec stats des notifications envoyées
9. 🟢 Webhook pour notifications externes (Slack, Teams)

---

## ✅ CHECKLIST DE VALIDATION

- [ ] Migration `notification_logs` créée et exécutée
- [ ] Étape 1 : EXPLOITANT reçoit l'email
- [ ] Étape 2 : Noms des événements corrigés
- [ ] Étape 3 : Aucune modification requise
- [ ] Étape 4 : Notification inspection après travaux implémentée
- [ ] Tests manuels effectués sur chaque étape
- [ ] Documentation utilisateur mise à jour

---

**Conclusion :** Le système de notification a une bonne base (Resend configuré, API existante) mais nécessite des ajustements pour couvrir 100% du workflow métier, notamment la liaison entre interventions et inspections.
