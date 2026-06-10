#!/usr/bin/env bash
set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <database-backup.sql.gz>" >&2
  exit 1
fi

ARCHIVE="$1"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_NAME="${DB_NAME:-visual_inventory_db}"
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASS:-}"

if [ ! -f "${ARCHIVE}" ]; then
  echo "Backup file not found: ${ARCHIVE}" >&2
  exit 1
fi

if command -v mysql >/dev/null 2>&1; then
  MYSQL_BIN="mysql"
elif [ -x "/Applications/XAMPP/xamppfiles/bin/mysql" ]; then
  MYSQL_BIN="/Applications/XAMPP/xamppfiles/bin/mysql"
else
  echo "mysql client not found" >&2
  exit 1
fi

echo "Restoring ${ARCHIVE} into ${DB_NAME}..."
export MYSQL_PWD="${DB_PASS}"
gunzip -c "${ARCHIVE}" | "${MYSQL_BIN}" -h "${DB_HOST}" -P "${DB_PORT}" -u "${DB_USER}" "${DB_NAME}"
unset MYSQL_PWD
echo "Database restore complete."
