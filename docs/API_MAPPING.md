# API Mapping — PHP → NestJS

Base: `/api/v1`  
Auth: `Authorization: Bearer <jwt>` unless noted.

## Auth

| PHP | NestJS | Notes |
|-----|--------|-------|
| `login.php` POST | `POST /auth/login` | Returns access + refresh JWT |
| session destroy | `POST /auth/logout` | Revoke refresh token |
| `?lang=en` session | `PATCH /auth/me` `{ lang }` | Persist to `users.lang` |
| shift timeout 07:00/19:00 | JWT middleware | Reject stale tokens |

## Warehouse

| PHP | NestJS |
|-----|--------|
| `get_rack_details.php` | `GET /warehouse/racks/:id` |
| `get_box_layout.php` | `GET /warehouse/boxes/:id/layout` |
| `get_box_products.php` | `GET /warehouse/boxes/:id/products` |
| `admin.php` CRUD | `CRUD /warehouse/admin/*` |
| `admin.php` ethernet_ios | `CRUD /io/devices` |

## Inventory

| PHP | NestJS |
|-----|--------|
| `get_inventory_from_api.php` | `GET /inventory/puid/:puid` |
| `receive_item.php` | `POST /inventory/receive` |
| `search_product.php` (server) | `GET /inventory/search?q=` |
| `highlight_location.php` | `POST /inventory/highlight` |
| `update_expiration.php` | `PATCH /inventory/:puid/expiration` |
| *(new)* receive return | `POST /inventory/receive-return` |

## Reservations

| PHP | NestJS |
|-----|--------|
| `get_reservation_list.php` | `GET /reservations` |
| `get_res_info.php` | `GET /reservations/:resNo` |

## CPK Service v1.0.0.14

| PHP proxy | NestJS | CPK endpoint | Body auth |
|-----------|--------|--------------|-----------|
| `cpk/get_version.php` | `GET /cpk/version` | GetVersion | — |
| `cpk/get_res_no_info.php` | `GET /cpk/reservations/:keyword` | GET_RESNoInfo | — |
| `cpk/get_public_uid.php` | `POST /cpk/public-uid` | GetPublicUID | McID + StationKey |
| `cpk/res_puid_recv.php` | `POST /cpk/reservations/receive` | RES_PUIDRecv | PublicUID |
| `cpk/update_puid_status.php` | `POST /cpk/puid/return` | UpdatePUIDStatus | PublicUID |
| `cpk/get_open_picklists.php` | `POST /cpk/picklists/open` | GetOpenPicklists | PublicUID |
| `cpk/get_picklist_detail.php` | `POST /cpk/picklists/detail` | GetPicklistDetail | PublicUID |
| `cpk/issue_puid_to_picklist.php` | `POST /cpk/picklists/issue` | IssuePUIDToPicklist | PublicUID |
| *(new)* | `POST /cpk/picklists/close` | ClosePicklist | PublicUID |
| `cpk/station_inven_check.php` | `POST /cpk/station/inventory` | StationInvenCheck | PublicUID |
| `cpk/clear_cache.php` | `POST /cpk/cache/clear` | ClearCache | PublicUID (admin) |

**Removed from scope:**

| PHP | Reason |
|-----|--------|
| `cpk/get_wo_bom_info.php` | withdraw_by_workorder legacy |

## Reports

| PHP | NestJS |
|-----|--------|
| `report_stock.php` | `GET /reports/stock-movements` |
| `check_expiration.php` | `GET /reports/expiration` |
| `?export=excel` | `GET /reports/expiration/export` |
| `view_inventory_receive.php` | `GET /reports/inventory-receive` |

## TV / Real-time

| PHP | NestJS |
|-----|--------|
| `api_tv_highlight?action=set` | `POST /tv/highlight` + Socket.IO emit |
| `api_tv_highlight?action=get` | `GET /tv/highlight` (TV_KIOSK_KEY) |
| `api_tv_highlight?action=clear` | `DELETE /tv/highlight` |

## IO / MQTT

| PHP | NestJS |
|-----|--------|
| `io_device_service` HTTP → Raspi | `POST /io/highlight` → MQTT publish |
| `reset_all_io.php` | `POST /io/reset` → MQTT |
| `trigger_box_io.php` | `POST /io/box/:id/highlight` → MQTT |

### MQTT topics

```
visual/io/{deviceId}/highlight
visual/io/{deviceId}/off
visual/io/reset
```

Payload: same JSON as `docs/RASPI_IO_API.md` in PHP project.

## Socket.IO events

| Event | Direction |
|-------|-----------|
| `highlight:update` | server → client |
| `highlight:clear` | server → client |
| `picklist:count` | server → client |

## External services (unchanged URLs)

| Service | Env |
|---------|-----|
| PDService | `PDSERVICE_BASE_URL` |
| CPK | `CPK_SERVICE_BASE_URL`, `CPK_MC_ID`, `CPK_STATION_KEY` |
