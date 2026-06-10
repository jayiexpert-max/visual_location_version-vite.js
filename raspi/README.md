# Raspberry Pi MQTT Gateway

Migrate from PHP project: `/Applications/XAMPP/xamppfiles/htdocs/visual_inventory/raspi/`

## Architecture change

| Before (PHP) | After (NestJS) |
|--------------|----------------|
| PHP HTTP POST → Raspi Flask :8080 | NestJS MQTT publish → Raspi MQTT subscriber |
| Raspi → Modbus TCP → Ethernet IO | Unchanged |

## Phase 5 tasks

1. Add MQTT subscriber to existing `raspi/app/server.py`
2. Keep Modbus logic in `modbus_io.py`
3. Topic: `visual/io/{deviceId}/highlight` — same JSON payload as HTTP API
4. Deprecate HTTP endpoint after cutover

See PHP `docs/RASPI_IO_API.md` for payload contract.
