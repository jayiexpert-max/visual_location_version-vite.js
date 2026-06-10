# Visual Location — Frontend

React SPA (Vite + MUI). Static files served by nginx in production.

Deploy this folder on your **web server** (separate IP from backend).

## Quick start (local dev)

```bash
cd frontend
npm install
cp .env.example .env
# VITE_API_BASE_URL=http://localhost:3000/api/v1

npm run dev
# → http://localhost:5173
```

Vite dev server proxies `/api` and `/socket.io` to `localhost:3000` when env vars are not set.

## Docker (nginx static)

```bash
cd frontend/docker
cp .env.example .env
# set VITE_API_BASE_URL=http://<BACKEND_SERVER_IP>:3000/api/v1

docker compose up -d --build
```

## Production checklist

| Variable | Example |
|----------|---------|
| `VITE_API_BASE_URL` | `http://192.168.1.10:3000/api/v1` |
| `VITE_SOCKET_URL` | `http://192.168.1.10:3000` |

> `VITE_*` values are baked in at **build time**. Rebuild the image after changing backend IP.

See [../docs/DEPLOYMENT.md](../docs/DEPLOYMENT.md) for full split-server guide.
