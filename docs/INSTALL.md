# Visual Location — Installation Guide

## Prerequisites

- Node.js 20+
- MySQL / MariaDB 10.11+
- MQTT broker (Mosquitto 2.x)
- Redis 7 (device presence)
- Factory network access to CPK and PD Service (if integrated)

## Quick start (development)

```bash
# Infrastructure
cd backend/docker && docker compose up -d mysql mosquitto redis

# Database migrations
mysql -u root visual_inventory_db < backend/database/migrations/001_additive_phase1.sql
mysql -u root visual_inventory_db < backend/database/migrations/002_phase4_iot.sql
mysql -u root visual_inventory_db < backend/database/migrations/003_phase6_production.sql

# Backend
cp backend/.env.example backend/.env
cd backend && npm install && npm run start:dev

# Frontend
cp frontend/.env.example frontend/.env
cd frontend && npm install && npm run dev
```

## Production (Docker)

```bash
cp .env.example .env
# Edit secrets and factory URLs
docker compose -f docker-compose.production.yml up -d --build
```

## Post-install

1. Log in as admin (`057412` / password = username for migrated PHP users).
2. Open **System Admin** → configure MQTT, Raspberry devices, Ethernet IO mapping.
3. Open **System Health** (`/app/admin/health`) and verify all services are green.
4. Schedule daily backups: `0 2 * * * /path/to/scripts/backup/backup.sh`

See also: [DEPLOYMENT.md](./DEPLOYMENT.md), [MQTT_SETUP.md](./MQTT_SETUP.md), [RASPBERRY_SETUP.md](./RASPBERRY_SETUP.md).
