#!/usr/bin/env bash
# Verify baseline + NestJS tables exist.
set -euo pipefail

DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASS:-}"
DB_NAME="${DB_NAME:-visual_inventory_db}"

MYSQL=(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -N -B)
if [[ -n "$DB_PASS" ]]; then
  MYSQL+=(-p"$DB_PASS")
fi

TABLES=(
  users
  racks
  inventory_receive
  reservation_list
  refresh_tokens
  tv_highlights
  io_command_logs
  raspberry_devices
  audit_logs
)

missing=0
for table in "${TABLES[@]}"; do
  count=$("${MYSQL[@]}" -e \
    "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='${DB_NAME}' AND table_name='${table}';")
  if [[ "$count" != "1" ]]; then
    echo "MISSING: ${table}"
    missing=$((missing + 1))
  else
    echo "OK: ${table}"
  fi
done

if [[ "$missing" -gt 0 ]]; then
  echo ""
  echo "Verification failed ($missing missing). Run npm run db:init or db:migrate."
  exit 1
fi

echo ""
echo "Database schema verification passed for ${DB_NAME}."
