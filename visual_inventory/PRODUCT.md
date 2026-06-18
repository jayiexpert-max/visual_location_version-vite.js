# Product

## Register

product

## Users

Primary users work on the factory floor and in the warehouse:

- **Warehouse operators** receive and withdraw stock, scan PU IDs, and confirm locations.
- **Material prep / kitting** staff prepare pick lists and fulfill line requests.
- **Production line staff** request parts from BOM-driven work orders.
- **Handheld scanner users** (Keyence BT-A500) run fast scan-first flows in gloves-friendly UI.
- **Admins / IT** configure racks, IO devices, integrations, and system settings.
- **TV / kiosk viewers** monitor rack status and highlights on the shop floor.

Context: noisy environments, time pressure, bilingual TH/EN switching, mixed desktop and handheld hardware. Users are in task flow, not browsing.

## Product Purpose

Visual Inventory (Visual Location Management) is a smart warehouse system for PUID scanning, BOM-driven production orders, visual rack monitoring, handheld operations, and physical IO indicators.

Success means operators complete receive/withdraw/kitting tasks quickly with low error rates, locations are visible on the rack map, and every screen feels like one consistent factory tool—not a collection of separate UIs.

## Brand Personality

**Practical · Calm · Industrial**

Voice is direct and operational. Labels say what will happen. Status is visible at a glance. The interface stays out of the way so the task stays in focus. Confidence comes from clarity and consistency, not decoration.

## Anti-references

- Consumer SaaS purple gradients and startup marketing aesthetics
- Tiny buttons or touch targets below 48px
- English-only copy (TH/EN must stay first-class)
- Inconsistent components across screens (e.g. dashboard tokens diverging from `factory.css`)

## Design Principles

1. **Task-first clarity** — Every screen answers "what do I do next?" before showing secondary detail.
2. **Earned familiarity** — Use standard warehouse/tool patterns; don't reinvent affordances for flavor.
3. **One vocabulary** — Same button, form, panel, and status language on desktop, handheld, and TV surfaces.
4. **Bilingual by default** — All user-facing strings go through i18n; layout must tolerate longer Thai labels.
5. **Floor-ready interaction** — 48px minimum touch targets, high legibility, motion that conveys state only.

## Accessibility & Inclusion

- Touch targets ≥ 48px on interactive controls (gloves, scanners, handheld devices)
- Full Thai + English support via `languages/th.php` and `languages/en.php`
- Prefer clear text labels and icons together; don't rely on color alone for critical status
- Respect `prefers-reduced-motion` for any transitions added going forward
