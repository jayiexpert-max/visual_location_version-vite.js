# React Architecture

Frontend design for `@visual-location/web`. Phase 1 defines structure; Phase 2 implements features.

## Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    React SPA (Vite :5173)                     │
├────────────┬─────────────┬──────────────┬────────────────────┤
│  Desktop   │  Handheld   │  TV Display  │  3D Layout         │
│  /app/*    │  /handheld/*│  /tv         │  /layout-3d        │
└────────────┴─────────────┴──────────────┴────────────────────┘
         │                    │
         ▼                    ▼
   Axios + React Query    Socket.IO client
         │                    │
         └────────┬───────────┘
                  ▼
           NestJS /api/v1
```

## Technology choices

| Concern | Library | Rationale |
|---------|---------|-----------|
| UI | MUI 6 | MES/WMS industrial, DataGrid, touch targets |
| Routing | React Router 7 | Nested layouts per device type |
| Server state | TanStack Query | Cache, refetch, optimistic updates |
| i18n | i18next | TH/EN — all screens, reports, menus |
| Auth state | React Context | JWT in memory, refresh in httpOnly cookie or secure storage |
| Real-time | socket.io-client | TV highlight, picklist badge |
| 3D | Babylon.js | Migrate from PHP — lazy loaded chunk |

**No Bootstrap.** Dark mode via MUI theme toggle.

---

## Route map

### Public

| Path | Layout | Screen |
|------|--------|--------|
| `/login` | AuthLayout | Login |

### Desktop (`MainLayout`)

| Path | Menu # | Role |
|------|--------|------|
| `/app` | 1 Dashboard | all |
| `/app/search` | 2 Search Material | all |
| `/app/receive-reservation` | 3 Receive from Reservation | admin, material_prep |
| `/app/receive-return` | 4 Receive Return | admin, material_prep |
| `/app/picklist` | 5 Material Picking | admin, material_prep |
| `/app/rack` | 6 Rack Overview | all |
| `/app/expiry` | 7 Expiry Check | all |
| `/app/reports/stock` | 10 Stock Reports | all |
| `/app/users` | 11 User Management | admin |
| `/app/admin` | 12 System Administration | admin |

### Special layouts

| Path | Layout | Menu # | Role |
|------|--------|--------|------|
| `/layout-3d` | none (fullscreen) | 8 | admin |
| `/tv` | TvLayout | 9 | kiosk / admin link |
| `/handheld` | HandheldLayout | 13 | all (role-gated actions) |
| `/handheld/receive-reservation` | HandheldLayout | 3 | admin, material_prep |
| `/handheld/receive-return` | HandheldLayout | 4 | admin, material_prep |
| `/handheld/add-stock` | HandheldLayout | 4 alt | admin, material_prep |

---

## Directory responsibilities

### `app/providers/`

| Provider | Responsibility |
|----------|----------------|
| `ThemeProvider` | MUI theme light/dark, industrial tokens |
| `QueryProvider` | TanStack Query client |
| `AuthProvider` | User, role, lang, login/logout, token refresh |
| `AppProviders` | Composes all + i18n + router |

### `app/router/`

| Component | Responsibility |
|-----------|----------------|
| `AppRouter` | Route definitions |
| `ProtectedRoute` | Redirect to `/login` if unauthenticated |
| `RoleRoute` | 403 or redirect if role lacks menu access |

Uses `ROLE_MENU_ACCESS` from `@visual-location/shared`.

### `app/layouts/`

#### MainLayout (desktop / tablet)

```
┌─────────────────────────────────────────────┐
│ AppBar: logo, lang switch, user, dark mode  │
├──────────┬──────────────────────────────────┤
│ Drawer   │  Page content (max-width 1400)   │
│ (menu)   │                                  │
│ 12 items │                                  │
└──────────┴──────────────────────────────────┘
```

- Drawer: permanent on desktop, temporary on tablet
- Menu items filtered by role
- Touch: min 48px list item height

#### HandheldLayout

```
┌─────────────────────┐
│ Bar: title, back    │
├─────────────────────┤
│ Full-width content  │
│ Large scan inputs   │
│ Large action buttons│
└─────────────────────┘
```

- No sidebar
- `ScanInput` auto-focus, Enter submits
- Idle timeout 30 min → logout (port `handheld-idle.js` behavior)
- i18n TH/EN (PHP handheld was EN-only)

#### TvLayout

- Full viewport, dark theme fixed
- No auth UI — kiosk key in query `?tv_key=`
- Poll replaced by Socket.IO `highlight:update`
- Web Speech API TTS (migrate from `tv_display.php`)

### `features/`

Each feature folder:

```
features/search/
├── pages/
│   └── SearchPage.tsx
├── components/
│   └── SearchResultPanel.tsx
├── hooks/
│   └── useSearch.ts
└── api/
    └── search.api.ts
```

| Feature | PHP source | Key components |
|---------|------------|----------------|
| dashboard | index.php | StatCards, PicklistBadge, ModuleGrid |
| search | search_product.php | ScanInput, LocationCard, HighlightButton |
| receive-reservation | show_api_data.php | ResList, PuidScanner, RackMap |
| receive-return | new + add_stock | PuidScanner, QtyForm, CpkWarnings |
| picklist | picklist_issue.php | PicklistTable, DetailTable, ScanIssue |
| rack-overview | dashboard_rack.php | RackGrid, BoxCell, TableView |
| expiry-check | check_expiration.php | FilterBar, ExpiryGrid, CsvExport |
| stock-reports | report_stock.php | MovementTable, Filters |
| user-management | manage_users.php | UserForm, UserTable |
| system-admin | admin.php | WarehouseCrud, IoDeviceCrud |
| layout-3d | layout_3d.php | BabylonScene (lazy), HighlightSync |
| tv-display | tv_display.php | RackGrid, TtsControl, HighlightOverlay |
| handheld | handheld/* | MenuGrid, ReceiveRes, ReceiveReturn |

### `shared/`

| Module | Purpose |
|--------|---------|
| `api/http-client.ts` | Axios instance, JWT interceptor, 401 refresh |
| `api/socket-client.ts` | Socket.IO singleton |
| `components/ScanInput.tsx` | Barcode-friendly input (auto-focus, VL prefix strip) |
| `components/DataTable.tsx` | MUI DataGrid wrapper — large row height |
| `components/LanguageSwitcher.tsx` | TH/EN toggle → PATCH `/auth/me` |
| `hooks/useScanInput.ts` | Enter key, debounce, normalize PUID |
| `hooks/useAuth.ts` | Auth context consumer |
| `hooks/useSocket.ts` | Subscribe to highlight/picklist events |

### `theme/factory-theme.ts`

Industrial MES/WMS tokens ported from PHP `factory.css`:

| Token | Value | Use |
|-------|-------|-----|
| touchTarget | 48px min | Buttons, list items |
| dataGridRowHeight | 56px | Tables |
| scanInputHeight | 56px | Barcode fields |
| fontFamily | Roboto / Noto Sans Thai | TH support |
| primary | `#4f46e5` | Actions |
| success | `#10b981` | Receive |
| warning | `#f59e0b` | Expiry |
| danger | `#ef4444` | Errors |

Dark mode: `palette.mode: 'dark'` with adjusted surface colors matching TV display (`#0f172a` bg).

### `i18n/`

```
locales/
├── th/
│   ├── common.json
│   ├── menu.json
│   ├── auth.json
│   ├── inventory.json
│   ├── picklist.json
│   ├── reports.json
│   └── admin.json
└── en/
    └── (mirror structure)
```

- Default: `th`
- Persist: `users.lang` via API on switch
- Reports/CSV headers: translated
- PHP source keys: `languages/th.php`, `languages/en.php`

---

## State management strategy

| State type | Solution |
|------------|----------|
| Server data | TanStack Query |
| Auth user/role/lang | AuthContext |
| UI theme mode | localStorage + MUI |
| Scan buffer | Component local state |
| TV highlight | Socket.IO → component state |
| Form wizards | React Hook Form (Phase 2) |

No Redux — Query + Context sufficient.

---

## API integration pattern

```typescript
// features/search/api/search.api.ts
export async function searchMaterial(q: string) {
  const { data } = await httpClient.get('/inventory/search', { params: { q } });
  return data;
}

// features/search/hooks/useSearch.ts
export function useSearch(q: string) {
  return useQuery({
    queryKey: ['inventory', 'search', q],
    queryFn: () => searchMaterial(q),
    enabled: q.length >= 3,
  });
}
```

CPK warnings displayed via shared `CpkWarningsAlert` component.

---

## 3D Layout migration strategy

1. Copy Babylon assets from PHP `public/plugins/babylonjs/`
2. Lazy route: `const Layout3D = lazy(() => import('./pages/Layout3DPage'))`
3. Data: `GET /warehouse/racks` hierarchy JSON (same shape as PHP `$racks_data`)
4. Highlight: Socket.IO `highlight:update` instead of polling `api_tv_highlight`
5. Do not redesign scene — port camera/box click logic from `layout_3d.php`

---

## TV Display migration strategy

1. Standalone route `/tv?lang=th&tv_key=...&sound=1`
2. Socket.IO for highlight (no file polling)
3. TTS: Web Speech API with sound unlock button
4. `get_box_layout` → `GET /warehouse/boxes/:id/layout`
5. IP whitelist enforced server-side

---

## Handheld scope (only additional feature)

| Screen | PHP | Included |
|--------|-----|----------|
| Menu | handheld/index.php | ✅ |
| Receive Reservation | handheld/receive_reservation.php | ✅ |
| Receive Return / Add Stock | handheld/add_stock.php | ✅ |
| Withdraw Stock | handheld/withdraw_stock.php | ❌ legacy — excluded |

---

## Build & deployment

| Target | Command | Output |
|--------|---------|--------|
| Dev | `npm run web:dev` | Vite dev server :5173 |
| Prod | `npm run web:build` | `apps/web/dist/` |
| Serve | nginx / Apache static | Proxy `/api` to NestJS |

Factory LAN: no CDN — bundle all assets including fonts and Babylon.js locally.

---

## Phase 2 implementation order

1. `theme/` + `i18n/` + `AppProviders`
2. `AuthLayout` + login + `AuthProvider`
3. `MainLayout` + router + role guards
4. Dashboard + Search
5. Receive flows (reservation + return)
6. Picklist + Rack + Expiry + Reports
7. Admin + Users
8. TV + 3D (migrate)
9. Handheld layout + screens
