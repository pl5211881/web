# Design System: Linear Landing Page

Source: https://linear.app/?ref=land-book.com

This document distills the observed Linear landing page into a reusable design system. It is not a pixel clone. Use it to reproduce the same dark, precise, product-system feeling in another interface.

## 1. Visual Theme & Atmosphere

Linear presents itself as a high-precision product development system. The page feels quiet, technical, premium, and engineered rather than decorative. The dominant impression is a near-black workspace with luminous typography, thin structural lines, restrained violet-blue accents, and large product workflow modules.

- Overall feeling: dark-first, cinematic, exacting, confident.
- Visual density: sparse at the hero, denser in workflow and product modules.
- Brand posture: system-level tool for serious product teams and AI-era workflows.
- Signature motifs: pill controls, hairline borders, muted gray copy, product screenshots, workflow stages, tiny metadata labels, subtle violet-blue action states.

### Key Characteristics

- Near-black background with surfaces separated by thin borders instead of heavy shadows.
- Large, low-weight display typography with tight negative tracking.
- Muted gray secondary text that carries much of the section hierarchy.
- Violet-blue accents used sparingly for links, selected states, and brand emphasis.
- Product UI screenshots and workflow panels treated as the main visual asset.
- Minimal decoration; atmosphere comes from spacing, contrast, and precise component rhythm.

## 2. Color Palette & Roles

| Role | Semantic Name | Value | Usage |
| --- | --- | --- | --- |
| Page background | Marketing black | `#08090A` / `#010102` | Full-page canvas and footer background. |
| Primary surface | Panel black | `#0F1011` | Product panels, inset cards, dark containers. |
| Secondary surface | Raised graphite | `#141516` | Subtle module separation and tinted blocks. |
| Tertiary surface | Control graphite | `#191A1B` | Buttons, tabs, cards, screenshot shells. |
| Primary text | Frost white | `#F7F8F8` | Headlines, important labels, active items. |
| Secondary text | Cool silver | `#D0D6E0` | Supporting heading copy and emphasized body text. |
| Tertiary text | System gray | `#8A8F98` | Paragraphs, nav items, captions, inactive controls. |
| Quaternary text | Dim graphite | `#62666D` | Metadata, subdued labels, disabled states. |
| Primary border | Hairline graphite | `#23252A` | Component outlines and module dividers. |
| Secondary border | Structural graphite | `#34343A` | Stronger separators and hovered controls. |
| Translucent border | Soft white line | `rgba(255,255,255,0.05)` | Screenshot frames, subtle rings, overlays. |
| Accent | Linear indigo | `#5E6AD2` | Brand color and occasional filled emphasis. |
| Accent link | Electric periwinkle | `#828FFF` | Links, hover states, selected text, active indicators. |
| Accent tint | Deep indigo tint | `#18182F` | Low-contrast accent backgrounds. |
| Success | Product green | `#27A644` | Rare status indicators and positive signals. |

### Primary

- Use `#08090A` as the default application background. It should feel black but not flat pure black.
- Use `#F7F8F8` only for top-priority text and active states. Most copy should sit lower in the hierarchy.
- Use `#828FFF` as a precise accent, not as a large decorative wash.

### Interactive

- Links default to `#828FFF` and can hover toward `#FFFFFF`.
- Buttons are usually pill-shaped, compact, and low-contrast until hovered.
- Active or selected states should use text brightness, border clarity, or a small accent fill instead of oversized color blocks.

### Neutral Scale

- `#0F1011`, `#141516`, `#191A1B`, `#23252A`, `#34343A`, `#3E3E44` form the structural dark scale.
- The page avoids warm grays. Neutrals lean cool and slightly blue.
- Use borders and background shifts of only one or two neutral steps for depth.

### Surface & Overlay

- Surfaces should be restrained: black panels, transparent overlays, hairline outlines.
- Modal or overlay dimming can use `rgba(0,0,0,0.85)`.
- Avoid glossy glassmorphism. Linear's depth language is flatter and more engineered.

