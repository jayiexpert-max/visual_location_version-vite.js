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

## Documentation

| Document | Description |
|----------|-------------|
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

| Phase | Status |
|-------|--------|
| Phase 1 — Structure & docs | Complete |
| Phase 2 — NestJS API + MySQL + Docker | Complete |
| Phase 3 — React frontend | Complete |
| Folder split — backend / frontend | Complete |
| Phase 4 — Industrial IoT (MQTT, Raspi, Socket.IO) | Complete |

## PHP source reference

Legacy system: `/Applications/XAMPP/xamppfiles/htdocs/visual_inventory`
