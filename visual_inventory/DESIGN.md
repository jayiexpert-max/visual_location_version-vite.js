---
name: Visual Inventory
description: Factory-floor warehouse UI — calm, industrial, scan-first
colors:
  slate-workspace: "#f1f5f9"
  white-surface: "#ffffff"
  slate-header: "#1e293b"
  slate-header-text: "#f8fafc"
  ink-primary: "#0f172a"
  ink-muted: "#64748b"
  border-neutral: "#cbd5e1"
  emerald-action: "#059669"
  emerald-action-hover: "#047857"
  blue-accent: "#2563eb"
  blue-accent-hover: "#1d4ed8"
  amber-warning: "#d97706"
  amber-warning-bg: "#fef3c7"
  red-danger: "#dc2626"
  red-danger-bg: "#fee2e2"
  handheld-bg: "#080b10"
  handheld-panel: "#101722"
  handheld-text: "#f7fafc"
typography:
  ui:
    fontFamily: "'Outfit', 'Sarabun', 'Segoe UI', Tahoma, Arial, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: 1.5
  scan:
    fontFamily: "'Outfit', 'Sarabun', 'Segoe UI', Tahoma, Arial, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.35
  handheld:
    fontFamily: "Arial, 'Helvetica Neue', sans-serif"
    fontSize: "18px"
    fontWeight: 400
    lineHeight: 1.35
rounded:
  sm: "8px"
  lg: "12px"
spacing:
  touch: "48px"
  main: "1.25rem"
components:
  button-primary:
    backgroundColor: "{colors.emerald-action}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "0 1.25rem"
    height: "{spacing.touch}"
  button-primary-hover:
    backgroundColor: "{colors.emerald-action-hover}"
    textColor: "#ffffff"
  button-accent:
    backgroundColor: "{colors.blue-accent}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "0 1.25rem"
    height: "{spacing.touch}"
  appbar:
    backgroundColor: "{colors.slate-header}"
    textColor: "{colors.slate-header-text}"
    height: "56px"
  panel:
    backgroundColor: "{colors.white-surface}"
    rounded: "{rounded.lg}"
    padding: "{spacing.main}"
---

# Design System: Visual Inventory

## 1. Overview

**Creative North Star: "The Factory Floor Console"**

Visual Inventory looks and behaves like equipment on the shop floor: sturdy panels, readable type, emerald for go/confirm, blue for focus and links, slate for structure. Desktop flows use the light `factory.css` shell; handheld flows use a separate dark `handheld.css` tuned for scanner hardware in dim aisles.

The system rejects consumer SaaS styling, decorative motion, and screen-by-screen visual drift. Every new page should compose from `fx-*` primitives in `public/assets/factory.css`, not ad-hoc inline palettes.

**Key Characteristics:**

- Light workspace (`--fx-bg`) with white panels and slate app bar
- Emerald primary actions; blue accent for focus rings and secondary emphasis
- 48px minimum touch height on buttons and ghost actions
- Bilingual type stack: Outfit + Sarabun
- Handheld dark theme as a deliberate second surface, not a recolor hack

## 2. Colors

Industrial neutrals with semantic green/blue/red/amber—not a marketing gradient palette.

