# Feature Mapping

> **Status column:** see live checklist in [PROJECT_PHASES.md](PROJECT_PHASES.md).

## Required main menu (12 items)

| # | Menu | PHP source | Roles | NestJS + React | Status |
|---|------|------------|-------|----------------|--------|
| 1 | Home Dashboard | `index.php` | all | `/app` | ✅ |
| 2 | Search Box | `search_product.php` | all | `/app/search` | ✅ |
| 3 | Reservation (RES) | `show_api_data.php` + `receive_item.php` | admin, material_prep | `/app/receive-reservation` | ✅ |
| 4 | Material Inbound | `add_stock.php` + CPK UpdatePUIDStatus | admin, material_prep | `/app/receive-return` | ✅ |
| 5 | Issue by Picklist | `picklist_issue.php` | admin, material_prep | `/app/picklist` | ✅ |
| 6 | Rack Overview | `dashboard_rack.php` | all | `/app/rack` | ✅ |
| 7 | Expiration Check | `check_expiration.php` | all | `/app/expiry` | ⚠️ |
| 8 | 3D Layout | `layout_3d.php` | admin | `/layout-3d` | ✅ |
| 9 | TV Display | `tv_display.php` | admin/kiosk | `/tv` | ✅ |
| 10 | Stock Report | `report_stock.php` | all | `/app/reports` | ✅ |
| 11 | Manage Users | `manage_users.php` | admin | `/app/users` | ✅ |
| 12 | System Settings | `admin.php` | admin | `/app/admin` | ⚠️ |

## Additional dashboard modules (PHP index.php)

| Menu | PHP source | Roles | NestJS + React | Status |
|------|------------|-------|----------------|--------|
| Create Picklist (HANA) | external URL | admin, material_prep | external (`VITE_HANA_PICKLIST_URL`) | ✅ |
| Booking Out PUID | `booking_out_puid.php` | warehouse staff | `/app/booking-out` | ✅ |
| WO Material Calculation | `wo_material_calc.php` | warehouse staff | `/app/wo-material-calc` | ✅ |
| Materials | `add_material.php` | admin | `/app/materials` | ⚠️ |
| Receive List | `view_inventory_receive.php` | admin | `/app/receive-list` | ✅ |
| Abdul AI | `abdul_ai/` | all | external (`VITE_ABDUL_AI_URL`) | ✅ |
| Io Monitor | `test_io.php` | admin | `/app/admin/iot` | ✅ |
| System Health | — | admin | `/app/admin/health` | ✅ |

## Additional feature — Handheld only

| Screen | PHP | Roles | React route | Status |
|--------|-----|-------|-------------|--------|
| Handheld menu | `handheld/index.php` | all | `/handheld` | ⏳ |
| Receive Reservation | `handheld/receive_reservation.php` | admin, material_prep | `/handheld/receive-reservation` | ⏳ |
| Receive Return / Add | `handheld/add_stock.php` | admin, material_prep | `/handheld/receive-return` | ⏳ |

**Excluded:** `handheld/withdraw_stock.php` (legacy)

## Excluded legacy features

| PHP feature | Status |
|-------------|--------|
| withdraw_by_workorder | Not migrated |
| withdraw_special | Not migrated |
| request_by_puid | Not migrated |
| production_calculator | Not migrated |
| ui_preview | Not migrated (dev-only) |
| set_empty / Robotic | Not migrated |
| Abdul AI rewrite | External app only |

## RBAC matrix

| Menu | user | material_prep | admin |
|------|:----:|:-------------:|:-----:|
| Dashboard | ✓ | ✓ | ✓ |
| Search | ✓ | ✓ | ✓ |
| Receive Reservation | | ✓ | ✓ |
| Receive Return | | ✓ | ✓ |
| Picklist | | ✓ | ✓ |
| Rack Overview | ✓ | ✓ | ✓ |
| Expiry | ✓ | ✓ | ✓ |
| 3D Layout | | | ✓ |
| TV Display | | | ✓ |
| Stock Reports | ✓ | ✓ | ✓ |
| User Management | | | ✓ |
| System Admin | | | ✓ |
| Handheld | ✓ | ✓ | ✓ |

Implemented in `@visual-location/shared` → `ROLE_MENU_ACCESS`.

## i18n

| PHP | React |
|-----|-------|
| `languages/th.php` | `src/i18n/locales/th/*.json` |
| `languages/en.php` | `src/i18n/locales/en/*.json` |
| `$_SESSION['lang']` | `users.lang` column + i18next |

## UI requirements

| Requirement | Implementation |
|-------------|----------------|
| MES/WMS style | MUI DataGrid, large buttons, AppBar |
| Touch friendly | 48px+ touch targets |
| Barcode scanner | ScanInput auto-focus, Enter submit, VL prefix strip |
| Handheld | Dedicated layout route |
| TV friendly | Fullscreen dark, large typography |
| Dark mode | MUI theme toggle |

## CPK business logic to preserve

- `cpk_post_authenticated` with PublicUID retry on expired
- RES_PUIDRecv before DB commit on reservation receive
- UpdatePUIDStatus before DB commit on receive return
- DUMMYBATCH: send MAT_DOC as PUID to RES_PUIDRecv
- Display Warnings[] even when Status=S
- Picklist array normalization (Picklists/OpenPicklists/Items/List)
- POST body: PublicUID only — no McID (v1.0.0.14)

## 3D / TV migration

- Do not rebuild — port Babylon.js scene and TV grid CSS/logic
- Replace file polling with Socket.IO
- Preserve TV_KIOSK_KEY and IP whitelist
