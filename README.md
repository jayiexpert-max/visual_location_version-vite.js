# Visual Location Management

Enterprise warehouse system migrated from Visual Inventory PHP.

| Layer | Stack |
|-------|-------|
| Frontend | React 19, Vite 6, TypeScript, MUI 6, i18next |
| Backend | NestJS 11, TypeScript, JWT, RBAC, Socket.IO, MQTT |
| Database | MySQL 8 / MariaDB 10.4+ |
| IoT | MQTT → Raspberry Pi → Modbus TCP → Ethernet IO |

**Network:** Local factory LAN only.

## Repository layout

```
visual_location/
├── backend/          # NestJS API — deploy บน API server
│   ├── src/
│   ├── shared/
│   ├── database/
│   └── docker/
├── frontend/         # React SPA — deploy บน web server
│   └── src/shared/
├── docs/
└── raspi/            # MQTT gateway (migrate from PHP project)
```

Frontend และ Backend เป็นโปรเจ็กต์อิสระ — **deploy คนละ server IP** ได้

## Quick start

See **[docs/RUN_GUIDE.md](docs/RUN_GUIDE.md)** (Thai) for full setup.

```bash
npm run install:all
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

npm run backend:dev   # Terminal 1 → http://localhost:3000
npm run frontend:dev  # Terminal 2 → http://localhost:5173
```

**Deploy แยก server:** [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)

## Start project

ใช้ชุดคำสั่งนี้เมื่อ clone project ลงเครื่องใหม่ หรือหลังจาก pull code ล่าสุด:

```bash
git clone https://github.com/jayiexpert-max/visual_location_version-vite.js.git
cd visual_location_version-vite.js

npm run install:all
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

ตั้งค่า database/API ใน `backend/.env` และตั้งค่า `VITE_API_BASE_URL` ใน `frontend/.env`
ให้ชี้ไปที่ backend server เช่น `http://localhost:3000/api/v1`

เริ่มระบบสำหรับ development:

```bash
npm run backend:dev
npm run frontend:dev -- --host 0.0.0.0
```

ถ้าเจอ `vite: command not found` ให้รัน `npm run frontend:install` หรือ `npm run install:all`
ก่อน เพราะ Vite ถูกติดตั้งเป็น dependency ภายใน `frontend/node_modules`

Build สำหรับตรวจ production:

```bash
npm run backend:build
npm run frontend:build
```

## Code overview

ระบบนี้แยก frontend และ backend ชัดเจนเพื่อให้ deploy คนละ server IP ได้:

| Area | Path | Description |
|------|------|-------------|
| Backend API | `backend/src/` | NestJS modules สำหรับ auth, inventory, warehouse, CPK, IoT, reports และ health check |
| Database migrations | `backend/database/migrations/` | SQL migration ตามลำดับ ใช้แทน TypeORM synchronize |
| Shared contract | `backend/shared/`, `frontend/src/shared/` | constants, role/permission และ realtime payload ที่ต้อง sync กันทั้งสองฝั่ง |
| Frontend app | `frontend/src/` | React SPA สำหรับ dashboard, search, receive, booking, admin, handheld และ TV kiosk |
| Static/offline assets | `frontend/public/` | favicon, รูป, font และ plugin asset สำหรับใช้งานใน factory LAN |
| Legacy PHP reference | `visual_inventory/` | source เดิมที่ใช้เทียบ feature และ migration parity |
| Raspberry Pi gateway | `raspi-client/`, `raspi/` | gateway สำหรับ MQTT/IO ในหน้างาน |

เวลาเพิ่ม feature ใหม่ให้เริ่มจาก backend module และ DTO ก่อน จากนั้น sync shared types/constants
ไป frontend แล้วจึงต่อหน้า UI และ service API ให้ครบ workflow.

## Documentation

| Document | Description |
|----------|-------------|
| **[docs/PROJECT_PHASES.md](docs/PROJECT_PHASES.md)** | **Phase checklist & PHP parity status** |
| [docs/RUN_GUIDE.md](docs/RUN_GUIDE.md) | **How to run the project** (TH) |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | **Split-server deployment** (TH) |
| [docs/FOLDER_STRUCTURE.md](docs/FOLDER_STRUCTURE.md) | Full directory tree |
| [docs/ER_DIAGRAM.md](docs/ER_DIAGRAM.md) | Entity-relationship diagram |
| [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | Table definitions & migrations |
| [docs/NESTJS_ARCHITECTURE.md](docs/NESTJS_ARCHITECTURE.md) | Backend module design |
| [docs/REACT_ARCHITECTURE.md](docs/REACT_ARCHITECTURE.md) | Frontend module design |
| [docs/MIGRATION_PLAN.md](docs/MIGRATION_PLAN.md) | Phased migration plan |
| [docs/API_MAPPING.md](docs/API_MAPPING.md) | PHP → NestJS API map |
| [docs/FEATURE_MAPPING.md](docs/FEATURE_MAPPING.md) | Menu & feature map |
| [docs/DATABASE_MAPPING.md](docs/DATABASE_MAPPING.md) | PHP DB → NestJS entity map |

## Project status

See **[docs/PROJECT_PHASES.md](docs/PROJECT_PHASES.md)** for the full checklist (Track A: platform Phase 1–7, Track B: PHP dashboard parity).

| Track | Summary |
|-------|---------|
| Platform (Phase 1–5) | Complete (incl. `db:init` / `db:verify`) |
| Handheld (Phase 6) | Pending |
| QA & cutover (Phase 7) | Pending |
| PHP parity (Track B) | 13 complete · 3 partial · 1 excluded |

## PHP source reference

Legacy system: `/Applications/XAMPP/xamppfiles/htdocs/visual_inventory`
