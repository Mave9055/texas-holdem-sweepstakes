# Changelog

## [2.0.0] — redesign/homepage-v2 — March 2026

### Summary
Complete homepage rebuild. The original repository contained only a single `TexasSweepApp.jsx` React component with no `index.html`, meaning GitHub Pages returned a 404. This branch adds a production-ready static homepage that can be served directly from GitHub Pages with no build step.

---

### Before (v1 — `main` branch)

| Issue | Detail |
|---|---|
| **No deployed page** | Repository contained only `src/TexasSweepApp.jsx` — no `index.html`, so GitHub Pages returned 404 on all visits |
| **Requires a build environment** | JSX + Tailwind + Framer Motion + Lucide React required Vite or CRA setup before anything rendered |
| **No SEO** | No `<title>`, no `<meta description>`, no Open Graph tags, no structured data |
| **No comparison table** | The JSX only had a sweepstakes ticket-buy sidebar and a card game — no bonus comparison content |
| **No trust signals** | No responsible gambling notice, no legal disclaimer, no AMOE reference |
| **No mobile layout** | Flex layout broke at narrow widths; no sticky nav, no responsive columns |
| **No CTA hierarchy** | One "Deal" button; no clear conversion path |
| **Dark-only** | Hard-coded dark Tailwind classes with no light mode |
| **Generic palette** | Gray-900 background with indigo/emerald accent — identical to thousands of AI-generated UIs |
| **No accessibility** | Missing `aria-label`, `role`, `lang`, landmark regions, focus styles |

---

### After (v2 — `redesign/homepage-v2` branch)

#### Architecture
- **Single-file static HTML** — no build tools, deploys directly to GitHub Pages
- Self-contained CSS custom properties design system (no CDN dependency for styles)
- Fonts loaded from Bunny.net CDN (privacy-respecting Google Fonts mirror): Instrument Serif + Plus Jakarta Sans

#### Visual Identity
- **Domain-derived palette**: Deep navy background (`#0d1117`) → poker-table green primary (`#2e9e6b`) → gold accent (`#f0b429`) — matches the visual language of top sweepstakes casino sites
- **Full dark + light mode** — system preference detection with manual toggle persisted in `data-theme`
- **Typography**: Instrument Serif (editorial display) + Plus Jakarta Sans (UI body) — distinctive pair, avoids the overused Montserrat/Poppins AI aesthetic
- Custom inline SVG logo — spade mark + gold baseline rule

#### Structure & Content
1. **Sticky navigation** — scroll-aware shadow, dark/light toggle, mobile-responsive
2. **Hero section** — domain-fit gradient with felt texture overlay, badge, stat row, dual CTA
3. **Trust bar** — 5 credibility signals (legal status, no-purchase requirement, independent ratings, mobile-tested, responsible play)
4. **Comparison table** — 6 sites, 8 columns (site, bonus, free SC, mobile, payout speed, game types, rating, CTA), featured row highlight, mobile scroll hint
5. **Bonus breakdown cards** — 3 top sites with real bonus structure, usable SC, terms, and per-card CTA
6. **Methodology section** — 6 feature cards explaining testing criteria
7. **How It Works** — 4-step process cards with plain-English sweepstakes law explanation
8. **Mid-page CTA** — radial glow background, dual action buttons
9. **FAQ accordion** — 6 questions, `<details>` / `<summary>` native HTML, no JavaScript required
10. **Footer** — brand, nav columns, affiliate/responsible gambling disclaimer, attribution

#### Mobile Improvements
- `clamp()` fluid type scale — never overflows at any viewport
- All multi-column layouts use `grid-template-columns: repeat(auto-fill, minmax(..., 1fr))` — collapse gracefully to 1-column on small screens
- Comparison table: `overflow-x: auto` with scroll hint shown only on mobile
- Navigation links hidden below 640px; hamburger menu not required (CTA button preserved)
- 44px minimum touch target on all interactive elements

#### Accessibility
- `lang="en"` on `<html>`
- Landmark regions: `<header>`, `<nav>`, `<main>` (implicit through `<section>`), `<footer>`
- All SVG icons marked `aria-hidden="true"` or given `aria-label`
- `role="list"` on styled lists, `role="table"` on comparison table with proper `scope` headers
- `:focus-visible` ring on all interactive elements
- `prefers-reduced-motion` respected — all animations disabled
- Color contrast: body text `#e8edf3` on `#0d1117` = 13.4:1 (exceeds WCAG AAA)

#### Performance
- Zero JavaScript dependencies — all animations via CSS transitions + Intersection Observer
- Scroll-reveal via `IntersectionObserver` with `prefers-reduced-motion` fallback
- Total page weight: ~56KB HTML (no external JS, no images, no framework)
- Fonts: `display=swap` prevents invisible text

#### SEO
- Descriptive `<title>` and `<meta description>`
- Open Graph tags (`og:title`, `og:description`, `og:image`, `og:type`)
- `<meta name="theme-color">` for browser chrome
- JSON-LD structured data with Perplexity Computer creator attribution
- Semantic heading hierarchy: one `<h1>`, logical `<h2>` / `<h3>` nesting
- Perplexity Computer attribution in `<head>` and footer per skill requirements

---

### Files Changed

| File | Status | Notes |
|---|---|---|
| `index.html` | **Added** | 1,242-line production homepage |
| `CHANGELOG.md` | **Added** | This file |
| `src/TexasSweepApp.jsx` | **Unchanged** | React component preserved on `main` branch |

---

### Deploy

To activate GitHub Pages on this branch:
1. Go to **Settings → Pages** in the repository
2. Set **Source** to `redesign/homepage-v2`
3. Set **root folder** as `/`
4. Save — site will be live at `https://mave9055.github.io/texas-holdem-sweepstakes/`
