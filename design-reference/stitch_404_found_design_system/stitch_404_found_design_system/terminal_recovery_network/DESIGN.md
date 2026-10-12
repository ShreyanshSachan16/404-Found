---
name: Terminal Recovery Network
colors:
  surface: '#121316'
  surface-dim: '#121316'
  surface-bright: '#38393c'
  surface-container-lowest: '#0d0e11'
  surface-container-low: '#1b1b1f'
  surface-container: '#1f1f23'
  surface-container-high: '#292a2d'
  surface-container-highest: '#343538'
  on-surface: '#e3e2e6'
  on-surface-variant: '#d4c4b0'
  inverse-surface: '#e3e2e6'
  inverse-on-surface: '#303034'
  outline: '#9c8f7c'
  outline-variant: '#4f4536'
  surface-tint: '#f7bd4f'
  primary: '#ffd898'
  on-primary: '#422c00'
  primary-container: '#f2b84b'
  on-primary-container: '#6a4900'
  inverse-primary: '#7d5700'
  secondary: '#c4c6ce'
  on-secondary: '#2d3037'
  secondary-container: '#44474e'
  on-secondary-container: '#b3b5bd'
  tertiary: '#8bf2ba'
  on-tertiary: '#003822'
  tertiary-container: '#6fd59f'
  on-tertiary-container: '#005b39'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdeaa'
  primary-fixed-dim: '#f7bd4f'
  on-primary-fixed: '#271900'
  on-primary-fixed-variant: '#5f4100'
  secondary-fixed: '#e1e2eb'
  secondary-fixed-dim: '#c4c6ce'
  on-secondary-fixed: '#191c22'
  on-secondary-fixed-variant: '#44474e'
  tertiary-fixed: '#90f7bf'
  tertiary-fixed-dim: '#74daa4'
  on-tertiary-fixed: '#002112'
  on-tertiary-fixed-variant: '#005233'
  background: '#121316'
  on-background: '#e3e2e6'
  surface-variant: '#343538'
typography:
  headline-xl:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 38px
  headline-xl-mobile:
    fontFamily: Geist
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 32px
  headline-lg:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 30px
  headline-md:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: '500'
    lineHeight: 26px
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 10px
    fontWeight: '500'
    lineHeight: 14px
  code-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '400'
    lineHeight: 14px
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 0.75rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system establishes an ultra-premium, precision-engineered aesthetic tailored for campus-wide retrieval and asset reunification. It channels the focus, high density, and tactile authority of developer tooling (Raycast, Linear, Vercel) while maintaining the urgent empathy required for recovering personal items.

### Brand Personality & Ethos
- **Hyper-Specific & Observant:** Eliminates clutter in favor of crisp status markers, categorical tags, and precise geo-spatial markers.
- **Calm Authority in Chaos:** Counteracts the panic of losing essential belongings through subdued, deeply recessed canvas layers and deliberate typographic hierarchy.
- **High-Fidelity Utility:** Treats lost belongings not as generic posts, but as actionable items with cryptographic-like verification states.

### Visual Style
- **Minimalist Dark Slate:** An obsidian-grounded architectural palette punctuated by luminous amber accents when a connection or resolution occurs.
- **Engineered Hairline Precision:** 1px borders with controlled opacity differentiate surfaces rather than heavy elevation shadows or blurred skeuomorphic panels.
- **Contextual Accent Activation:** Restrained monochrome dominance that selectively flares into amber, jade, or cobalt only during discovery, high-confidence matching, and identity handoffs.

## Colors

The color system relies on extreme dark depth paired with low-reflectance structural neutrals, illuminated by a warm amber beacon.

### Core Surface Roles
- **Canvas Base (`#0A0B0E`):** Pure obsidian baseline designed to eliminate screen glare and maximize contrast in varied field conditions across campus.
- **Surface Level 1 (`#111318`):** Applied to primary cards, feeds, persistent bottom sheets, and tabular row elements.
- **Surface Level 2 (`#181B21`):** Applied to interactive overlays, floating action bars, dropdown drawers, and verification modals.
- **Structural Border (`#282C34`):** Crisp 1px hairline boundary separating surfaces with zero visual bleeding.

### Typography & Content
- **Primary Text (`#F4F1E8`):** Warm Ivory. Delivers high legibility without the harsh ocular fatigue caused by pure `#FFFFFF` against deep black.
- **Secondary / Supporting Text (`#9699A3`):** Neutral titanium gray for timestamps, hardware serial tags, item sub-notes, and secondary metadata.

### Accent & Semantic Actions
- **Signature Amber (`#F2B84B` / Hover `#FFC966`):** Reserved exclusively for active recovery states, search highlights, key callouts, match alerts, and verified handshakes.
- **Success (`#70D6A0`):** Indicates verified item ownership and final returned status.
- **Error (`#FF6B6B`):** Flags rejected claims, security discrepancies, and urgent theft warnings.
- **Info (`#7DB7FF`):** Flags campus security lockboxes, administrative drop-off desks, and transit routing notes.

## Typography

The typographic hierarchy combines the cold, clinical balance of `Geist` with the forensic technicality of `JetBrains Mono`.

- **Geist (Headlines & Body):** Delivers clean neutral forms with tight vertical rhythm. Letter-spacing remains neutral for headlines and opens slightly (`-0.01em` to `0em`) for micro-readability on small handheld displays.
- **JetBrains Mono (Metadata & Statuses):** Applied to claim IDs, categorical tracking codes, timestamps, matching percentages, geo-coordinates, and operational badge states.
- **Mobile Scale Strategy:** Display titles clamp strictly at `26px` on viewport widths under `480px` to maintain 2-line maximum headlines above the fold on compact viewports.