### Theme Modes

The inspected public landing page is dark-first. No visible user-facing theme switch was observed during extraction. If adapting this system to light mode, treat light mode as an application-specific extension rather than an observed Linear rule.

#### Light Mode

- Background: use a cool off-white such as `#F7F8F8` only if the target product requires a light appearance.
- Surface: use `#FFFFFF` with very light cool borders.
- Text: invert the hierarchy into graphite text, preserving muted secondary tiers.
- Accent: keep indigo/periwinkle as the stable brand accent.
- Notes: inferred extension, not directly observed on the inspected landing page.

#### Dark Mode

- Background: `#08090A` or `#010102`.
- Surface: `#0F1011`, `#141516`, `#191A1B`.
- Text: `#F7F8F8`, `#D0D6E0`, `#8A8F98`, `#62666D`.
- Accent: `#828FFF`, `#5E6AD2`.
- Notes: this is the observed default.

### Shadows & Depth

- Prefer borders and surface changes over heavy shadow stacks.
- Use translucent white outlines on screenshot-like panels.
- Focus and hover states should feel crisp and immediate, not glowy.

## 3. Typography Rules

### Font Family

- Primary: `"Inter Variable", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif`.
- Monospace: use a narrow technical mono such as `"Berkeley Mono", "SFMono-Regular", Consolas, monospace` for metadata, stage numbers, and code-like labels.
- OpenType Features: use tight spacing and refined numerals where available; avoid decorative alternates.

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Hero headline desktop | Inter Variable | `64px` | `510` | `64px` | `-1.4px` | Centered or strongly anchored, compact and luminous. |
| Hero headline mobile | Inter Variable | `38px` | `510` | `41.8px` | `-0.836px` | Wraps into multiple short lines with generous top spacing. |
| Section statement desktop | Inter Variable | `40px` | `510` | `44px` | `-0.88px` | Often muted gray, used as narrative heading copy. |
| Section statement mobile | Inter Variable | `24px` | `510` | `31.92px` | `-0.288px` | Still prominent but more conversational. |
| Body | Inter Variable | `15px` | `400` | `24px` | `-0.165px` | Product copy and explanatory text. |
| Large body | Inter Variable | `17px` | `400` | `27px` | slight negative | Hero subcopy and important paragraphs. |
| Button / Nav | Inter Variable | `13px` | `400-510` | `19.5px` | slight negative | Compact, quiet, pill-based controls. |
| Meta / Eyebrow | Mono or Inter | `10-12px` | `500-590` | `1.4-1.5` | `0` to slight positive | Stage labels, version numbers, small descriptors. |

### Principles

- Display text should be large but not loud; weight stays around `510-590`.
- Use muted gray headings for long narrative statements to avoid marketing heaviness.
- Tight tracking is part of the identity. Do not use wide letter spacing except in tiny technical labels.
- Keep body text compact and readable, usually near `15px / 24px`.

## 4. Component Stylings

### Buttons and Links

- Primary CTA: compact pill, `32px` height on desktop navigation, rounded `9999px`, light fill when inverted or subtle dark fill in context.
- Secondary CTA: transparent or dark graphite pill with hairline border, muted text, stronger border on hover.
- Text links: periwinkle `#828FFF`; arrow symbols are common for forward motion.
- Hover and active feel: very fast, precise, often a border or text color change in `0.1s-0.15s`.

### Cards and Containers

- Surface style: dark graphite surfaces on black, usually one neutral step above the page.
- Radius: `8px` and `12px` are standard; `16px` and above are reserved for larger screenshot shells or major modules.
- Border: `1px solid #23252A` or translucent white for image/product frames.
- Shadow or elevation: minimal. Use layered borders and slight background shifts instead.
- Internal spacing: compact for controls, expansive for hero and feature sections.

### Inputs and Interactive Controls

