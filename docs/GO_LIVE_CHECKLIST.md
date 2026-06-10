# Go-Live Checklist

## Infrastructure

- [ ] MySQL running with all migrations applied (001, 002, 003)
- [ ] Mosquitto MQTT broker reachable from API and all Raspberry Pis
- [ ] Redis running for device presence
- [ ] Backend `NODE_ENV=production`, Swagger disabled
- [ ] Frontend built with correct `VITE_API_BASE_URL` and `VITE_SOCKET_URL`
- [ ] HTTPS / reverse proxy configured
- [ ] Daily backup cron scheduled

## Security

- [ ] JWT secrets rotated (32+ chars)
- [ ] CORS limited to factory origins
- [ ] TV kiosk key set (if used)
- [ ] CPK McID and StationKey configured
- [ ] Account lockout tested
- [ ] Audit logs writing on login, receive, user changes

## Functional

- [ ] Login / logout (desktop + handheld)
- [ ] Search + highlight (TV + Ethernet IO)
- [ ] Receive reservation + return
- [ ] Picklist (CPK)
- [ ] Rack overview realtime updates
- [ ] Reports export (Excel, CSV, PDF)
- [ ] System Health dashboard all green

## Hardware

- [ ] Raspberry Pi registered and heartbeat visible
- [ ] Ethernet IO outputs tested per slot
- [ ] BT-A500 scanners configured (keyboard wedge)
- [ ] TV displays on `/tv`

## Documentation

- [ ] Operators trained ([USER_MANUAL.md](./USER_MANUAL.md))
- [ ] IT has [RECOVERY.md](./RECOVERY.md) and [BACKUP.md](./BACKUP.md)

Sign-off: _________________ Date: _________