### Primary
- **Emerald Action** (#059669): Primary buttons, success states, online indicators, confirm actions.
- **Emerald Deep** (#047857): Hover and pressed primary states.

### Secondary
- **Blue Accent** (#2563eb): Focus rings, accent buttons, secondary CTAs, link emphasis.
- **Blue Deep** (#1d4ed8): Accent hover states.

### Tertiary
- **Amber Alert** (#d97706) on **Warm Warning Surface** (#fef3c7): Pending and expiry-adjacent warnings.
- **Red Stop** (#dc2626) on **Soft Danger Surface** (#fee2e2): Errors, offline, destructive actions.

### Neutral
- **Slate Workspace** (#f1f5f9): Page background on desktop.
- **White Panel** (#ffffff): Cards, forms, data panels.
- **Slate Header** (#1e293b): App bar, top chrome.
- **Ink Primary** (#0f172a): Body text.
- **Ink Muted** (#64748b): Labels, secondary metadata.
- **Border Neutral** (#cbd5e1): Panel and input borders.

### Handheld (separate surface)
- **Aisle Black** (#080b10): Handheld page background.
- **Panel Steel** (#101722): Handheld cards and scan areas.
- **Handheld Ink** (#f7fafc): Primary text on dark panels.

### Named Rules

**The No Purple Gradient Rule.** Do not introduce indigo/violet marketing gradients (`#4f46e5`, `#8b5cf6`) on product screens. Legacy dashboard inline tokens in `index.php` are technical debt—migrate to `--fx-*` tokens.

**The Accent Sparingly Rule.** Emerald and blue accents mark actions and focus. Neutral slate carries structure; color signals state or interaction.

## 3. Typography

**UI Font:** Outfit + Sarabun (with system-ui fallbacks)
**Handheld Font:** Arial / Helvetica Neue (scanner-optimized legibility)
**Scan Font:** Outfit/Sarabun at 1.125rem bold for barcode and PUID fields

**Character:** Calm industrial sans. No display-serif pairing. Hierarchy through weight and size steps, not decorative type.

### Hierarchy
- **App title** (700, 1rem–1.05rem, 1.5): App bar brand and page titles.
- **Panel title** (700, ~1.1rem): Section headers inside `fx-panel`.
- **Body** (400, 16px, 1.5): Forms, tables, instructions. Cap prose at 65–75ch where readable.
- **Label / meta** (600, 0.75rem–0.875rem): Summary grid labels, status bar, muted hints.
- **Scan input** (700, 1.125rem, 1.35): PUID and barcode fields (`--fx-scan-font`).

### Named Rules

**The Bilingual Stack Rule.** Always include Sarabun in the UI stack so Thai labels render cleanly without swapping font family per language.

## 4. Elevation

Subtle tonal layering with light shadows—not glassmorphism or heavy lift.

Depth is conveyed by: white panels on slate workspace, 1px borders, and two shadow steps. Handheld uses border contrast and panel tone steps instead of shadows.

### Shadow Vocabulary
- **Ambient** (`0 1px 3px rgba(15, 23, 42, 0.08)`): Panels at rest (`--fx-shadow`).
- **Raised chrome** (`0 4px 12px rgba(15, 23, 42, 0.1)`): App bar and elevated headers (`--fx-shadow-md`).

### Named Rules

**The Flat Panel Rule.** Cards are bordered white surfaces, not nested floating cards. Avoid card-in-card layouts.

## 5. Components

Industrial controls: rounded 8px, bold labels, full touch height.

### Buttons
- **Shape:** 8px radius (`--fx-radius`), min-height 48px (`--fx-touch`).
- **Primary:** Emerald background, white text, 700 weight. Hover → emerald deep. Active → scale 0.98.
- **Accent:** Blue background for secondary emphasis actions.
- **Secondary:** White fill, 2px neutral border; hover shifts border/text to accent blue.
- **Danger:** Red background for destructive confirms.
- **Ghost (app bar):** Transparent on slate header, 1px light border, 48px height.

### Cards / Containers
- **Panel (`fx-panel`):** White surface, 12px radius, 1px border, ambient shadow, 1.25rem padding.
- **Main layout:** Max-width 1280px (960px narrow, 1440px picklist variants).

### Inputs / Fields
- **Style:** Full-width fields with neutral border; focus shifts border to accent blue with 3px glow (`rgba(37, 99, 235, 0.15)`).
- **Scan row:** Large scan font, touch-friendly row layout with adjacent action buttons.

### Navigation
- **App bar (`fx-appbar`):** Slate header, 56px min-height, brand icon in mint accent (#34d399), TH|EN toggle, ghost home/logout actions.
- **Status bar (`fx-statusbar`):** Light slate strip under header with dot indicators (online/offline/pending).

### Handheld shell
- **Dark frame:** `handheld-shell` body, max-width 480px centered column.
- **Touch:** 48px targets, high contrast text on dark panels.
- **Primary actions:** Same emerald semantics as desktop for cross-surface consistency.

## 6. Do's and Don'ts

### Do:
- **Do** use `factory.css` `--fx-*` tokens for all new desktop pages.
- **Do** keep buttons at ≥48px height and label them with verb + object ("รับเข้าสต็อก", "เบิกสินค้า").
- **Do** route all copy through `languages/th.php` and `languages/en.php`.
- **Do** use emerald for confirm/primary, blue for focus/accent, red/amber for danger/warning.
- **Do** use `handheld.css` tokens for Keyence flows; don't reuse desktop light theme on scanners.

### Don't:
- **Don't** use consumer SaaS purple gradients or startup marketing aesthetics.
- **Don't** ship touch targets below 48px on floor-facing screens.
- **Don't** hardcode English-only strings in PHP templates.
- **Don't** invent per-page color systems (inline `:root` blocks); align `index.php` dashboard to `factory.css`.
- **Don't** add decorative motion; transitions should be 150–250ms and state-driven only.