- Input treatment: dark surface, subtle border, compact label, muted placeholder.
- Focus behavior: border shifts toward accent or brighter gray; avoid thick outlines.
- Selection states: use pill tabs, small active indicators, or accent text.

### Navigation

- Structure: desktop navigation spans about `72px` high; mobile is closer to `64px`.
- Background treatment: transparent over the same dark canvas, no heavy app bar.
- Link style: compact muted text, hover brightens toward primary white.
- Sticky or scroll behavior: navigation is visually persistent in spirit, but the observed mobile snapshot used a simple top bar with hidden desktop links and visible login/signup actions.

### Image Treatment

- Screenshot treatment: product UI screenshots are the hero visual asset; frame them with thin lines, dark shells, and measured radius.
- Photography or illustration style: avoid generic photos and decorative illustrations. Use actual product states, workflow panels, and interface fragments.
- Border and radius treatment: subtle `8px-16px` radius, `rgba(255,255,255,0.05)` border, no thick drop shadows.

### Distinctive Components

- Workflow stage modules: numbered sequence sections like `1.0 Intake`, `2.0 Plan`, `3.0 Build`, `4.0 Diffs`, `5.0 Monitor`.
- Pill navigation and pill CTAs: small, calm controls with high polish.
- Product narrative bands: large muted headings that read like product philosophy rather than sales slogans.
- Customer quote rows: short, high-signal quotes from recognizable teams, kept visually quiet.
- Final CTA: direct, confident, minimal; no oversized marketing clutter.

## 5. Layout Principles

### Spacing System

- Base unit: `8px`.
- Repeated spacing values: `16px`, `24px`, `32px`, `48px`, `64px`, `96px`, `128px`.
- Mobile section spacing compresses but remains airy; avoid stacking cards too tightly.

### Grid & Container

- Grid logic: wide centered content with constrained inner reading widths.
- Max content width: large homepage containers can approach `1280px-1344px`, with small side insets.
- Section spacing: large vertical bands; product modules appear as full-width narrative blocks rather than isolated floating cards.

### Whitespace Philosophy

- Whitespace is structural and cinematic, especially around the hero.
- Alignment tends to be centered for hero messaging and grid-based for product modules.
- Long text blocks should be kept narrow enough for scanning, while product visuals can span wide.

### Border Radius Scale

- Micro: `4px` for tiny badges or internal UI details.
- Standard: `8px` for controls and small panels.
- Large: `12px-16px` for cards and product screenshots.
- XL: `24px-32px` only for major containers when the layout needs a softer shell.
- Pill: `9999px` for buttons, nav chips, and compact CTAs.

## 6. Depth & Elevation

| Level | Treatment | Use |
| --- | --- | --- |
| Flat | `#08090A` canvas, no border | Page background and full-width bands. |
| Ring | `1px solid #23252A` or translucent white | Buttons, cards, screenshot frames, dividers. |
| Card | `#0F1011` or `#141516` with hairline border | Workflow panels and product modules. |
| Focus | Accent-tinted border or brighter text | Keyboard focus, selected tabs, active controls. |

### Depth Principles

- Surface hierarchy should be almost imperceptible until content or interaction clarifies it.
- Shadows are not a primary motif; avoid soft floating SaaS card stacks.
- Blur and glass should be rare. If used, keep it black and functional.
- Depth exists to clarify product screenshots, not to decorate the page.

## 7. Do's and Don'ts

### Do

- Use near-black backgrounds with cool gray type hierarchy.
- Use product screenshots, workflow diagrams, and interface fragments as primary visuals.
- Keep buttons compact, pill-shaped, and restrained.
- Make borders thin and purposeful.
- Use periwinkle accent sparingly to signal action or selection.
- Let large typography and spacing carry the premium feeling.

### Don't

- Do not use bright gradients, blobs, bokeh, or decorative abstract art.
- Do not make heavy rounded marketing cards or nested card stacks.
- Do not overuse the accent color across large backgrounds.
- Do not use warm beige, tan, or overly saturated palettes.
- Do not make UI copy playful or casual; keep it direct and product-focused.
- Do not rely on large drop shadows for depth.

