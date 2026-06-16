# Design System: Qount Practice Intelligence

Source: https://qount.io/?ref=land-book.com

This document distills the observed Qount homepage into a reusable design system. It is not a pixel clone. Use it to reproduce the same accounting-practice intelligence feeling: dark operational confidence, bold white typography, electric yellow action accents, and data-led product storytelling.

## 1. Visual Theme & Atmosphere

Qount uses a high-contrast B2B SaaS language built around practice intelligence, predictive operations, and financial accountability. The page alternates between deep charcoal/black sections and stark white content panels, using electric yellow as a sharp signal for action and intelligence.

- Overall feeling: confident, operational, data-rich, direct, modern accounting-tech.
- Visual density: medium-high; long narrative page with statistics, tabbed panels, case studies, integration logos, and product modules.
- Brand posture: firm operations platform that turns fragmented practice data into predictive intelligence.
- Signature motifs: black canvas, white panels, neon-yellow action color, large percentage metrics, fixed navigation, canvas/diagram visuals, clear section statements.

### Key Characteristics

- Deep charcoal background instead of pure black, commonly `#1A1A1A`.
- Electric yellow `#D9FF42` as the signature brand accent and CTA color.
- White content panels used as strong contrast moments inside the dark page.
- Large, direct headlines with Inter and little typographic ornament.
- Data proof blocks: percentages, revenue lift, realization, utilization, margin recovery.
- Product modules feel businesslike and practical, not decorative or playful.

## 2. Color Palette & Roles

| Role | Semantic Name | Value | Usage |
| --- | --- | --- | --- |
| Page background | Qount charcoal | `#1A1A1A` | Main page background and dark sections. |
| Deep surface | Graphite black | `#1B1B1B` / `#262626` | Dark cards, side panels, header backdrop. |
| Raised dark surface | Utility graphite | `#333333` / `#373737` | Secondary panel separation and controls. |
| Light surface | Paper white | `#FFFFFF` | Contrast panels, intelligence tabs, modal surfaces. |
| Soft light surface | Cool paper | `#F2F2F2` / `#F0F0F0` | Inset cards, inputs, quiet backgrounds. |
| Primary text on dark | White | `#FFFFFF` | Main headings and navigation on dark. |
| Primary text on light | Ink black | `#000000` / `#1A1A1A` | Text inside white panels. |
| Secondary text | Gray 400 | `#C3C4C8` | Supporting copy, labels, footer text. |
| Muted text | Mid gray | `#4F4F4F` | Secondary copy on light surfaces. |
| Primary action | Intelligence yellow | `#D9FF42` | Main CTAs, badges, active indicators, data accent. |
| Border on dark | Graphite line | `#333333` / `rgba(255,255,255,0.14)` | Dark card boundaries and table lines. |
| Border on light | Soft gray line | `#E0E0E0` | White panels, form fields, content cards. |

### Primary

- Use `#1A1A1A` as the default canvas.
- Use `#D9FF42` sparingly but decisively for action, status, intelligence, or selected states.
- Use white panels to create strong information zones rather than many low-contrast dark cards.

### Interactive

- Primary CTAs should feel high-contrast: yellow fill with black text, or white fill with black text on dark backgrounds.
- Secondary links can be outlined or text-only, but should still feel crisp and businesslike.
- Hover states should sharpen contrast: yellow becomes brighter, dark borders become clearer, white cards lift subtly.

### Neutral Scale

- Dark scale: `#1A1A1A`, `#1B1B1B`, `#262626`, `#333333`, `#373737`, `#4F4F4F`.
- Light scale: `#FFFFFF`, `#F2F2F2`, `#F0F0F0`, `#E0E0E0`, `#C3C4C8`.
- The palette is deliberately grayscale with one acidic yellow accent.

### Surface & Overlay

- Dark sections should be flat and substantial, not glassy.
- White panels should be clean, direct, and structured.
- Overlays can use dark translucent black with a strong white or yellow foreground.

### Theme Modes

No explicit theme switch was observed. The site itself is dark-first with embedded light panels.

#### Light Mode

- Background: `#FFFFFF` or `#F2F2F2`.
- Surface: `#FFFFFF`.
- Text: `#1A1A1A`.
- Accent: `#D9FF42`.
- Notes: inferred adaptation for product surfaces; not a user-facing homepage mode.

#### Dark Mode

- Background: `#1A1A1A`.
- Surface: `#1B1B1B`, `#262626`, `#333333`.
- Text: `#FFFFFF`, `#C3C4C8`.
- Accent: `#D9FF42`.
- Notes: observed default page language.

### Shadows & Depth

- Prefer contrast blocks and borders over soft shadow-heavy SaaS cards.
- Use subtle dark shadows only to separate floating header, dialogs, or active cards.
- White panels may use almost no shadow because contrast against dark canvas already creates depth.

