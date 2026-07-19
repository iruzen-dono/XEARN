#!/bin/bash
# XEARN — Backup automatique de la base PostgreSQL
# Utilise docker exec pour lancer pg_dump dans le conteneur
# Sauvegarde locale + rotation (30 jours)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKUP_DIR="${SCRIPT_DIR}/../backups/postgres"
CONTAINER="xearn-postgres"
DB_USER="xearn"
DB_NAME="xearn_db"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="xearn_${TIMESTAMP}.dump"

mkdir -p "$BACKUP_DIR"

echo "📦 Dumping database ${DB_NAME} from ${CONTAINER}..."

# 1. Dump dans le conteneur
docker exec "${CONTAINER}" pg_dump \
  -U "${DB_USER}" \
  -d "${DB_NAME}" \
  --format=custom \
  --no-owner \
  --no-acl \
  -f "/tmp/${BACKUP_FILE}"

# 2. Lire le dump depuis le conteneur vers un fichier local
docker exec "${CONTAINER}" cat "/tmp/${BACKUP_FILE}" > "${BACKUP_DIR}/${BACKUP_FILE}"

# 3. Nettoyer le fichier temporaire dans le conteneur
docker exec "${CONTAINER}" rm "/tmp/${BACKUP_FILE}"

echo "✅ Backup créé : ${BACKUP_DIR}/${BACKUP_FILE} ($(du -h "${BACKUP_DIR}/${BACKUP_FILE}" | cut -f1))"

# 4. Rotation : supprimer les backups de plus de RETENTION_DAYS jours
find "$BACKUP_DIR" -name "xearn_*.dump" -type f -mtime +${RETENTION_DAYS} -delete
echo "🧹 Nettoyage : backups > ${RETENTION_DAYS} jours supprimés"
echo "📊 Total backups : $(find "$BACKUP_DIR" -name 'xearn_*.dump' | wc -l)"
