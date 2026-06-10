# Folder Structure

Production-ready monorepo layout for Visual Location Management.

```
visual_location/
├── README.md
├── package.json                         # npm workspaces root
├── .gitignore
│
├── apps/
│   ├── api/                             # NestJS backend
│   │   ├── package.json
│   │   ├── nest-cli.json
│   │   ├── tsconfig.json
│   │   ├── tsconfig.build.json
│   │   ├── .env.example
│   │   └── src/                         # Phase 2+ implementation
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       ├── config/
│   │       │   ├── app.config.ts
│   │       │   ├── database.config.ts
│   │       │   ├── jwt.config.ts
│   │       │   ├── cpk.config.ts
│   │       │   ├── mqtt.config.ts
│   │       │   └── cors.config.ts
│   │       ├── common/
│   │       │   ├── decorators/
│   │       │   │   ├── roles.decorator.ts
│   │       │   │   └── current-user.decorator.ts
│   │       │   ├── guards/
│   │       │   │   ├── jwt-auth.guard.ts
│   │       │   │   ├── roles.guard.ts
│   │       │   │   ├── tv-kiosk.guard.ts
│   │       │   │   └── ip-whitelist.guard.ts
│   │       │   ├── filters/
│   │       │   │   └── http-exception.filter.ts
│   │       │   ├── interceptors/
│   │       │   │   └── transform.interceptor.ts
│   │       │   └── pipes/
│   │       │       └── validation.pipe.ts
│   │       ├── modules/
│   │       │   ├── auth/
│   │       │   │   ├── auth.module.ts
│   │       │   │   ├── auth.controller.ts
│   │       │   │   ├── auth.service.ts
│   │       │   │   ├── strategies/
│   │       │   │   │   └── jwt.strategy.ts
│   │       │   │   └── dto/
│   │       │   ├── users/
│   │       │   ├── warehouse/
│   │       │   │   ├── entities/
│   │       │   │   │   ├── rack.entity.ts
│   │       │   │   │   ├── level.entity.ts
│   │       │   │   │   ├── box.entity.ts
│   │       │   │   │   ├── slot.entity.ts
│   │       │   │   │   └── product.entity.ts
│   │       │   │   ├── warehouse.controller.ts
│   │       │   │   ├── warehouse.service.ts
│   │       │   │   └── box-layout.service.ts
│   │       │   ├── inventory/
│   │       │   │   ├── entities/
│   │       │   │   │   ├── inventory-receive.entity.ts
│   │       │   │   │   └── stock-log.entity.ts
│   │       │   │   ├── inventory.controller.ts
│   │       │   │   ├── inventory.service.ts
│   │       │   │   ├── receive.service.ts
│   │       │   │   └── fifo.service.ts
│   │       │   ├── reservations/
│   │       │   ├── cpk/
│   │       │   │   ├── cpk.module.ts
│   │       │   │   ├── cpk.controller.ts
│   │       │   │   ├── cpk.service.ts
│   │       │   │   └── cpk-token.service.ts
│   │       │   ├── pdservice/
│   │       │   ├── reports/
│   │       │   ├── tv/
│   │       │   ├── io/
│   │       │   │   ├── io.module.ts
│   │       │   │   ├── io.controller.ts
│   │       │   │   ├── mqtt-publisher.service.ts
│   │       │   │   └── highlight.service.ts
│   │       │   ├── realtime/
│   │       │   │   ├── realtime.module.ts
│   │       │   │   └── highlight.gateway.ts
│   │       │   └── health/
│   │       └── database/
│   │           └── typeorm.config.ts
│   │
│   └── web/                             # React SPA
│       ├── package.json
│       ├── vite.config.ts
│       ├── tsconfig.json
│       ├── tsconfig.node.json
│       ├── index.html
│       ├── .env.example
│       └── src/                         # Phase 2+ implementation
│           ├── main.tsx
│           ├── App.tsx
│           ├── app/
│           │   ├── providers/
│           │   │   ├── AppProviders.tsx
│           │   │   ├── AuthProvider.tsx
│           │   │   ├── ThemeProvider.tsx
│           │   │   └── QueryProvider.tsx
│           │   ├── router/
│           │   │   ├── AppRouter.tsx
│           │   │   ├── ProtectedRoute.tsx
│           │   │   └── RoleRoute.tsx
│           │   └── layouts/
│           │       ├── MainLayout.tsx
│           │       ├── HandheldLayout.tsx
│           │       ├── TvLayout.tsx
│           │       └── AuthLayout.tsx
│           ├── features/
│           │   ├── auth/
│           │   ├── dashboard/
│           │   ├── search/
│           │   ├── receive-reservation/
│           │   ├── receive-return/
│           │   ├── picklist/
│           │   ├── rack-overview/
│           │   ├── expiry-check/
│           │   ├── stock-reports/
│           │   ├── user-management/
│           │   ├── system-admin/
│           │   ├── layout-3d/
│           │   ├── tv-display/
│           │   └── handheld/
│           ├── shared/
│           │   ├── api/
│           │   │   ├── http-client.ts
│           │   │   └── socket-client.ts
│           │   ├── components/
│           │   │   ├── ScanInput.tsx
│           │   │   ├── PageHeader.tsx
│           │   │   ├── DataTable.tsx
│           │   │   └── LanguageSwitcher.tsx
│           │   └── hooks/
│           │       ├── useAuth.ts
│           │       ├── useScanInput.ts
│           │       └── useSocket.ts
│           ├── theme/
│           │   ├── factory-theme.ts
│           │   ├── light.ts
│           │   └── dark.ts
│           └── i18n/
│               ├── index.ts
│               ├── locales/
│               │   ├── th/
│               │   └── en/
│               └── keys.ts
│
├── packages/
│   └── shared/                          # Cross-app contracts
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── types/
│           ├── rbac/
│           └── constants/
│
├── database/
│   ├── migrations/
│   │   ├── README.md
│   │   └── 001_additive_phase1.sql
│   └── seeds/
│
├── docker/
│   ├── docker-compose.yml
│   ├── mosquitto/
│   │   └── mosquitto.conf
│   └── data/                            # gitignored volume mounts
│
├── raspi/                               # MQTT subscriber (from PHP raspi/)
│
└── docs/
    ├── FOLDER_STRUCTURE.md              # this file
    ├── ER_DIAGRAM.md
    ├── DATABASE_SCHEMA.md
    ├── NESTJS_ARCHITECTURE.md
    ├── REACT_ARCHITECTURE.md
    ├── MIGRATION_PLAN.md
    ├── DATABASE_MAPPING.md
    ├── API_MAPPING.md
    └── FEATURE_MAPPING.md
```

## Conventions

| Rule | Standard |
|------|----------|
| API routes | `/api/v1/*` |
| React routes | `/app/*` (desktop), `/handheld/*`, `/tv`, `/layout-3d` |
| File naming | `kebab-case` folders, `PascalCase` React components, `camelCase` services |
| Shared contracts | `@visual-location/shared` only — no cross-import between apps |
| Env files | `.env.example` committed; `.env` gitignored |
