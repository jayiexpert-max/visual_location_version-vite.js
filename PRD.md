# Visual Location Product Requirements Document

## 1. Product Overview

Visual Location is a factory-internal warehouse management system for the Visual Inventory migration. It serves warehouse, material preparation, admin, handheld, TV kiosk, Raspberry Pi, and system integration workflows inside a factory LAN.

The product replaces the legacy PHP-based Visual Inventory application with a split frontend/backend architecture:

- Frontend: React SPA served separately from the API
- Backend: NestJS API with MySQL, MQTT, Redis, audit logging, and CPK/PDService integrations
- IoT: Raspberry Pi MQTT gateway for Ethernet IO and device presence

The system is designed to support stock visibility, reservation receiving, material inbound, picklist issue, rack navigation, realtime highlight, and operational reporting.

## 2. Problem Statement

The legacy warehouse workflow depends on multiple PHP pages, manual coordination, and several external or hardware-linked systems. This creates friction in day-to-day operations:

- Warehouse staff need fast lookup of stock, rack location, and reservation status
- Material preparation staff need a reliable way to receive, return, and issue inventory
- Admins need central control of users, warehouse structure, devices, and settings
- Operators need realtime TV and handheld workflows that match factory floor usage
- IoT and picklist integrations need stable messaging and auditability

Visual Location addresses this by consolidating the operational workflow into one system with shared types, realtime updates, and a clearer deployment model.

## 3. Product Goals

### Primary goals

- Replace the migrated core PHP warehouse flows with the NestJS + React implementation
- Support fast barcode-driven warehouse operations on desktop, handheld, and kiosk screens
- Keep frontend and backend deployable on separate servers in production
- Preserve existing business logic for CPK, PDService, rack layout, and issue/receive behavior
- Provide admin visibility into health, audit logs, device status, and warehouse configuration

### Secondary goals

- Reduce operator errors through clear state, validation, and pre-checks
- Keep the system usable on factory LAN with offline/self-hosted assets
- Support future extension for materials data, reporting, and additional operational screens

## 4. Target Users

### 4.1 Admin

Responsibilities:

- Manage users and roles
- Configure system settings, warehouse structure, slots, and product mappings
- Monitor health, MQTT, Raspberry Pi, and Ethernet IO
- Review audit logs and operational status

### 4.2 Material Preparation

Responsibilities:

- Receive reservations
- Receive returns and inbound materials
- Issue picklists
- Support scan-driven workflows and line-level validation

### 4.3 Warehouse Staff

Responsibilities:

- Search stock and rack locations
- Review reports
- Support booking out PUID and material calculations where applicable

### 4.4 Handheld Operators

Responsibilities:

- Use a touch-friendly mobile workflow
- Scan items quickly with minimal typing
- Complete receive/issue actions on BT-A500 or similar devices

### 4.5 TV / Kiosk Users

Responsibilities:

- View search highlight and rack focus results on large screens
- Monitor TV display and 3D layout during warehouse operations

## 5. Scope

## In Scope

- Authentication, session handling, lockout, and shift logout
- Role-based access control
- Dashboard and menu navigation
- Inventory search and highlight
- Reservation receive
- Return / add stock flow
- Picklist open, issue, close, and notifications
- Rack hierarchy and slot mapping
- Expiration checking
- Booking out PUID
- WO material calculation
- Materials CRUD and CSV import/export
- Receive list and stock movement reporting
- User management
- System settings and warehouse administration
- TV display and 3D layout kiosk pages
- MQTT and Raspberry Pi monitoring
- Health dashboards and operational checks
- Audit logging and report endpoints

## Out of Scope

- Full rewrite of the external Abdul AI app
- Legacy PHP-only features that were explicitly excluded from migration
- Self-service password reset
- Full CSRF-cookie auth model, since the SPA uses bearer JWTs
- Any public internet-facing use case

## 6. Core User Journeys

### 6.1 Login and session start

1. User opens the app
2. User logs in with username and password
3. System issues access and refresh tokens
4. User lands on dashboard with menu items filtered by role

### 6.2 Search and highlight

1. User scans or searches a product, HanaPart, or PUID
2. System returns matching stock and rack data
3. If relevant, TV, 3D layout, or Ethernet IO highlight is triggered

### 6.3 Receive reservation

1. User opens reservation receive screen
2. System loads reservation and item detail
3. User verifies stock and confirms receive
4. System persists inventory changes and writes audit trail

### 6.4 Receive return / add stock

1. User scans inbound material or returned reel
2. System fetches external PDService / CPK data as needed
3. User confirms location and stock update
4. System updates inventory and status in connected systems

### 6.5 Picklist issue

1. User opens picklist screen
2. System shows pending picklists and sound/TTS alerts
3. User selects a picklist line and issues stock
4. System validates state, updates CPK, and highlights target locations

### 6.6 Admin operations

1. Admin opens system settings
2. Admin manages users, racks, slots, products, and devices
3. Admin checks health dashboards and audit logs
4. Admin resolves issues or prepares for go-live

## 7. Functional Requirements

### 7.1 Authentication and access control

- Support login with JWT access and refresh tokens
- Enforce account lockout on repeated failures
- Support role-based menu and API restrictions
- Support shift logout
- Keep password hashing compatible with migrated PHP users

