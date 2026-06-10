# System Acceptance Test

## AUTH-01 Login

| Step | Expected |
|------|----------|
| Valid credentials | 201 + access/refresh tokens |
| Invalid password | 401 AUTH_INVALID_CREDENTIALS |
| 5 failed attempts | 401 AUTH_ACCOUNT_LOCKED |

## INV-01 Receive

| Step | Expected |
|------|----------|
| Receive new PUID to slot | Stock increased, audit log `receive_material` |
| Duplicate PUID | 400 INVENTORY_PUID_EXISTS |

## INV-02 Return

| Step | Expected |
|------|----------|
| Return existing PUID | qty_remain updated, audit `return_material` |

## IO-01 Highlight

| Step | Expected |
|------|----------|
| Search → Highlight | TV event + MQTT publish + IO lights |

## HLTH-01 Health APIs

All `/api/v1/health/*` endpoints return 200 with status fields.

## RPT-01 Reports

Each report tab exports Excel, CSV, and PDF without error.

## MQTT-01 Device heartbeat

Raspberry publishes to `factory/device/status`; appears online in health dashboard.

## CPK-01 Integration

`GET /health/cpk` returns ok when CPK reachable and configured.
