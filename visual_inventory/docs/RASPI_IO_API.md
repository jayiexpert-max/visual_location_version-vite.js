# Raspi4 IO Gateway API

PHP server (Visual Inventory) sends highlight commands to **Raspi4 WiFi IP only**.
The Ethernet IO module sits on an **isolated network** connected to Raspi Ethernet — PHP never contacts the IO module directly.

## Network topology

```
PHP Server (factory LAN/WiFi)
    → POST JSON to http://{raspi_wifi_ip}:{port}/api/io/highlight
Raspi4 (WiFi + Ethernet)
    → Modbus TCP to Ethernet IO on local eth0 ([`raspi/` gateway](../raspi/README.md))
Ethernet IO → lights / relays
```

## Authentication

If `RASPI_IO_KEY` is set in PHP `.env`, every request includes:

```http
X-IO-Key: {RASPI_IO_KEY}
```

Pi must reject requests with a missing or wrong key (HTTP 401).

## Endpoint

```http
POST http://{raspi_wifi_ip}:{port}/api/io/highlight
Content-Type: application/json
```

Default URL template in Admin: `http://{IP}:{PORT}/api/io/highlight`

## Highlight request

```json
{
  "action": "highlight",
  "duration_sec": 60,
  "device_name": "Raspi-Rack-A",
  "location": {
    "box_id": 12,
    "box_code": "A-01-03",
    "slot_no": 5,
    "level_no": 2,
    "rack_name": "A"
  },
  "outputs": [
    {"pin": 3, "state": 1, "role": "box"},
    {"pin": 1, "state": 1, "role": "green"}
  ]
}
```

| Field | Description |
|-------|-------------|
| `action` | `highlight` or `off` |
| `duration_sec` | Auto-off timer (Pi should turn outputs off after this many seconds) |
| `device_name` | Name from `ethernet_ios.name` in Admin |
| `location` | Warehouse context for logging/display on Pi |
| `outputs` | Pins to drive on the local Ethernet IO module |
| `outputs[].pin` | 1-based output number (Pin 1 = first coil) |
| `outputs[].state` | `1` = ON, `0` = OFF |
| `outputs[].role` | `box`, `green`, or `test` (admin manual test) |

## Turn off request

```json
{
  "action": "off",
  "duration_sec": 0,
  "device_name": "Raspi-Rack-A",
  "location": {
    "box_id": 12,
    "box_code": "A-01-03",
    "slot_no": 5,
    "level_no": 2,
    "rack_name": "A"
  },
  "outputs": [
    {"pin": 3, "state": 0, "role": "box"},
    {"pin": 1, "state": 0, "role": "green"}
  ]
}
```

## Expected response

Success:

```json
{"status": "ok"}
```

HTTP status: **200**

Error (example):

```json
{"status": "error", "message": "Modbus timeout"}
```

HTTP status: **4xx/5xx**

## Pi-side implementation

Source code and installation guide: **[raspi/README.md](../raspi/README.md)**

Configuration on the Pi (`/etc/visual-inventory-io/env`):
| Setting | Example |
|---------|---------|
| Ethernet IO IP | `192.168.0.244` |
| Modbus port | `502` |
| Modbus unit ID | `1` |

Forward each `outputs[]` entry using **Modbus Function 05 (Write Single Coil)** with coil address = `pin - 1`.

## PHP entry points

| File | Purpose |
|------|---------|
| `config/io_device_service.php` | Sender service |
| `api/trigger_box_io.php` | Batch highlight/off by `box_id` |
| `api/reset_all_io.php` | Turn off all mapped box + rack outputs |
| `api/io_control.php` | Single pin test (Admin / test_io.php) |

## Admin setup

1. **Manage Ethernet IO** → Controller Type: **Raspi Gateway (WiFi)**
2. **IP Address** = WiFi IP of Raspi4 (not the isolated IO module IP)
3. **Port** = REST port on Pi (default `8080`)
4. Map **box output pin** and **rack green pin** in Racks / Boxes sections

## Testing before Pi is ready

1. Point Admin device URL to a mock endpoint (e.g. webhook.site)
2. Use `public/test_io.php` or search product on `search_product.php`
3. Verify JSON payload in mock receiver logs

## Production notes

- Direct Modbus/HTTP from PHP to IO IP is **disabled** when `APP_ENV=production`
- Only `controller_type = raspi` is allowed for factory deployment
- Set `APP_ENV=development` on XAMPP for legacy direct Modbus bench tests
