# Visual Location — Agent Guide

Warehouse management system (migrated from Visual Inventory PHP). Factory LAN only.

## Layout

```
visual_location/
├── backend/          NestJS API (port 3000, prefix /api/v1)
├── frontend/         React SPA (Vite, port 5173)
├── raspi-client/     MQTT gateway for Raspberry Pi
├── scripts/backup/   backup.sh, restore.sh
├── docs/             INSTALL, DEPLOYMENT, GO_LIVE_CHECKLIST, etc.
└── docker-compose.production.yml
```

Frontend and backend deploy to **separate server IPs**. Frontend calls API via `VITE_API_BASE_URL`; do not proxy API through nginx in production.

## Dev commands

```bash
npm run install:all
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
npm run backend:dev    # Terminal 1
npm run frontend:dev   # Terminal 2
```

Infrastructure (optional for IoT):

```bash
cd backend/docker && docker compose up -d mysql mosquitto redis
```

## Database

- MySQL/MariaDB database: `visual_inventory_db`
- Migrations (in order): `backend/database/migrations/001_*.sql`, `002_*.sql`, `003_*.sql`
- TypeORM `synchronize: false` — always use SQL migrations
- Stock on rack: `products` (linked to `slots`)
- PUID receive history: `inventory_receive`
- Master catalog `materials` exists but has **no API module yet**

Local XAMPP MySQL: `/Applications/XAMPP/xamppfiles/bin/mysql`

## Key backend modules

| Module | Path | Role |
|--------|------|------|
| auth | `backend/src/modules/auth/` | JWT access + refresh, lockout, shift logout |
| inventory | `backend/src/modules/inventory/` | Search, receive, return, highlight |
| warehouse | `backend/src/modules/warehouse/` | Rack hierarchy CRUD |
| mqtt / io | `backend/src/modules/mqtt/`, `io/` | Ethernet IO via MQTT |
| cpk | `backend/src/modules/cpk/` | External picklist service |
| audit | `backend/src/modules/audit/` | `audit_logs` trail |
| health | `backend/src/modules/health/` | `/health/*` endpoints |

Shared types: `backend/shared/` (npm workspace `@visual-location/shared`). Frontend copy: `frontend/src/shared/`.

## Key frontend routes

| Route | Purpose |
|-------|---------|
| `/login` | Auth |
| `/app` | Dashboard |
| `/app/search` | HanaPart / PUID search + highlight |
| `/app/admin` | System admin |
| `/app/admin/health` | System health dashboard |
| `/app/admin/iot` | MQTT / Raspberry monitor |
| `/tv` | TV kiosk display |

## Security & config

- Never commit `.env` — use `.env.example` as template
- PHP bcrypt hashes use `$2y$`; normalize to `$2a$` in `auth.service.ts`
- `DB_LOGGING=false` by default (SQL not printed to console)
- Redis/MQTT optional in dev; in-memory fallback for Redis

## Test users (migrated from PHP, password = username)

| Username | Role |
|----------|------|
| 057412 | admin |
| 088888 | material_prep |
| 089999 | user |

## Before changing code

1. Match existing NestJS module patterns and RBAC decorators
2. Keep backend and frontend `shared/` constants in sync when adding API/socket/MQTT constants
3. Run `npm run build` in backend and frontend after substantive changes
4. Do not add mock data or placeholder stubs for production paths

## Docs to read first

- `docs/INSTALL.md` — setup
- `docs/DEPLOYMENT.md` — split-server deploy
- `docs/GO_LIVE_CHECKLIST.md` — production readiness
- `docs/API_DOCUMENTATION.md` — endpoint list
