# ER Diagram

Entity-relationship model for Visual Location Management.  
Baseline tables from PHP `visual_inventory_db` plus Phase 1 additive tables.

## Core warehouse hierarchy

```mermaid
erDiagram
    racks ||--o{ levels : contains
    levels ||--o{ boxes : contains
    boxes ||--o{ slots : contains
    slots ||--o| products : stores

    racks {
        int id PK
        varchar name
        varchar location_desc
        int io_device_id FK
        int io_red_pin
        int io_yellow_pin
        int io_green_pin
        int io_buzzer_pin
    }

    levels {
        int id PK
        int rack_id FK
        int level_no
    }

    boxes {
        int id PK
        int level_id FK
        varchar box_code
        varchar layout
        int io_device_id FK
        int io_output_pin
    }

    slots {
        int id PK
        int box_id FK
        int slot_no
    }

    products {
        int id PK
        int slot_id FK
        varchar name
        int qty
    }
```

## Inventory & audit

```mermaid
erDiagram
    products ||--o{ stock_logs : tracked_by
    users ||--o{ stock_logs : performs
    inventory_receive }o--|| materials : references_hanapart

    inventory_receive {
        int id PK
        varchar PUID UK
        varchar ReservationNo
        varchar HanaPart
        int Qty
        int QtyRemain
        varchar StatusName
        datetime ExpirationDate
        varchar Loc_Shelf
        varchar Loc_Level
        varchar Loc_Box
    }

    stock_logs {
        int id PK
        int product_id FK
        int user_id FK
        varchar action
        int quantity
        timestamp created_at
    }

    materials {
        int id PK
        varchar material_code UK
        varchar description
    }
```

## Users & authentication (Phase 1 additive)

```mermaid
erDiagram
    users ||--o{ refresh_tokens : has
    users ||--o{ stock_logs : performs
    users ||--o{ io_command_logs : triggers

    users {
        int id PK
        varchar username UK
        varchar password
        enum role
        enum lang
        varchar email
        timestamp created_at
    }

    refresh_tokens {
        bigint id PK
        int user_id FK
        char token_hash UK
        enum device_type
        datetime expires_at
        datetime revoked_at
    }
```

## IoT & real-time (Phase 1 additive)

```mermaid
erDiagram
    ethernet_ios ||--o{ boxes : drives
    ethernet_ios ||--o{ racks : drives
    ethernet_ios ||--o{ io_command_logs : audited_by
    users ||--o{ io_command_logs : triggers

    ethernet_ios {
        int id PK
        varchar name
        varchar ip_address
        int port
        varchar controller_type
    }

    tv_highlights {
        bigint id PK
        int box_id
        int slot_id
        varchar highlight_seq UK
        datetime expires_at
    }

    io_command_logs {
        bigint id PK
        int user_id FK
        int device_id FK
        enum action
        varchar mqtt_topic
        json payload_json
    }

    cpk_token_cache {
        int id PK
        varchar public_uid
        datetime expired_at
    }
```

## BOM & production (legacy — retained in DB, not in v1 UI scope)

```mermaid
erDiagram
    models ||--o{ model_revisions : has
    model_revisions ||--o{ bom_items : contains
    materials ||--o{ bom_items : used_in

    models {
        int id PK
        varchar model_code
    }

    model_revisions {
        int id PK
        int model_id FK
        varchar revision
    }

    bom_items {
        int id PK
        int revision_id FK
        int material_id FK
        decimal qty
    }
```

## Views (read-only)

| View | Joins |
|------|-------|
| `v_inventory_location` | products → slots → boxes → levels → racks + earliest expiration |
| `v_stock_history` | stock_logs → users → products |

## Relationship summary

| Parent | Child | Cardinality | On delete |
|--------|-------|-------------|-----------|
| racks | levels | 1:N | CASCADE (admin) |
| levels | boxes | 1:N | CASCADE |
| boxes | slots | 1:N | CASCADE |
| slots | products | 1:0..1 | CASCADE |
| users | stock_logs | 1:N | RESTRICT |
| users | refresh_tokens | 1:N | CASCADE |
| ethernet_ios | boxes/racks | 1:N | SET NULL |
