# API Documentation

Base URL: `/api/v1`

Development Swagger: `http://localhost:3000/api/docs` (disabled in production)

## Authentication

| Method | Path | Auth |
|--------|------|------|
| POST | `/auth/login` | Public (rate limited) |
| POST | `/auth/refresh` | Public |
| POST | `/auth/logout` | Bearer JWT |
| GET | `/auth/me` | Bearer JWT |

## Health (public)

| Method | Path |
|--------|------|
| GET | `/health` |
| GET | `/health/database` |
| GET | `/health/mqtt` |
| GET | `/health/raspi` |
| GET | `/health/io` |
| GET | `/health/cpk` |
| GET | `/health/pdservice` |
| GET | `/health/socketio` |
| GET | `/health/system` |
| GET | `/health/dashboard` |

## Inventory

| Method | Path | Roles |
|--------|------|-------|
| GET | `/inventory/search?q=` | All |
| POST | `/inventory/receive` | admin, material_prep |
| POST | `/inventory/receive-return` | admin, material_prep |
| POST | `/inventory/highlight` | All |

## IO

| Method | Path | Roles |
|--------|------|-------|
| POST | `/io/highlight` | admin |
| POST | `/io/off` | admin |
| POST | `/io/reset` | admin |
| GET | `/io/status` | admin |
| GET | `/io/devices` | admin |

## Users (admin)

CRUD on `/users`

## Audit (admin)

`GET /audit/logs?category=&action=&limit=`

## Error format

```json
{
  "status": "error",
  "message": "Human-readable message",
  "code": "ERROR_CODE",
  "details": {}
}
```