## 3. Typography Rules

### Font Family

- Primary: `"qount.io--Inter", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif`.
- Monospace: `SFMono-Regular, monospace` for data labels or system readouts if needed.
- OpenType Features: keep typography plain and functional; do not over-style accounting/product copy.

### Hierarchy

| Role | Font | Size | Weight | Line Height | Letter Spacing | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Hero headline desktop | Inter | `48px` | `700` | `56px` | `0` | Direct business outcome headline. |
| Hero headline mobile | Inter | `28px` | `700` | `32px` | `0` | Compact but still authoritative. |
| Section heading | Inter | `40px-48px` | `700` | `1.1-1.2` | `0` | Used for big practice-intelligence statements. |
| Small heading | Inter | `18px-24px` | `700` | `normal-1.25` | `0` | Partner headings, card titles, tab panels. |
| Body | Inter | `18px` | `400` | `22.5px` | `0` | Observed body baseline; use slightly looser line-height in dense app UI. |
| Caption / Label | Inter | `14px-16px` | `500-700` | `1.4` | `0` | Metadata, section tags, nav labels. |
| Metric | Inter | `40px-64px` | `700` | `1` | `0` | Percentages, revenue values, major proof points. |

### Principles

- Headlines are plain, bold, and outcome-oriented.
- Avoid tight negative tracking; Qount typography is more straightforward than editorial.
- Use metric type as a visual anchor.
- Body copy can be direct and explanatory; it should sound operational, not poetic.

## 4. Component Stylings

### Buttons and Links

- Primary CTA: yellow `#D9FF42` fill, black text, firm rectangular or lightly rounded shape.
- Secondary CTA: white fill with black text on dark backgrounds, or dark outline on light panels.
- Text links: white on dark or black on light; underline is not dominant.
- Hover and active feel: sharpen border, brighten yellow, small upward movement is acceptable but keep it restrained.

### Cards and Containers

- Surface style: mix dark graphite cards and high-contrast white panels.
- Radius: many observed nav/menu surfaces use `10px-20px`; content panels can be `16px-24px`.
- Border: graphite lines on dark, soft gray lines on light.
- Shadow or elevation: low; rely on contrast and spacing.
- Internal spacing: generous, usually `20px-40px` for content cards and panels.

### Inputs and Interactive Controls

- Input treatment: white or graphite field with clear border.
- Focus behavior: yellow outline or dark border plus subtle glow.
- Selection states: selected tab or checkbox should use yellow fill/marker with black text.

### Navigation

- Structure: fixed top header, desktop nav centered with right-side CTAs.
- Background treatment: transparent over dark hero but visually anchored.
- Link style: white, simple, unadorned; CTAs are stronger than nav links.
- Sticky or scroll behavior: fixed header remains available while scrolling long content.

### Image Treatment

- Screenshot treatment: product imagery and canvas diagrams are integrated into large sections.
- Photography or video: customer story cards include video/image proof, paired with metrics and quotes.
- Border and radius treatment: medium radius for rich media cards; avoid overly rounded toy-like corners.

### Distinctive Components

- Metric cards: large percentages like `8-12%`, `3-7%`, `5-10%`, `$150K-$500K`.
- Intelligence tabs: Operational, Client, Performance Intelligence with active panel.
- Comparison blocks: traditional practice management versus Qount practice management.
- Integration logo fields: tool ecosystem proof, spaced and orderly.
- CTA narrative block: "One Platform. Total Visibility." leading into demo action.

## 5. Layout Principles

### Spacing System

- Base unit: `10px` and `20px` are strongly reflected in observed grid variables.
- Repeated spacing values: `20px`, `40px`, `60px`, `70px`, `84px`, `134px`.
- Use larger vertical rhythm for long homepage-like flows.

### Grid & Container

- Grid logic: 12-column grid with `20px` gaps.
- Max content width: `1440px`.
- Container side offset: `60px` on desktop; about `20px` on mobile.
- Section spacing: large vertical sections, often with full-width bands.

### Whitespace Philosophy

- Use confident open space around major claims.
- Balance dense proof content with large statement sections.
- Keep dashboards and product modules structured rather than floating loosely.

### Border Radius Scale

- Micro: `6px-8px` for tags and small controls.
- Standard: `10px-12px` for dropdown/menu items and fields.
- Large: `16px-24px` for cards and major media panels.
- Pill: use sparingly; Qount feels less pill-heavy than Linear.

## 6. Depth & Elevation

