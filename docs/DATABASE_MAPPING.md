# Database Mapping — PHP → NestJS TypeORM

## Database

- **Name:** `visual_inventory_db`
- **Baseline:** `visual_inventory_db.sql` from PHP project
- **Additive:** `database/migrations/001_additive_phase1.sql`

## Entity map

| Table | Entity | Module |
|-------|--------|--------|
| users | User | users |
| refresh_tokens | RefreshToken | auth |
| racks | Rack | warehouse |
| levels | Level | warehouse |
| boxes | Box | warehouse |
| slots | Slot | warehouse |
| products | Product | warehouse |
| inventory_receive | InventoryReceive | inventory |
| stock_logs | StockLog | inventory |
| reservation_list | ReservationList | reservations |
| ethernet_ios | EthernetIo | io |
| materials | Material | warehouse |
| tv_highlights | TvHighlight | tv |
| io_command_logs | IoCommandLog | io |
| cpk_token_cache | CpkTokenCache | cpk |

## Views (keep in DB)

| View | NestJS usage |
|------|--------------|
| v_inventory_location | Raw query in InventoryService |
| v_stock_history | ReportsModule |

## Phase 1 schema changes

| Change | Purpose |
|--------|---------|
| users.lang | Persist language preference |
| refresh_tokens | JWT refresh storage |
| tv_highlights | Replace tv_highlight.json |
| io_command_logs | MQTT audit trail |
| cpk_token_cache | Replace session PublicUID cache |

## Column semantics

### inventory_receive.StatusName
`Restricted`, `Withdrawn`, `Is empty`, `Is Blocked`, `Connected to feeder`

FIFO excludes: `Withdrawn`, `Empty`

### stock_logs.action
Format: `{type}|{qty}|{puid}`

Types: `add`, `withdraw_wo_scan`, `withdraw_bom_scan`, `order_withdraw`

### boxes.layout
Grid dimensions: `1x1`, `2x5`, `3x3` — parsed by BoxLayoutService

## Hierarchy FK chain

```
racks.id ← levels.rack_id ← boxes.level_id ← slots.box_id ← products.slot_id
```

## IO mapping

```
ethernet_ios.id ← racks.io_device_id
ethernet_ios.id ← boxes.io_device_id
```

Pins: `io_output_pin` (box), `io_green_pin` (rack) — 1-based, sent via MQTT to Raspi.

## Data migration

- No breaking changes to baseline tables
- Import PHP dump first, then run additive migration
- Existing bcrypt passwords compatible with NestJS bcrypt