### 7.2 Inventory search and highlight

- Allow search by stock/product identifiers
- Support TV and handheld highlight feedback
- Support rack focus and slot visualization
- Support realtime and fallback polling behavior where needed

### 7.3 Reservation receive

- Show reservation details and item line status
- Support receive confirmation and validation
- Write inventory receive history
- Preserve business rules around reservation-based receive flow

### 7.4 Material inbound / receive return

- Support inbound receipt from external PDService / CPK workflows
- Update PUID status during receive return
- Support fallback behavior when transport or upstream systems fail

### 7.5 Picklist management

- Display open picklists and pending issue counts
- Notify users with audio and speech synthesis
- Support issue, close, and status tracking
- Normalize multiple possible CPK payload shapes
- Surface pending or partial states clearly
- Support two issue modes:
  - FIFO (First In, First Out): issue stock based on inbound order, IM Batch first
  - FEFO (First Expired, First Out): issue stock based on earliest expiration date first
- Show alerts that match the active issue mode so operators understand whether the system is prioritizing batch order or expiration date

### 7.6 Warehouse structure

- Support rack, level, box, and slot hierarchy
- Support product-to-slot mapping
- Provide a visual rack overview page

### 7.7 Reporting

- Provide stock movement and stock report views
- Support expiration checking
- Support exports where applicable

### 7.8 Admin and system settings

- Manage users and role assignment
- Manage warehouse settings, FIFO / FEFO policy, and device mappings
- Monitor system health, MQTT, socket, IO, and connected services
- Review audit logs for key events

### 7.9 IoT and realtime

- Publish and receive MQTT events
- Support Raspberry Pi gateway integration
- Support Ethernet IO status and highlight commands
- Keep Socket.IO events consistent with frontend shared constants

### 7.10 Kiosk and handheld UX

- Provide dedicated handheld routes and layout
- Provide TV display route and 3D layout route
- Keep UI touch-friendly and scanner-friendly
- Preserve offline self-hosted visual assets

## 8. Non-Functional Requirements

### 8.1 Deployment

- Frontend and backend must be deployable to different server IPs
- Frontend must call the backend via `VITE_API_BASE_URL`
- Production frontend must not proxy API through nginx

### 8.2 Performance

- Search and dashboard flows should feel responsive on factory LAN
- Realtime updates should remain usable even with fallback polling where required
- TV and handheld views should be usable on low-latency local networks

### 8.3 Reliability

- The system should survive temporary MQTT or Redis unavailability with safe fallback behavior where designed
- Health endpoints must expose core service status
- Critical workflows should record audit logs

### 8.4 Security

- Keep JWT secret values strong and environment-based
- Restrict CORS to factory origins
- Keep the app internal to the factory network
- Do not commit `.env` files

### 8.5 Maintainability

- Shared constants and types must stay synchronized across backend and frontend
- Use SQL migrations instead of TypeORM synchronize
- Preserve compatibility with existing CPK and PHP business rules where migration requires it

## 9. Success Metrics

- Core migrated menus and workflows are usable without fallback to PHP
- Admin can complete setup, monitor health, and manage users from the new app
- Handheld workflows can complete without layout or scanning friction
- Picklist alerts reliably show pending work and clearly indicate whether issue order follows FIFO (IM Batch) or FEFO (Expired date)
- Realtime highlight and kiosk flows work in production factory conditions
- Go-live checklist passes with all required services healthy

## 10. Key Dependencies

- MySQL / MariaDB database `visual_inventory_db`
- Mosquitto MQTT broker
- Redis for device presence
- CPK / PDService integration endpoints
- Raspberry Pi MQTT gateway
- Barcode scanners and kiosk hardware

## 11. Risks and Constraints

- Some legacy PHP functionality was intentionally excluded from scope
- External CPK / PDService outages can affect receive and issue workflows
- Factory network availability is a hard dependency
- Shared frontend/backend constants must stay in sync
- Production split-server deployment requires correct `VITE_API_BASE_URL` and CORS configuration
- Audit and recovery expectations should be reviewed before cutover

## 12. Open Gaps

The project still has a few known gaps or partial items that should be tracked separately:

- Expiration and admin areas may still need completeness checks
- Some CPK actions may not yet be fully covered in audit logs
- Host disk usage is not fully reported in health API
- Self-service password reset is not implemented

See [docs/OPEN_ISSUES.md](docs/OPEN_ISSUES.md) for the live list.

## 13. Delivery Notes

- Database changes must be delivered via SQL migrations
- Frontend and backend should be built and verified separately
- Backend and frontend builds should be checked after substantive changes
- Production documentation should remain aligned with the actual route map and feature parity

## 14. Related Documents

- [docs/INSTALL.md](docs/INSTALL.md)
- [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)
- [docs/GO_LIVE_CHECKLIST.md](docs/GO_LIVE_CHECKLIST.md)
- [docs/API_DOCUMENTATION.md](docs/API_DOCUMENTATION.md)
- [docs/FEATURE_MAPPING.md](docs/FEATURE_MAPPING.md)
- [docs/PROJECT_PHASES.md](docs/PROJECT_PHASES.md)
- [docs/OPEN_ISSUES.md](docs/OPEN_ISSUES.md)
