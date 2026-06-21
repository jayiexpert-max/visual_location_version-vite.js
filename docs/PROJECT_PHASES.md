# Project Phases & Checklist

**Last updated:** 2026-06-10 (Phase 6 Handheld complete)  
**PHP reference:** `/Users/jayoverlay/Downloads/visual_inventory` (legacy Visual Inventory)

This document is the **single source of truth** for migration and PHP parity progress.  
Original plan: [MIGRATION_PLAN.md](MIGRATION_PLAN.md) · Route map: [FEATURE_MAPPING.md](FEATURE_MAPPING.md) · Ops sign-off: [GO_LIVE_CHECKLIST.md](GO_LIVE_CHECKLIST.md)

---

## Summary (at a glance)

| Track | Description | Done | In progress | Pending |
|-------|-------------|:----:|:-----------:|:-------:|
| **A** | Platform migration (Phase 1–7) | 6 phases | — | 1 phase |
| **B** | PHP dashboard parity (17 cards) | 16 | — | 0 |

**Legend:** ✅ complete · ⚠️ partial · ⏳ pending · ❌ excluded / not planned

---

## How to maintain

1. Update **Last updated** when closing a phase or major parity item.
2. **Track A** = NestJS + React platform (infra, modules, routes).
3. **Track B** = UI + API + workflow parity vs PHP `public/index.php` cards.
4. When Track A Phase 6–7 and planned Track B items are done → run [GO_LIVE_CHECKLIST.md](GO_LIVE_CHECKLIST.md).
5. Known bugs/gaps → [OPEN_ISSUES.md](OPEN_ISSUES.md).
6. Real-time page sync → [REALTIME_SYNC_CHECKLIST.md](REALTIME_SYNC_CHECKLIST.md).

---

## Track A — Platform Migration

### Phase 1 — Foundation ✅

- [x] Monorepo folder structure (`backend/`, `frontend/`, `docs/`, `raspi-client/`)
- [x] ER diagram, database schema, architecture docs
- [x] Shared package (roles, RBAC, API routes, socket events)
- [x] Docker compose (MySQL, Mosquitto, Redis)
- [x] Additive SQL migrations (`001`–`003`)
- [x] `npm install:all` + env examples (`backend/.env.example`, `frontend/.env.example`)
- [x] Baseline schema scripts (`npm run db:init`, `db:migrate`, `db:verify`)

### Phase 2 — Core Backend ✅

- [x] Config, database module, health endpoints
- [x] Auth (JWT access/refresh, shift logout, account lockout)
- [x] Users CRUD + RBAC guards
- [x] Warehouse hierarchy, box layout, slot products
- [x] PDService client + CPK module (v1.0.0.14 PublicUID flow)
- [x] Inventory (search, receive, receive-return, highlight, lookup)
- [x] Reservations (`GET /reservations`, enriched `GET /reservations/:resNo/detail`)
- [x] Materials CRUD, Reports, Audit logs
- [x] WO BOM (`GET /wo-bom/:workOrder`)
- [x] Booking out PUID (`POST /cpk/booking-out`)

### Phase 3 — Core Frontend ✅

- [x] MUI theme + i18next TH/EN
- [x] Auth + role-gated routes (`ProtectedRoute`, shared RBAC)
- [x] Dashboard with PHP-style module grid + stats
- [x] Factory UI (login glassmorphism, top bar, status bar, footer)
- [x] Dashboard card names from PHP `mod_*` keys
- [x] Pages: Search, Receive Reservation (split-panel), Receive Return, Picklist, Booking Out, WO Material Calc, Rack, Expiry, Reports, Materials, Receive List, Users, System Admin
- [x] Picklist notify (dashboard badge, sound/TTS) — PHP `picklist-notify.js` parity
- [x] Io Monitor + System Health admin pages

### Phase 4 — Real-time + Special Displays ✅

- [x] Socket.IO gateway (`highlight:update`, `highlight:clear`, IO status)
- [x] TV Display (`/tv`) — migrated from `tv_display.php`
- [x] 3D Layout (`/layout-3d`) — Babylon.js from `layout_3d.php`
- [x] PUID in highlight payload + slot grid chips (PHP `wh_build_highlight_payload`)
- [x] TV search-mode (focus target rack) + 500ms poll fallback
- [x] 3D public kiosk (`?tv_key=`) + highlight clear + reset view + live banner
- [x] Dashboard links append `VITE_TV_KIOSK_KEY` when configured

