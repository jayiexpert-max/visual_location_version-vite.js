# Raspberry Pi MQTT Gateway

Phase 4 IoT integration uses the standalone Node.js client in **`../raspi-client/`**.

## Quick start (simulator)

```bash
cd ../raspi-client
npm install
cp .env.example .env
npm run simulator
```

## Docker (with backend stack)

```bash
cd ../backend/docker
docker compose up -d raspberry-simulator mosquitto
```

## Architecture

- Backend **never** controls Ethernet IO directly
- NestJS `IoModule` publishes MQTT commands only
- Raspi client subscribes and drives outputs (Modbus / relay in production)
- Heartbeat every 30s on `factory/device/status`

See [../docs/NESTJS_ARCHITECTURE.md](../docs/NESTJS_ARCHITECTURE.md) IoModule section.
