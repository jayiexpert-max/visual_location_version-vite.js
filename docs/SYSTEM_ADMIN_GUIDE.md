# System Administrator Guide

## Access

Role: **admin** → `/app/admin`

## Settings tabs

| Tab | Purpose |
|-----|---------|
| Location Mapping | Rack / level / box / slot hierarchy |
| Rack Config | CRUD warehouse structure |
| MQTT Settings | Broker URL, topic prefix (read-only from env in production) |
| Raspberry Settings | Device list from heartbeats |
| Output Mapping | Ethernet IO pin assignment per slot |
| Language Settings | Default UI language |
| System Settings | Session shift cutoffs, external service URLs |

## Monitoring

- **IoT Monitor** (`/app/admin/iot`) — MQTT logs, Raspberry devices, realtime events
- **System Health** (`/app/admin/health`) — Database, MQTT, CPK, PD Service, Socket.IO, host metrics

## Security

- JWT access + refresh tokens with shift logout
- Account lockout after failed logins
- Audit log: `GET /api/v1/audit/logs`
- Rate limiting on login endpoints

## Backup

Schedule `scripts/backup/backup.sh` daily. See [BACKUP.md](./BACKUP.md).

## User management

`/app/users` — create operators, material prep, admins. Passwords hashed with bcrypt (12 rounds).