## Layout & Spacing

The layout model prioritizes compact portrait ergonomics, ensuring critical one-handed actions remain within the bottom thumb zone while content reflows deterministically.

### Grid & Canvas Structure
- **Mobile Handheld (Primary Target):** 4-column layout with 16px (`1rem`) outer canvas margins and 12px (`0.75rem`) internal gutters. Fixed bottom docking holds the urgent status bar and submission triggers.
- **Desktop/Tablet Dashboard:** Expands to an 8-to-12 column fluid layout constrained to a maximum width of `1280px` with 32px (`2rem`) margins.

### Spacing Cadence
- Spacing follows a 4px/8px micro-grid. Component padding scales from `space-xs` (4px) inside status micro-pills to `space-xl` (24px) for empty states and hero summary modules.
- Touch targets strictly enforce a minimum tap clearance of 44x44px, even when housing `10px` mono-styled labels.

## Elevation & Depth

This design system avoids traditional fuzzy drop shadows. Visual depth is rendered via crisp layered stratification, fine structural boundaries, and subtle specular lighting.

### Tonal Hierarchy
- **Base Canvas (`#0A0B0E`):** Bottom-most viewport backdrop.
- **Card Tier (`#111318`):** Outlined with a 1px solid border (`#282C34`).
- **Overlay & Modal Tier (`#181B21`):** Supported by a 1px border (`#282C34`) and an ambient, low-spread dark rim shadow (`0 12px 32px rgba(0, 0, 0, 0.65)`).

### Edge & Focus Illumination
- Instead of high-radius glows, interactive states use an amber edge stroke: `border-color: #F2B84B` with an inset micro-highlight: `box-shadow: inset 0 1px 0 rgba(242, 184, 75, 0.2)`.
- Modals invoke a semi-transparent canvas backdrop blur (`backdrop-filter: blur(8px); background: rgba(10, 11, 14, 0.75)`).

## Shapes

The design system uses deliberate, disciplined corner radiuses to reinforce a hardware-tool aesthetic without appearing sharp or brutalist.

- **Base Corner Radius (`roundedness: 2` / 8px):** Applied to standard card surfaces, text fields, and dynamic list tiles.
- **Micro Radii (4px):** Reserved for technical status badges, inline chips, and monospaced code blocks.
- **Large Container Radii (16px):** Reserved for bottom-sheet drawers, pop-up verification panels, and full-screen camera viewfinders.

## Components

### Buttons
- **Primary Action (Beacon):** Background `#F2B84B`, text `#0A0B0E` (`font-weight: 600`), 8px border radius. Hover changes background to `#FFC966`. Active transitions invoke a scale of `0.98`.
- **Secondary (Obsidian Shell):** Background `#181B21`, text `#F4F1E8`, border `1px solid #282C34`. Hover border lightens to `rgba(242, 184, 75, 0.4)`.
- **Destructive/Critical:** Background `transparent`, border `1px solid rgba(255, 107, 107, 0.3)`, text `#FF6B6B`.

### Status Badges (JetBrains Mono, Uppercase, 10px)
Badges feature an ultra-clean solid dark core, a 1px border, and a colored status indicator dot:
- **LOST:** Background `#181B21`, text `#9699A3`, border `#282C34`, dot `#9699A3`.
- **POTENTIAL MATCH:** Background `rgba(242, 184, 75, 0.08)`, text `#F2B84B`, border `rgba(242, 184, 75, 0.25)`, dot `#F2B84B` (pulsing).
- **CLAIMED:** Background `rgba(125, 183, 255, 0.08)`, text `#7DB7FF`, border `rgba(125, 183, 255, 0.25)`, dot `#7DB7FF`.
- **VERIFICATION:** Background `rgba(242, 184, 75, 0.12)`, text `#FFC966`, border `rgba(242, 184, 75, 0.4)`, dot `#FFC966`.
- **VERIFIED:** Background `rgba(112, 214, 160, 0.08)`, text `#70D6A0`, border `rgba(112, 214, 160, 0.3)`, dot `#70D6A0`.
- **RETURNED:** Background `#111318`, text `#70D6A0`, border `1px solid #282C34`, dot `#70D6A0`.

### Cards & Recovery Feed Rows
- Base `#111318` background, 1px `#282C34` border, 8px radius, and 12px internal padding.
- Card header features item name (`Geist 14px Weight 500`) alongside the right-aligned status badge.
- Secondary line details campus zone, time delta, and claim verification protocol via `JetBrains Mono 11px` in `#9699A3`.

### Input Fields & Search Bars
- Background `#111318`, border `1px solid #282C34`, text `#F4F1E8`, placeholder `#9699A3`.
- Active focus state transitions the border to `#F2B84B` with zero outer shadow blur.
- Keyboard accessory tray includes one-tap quick filters (`All`, `Keys`, `Electronics`, `Bags`, `IDs`).

### Checkboxes & Segmented Radios
- Checkbox container: 16x16px, 4px corner radius, `#181B21` background, `#282C34` border.
- Checked state: `#F2B84B` fill with `#0A0B0E` precision checkmark icon.

### Verification Handshake Drawer (Domain Specific)
- Slide-up bottom sheet anchored over an obsidian glass backdrop.
- Displays encrypted comparison vectors (e.g., partial serial matches, matching distinctive stickers, location heatmaps) in a two-column card view with clear confirmation actions.