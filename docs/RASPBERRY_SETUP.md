# Raspberry Pi Setup

## Install

On the Raspberry Pi (as root):

```bash
cd raspi-client
sudo ./raspi-install.sh
```

## Configuration (`.env`)

```env
DEVICE_ID=1
MQTT_BROKER_URL=mqtt://192.168.x.x:1883
MQTT_CLIENT_ID=visual-raspi-1
HEARTBEAT_INTERVAL_SEC=30
OUTPUT_COUNT=16
```

## Services

- **systemd** unit: `visual-location-raspi`
- **Watchdog**: 60s — restarts on hang
- **Auto-reconnect**: MQTT client reconnects on disconnect

## Update

```bash
sudo ./raspi-update.sh
```

## Registration

Device appears in `raspberry_devices` after first heartbeat. Admin maps Ethernet IO pins in **System Admin → Output Mapping**.

## Monitoring

- API: `GET /api/v1/health/raspi`
- UI: `/app/admin/iot` → Device Health
