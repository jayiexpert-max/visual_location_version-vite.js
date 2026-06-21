# Production Readiness Report

**Project:** Visual Location  
**Date:** 2026-06-21  
**Scope:** Current repo only (`backend/`, `frontend/`, `docs/`, `PRD.md`)  
**Excluded from this review:** `visual_inventory/` legacy PHP tree

## Executive Summary

The codebase is **functionally close to production-ready**, but it is **not yet safe to declare as fully ready for go-live without environment and hardware validation**.

What passed:

- Backend build passed
- Frontend build passed
- Backend test suite passed
- Core auth, health, MQTT, socket, picklist, and reporting code paths are present and compile cleanly

What still blocks a full production sign-off:

- Production environment values still need to be verified in the target deployment
- Hardware and factory-network integrations still need live validation
- A small set of known issues remains open

## Executive Status Table

| Status | Area | Summary |
|--------|------|---------|
| ✓ PASS | Source code build | Backend and frontend compile successfully |
| ✓ PASS | Automated tests | Backend test suite passed `8/8` suites, `25/25` tests |
| ✓ PASS | Authentication | JWT login, refresh, lockout, and shift logout are implemented |
| ✓ PASS | Core warehouse workflows | Search, receive, picklist, reports, admin, TV, and handheld flows exist in code |
| △ NEEDS TEST | Production deployment config | Env values, migrations, CORS, HTTPS, and backups must be verified in target environment |
| △ NEEDS TEST | Database and integrations | MySQL, MQTT, Redis, CPK, and PDService must be validated live |
| △ NEEDS TEST | Hardware / factory devices | Raspberry Pi, Ethernet IO, scanners, and TV display need on-site validation |
| △ NEEDS TEST | Security readiness | Production secrets, CORS restrictions, kiosk key, and sign-off need confirmation |
| ✗ FAIL | Known issues | Open issues still exist for receive traceability, disk metrics, audit coverage, and password reset |
| ✗ FAIL | Go-live decision | Not ready for immediate production cutover |

## Evidence Collected

### Build and test

- Backend build: passed
- Frontend build: passed
- Backend tests: passed, `8/8` suites and `25/25` tests

### Deployment config

- `docker-compose.production.yml` exists and defines `mysql`, `redis`, `mosquitto`, `api`, and `web`
- Frontend production build uses baked `VITE_API_BASE_URL` and `VITE_SOCKET_URL`
- Backend production env requires secrets and integration endpoints

### Current checklist and risk docs

- `docs/GO_LIVE_CHECKLIST.md`
- `docs/OPEN_ISSUES.md`
- `docs/RISK_ASSESSMENT.md`

## Detailed Readiness Status

### 1. Source code health

**Status: PASS**

- Backend compiles successfully
- Frontend compiles successfully
- Shared types and constants build successfully
- Recent changes to FIFO / FEFO wording did not break build or tests

### 2. Authentication and session handling

**Status: PASS, with environment verification required**

- JWT access/refresh flow exists
- Lockout logic exists
- Shift logout logic exists
- Bearer-only auth model is in place

Needs production verification:

- Secret values must be set to strong, unique values
- Login, refresh, logout, and lockout should be exercised in target environment

### 3. Health and observability

**Status: PARTIAL**

Implemented:

- Database health
- MQTT health
- Raspberry Pi health
- IO health
- Socket.IO health
- System metrics
- CPK and PDService checks
- Combined dashboard snapshot

Known gap:

- Host disk usage is not reported in the health API, which is listed as a known issue

### 4. Core warehouse workflows

**Status: PASS in code, NEEDS live validation**

Implemented flows:

- Search + highlight
- Receive reservation
- Receive return / add stock
- Picklist issue
- Rack overview
- Expiration check
- Reports
- Materials
- User management
- System settings
- TV display and 3D layout
- Handheld routes

Live validation still required:

- Barcode scanner behavior on factory devices
- TV/kiosk display behavior
- Realtime highlight latency
- CPK / PDService end-to-end behavior

### 5. Picklist and issue policy

**Status: PASS in code, NEEDS functional verification**

Implemented:

- Issue policy supports `FIFO (IM Batch)` and `FEFO (Expired date)`
- Messages and translations now match the new naming
- Abdul chat near-expiry flow uses a 7-day window

Verify in production:

- Admin settings save/load correctly
- Issue validation still blocks the right stock
- User-facing alerts match the selected mode

### 6. Infrastructure / deployment

**Status: PARTIAL**

Present in repo:

- Docker production compose
- Environment templates
- Separate frontend/backend deployment model
- Database migrations

Still required before go-live:

- Apply migrations in the target database
- Set production environment variables
- Confirm backend and frontend can reach each other
- Confirm Mosquitto and Redis are live
- Confirm HTTPS or reverse proxy is configured
- Confirm daily backup cron is scheduled

### 7. Hardware / factory integration

**Status: NEEDS LIVE VALIDATION**

Must be verified on site:

- Raspberry Pi registration and heartbeat
- Ethernet IO outputs per slot
- BT-A500 scanner behavior
- TV `/tv` display
- 3D layout `/layout-3d`

### 8. Security

**Status: PARTIAL**

Implemented:

- JWT auth
- CORS support
- Rate limiting / lockout
- Audit logging framework

Still required:

- Confirm CORS is limited to factory origins
- Confirm production secrets are rotated and not default
- Confirm no auth cookies are used
- Confirm TV kiosk key is set if needed
- Confirm CPK McID and StationKey are configured

### 9. Documentation and operational readiness

**Status: PARTIAL**

Documentation exists for:

- Installation
- Deployment
- Go-live checklist
- Backup and recovery
- Feature mapping
- Phase status

Still required:

- Operator training sign-off
- IT sign-off on backup and recovery
- Final go-live approval against checklist

## Known Issues That Still Matter

From `docs/OPEN_ISSUES.md`:

- `OI-01`: Receive without reservation number skips `RES_PUIDRecv`
- `OI-02`: Host disk usage not reported in health API
- `OI-04`: CPK picklist actions not yet in `audit_logs`
- `OI-05`: Self-service password reset not implemented

Impact summary:

- `OI-01` and `OI-04` are operational risks for traceability and receive flow correctness
- `OI-02` is an ops visibility gap
- `OI-05` is a supportability gap

## Go / No-Go Recommendation

**Recommendation: NO-GO for immediate production cutover until environment and hardware checks are completed.**

Reason:

- Code quality and build health are good
- But production readiness depends on external systems and factory hardware that have not been validated in this review
- There are still documented open issues that affect operational risk

## What Must Pass Before Go-Live

### Environment

- MySQL migrations applied
- Mosquitto reachable
- Redis reachable
- Production secrets configured
- Backend starts with `NODE_ENV=production`
- Frontend built with correct API/socket URLs
- CORS limited to factory origins
- HTTPS or reverse proxy in place
- Backups scheduled

### Functional

- Login/logout
- Search + highlight
- Receive reservation
- Receive return
- Picklist
- Rack overview realtime updates
- Reports export
- System Health dashboard green

### Hardware

- Raspberry Pi heartbeat visible
- Ethernet IO tested per slot
- Scanner input validated
- TV `/tv` works

## Recommended Next Steps

1. Run the production stack in a staging environment that matches the factory network as closely as possible.
2. Execute the go-live checklist item by item and record results.
3. Validate the four live integrations:
   - CPK
   - PDService
   - MQTT / Redis
   - Raspberry / Ethernet IO
4. Decide whether `OI-01` and `OI-04` are acceptable for launch or must be fixed before cutover.
5. Collect final operator and IT sign-off.
