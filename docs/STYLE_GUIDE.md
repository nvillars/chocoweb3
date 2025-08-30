# Style Guide — La Dulcerina (starter)

This document summarizes the core design tokens and usage examples for the site.

Colors
- Brand cacao: `#5A3E36` (brand-700)
- Brand caramel: `#D4A373` (brand-300)
- Gold accent: `#C4A062`
- Neutrals: `#111827` (900), `#6B7280` (500), `#F8F5F2` (50)

Typography
- Display: Playfair Display via `next/font` — used for H1/H2 and editorial headings.
- UI: Inter via `next/font` — used for body, inputs and buttons.

Spacing & Radius
- Spacing scale: 4/8/12/16/24/32/48 (use tailwind spacing tokens)
- Card radius: `var(--radius)` / `rounded-card` (14px)

Shadows & Motion
- Soft shadow: `shadow-soft` (soft elevation)
- Larger hover: `shadow-lg-soft`
- Micro-interactions: transition duration 150–200ms, ease-out.

Usage examples
- Use `btn-primary` for primary CTAs (see `src/app/globals.css`).
- Use `card` for elevated containers.

Exported tokens are defined in `tailwind.config.js` and CSS variables in `src/app/globals.css`.
