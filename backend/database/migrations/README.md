# Database Migrations

> **Quick commands (from repo root):** `npm run db:init` · `npm run db:migrate` · `npm run db:verify`

Environment variables (optional): `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASS`, `DB_NAME` (default `visual_inventory_db`).

## Fresh database (no PHP seed data)

Creates schema + IoT + production tables. Does **not** include test users — import PHP dump or create users separately.

```bash
npm run db:init
npm run db:verify
```

Uses:

| File | Purpose |
|------|---------|
| `init/01_full_schema.sql` | Baseline PHP tables + views + Phase 1 additive |
| `migrations/002_phase4_iot.sql` | Raspberry Pi registry, device presence |
| `migrations/003_phase6_production.sql` | Audit logs, account lockout |

## Existing PHP database (recommended for dev)

Import legacy dump first, then apply NestJS migrations:

```bash
mysql -u root visual_inventory_db < /path/to/visual_inventory/visual_inventory_db.sql
npm run db:migrate
npm run db:verify
```

`db:migrate` applies in order:

| File | Purpose |
|------|---------|
| `001_additive_phase1.sql` | JWT refresh tokens, TV highlights, IO logs, `users.lang` |
| `002_phase4_iot.sql` | IoT device registry |
| `004_app_settings.sql` | App settings key-value store |
| `005_phase4_tv_puid.sql` | TV highlight PUID column |
| `006_user_is_active.sql` | `users.is_active` for enable/disable accounts |
| `007_users_role_manage.sql` | Add `manage` role to `users.role` enum |

## Verify

```bash
npm run db:verify
```

Checks required tables: `users`, `racks`, `inventory_receive`, `reservation_list`, `refresh_tokens`, `tv_highlights`, `io_command_logs`, `raspberry_devices`, `audit_logs`.

## Rollback (Phase 1 additive only)

```sql
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS tv_highlights;
DROP TABLE IF EXISTS io_command_logs;
ALTER TABLE users DROP COLUMN IF EXISTS lang;
```
