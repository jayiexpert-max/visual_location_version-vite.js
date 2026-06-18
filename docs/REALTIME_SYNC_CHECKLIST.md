# Real-time Sync Checklist

**Last updated:** 2026-06-10  
**Transport:** Socket.IO namespace `/realtime` (JWT auth for desktop/handheld)

When any device saves data, the backend broadcasts an event; open pages refetch from API (device-agnostic).

---

## Summary

| Status | Count |
|--------|:-----:|
| ✅ Done | 4 pages |
| ⏳ Pending | 6 pages |

**Legend:** ✅ wired · ⏳ not yet · N/A kiosk-only or on-demand

---

## Socket events

| Event | Payload | Emitted when |
|-------|---------|--------------|
| `highlight:update` | TV highlight | Search / highlight API |
| `highlight:clear` | — | Clear highlight |
| `inventory:update` | `{ boxId, slotId, action }` | Receive return, RES receive (add stock) |
| `reservation:update` | `{ resNo, puid, action: 'received' }` | `POST /inventory/receive` with `reservationNo` |
| `picklist:update` | `{ picklistId, puid?, action: 'issue' \| 'close' }` | Picklist issue / close |
| `picklist:count` | `{ count }` | Defined — not wired to backend yet |
| `io:status` | IO payload | MQTT IO |
| `device:online` / `device:offline` | device presence | Raspberry Pi |

---

## Pages — Receive Reservation

| Page | Route | Event | Status | Notes |
|------|-------|-------|:------:|-------|
| Receive Reservation (PC) | `/app/receive-reservation` | `reservation:update` | ✅ | Detail + list invalidate |
| Handheld Receive RES | `/handheld/receive-reservation` | `reservation:update` | ✅ | Detail refresh when same RES open |

---

## Pages — Picklist

| Page | Route | Event | Status | Notes |
|------|-------|-------|:------:|-------|
| Picklist (PC) | `/app/picklist` | `picklist:update` | ✅ | Open list + detail silent reload |
| Handheld Picklist | `/handheld/picklist` | `picklist:update` | ✅ | List + detail silent reload |
| Dashboard picklist badge | `/app` | `picklist:count` | ⏳ | Still polls 60s (`usePicklistNotify`) |

---

## Pages — Pending (next phases)

| Page | Route | Suggested event | Priority | Notes |
|------|-------|-----------------|----------|-------|
| Rack Overview | `/app/rack` | `inventory:update` | P1 | ✅ already listens; add emit on picklist issue withdraw |
| Receive Return | `/app/receive-return` | `inventory:update` | P2 | Rack updates; form N/A |
| Handheld Add Stock | `/handheld/add-stock` | `inventory:update` | P2 | Same as receive return |
| Receive List | `/app/receive-list` | `reservation:update` or `inventory:update` | P2 | Refetch list on receive |
| Reports (Stock) | `/app/reports` | `stock:update` (new) | P3 | Refetch when filter matches |
| Search | `/app/search` | N/A | — | Highlight already real-time to TV/3D |

---

## Display / kiosk (highlight only)

| Page | Route | Events | Status |
|------|-------|--------|:------:|
| TV Display | `/tv` | `highlight:update`, `highlight:clear` | ✅ |
| 3D Layout | `/layout-3d` | `highlight:update`, `highlight:clear` | ✅ |
| Io Monitor | `/app/admin/iot` | `io:status`, device presence | ✅ |

---

## Verification (manual)

1. Open **Receive RES** on PC and **Handheld** on same RES.
2. Receive a PUID on handheld → PC line status updates within ~1s (no F5).
3. Open **Picklist** on PC and handheld on same picklist ID.
4. Issue PUID on either device → other device line shows issued.
5. Close picklist on one device → open list refreshes on the other.

---

## Related

- [PROJECT_PHASES.md](PROJECT_PHASES.md)
- [NESTJS_ARCHITECTURE.md](NESTJS_ARCHITECTURE.md) — Socket.IO section
- Hooks: `frontend/src/hooks/useReservationRealtimeSync.ts`, `usePicklistRealtimeSync.ts`
