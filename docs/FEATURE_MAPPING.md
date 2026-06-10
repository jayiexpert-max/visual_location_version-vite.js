# Feature Mapping

## Required main menu (12 items)

| # | Menu | PHP source | Roles | NestJS + React |
|---|------|------------|-------|----------------|
| 1 | Home Dashboard | `index.php` | all | `/app` |
| 2 | Search Material | `search_product.php` | all | `/app/search` |
| 3 | Receive from Reservation | `show_api_data.php` + `receive_item.php` | admin, material_prep | `/app/receive-reservation` |
| 4 | Receive Return Material | `add_stock.php` + CPK UpdatePUIDStatus | admin, material_prep | `/app/receive-return` |
| 5 | Material Picking | `picklist_issue.php` | admin, material_prep | `/app/picklist` |
| 6 | Rack Overview | `dashboard_rack.php` | all | `/app/rack` |
| 7 | Expiry Check | `check_expiration.php` | all | `/app/expiry` |
| 8 | 3D Layout | `layout_3d.php` | admin | `/layout-3d` (migrate) |
| 9 | TV Display | `tv_display.php` | admin/kiosk | `/tv` (migrate) |
| 10 | Stock Reports | `report_stock.php` | all | `/app/reports/stock` |
| 11 | User Management | `manage_users.php` | admin | `/app/users` |
| 12 | System Administration | `admin.php` | admin | `/app/admin` |

## Additional feature — Handheld only

| Screen | PHP | Roles | React route |
|--------|-----|-------|-------------|
| Handheld menu | `handheld/index.php` | all | `/handheld` |
| Receive Reservation | `handheld/receive_reservation.php` | admin, material_prep | `/handheld/receive-reservation` |
| Receive Return / Add | `handheld/add_stock.php` | admin, material_prep | `/handheld/receive-return` |

**Excluded:** `handheld/withdraw_stock.php` (legacy)

## Excluded legacy features

| PHP feature | Status |
|-------------|--------|
| withdraw_by_workorder | Not migrated |
| withdraw_special | Not migrated |
| request_by_puid | Not migrated |
| BOM management | Not migrated |
| production orders | Not migrated |
| set_empty / Robotic | Not migrated |
| Abdul AI | Out of scope |

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
