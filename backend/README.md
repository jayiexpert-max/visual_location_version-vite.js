# Visual Location — Backend

NestJS API, MySQL schema, MQTT, Docker stack.

Deploy this folder on your **API server** (separate IP from frontend).

## Quick start (local dev)

```bash
cd backend
npm install
cp .env.example .env
# edit .env — DB credentials, JWT secrets, CORS_ORIGINS

npm run start:dev
# → http://localhost:3000
# → Swagger: http://localhost:3000/api/docs
```

## Docker (API + MySQL + MQTT)

```bash
cd backend/docker
cp .env.example .env
# set CORS_ORIGINS=http://<FRONTEND_SERVER_IP>

docker compose up -d --build
```

## Production checklist

| Variable | Example |
|----------|---------|
| `CORS_ORIGINS` | `http://192.168.1.20` (frontend server) |
| `JWT_ACCESS_SECRET` | ≥ 32 characters |
| `JWT_REFRESH_SECRET` | ≥ 32 characters |
| `DB_HOST` | MySQL host (or `mysql` in Docker) |

See [../docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) for full split-server guide.
