# Disaster Recovery

## Overview

Recovery order: **Database → MQTT → Application → Raspberry clients**

## Database restore

1. Stop API to prevent writes: `docker compose -f docker-compose.production.yml stop api`
2. Restore: `DB_PASS=secret ./scripts/backup/restore.sh backups/database/visual_inventory_db-YYYYMMDD-HHMMSS.sql.gz`
3. Verify: `mysql -u root -p visual_inventory_db -e "SELECT COUNT(*) FROM users;"`
4. Start API: `docker compose -f docker-compose.production.yml start api`

## MQTT restore

1. Restart Mosquitto: `docker compose -f docker-compose.production.yml restart mosquitto`
2. Confirm broker: `curl http://api-host:3000/api/v1/health/mqtt`
3. Raspberry clients auto-reconnect (watchdog + systemd)

## Application restore

1. Redeploy from last known good image or git tag
2. Restore `.env` from file backup (`backups/files/`)
3. Run health dashboard: `/app/admin/health`

## Raspberry Pi restore

1. Flash SD / reinstall OS if hardware failure
2. Run `sudo ./raspi-install.sh` from `raspi-client/`
3. Set `DEVICE_ID` and `MQTT_BROKER_URL` in `.env`
4. Confirm heartbeat in IoT Monitor

## Factory acceptance after recovery

- Login / logout works
- Receive and return material
- Search + highlight (TV + IO)
- CPK and PD Service health green
- Reports export (Excel, CSV, PDF)

See [GO_LIVE_CHECKLIST.md](./GO_LIVE_CHECKLIST.md).
