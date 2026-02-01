#!/bin/bash
# 🔱 PILIER 1: Purge Cérémonielle
# Supprime tous les console.log de debug

echo "🧹 Nettoyage des logs de debug..."

# Remplacer les console.log par des commentaires
find . -type f \( -name "*.ts" -o -name "*.tsx" \) \
  ! -path "./node_modules/*" \
  ! -path "./.next/*" \
  -exec sed -i 's/console\.log\(/\/\/ Log: (/g' {} +

echo "✅ Logs nettoyés"

# Vérifier s'il reste des logs
if grep -r "console.log(" --include="*.ts" --include="*.tsx" . --exclude-dir=node_modules --exclude-dir=.next; then
  echo "⚠️  Il reste des logs"
else
  echo "✅ Aucun log trouvé"
fi
