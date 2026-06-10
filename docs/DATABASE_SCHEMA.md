# Database Schema

**Database name:** `visual_inventory_db`  
**Engine:** InnoDB  
**Charset:** utf8mb4 / utf8mb4_unicode_ci  
**Timezone:** Asia/Bangkok (+07:00)

## Setup procedure

```bash
# 1. Baseline from PHP dump
mysql -u root -p visual_inventory_db < \
  /Applications/XAMPP/xamppfiles/htdocs/visual_inventory/visual_inventory_db.sql

# 2. Phase 1 additive
mysql -u root -p visual_inventory_db < database/migrations/001_additive_phase1.sql
```

---

## Baseline tables (from PHP)

### Warehouse hierarchy

#### `racks`
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK AUTO_INCREMENT | |
| name | VARCHAR(50) | Rack identifier e.g. "1", "3" |
| location_desc | VARCHAR(255) NULL | |
| io_device_id | INT NULL FK → ethernet_ios | |
| io_red_pin | INT NULL | Indicator pin |
| io_yellow_pin | INT NULL | |
| io_green_pin | INT NULL | |
| io_buzzer_pin | INT NULL | |

#### `levels`
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| rack_id | INT FK → racks | |
| level_no | INT | 1 = bottom |

#### `boxes`
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| level_id | INT FK → levels | |
| box_code | VARCHAR(50) | |
| position_in_level | INT NULL | |
| layout | VARCHAR(10) DEFAULT '1x1' | Grid e.g. `2x5`, `3x3` |
| io_device_id | INT NULL FK | Box-level indicator |
| io_output_pin | INT NULL | |

#### `slots`
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| box_id | INT FK → boxes | |
| slot_no | INT | Position within box grid |

#### `products`
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| slot_id | INT FK → slots | One product per slot |
| name | VARCHAR(255) | HanaPart / material_code |
| qty | INT DEFAULT 0 | Aggregated count in slot |

### Inventory

#### `inventory_receive`
PUID-level stock records from PDService / receive operations.

| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| ReceiveDate | DATETIME | |
| PUID | VARCHAR(50) | Business unique key |
| ReservationNo | VARCHAR(50) NULL | CPK reservation |
| IM | VARCHAR(50) | Incoming material doc |
| HanaPart | VARCHAR(50) | Part number |
| Description | VARCHAR(255) | |
| Qty | INT | Original qty |
| QtyRemain | INT | Current remain |
| StatusName | VARCHAR(50) | Restricted, Withdrawn, Is empty, etc. |
| ExpirationDate | DATETIME NULL | |
| Loc_Shelf | VARCHAR(50) NULL | Rack name |
| Loc_Level | VARCHAR(50) NULL | |
| Loc_Box | VARCHAR(50) NULL | |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

**FIFO query filter:** `QtyRemain > 0 AND StatusName NOT IN ('Withdrawn', 'Empty')`  
**Order:** `ExpirationDate ASC NULLS LAST, id ASC`

#### `stock_logs`
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| product_id | INT FK → products | |
| user_id | INT FK → users | |
| action | VARCHAR(255) | Pipe format: `type\|qty\|puid` |
| quantity | INT | |
| created_at | TIMESTAMP | |
| remark | TEXT NULL | |

**Action types:** `add`, `withdraw_wo_scan`, `withdraw_bom_scan`, `order_withdraw`

#### `reservation_list`
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| res_no | VARCHAR(50) | |
| req_date | DATETIME | |
| status | VARCHAR(50) DEFAULT 'Pending' | |

### Master data

#### `materials`
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| material_code | VARCHAR(50) UNIQUE | Maps to HanaPart |
| description | VARCHAR(255) | |

#### `users`
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| username | VARCHAR(100) UNIQUE | Employee ID login |
| password | VARCHAR(255) | bcrypt hash |
| role | ENUM('admin','user','material_prep') | |
| email | VARCHAR(255) NULL | |
| created_at | TIMESTAMP | |

### IoT devices

#### `ethernet_ios`
| Column | Type | Notes |
|--------|------|-------|
| id | INT PK | |
| name | VARCHAR(100) | |
| ip_address | VARCHAR(50) | Raspi WiFi IP (not Ethernet IO IP) |
| port | INT DEFAULT 8080 | MQTT gateway HTTP port (legacy) |
| controller_type | VARCHAR(50) | `modbus`, `http`, `raspi` |

### Views

#### `v_inventory_location`
Products with full location path and `earliest_expiration` subquery.

#### `v_stock_history`
Stock logs with parsed `action_type` = `SUBSTRING_INDEX(action, '|', 1)`.

---

## Phase 1 additive tables

### `users.lang` (column)
```sql
lang ENUM('th','en') NOT NULL DEFAULT 'th'
```

### `refresh_tokens`
JWT refresh token persistence. See `001_additive_phase1.sql`.

| Column | Type | Notes |
|--------|------|-------|
| token_hash | CHAR(64) | SHA-256 of raw token |
| device_type | ENUM | desktop (4h), handheld (30m), tv |
| expires_at | DATETIME | |
| revoked_at | DATETIME NULL | Set on logout |

### `tv_highlights`
Replaces PHP `data/tv_highlight.json`. Application keeps one active row (delete previous on set).

### `io_command_logs`
MQTT publish audit. Backend never calls Ethernet IO directly.

### `cpk_token_cache`
Singleton row (`id=1`) for CPK `PublicUID` + `ExpiredDate`. Replaces PHP `$_SESSION['cpk_public_uid']`.

---

## Indexes (recommended Phase 2)

```sql
-- Performance for search/FIFO (add if not present in baseline)
CREATE INDEX idx_inv_recv_hanapart ON inventory_receive (HanaPart, QtyRemain);
CREATE INDEX idx_inv_recv_puid ON inventory_receive (PUID);
CREATE INDEX idx_products_name ON products (name);
CREATE INDEX idx_stock_logs_created ON stock_logs (created_at DESC);
```

---

## Data integrity rules (application layer)

| Rule | Enforcement |
|------|-------------|
| One product per slot | UNIQUE(slot_id) on products — verify baseline |
| Receive with reservation | CPK RES_PUIDRecv **before** local DB commit |
| Return material | CPK UpdatePUIDStatus **before** local DB commit |
| Picklist issue | CPK IssuePUIDToPicklist **before** local stock decrement |
| IO commands | MQTT publish only — log to io_command_logs |
| Shift logout | JWT invalid if login_time < last 07:00/19:00 cutoff |
