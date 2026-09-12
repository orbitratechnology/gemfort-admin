# DESIGN.md - GemFort Admin

## Context (from discovery)

- Artifact type: settings/admin/CMS and operational dashboard
- Positioning: trustworthy, utilitarian, technical
- Audience: GemFort administrators | Primary action: review and record platform decisions
- Adjectives: calm, precise, dependable
- Visual word translations: calm -> quiet neutral surfaces; precise -> strong left alignment and compact data groups; dependable -> restrained accent and explicit status labels
- Aesthetic essence (3 words): quiet, exact, useful
- Single-minded proposition: every admin task should be easy to find, inspect, and complete on a small screen
- Archetype: Sage
- References: existing GemFort admin palette and shadcn primitives; avoid decorative dashboard patterns that compete with operational data
- Mode: light and existing dark tokens | Density: balanced
- Constraints: Next.js App Router, React 19, Tailwind v4, shadcn primitives, WCAG 2.2 AA targets, mobile layouts from 320px upward

## Aesthetic

- Direction: restrained operations desk
- Defining trait: navigation and action context stay visible while content reflows from desktop grids into single-column mobile groups
- Signature move: the mobile top bar pairs the GemFort mark with the current workspace section, then opens a full-height left navigation drawer

## Typography

- Display: Inter | source: Google Fonts | license: OFL
- Body: Inter | source: Google Fonts | license: OFL
- Mono (if used): ui-monospace stack for code and identifiers
- Scale: ratio 1.2 minor third, base 16px | display 48px | page title 30px | section 18px | body 16px / 1.6 | small 14px / 1.5
- Weights: 400/500/600 | Measure: 65-75ch for long copy | Tracking notes: tighten titles slightly; keep labels readable

## Color

- Strategy: neutral semantic tokens with a single dark primary accent; no gradient or indigo-led decoration
- Distribution: 60 neutral / 30 brand / 10 accent
- Palette (role -> OKLCH | hex):
  - bg: oklch(1 0 0) | #ffffff
  - surface: oklch(0.985 0 0) | #fafafa
  - fg: oklch(0.145 0 0) | #181818
  - muted: oklch(0.97 0 0) | #f4f4f4
  - border: oklch(0.922 0 0) | #e5e5e5
  - accent: oklch(0.205 0 0) | #2b2b2b
  - accent-fg: oklch(0.985 0 0) | #fafafa
  - success / warning / error: semantic status tokens already defined by the app; pair with text labels
- Dark mode overrides: near-black background, off-white foreground, lighter borders, and desaturated semantic accents as defined in `app/globals.css`

## Spacing, radius, shadow

- Spacing base: 4px, scale: 1, 2, 3, 4, 5, 6, 8
- Radius: medium surfaces and controls use the existing token scale; pills are reserved for filters and statuses
- Shadow approach: soft elevation for cards and overlays; borders remain light separators rather than heavy outlines

## Layout and composition

- Grid: modular dashboard grid with a single-column mobile fallback; gutters 16px mobile, 24px tablet, 32px desktop
- Spacing rhythm: tight within controls and metadata, generous between page sections
- Signature layout move: mobile navigation exposes current location in the top bar and keeps the full route list one tap away
- Density: balanced | Scanning: F-shaped for records, Z-shaped for overview actions
- Responsive: mobile-first behavior layered onto existing desktop breakpoints at sm, md, lg, and xl

## Components and states

- Button hierarchy: primary filled / secondary outlined / tertiary text; preserve hover, active, focus, disabled, loading states
- Inputs: visible labels, native types, inline errors, and retained input values
- Tables: left-aligned text, tabular numerals, light separators, horizontal fallback only for desktop data views
- Overlays: Sheet for mobile navigation and verification review, Dialog for focused forms, with library-managed focus behavior
- Empty / loading / error: shared `EmptyState`, `PortalLoading`, and `ErrorAlert` patterns
- Focus ring: existing ring tokens with visible focus-visible borders and rings

## Motion

- Duration scale: instant for state changes, fast for controls, normal for sheets and dialogs
- Easing: existing Tailwind/shadcn ease-out defaults
- What animates: transform and opacity only where provided by primitives | reduced-motion: defer to primitive and browser reduced-motion behavior
- Signature motion: the mobile drawer enters from its left edge to preserve spatial relation to the menu trigger

## Iconography

- Set: Lucide customized through shared sizing utilities | grid: 24px | stroke: default Lucide stroke | caps/joins: default rounded geometry | radius match: yes

## Imagery and illustration

- Mode: real Gem Show cover images where content requires imagery; simple icons for operational states
- Rules: preserve source imagery and use `next/image` for supported remote assets
- Avoid: decorative stock imagery, gradient blobs, and illustration that hides operational content
- Text-over-image contrast: status badge sits on a controlled image overlay area and retains a text label

## Dark mode (if in scope)

- Base bg: near-black token | fg: off-white token | elevation ramp: existing card and popover semantic tokens
- Accent (dark): existing desaturated dark-mode primary | border: lighter than surface

## Accessibility

- Contrast: semantic tokens are retained for AA review in both modes | Focus: visible focus-visible states
- Keyboard: native links and buttons; overlays use the existing Base UI focus management | Targets: 44px preferred for mobile navigation and primary actions
- Color independence: statuses include text labels | Reduced motion: primitive animations remain the only motion surface
- Notes: mobile users receive a non-table card view for accounts; active route is exposed with `aria-current`

## Tokens (source of truth)

```css
:root {
  --font-body: var(--font-sans);
  --font-display: var(--font-sans);
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  --spacing-base: 4px;
  --radius-surface: 16px;
  --radius-pill: 999px;
}
```

- Adapter: Tailwind v4 `@theme` with shadcn semantic tokens

## Cards and surfaces

- Cards/surfaces: existing soft elevation with restrained separators, medium radius, and 16px mobile padding | nesting: avoid cards-in-cards where possible

## Slop audit

- Date: 2026-09-12 | Result: fixed 4 responsive usability tells
- Notes: replaced horizontal mobile navigation, added current-route context, moved mobile users out of a desktop table, and expanded key touch targets. Source-level accessibility review is complete; rendered-device verification remains separate.

## Changelog

- 2026-09-12: fixed the mobile shell flow so the navigation bar lives inside the content column instead of pushing page content off-screen.
- 2026-09-12: established the responsive admin direction and recorded the mobile navigation/layout decisions.
