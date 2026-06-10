#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_ROOT="${BACKUP_ROOT:-${ROOT_DIR}/backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
DATE_STAMP="$(date +%Y%m%d-%H%M%S)"

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-visual_inventory_db}"
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASS:-}"

DEST_DIR="${BACKUP_ROOT}/database"
ARCHIVE="${DEST_DIR}/${DB_NAME}-${DATE_STAMP}.sql.gz"

mkdir -p "${DEST_DIR}"

if command -v mysqldump >/dev/null 2>&1; then
  MYSQLDUMP_BIN="mysqldump"
elif [ -x "/Applications/XAMPP/xamppfiles/bin/mysqldump" ]; then
  MYSQLDUMP_BIN="/Applications/XAMPP/xamppfiles/bin/mysqldump"
else
  echo "mysqldump not found" >&2
  exit 1
fi

export MYSQL_PWD="${DB_PASS}"
"${MYSQLDUMP_BIN}" \
  -h "${DB_HOST}" \
  -P "${DB_PORT}" \
  -u "${DB_USER}" \
  --single-transaction \
  --routines \
  --triggers \
  "${DB_NAME}" | gzip -9 > "${ARCHIVE}"
unset MYSQL_PWD

if ! gzip -t "${ARCHIVE}"; then
  echo "Backup verification failed: ${ARCHIVE}" >&2
  exit 1
fi

find "${DEST_DIR}" -name "*.sql.gz" -type f -mtime +"${RETENTION_DAYS}" -delete

echo "Database backup created: ${ARCHIVE}"