### Phase 5 — MQTT IoT ✅

- [x] NestJS MQTT publisher + subscriber
- [x] Raspberry Pi MQTT client (`raspi-client/`)
- [x] `io_command_logs` audit
- [x] Ethernet IO highlight/off via MQTT (not direct Modbus from API)

### Phase 6 — Handheld ✅

- [x] `HandheldLayout` + routes `/handheld/*`
- [x] Handheld login (`handheld/login.php`) — single-scan, device type `handheld`
- [x] Handheld menu (`handheld/index.php`)
- [x] Receive reservation (`handheld/receive_reservation.php`) + TV/3D/IO highlight
- [x] Receive return / add stock (`handheld/add_stock.php`)
- [x] Picklist issue (`handheld/picklist_issue.php`) + TV/3D highlight
- [x] 30-minute idle timeout (`useHandheldIdle`)
- [x] Session expiry → `/handheld/login?timeout=1`
- [x] Exclude withdraw (legacy) — per [MIGRATION_PLAN.md](MIGRATION_PLAN.md)

### Phase 7 — QA & Cutover ⏳

- [ ] Test against PHP `docs/TEST_CHECKLIST_TH.md`
- [ ] Parallel run with PHP on same MySQL
- [ ] Feature-flag cutover per menu
- [ ] Sign-off per [GO_LIVE_CHECKLIST.md](GO_LIVE_CHECKLIST.md)

---

## Track B — PHP Dashboard Parity

Active cards from PHP `public/index.php` (commented-out cards excluded).

| # | PHP label (EN) | PHP file | React route | UI | API | Notes |
|---|----------------|----------|-------------|:--:|:---:|-------|
| — | Picklists pending (stat) | `picklist_issue.php` | `/app/picklist` | ✅ | ✅ | Stat link + badge on dashboard |
| 1 | Search Box | `search_product.php` | `/app/search` | ✅ | ✅ | Highlight + TV/IO |
| 2 | Reservation (RES) | `show_api_data.php` | `/app/receive-reservation` | ✅ | ✅ | Split-panel, PUID verify/save |
| 3 | Material Inbound | `add_stock.php` | `/app/receive-return` | ✅ | ✅ | PDService fetch + CPK UpdatePUIDStatus + TV/IO highlight |
| 4 | Create Picklist (HANA) | external URL | external | ✅ | N/A | Same external link as PHP |
| 5 | Issue by Picklist | `picklist_issue.php` | `/app/picklist` | ✅ | ✅ | Factory UI, RequiredOnly, FIFO / FEFO, close+KitsNote, TV/3D |
| 6 | Booking Out PUID | `booking_out_puid.php` | `/app/booking-out` | ✅ | ✅ | Preview + confirm modal + eligibility (PHP parity) |
| 7 | WO Material Calculation | `wo_material_calc.php` | `/app/wo-material-calc` | ✅ | ✅ | WO header, production qty, BOM table, Find/highlight |
| 8 | Rack Overview | `dashboard_rack.php` | `/app/rack` | ✅ | ✅ | |
| 9 | TV Display | `tv_display.php` | `/tv` | ✅ | ✅ | |
| 10 | 3D Layout | `layout_3d.php` | `/layout-3d` | ✅ | ✅ | |
| 11 | Abdul AI | `abdul_ai/` | external | ✅ | N/A | Separate PHP app; external URL |
| 12 | Stock Report | `report_stock.php` | `/app/reports` | ✅ | ✅ | Movement filters: add, RES, picklist, booking out + PUID column |
| 13 | Expiration Check | `check_expiration.php` | `/app/expiry` | ✅ | ✅ | Report/export + CPK/PDService sync |
| 14 | Materials | `add_material.php` | `/app/materials` | ✅ | ✅ | CRUD + CSV import/export |
| 15 | Manage Users | `manage_users.php` | `/app/users` | ✅ | ✅ | |
| 16 | Receive List | `view_inventory_receive.php` | `/app/receive-list` | ✅ | ✅ | |
| 17 | System Settings | `admin.php` | `/app/admin` | ✅ | ✅ | Racks/slots/IO/products/FIFO / FEFO |
| — | Handheld (BT-A500) | `handheld/index.php` | `/handheld` | ✅ | ✅ | Login, menu, add stock, RES, picklist; idle 30m |
| — | UI Preview | `ui_preview.php` | — | ❌ | ❌ | Dev-only; not planned |