## 8. Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
| --- | --- | --- |
| Mobile | `<= 640px` | Hero title reduces to about `38px`; nav links collapse; sections become single-column with `16px-24px` side padding. |
| Tablet | `<= 768px` | Section headings reduce, product modules stack, text widths tighten. |
| Laptop | `<= 1024px` | Hero title moves from largest display scale to `56px`-like scale; content density decreases. |
| Desktop | `>= 1280px` | Wide product panels, full navigation, large narrative headings, broad screenshot areas. |

### Touch Targets

- Keep tappable pills at least `32px` high; larger touch areas can be invisible around compact labels.
- Preserve spacing between interactive pills so the interface remains calm on mobile.

### Collapsing Strategy

- Desktop behavior: full nav, large hero, wide product-system visuals, multi-column proof sections.
- Tablet behavior: reduce title scale, stack dense modules, keep generous section rhythm.
- Mobile behavior: single-column page, hidden desktop nav links, compact top actions, hero centered with large top breathing room.
- Breakpoint-driven component changes: title scales from `64px` to `38px`; section statements from `40px` to `24px`.
- Touch target and spacing adjustments: avoid cramped nav rows; prefer fewer visible actions.

## 9. Agent Prompt Guide

### Quick Color Reference

- Primary CTA: `#E5E5E6` fill with dark text for inverted CTA, or dark pill with `#23252A` border.
- Background: `#08090A`.
- Heading text: `#F7F8F8`.
- Body text: `#8A8F98`.
- Border or ring: `#23252A` / `rgba(255,255,255,0.05)`.
- Accent: `#828FFF`.

### Quick Summary

Build a dark-first, precise B2B product interface inspired by Linear's landing page. Use near-black backgrounds, cool gray hierarchy, compact pill controls, hairline borders, and sparse periwinkle accents. Let product screenshots and workflow modules do the visual work. Keep typography large but restrained, with tight tracking and modest weights. Avoid decorative gradients, oversized marketing cards, and loud color blocks.

### Example Component Prompts

- Hero: Create a centered dark hero with a `64px` desktop headline, `17px` muted subcopy, compact pill CTA row, and a framed product screenshot below.
- Card: Create a graphite product module with a `1px` cool border, `12px` radius, muted body text, tiny mono metadata label, and a subtle hover border shift.
- Navigation: Create a `72px` transparent dark nav with compact muted links, pill CTAs, and hover states that brighten text without changing layout.
- Button or badge: Create a `32px` high pill with `9999px` radius, `13px` text, dark graphite fill, hairline border, and `0.1s` hover transition.

### Ready-to-Use Prompt

Use the Linear landing page design language: dark-first `#08090A` canvas, Inter Variable typography, tight display tracking, cool gray text hierarchy, compact pill controls, hairline graphite borders, minimal shadows, and sparse periwinkle `#828FFF` accents. Structure the page as a serious product-system interface with workflow modules and real UI screenshots rather than decorative marketing sections.

### Iteration Guide

1. First remove visual noise: gradients, blobs, heavy shadows, oversized cards, and unnecessary copy.
2. Then tune hierarchy: primary white for only the most important text, muted gray for most explanations.
3. Finally refine interaction polish: faster transitions, clearer borders, compact pill actions, and consistent `8px` rhythm.

## Optional Appendix: Interaction Patterns

- Scroll: content reveals long product narrative sections rather than many small cards.
- Hover: links and buttons brighten quickly; borders may become stronger.
- Click: pill actions and feature links imply forward navigation, often with arrow copy.
- Motion: crisp and subtle. Observed tokens include `0.1s`, `0.15s`, and `0.25s` transitions with quint/circ/quart easing curves.
- Content voice: concise, confident, technical, and product-led. Headlines frame the product as an operating system rather than a simple tool.
