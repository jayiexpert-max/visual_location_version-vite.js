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
├── apps/
│   ├── api/          # NestJS backend
│   └── web/          # React SPA (+ handheld routes)
├── packages/
│   └── shared/       # Shared types, constants, i18n keys
├── database/
│   ├── migrations/   # SQL migrations
│   └── seeds/        # Reference data (optional)
├── docker/           # Local dev: MySQL, Mosquitto
├── docs/             # Architecture & migration documentation
└── raspi/            # MQTT gateway (migrate from PHP project)
```

## Documentation

| Document | Description |
|----------|-------------|
| [docs/FOLDER_STRUCTURE.md](docs/FOLDER_STRUCTURE.md) | Full directory tree |
| [docs/ER_DIAGRAM.md](docs/ER_DIAGRAM.md) | Entity-relationship diagram |
| [docs/DATABASE_SCHEMA.md](docs/DATABASE_SCHEMA.md) | Table definitions & migrations |
| [docs/NESTJS_ARCHITECTURE.md](docs/NESTJS_ARCHITECTURE.md) | Backend module design |
| [docs/REACT_ARCHITECTURE.md](docs/REACT_ARCHITECTURE.md) | Frontend module design |
| [docs/MIGRATION_PLAN.md](docs/MIGRATION_PLAN.md) | Phased migration plan |
| [docs/API_MAPPING.md](docs/API_MAPPING.md) | PHP → NestJS API map |
| [docs/FEATURE_MAPPING.md](docs/FEATURE_MAPPING.md) | Menu & feature map |
| [docs/DATABASE_MAPPING.md](docs/DATABASE_MAPPING.md) | PHP DB → NestJS entity map |

## Phase 1 — Setup (current)

1. Import baseline schema from PHP dump (`visual_inventory_db.sql`)
2. Apply additive migrations in `database/migrations/`
3. Configure `.env` from `.env.example` in each app
4. Start local services: `docker compose -f docker/docker-compose.yml up -d`

## PHP source reference

Legacy system: `/Applications/XAMPP/xamppfiles/htdocs/visual_inventory`