**React extras (no PHP dashboard card):** Io Monitor (`/app/admin/iot`), System Health (`/app/admin/health`).  
**Note:** React dashboard also links to Handheld (`/handheld`); PHP uses a separate handheld entry URL.

---

## Track B — Detail checklists

### B1 — Receive Return / add_stock parity ✅

- [x] PDService fetch flow matching `add_stock.php`
- [x] Location resolve + TV/IO highlight on save
- [x] CPK `UpdatePUIDStatus` with transport-failure fallback
- [x] Add-stock API (`POST /inventory/receive-return`) — upsert, +1 reel, stock_log

### B2 — Picklist full parity ✅

- [x] Open / detail / issue / close CPK APIs
- [x] Dashboard badge + notify (sound/TTS)
- [x] Factory UI parity (`picklist_issue.php` — list, issue panel, scan, TV/3D)
- [x] RequiredOnly filter + Meta (CPK fallback + local filter)
- [x] Pre-check PUID flow (`/inventory/lookup`)
- [x] FIFO / FEFO validation on issue + renewal modal
- [x] Local stock withdraw + `stock_logs` picklist_issue entry
- [x] Close picklist modal with KitsNote (max 200)

### B3 — Admin products + FIFO / FEFO ✅

- [x] Products slot mapping UI (`admin.php#products`)
- [x] FIFO / FEFO issue policy settings UI
- [x] FIFO / FEFO settings API (`app_settings` equivalent)
- [x] Warehouse admin CRUD (racks, levels, boxes, slots, devices)

### B4 — Materials CSV ✅

- [x] Materials CRUD API + basic page
- [x] CSV import parity (`import_materials_csv.php`)
- [x] CSV export parity (`export_materials.php`)

### B5 — Expiry sync ✅

- [x] Expiration report + export
- [x] `sync_station_inventory` action (CPK station refresh)
- [x] `update_expiration` per RES/PUID

### B6 — Handheld ✅

- [x] `HandheldLayout` + routes `/handheld/*` (see **Track A — Phase 6**)
- [x] Handheld login + menu
- [x] Receive reservation, add stock, picklist issue
- [x] TV/3D/IO highlight on line tap (`handheldHighlight.ts`)
- [x] 30-minute idle timeout + handheld-aware session redirect

---

## Excluded (not migrating)

| PHP feature | Reason |
|-------------|--------|
| `withdraw_product.php` | Legacy |
| `withdraw_by_workorder.php` | Legacy |
| `request_by_puid.php` | Legacy |
| `production_calculator.php` | Legacy (commented on dashboard) |
| `ui_preview.php` | Dev/design preview only |
| `handheld/withdraw_stock.php` | Legacy |
| Abdul AI rewrite | Stays external PHP app |

Full list: [MIGRATION_PLAN.md — Excluded from scope](MIGRATION_PLAN.md#excluded-from-scope-legacy-php).

---

## Related documentation

| Document | Purpose |
|----------|---------|
| [MIGRATION_PLAN.md](MIGRATION_PLAN.md) | Original phased plan + architecture |
| [FEATURE_MAPPING.md](FEATURE_MAPPING.md) | Menu ↔ route ↔ PHP file map |
| [API_MAPPING.md](API_MAPPING.md) | PHP API → NestJS endpoint map |
| [GO_LIVE_CHECKLIST.md](GO_LIVE_CHECKLIST.md) | Production ops sign-off |
| [OPEN_ISSUES.md](OPEN_ISSUES.md) | Known gaps and workarounds |
| [RUN_GUIDE.md](RUN_GUIDE.md) | Local dev setup (TH) |
| [REALTIME_SYNC_CHECKLIST.md](REALTIME_SYNC_CHECKLIST.md) | Real-time sync by page |
