#!/usr/bin/env bash
# Apply NestJS additive migrations on an existing PHP visual_inventory_db.
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

for file in \
  "$ROOT/backend/database/migrations/001_additive_phase1.sql" \
  "$ROOT/backend/database/migrations/002_phase4_iot.sql" \
  "$ROOT/backend/database/migrations/003_phase6_production.sql" \
  "$ROOT/backend/database/migrations/004_app_settings.sql" \
  "$ROOT/backend/database/migrations/005_phase4_tv_puid.sql" \
  "$ROOT/backend/database/migrations/006_user_is_active.sql" \
  "$ROOT/backend/database/migrations/007_users_role_manage.sql"
do
  echo "==> $(basename "$file")"
  "${MYSQL[@]}" "$DB_NAME" < "$file"
done

echo "Done. Run: npm run db:verify"
