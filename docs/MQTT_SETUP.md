# MQTT Setup

## Broker

Production uses Mosquitto 2.x (`backend/docker/mosquitto/mosquitto.conf`).

Default port: **1883** (factory LAN only — do not expose to internet).

## Topics

| Topic | Direction | Purpose |
|-------|-----------|---------|
| `visual/io/{deviceId}/highlight` | API → Raspi | Turn on outputs |
| `visual/io/{deviceId}/off` | API → Raspi | Turn off outputs |
| `visual/io/reset` | API → Raspi | Reset all devices |
| `factory/device/status` | Raspi → API | Heartbeat / online status |

## Backend configuration

```env
MQTT_BROKER_URL=mqtt://mosquitto:1883
MQTT_CLIENT_ID=visual-location-api
MQTT_IO_TOPIC_PREFIX=visual/io
```

## Health check

`GET /api/v1/health/mqtt`

## Troubleshooting

1. Check Mosquitto logs: `docker logs vl-prod-mqtt`
2. Verify API MQTT connected in System Health dashboard
3. Review `mqtt_logs` table and IoT Monitor → MQTT tab
