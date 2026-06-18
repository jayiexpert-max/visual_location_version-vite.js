# Visual Inventory (Visual Location Management)

Smart warehouse system for PUID scanning, BOM-driven production orders, visual rack monitoring, handheld scanners, and IO indicators.

## Documentation (TH)

| Document | Description |
|----------|-------------|
| [docs/DEPLOY_UBUNTU_TH.md](docs/DEPLOY_UBUNTU_TH.md) | **คู่มือย้ายโปรเจกต์ไป Ubuntu Server** (Nginx/Apache, Ollama systemd, offline) |
| [docs/USER_GUIDE_TH.md](docs/USER_GUIDE_TH.md) | คู่มือการใช้งานฉบับสมบูรณ์ (Desktop, Handheld, TV, IT setup) |
| [docs/TEST_CHECKLIST_TH.md](docs/TEST_CHECKLIST_TH.md) | รายการทดสอบ QA หลัง Phase 1–7 |

## Requirements

- PHP 8.2+
- MariaDB / MySQL
- Apache with `mod_rewrite` (XAMPP)
- Composer

## Setup

1. Clone or copy project to web root (e.g. `htdocs/visual_inventory`)
2. Copy environment file:
   ```bash
   copy .env.example .env
   ```
3. Edit `.env` — set database, mail, and URLs:
   - `DB_*` — database credentials
   - `APP_BASE_URL` — e.g. `http://172.31.71.125/visual_inventory`
   - `PDSERVICE_BASE_URL` — external PUID API base URL
   - `CPK_*` — CPK Service (see [CPK Service](#cpk-service) below)
   - `MAIL_*` — SMTP settings for expiry notifications
   - `APP_ENV=production` in production (`development` enables dev-only tools)
4. Import database:
   ```bash
   mysql -u root visual_inventory_db < visual_inventory_db.sql
   ```
5. Install PHP dependencies:
   ```bash
   composer install
   ```

## Folder Structure

| Folder | Purpose |
|--------|---------|
| `public/` | Main web UI |
| `api/` | JSON API endpoints |
| `config/` | DB, session, env, mail |
| `handheld/` | Keyence scanner UI |
| `languages/` | i18n (TH/EN) |
| `scripts/` | CLI cron scripts |
| `maintenance/` | One-off fix/test/migration scripts |

See also [PROJECT_STANDARDS.md](PROJECT_STANDARDS.md).

## Scheduled Tasks

Expiry email alerts (CLI only):

```bash
php scripts/notify_expiry.php
```

Schedule via Windows Task Scheduler or cron. Requires valid `MAIL_*` in `.env`.

## CPK Service

Control Point Kitting API at `http://194.10.10.15/CPKservice/` (JSON REST).

### Environment variables

| Variable | Description |
|----------|-------------|
| `CPK_SERVICE_BASE_URL` | New base URL (default `.../cpk_service`) |
| `CPK_SERVICE_LEGACY_URL` | Legacy WCF REST (`.../cpkservice.svc/rest`) |
| `CPK_USE_LEGACY_URL` | `true` to use legacy URL and path casing |
| `CPK_MC_ID` | Machine/station ID from IT — **required for all POST endpoints** |
| `CPK_STATION_KEY` | Station GUID from IT — used only with `GetPublicUID` |

GET endpoints (`GetVersion`, `GET_RESNoInfo`, `GET_WOBOMInfo`) work without `CPK_MC_ID`.  
POST endpoints need `CPK_MC_ID` + `CPK_STATION_KEY` to obtain a `PublicUID` token first.

### Proxy endpoints (via `public/api_gateway.php?call=cpk/...`)

| Call | Method | CPK endpoint |
|------|--------|--------------|
| `cpk/get_version.php` | GET | GetVersion |
| `cpk/get_res_no_info.php` | GET | GET_RESNoInfo (`keyword` or `res_no`) |
| `cpk/get_wo_bom_info.php` | GET | GET_WOBOMInfo (`wo` or `workorder`) |
| `cpk/get_public_uid.php` | POST | GetPublicUID |
| `cpk/res_puid_recv.php` | POST | RES_PUIDRecv |
| `cpk/issue_puid_to_picklist.php` | POST | IssuePUIDToPicklist |
| `cpk/update_puid_status.php` | POST | UpdatePUIDStatus |
| `cpk/get_open_picklists.php` | POST | GetOpenPicklists |
| `cpk/get_picklist_detail.php` | POST | GetPicklistDetail |
| `cpk/station_inven_check.php` | POST | StationInvenCheck |
| `cpk/clear_cache.php` | POST | ClearCache (admin only) |

Client library: `config/cpk_service.php`.

### Maintenance tools (IT)

Direct URL (not routed through `public/`):

`{APP_BASE_URL}/maintenance/cpk_test.php`

Example: `http://localhost/visual_inventory/maintenance/cpk_test.php`

- Requires login (`session_check`)
- **Production:** admin role only
- **Development** (`APP_ENV=development`): any logged-in user

Other scripts under `maintenance/` (migrations, schema dumps, DB fixes) require login, admin role, and `APP_ENV=development`. They are blocked in production even for admins.

`scripts/` is CLI-only (`Deny from all` via `.htaccess`); run with `php scripts/...`.

Reservation receive (`api/receive_item.php`) calls `RES_PUIDRecv` on CPK before local DB commit when `ReservationNo` is set.

## Development vs Production

- `APP_ENV=development` — enables dev-only endpoints (`public/test_api.php`, `api/test_api_connection.php`, and guarded `maintenance/*` tools)
- `APP_ENV=production` — blocks dev-only maintenance/migration scripts; `maintenance/cpk_test.php` remains available to logged-in admins

## Security Notes

- Never commit `.env` (listed in `.gitignore`)
- Rotate SMTP password if it was previously stored in source code
- `test_net.php` requires login — used for live API health checks on stock pages
