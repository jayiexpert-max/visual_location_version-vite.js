# Migration Plan

> **Current status (checkboxes, parity):** see **[PROJECT_PHASES.md](PROJECT_PHASES.md)** — update that file when completing work.

## Objective

Rebuild Visual Inventory PHP into a production-ready enterprise application on local factory LAN.

| Layer | Stack |
|-------|-------|
| Frontend | React, Vite, TypeScript, MUI, i18next |
| Backend | NestJS, TypeScript, JWT, RBAC, Socket.IO, MQTT |
| Database | MySQL / MariaDB (`visual_inventory_db`) |

## Principles

1. Port business logic — do not reinvent (CPK, PDService, FIFO, location resolve)
2. Migrate 3D and TV — do not rebuild
3. MQTT for IO — backend never calls Ethernet IO directly
4. MUI only — MES/WMS industrial UI, touch/barcode/TV friendly
5. Legacy PHP features excluded — only Handheld as additional scope beyond 12 menus

## Target architecture

```
React SPA ──JWT──► NestJS API ──► MySQL
     │                  ├──► PDService (HTTP)
     │ Socket.IO        ├──► CPK Service v1.0.0.14 (HTTP)
     ▼                  └──► MQTT Broker
TV / 3D / Handheld              │
                                ▼
                         Raspberry Pi subscriber
                                │
                                ▼ Modbus TCP
                         Ethernet IO → lights
```

## Phase plan

### Phase 1 — Foundation ✅

- [x] Monorepo folder structure
- [x] ER diagram, database schema, architecture docs
- [x] Shared package (roles, RBAC, API routes)
- [x] Docker compose (MySQL, Mosquitto)
- [x] Additive SQL migrations
- [x] `npm install` + env configuration (examples + root scripts)
- [x] Baseline schema scripts (`npm run db:init`, `db:migrate`, `db:verify`)

### Phase 2 — Core backend ✅

- [x] Config, database, health
- [x] Auth (JWT, shift logout, device types)
- [x] Users CRUD
- [x] Warehouse + box layout
- [x] PDService + CPK modules
- [x] Inventory (search, receive, return, highlight, lookup)
- [x] Reservations enriched detail, Materials, Reports, WO BOM, Booking out

### Phase 3 — Core frontend ✅

- [x] MUI theme + i18next TH/EN
- [x] Auth + role-gated routes
- [x] Dashboard, Search, Receive flows, Picklist, Rack, Expiry, Reports, Admin, Users
- [x] Factory UI + PHP dashboard card names (`mod_*`)
- [x] Extra modules: Booking Out, WO Material Calc, Receive List, Io/Health admin
- [ ] Full PHP UI parity for some flows — see [PROJECT_PHASES.md](PROJECT_PHASES.md) Track B

### Phase 4 — Real-time + special displays ✅

- [x] Socket.IO gateway
- [x] TV Display migration
- [x] 3D Layout migration (Babylon.js)

### Phase 5 — MQTT IoT ✅

- [x] NestJS MQTT publisher
- [x] Raspberry Pi MQTT subscriber (`raspi-client/`)
- [x] `io_command_logs` audit

### Phase 6 — Handheld ⏳

- [ ] HandheldLayout + 3 screens (menu, receive reservation, receive return)
- [ ] 30-minute idle timeout
- [x] Exclude withdraw (legacy)

Details: [PROJECT_PHASES.md — Track A Phase 6](PROJECT_PHASES.md#phase-6--handheld-)

### Phase 7 — QA & cutover ⏳

- [ ] Test against `docs/TEST_CHECKLIST_TH.md` from PHP project
- [ ] Parallel run with PHP
- [ ] Feature-flag cutover per menu
- [ ] Sign-off per [GO_LIVE_CHECKLIST.md](GO_LIVE_CHECKLIST.md)

Details: [PROJECT_PHASES.md — Track A Phase 7](PROJECT_PHASES.md#phase-7--qa--cutover-)

## Excluded from scope (legacy PHP)

| Feature | Reason |
|---------|--------|
| withdraw_by_workorder | Legacy |
| withdraw_special | Legacy |
| request_by_puid | Legacy |
| BOM management UI | Legacy |
| Production orders | Legacy |
| set_empty / Robotic | Legacy |
| Handheld withdraw_stock | Legacy |

## CPK integration (v1.0.0.14)

- Base URL: `http://194.10.10.15/CPKservice/cpk_service/`
- POST endpoints: **PublicUID only** (no McID in body)
- GetPublicUID: McID + StationKey
- New endpoints to implement: `ClosePicklist`, full `UpdatePUIDStatus` for receive return
- See `docs/API_MAPPING.md`

## Cutover strategy

1. Same MySQL database — both systems read/write during parallel run
2. MQTT cutover for IO — Pi supports HTTP+MQTT transition period
3. TV kiosk URL unchanged pattern: `/tv?lang=th&tv_key=...`
4. Decommission PHP after QA sign-off

## Approval

Plan approved. Phase 1–5 complete; Phase 6–7 and PHP parity — see [PROJECT_PHASES.md](PROJECT_PHASES.md).
