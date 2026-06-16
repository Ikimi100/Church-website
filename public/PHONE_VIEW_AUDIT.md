# Phone-View Audit — Messianic Movement site

Scope: every page in `public/`, reviewed for small-screen (~360–390px) behaviour.
Date: 2026-06-16.

## What is already solid (no action needed)

- **Viewport meta** is present on every page.
- **Global guards** in `style.css`: `body { overflow-x: hidden }` and `* { box-sizing: border-box }` prevent sideways scrolling site-wide.
- **Mobile nav** works everywhere: `script.js` injects a `.mobile-menu-toggle` hamburger into each page's nav at runtime, and `style.css` hides the desktop links / shows the slide-down menu under 768px. (That's why no page hard-codes the button.)
- **Checkout** (`checkout.html`) has no inline media queries but still stacks correctly — the shared `.checkout-section` rule collapses `1.6fr 1fr` to a single column at 768px.
- **No data tables** anywhere, so no table-overflow problems.
- **Hero manifesto ticker** (homepage): FIXED — on phones it now shows one full, wrapped phrase at a time, fading every 10s; the horizontal scroll is disabled below 768px. Desktop unchanged.

## Issues found, by priority

### P1 — worth fixing
1. **Grids that stop at 2 columns on phones.** Several pages collapse `repeat(3/4, 1fr)` grids only to 2 columns (at the 1024px breakpoint) and never to a single column, so cards stay cramped at 360px.
   - `faith_dimension.html`: `.pathways-grid`, `.teachings-grid` stay 2-up (only `.resource-grid` reaches 1 column, at 400px).
   - Candidates with the same pattern to verify: `compassion_works.html`, `global_response.html`, `gospel_revolution.html`, `giving.html`, `donate.html`, `divine_episodes.html`.
   - Fix: add a `@media (max-width: 480px)` rule forcing these grids to `1fr`.

### P2 — polish
2. **Inline fixed pixel widths** (`width: 300–700px`) on a handful of decorative/media elements in `faith_dimension`, `zion_music`, `items`, `gospel_revolution`, `divine_episodes`. The global `overflow-x: hidden` stops them from causing scroll, but they can still overflow their container visually. Convert the genuinely fixed ones to `max-width: 100%`.
3. **`zion_music.html`** (Spotify-style player) is the most custom layout and the most likely to need hands-on checking of the track list / player bar at 360px.
4. **`items.html`** store grid — confirm product cards reach a comfortable 1–2 columns and that price/quantity controls keep a 44px tap target.

### P3 — consistency
5. Tighten heading sizes on the longest hero titles for ~360px so they don't run to 3–4 lines (minor).

## Progress
- DONE (P1): added a `@media (max-width: 600px)` rule to `faith_dimension`, `compassion_works`, `global_response`, `gospel_revolution`, `divine_episodes`, `giving`, `donate`. Content-card grids now go to one column; stat / donation-amount / payment grids go to a tidy 2-up instead of a single tall column.
- DONE (P2): hand-checked `zion_music.html` — already fully responsive (album art 232→160px, all grids collapse, now-playing bar trims on mobile); no change needed. Hand-checked `items.html` — store grid already collapses to one column; fixed the book modal, which was cramped on phones (modal + content padding left only ~200px usable at 360px) by reducing mobile padding and heading size.
- REVIEWED (P2): remaining fixed-px widths are decorative only (loader bars, logo marks, radial-glow backgrounds) and sit safely behind content under the global `overflow-x: hidden` — left as-is.
- Cache version bumped to `?v=20260621` site-wide.

- DONE (P3): hero headings checked site-wide. Homepage already shrinks correctly; `never_again` already has a mobile size; only `faith_dimension` had an oversized title (48px floor at 360px) — added a mobile reduction so "Faith Dimension" fits cleanly. Other ministry pages don't define oversized hero titles.
- Cache version now `?v=20260622` site-wide.

## Site-wide grid + ticker pass (latest)
- Every card-bearing page now collapses its card grids to a neat single column on phones (35 pages total). Stat / donation-amount / payment grids drop to a tidy 2-up instead of one tall column. Home page left as-is (already good).
- All scrolling "ticker" messages are now static on phones with a 10-second crossfade. The home page uses the shared script; `faith_dimension` (a self-contained page that doesn't load the shared CSS/JS) got its own inline fade styling + script so it behaves identically.
- Pages with no card grids (`checkout`, `watch`, `weekly-bereisheet`) and `items`/`zion_music` (already responsive) needed no grid changes.

## Status: P1–P3 + site-wide grids/tickers complete
Remaining is just a real-device pass after deploy — glance at `donate`, `giving`, the `items` book modal, the `faith_dimension` hero + ticker, and a couple of ministry/weekly pages.

> Reminder: changes only reach the live Vercel site after `git commit` + `git push`.