| Level | Treatment | Use |
| --- | --- | --- |
| Flat dark | `#1A1A1A`, no shadow | Page canvas and dark bands. |
| Dark card | `#262626` with graphite border | App cards, upload zones, side panels. |
| Light panel | `#FFFFFF` with black text | Important contrast panels and report blocks. |
| Accent | `#D9FF42` fill or outline | Primary action, selected state, intelligence signal. |
| Overlay | `rgba(0,0,0,0.72)` | Modals and image previews. |

### Depth Principles

- Depth comes from high contrast bands and alternating dark/light surfaces.
- Do not blur or glass the core interface.
- Keep shadows utilitarian and mostly reserved for modals, fixed navigation, and raised cards.
- Use yellow as information priority, not decoration.

## 7. Do's and Don'ts

### Do

- Use a grayscale-first system with a single strong yellow accent.
- Make CTAs obvious and businesslike.
- Use metrics and compact proof blocks as visual anchors.
- Alternate dark and white panels to create rhythm.
- Keep copy direct: risk, margin, utilization, visibility, intelligence.
- Use strong rectangular composition and grid discipline.

### Don't

- Do not use blue/purple gradients as the main accent.
- Do not make everything pill-shaped.
- Do not use soft pastel SaaS styling.
- Do not hide important actions in low-contrast ghost buttons.
- Do not overuse decorative shadows or abstract blobs.
- Do not make the page feel playful; it should feel accountable and operational.

## 8. Responsive Behavior

### Breakpoints

| Name | Width | Key Changes |
| --- | --- | --- |
| Mobile | `390px observed` | Hero headline becomes `28px / 32px`; side padding compresses to about `20px`; nav becomes minimal. |
| Tablet | `<= 768px` | Multi-column proof/cards should stack, CTAs become easier touch targets. |
| Desktop | `1280px observed` | Hero headline is `48px / 56px`; fixed header spans the viewport; container uses `60px` side margin. |
| Wide | `1440px max` | Full 12-column grid and generous content spacing. |

### Touch Targets

- CTAs should be at least `40px` high.
- Avoid tiny adjacent links in dense financial workflows.
- Keep checkbox/tile selections clearly visible with yellow selected states.

### Collapsing Strategy

- Desktop behavior: fixed header, large two-column hero, long proof sections, tabbed panels.
- Tablet behavior: stack columns but preserve alternating dark/light section rhythm.
- Mobile behavior: reduce headline scale, use one-column cards, keep main CTA prominent.
- Breakpoint-driven component changes: `48px` hero to `28px`, `60px` margin to `20px`.
- Touch target and spacing adjustments: increase control height and reduce dense side-by-side actions.

## 9. Agent Prompt Guide

### Quick Color Reference

- Primary CTA: `#D9FF42` with `#1A1A1A` text.
- Background: `#1A1A1A`.
- Heading text: `#FFFFFF` on dark, `#1A1A1A` on light.
- Body text: `#C3C4C8` on dark, `#4F4F4F` on light.
- Border or ring: `#333333` on dark, `#E0E0E0` on light.
- Accent: `#D9FF42`.

### Quick Summary

Build a dark-first accounting intelligence interface inspired by Qount. Use a charcoal `#1A1A1A` canvas, bold white Inter headlines, high-contrast white panels, and electric yellow `#D9FF42` for primary actions and selected states. Make the UI feel operational and data-led with metrics, strong grids, and direct business copy. Avoid purple/blue gradients, overly soft cards, and playful decoration.

### Example Component Prompts

- Hero: Create a charcoal hero with a bold `48px` white headline, operational paragraph copy, a yellow primary CTA, a white secondary CTA, and product proof bullets.
- Card: Create a graphite card with a subtle border, compact data label, large metric, and yellow action marker.
- Navigation: Create a fixed dark header with white text links and high-contrast right-side CTAs.
- Button or badge: Create a firm rectangular yellow button with black text, `10px-14px` radius, and a crisp hover border.

### Ready-to-Use Prompt

Use the Qount design language: dark charcoal canvas, Inter typography, bold white business headlines, alternating white information panels, electric yellow `#D9FF42` action states, visible metrics, and a disciplined 12-column grid. Keep the experience serious, operational, and accounting-tech focused while preserving all existing product functionality.

### Iteration Guide

1. Replace blue/purple accents with yellow and grayscale contrast.
2. Strengthen CTAs and selected states so actions are obvious.
3. Use white panels only for high-value contrast sections, not every card.
4. Add metric-like emphasis where the content needs hierarchy.

## Optional Appendix: Interaction Patterns

- Scroll: long page with fixed header and large narrative sections.
- Tabs: intelligence panel uses selected tabs to switch operational/client/performance stories.
- Hover: CTAs and links sharpen through contrast rather than elaborate motion.
- Motion: subtle in-view reveals and canvas visuals; businesslike, not playful.
- Content voice: direct, outcome-focused, emphasizing risk, margin, billing, capacity, visibility, and practice intelligence.
