#!/usr/bin/env bash
# Fresh database: full baseline schema + Phase 4/6 migrations (no PHP seed data).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
DB_HOST="${DB_HOST:-127.0.0.1}"
DB_PORT="${DB_PORT:-3306}"
DB_USER="${DB_USER:-root}"
DB_PASS="${DB_PASS:-}"
DB_NAME="${DB_NAME:-visual_inventory_db}"

MYSQL=(mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER")
if [[ -n "$DB_PASS" ]]; then
  MYSQL+=(-p"$DB_PASS")
fi

echo "==> Creating schema in ${DB_NAME} (fresh, no seed users)..."
"${MYSQL[@]}" < "$ROOT/backend/database/init/01_full_schema.sql"

echo "==> Applying Phase 4 IoT migration..."
"${MYSQL[@]}" "$DB_NAME" < "$ROOT/backend/database/migrations/002_phase4_iot.sql"

echo "==> Applying Phase 6 production migration..."
"${MYSQL[@]}" "$DB_NAME" < "$ROOT/backend/database/migrations/003_phase6_production.sql"

echo "Done. Run: npm run db:verify"
echo "Note: For login users, import PHP dump or create users via API/admin."
