# Responsive Component Craft and Visual Critique Loop

Build accessible, phone-first components from tokens, then verify the rendered pixels across mobile, tablet, and desktop before finishing.

## 1. Interaction States & Accessible Controls

Ship complete states on every interactive control (buttons, links, nav items, inputs, tabs, cards):
- **Required states:** default, `:hover`, `:focus-visible`, `:active` (`scale(0.98)` or `translateY(1px)`), `:disabled`, plus loading, empty, error, and success states where forms or dynamic data exist.
- **Visible focus ring:** `outline: 2px solid var(--accent); outline-offset: 3px;` with `>= 3:1` contrast against surrounding surfaces.
- **Mobile touch targets (`>= 44x44px`):** keep primary buttons, nav toggles, close icons, and Zalo/call CTAs at least `44px` tall and wide (`min-height: 44px; min-width: 44px`). When an icon looks compact, expand its hit area with `::before { content: ""; position: absolute; inset: -10px; }`.
- **Native dialogs & popovers (avoid dropdown clipping):** use native `<dialog>` with `showModal()` and `::backdrop`, or the HTML `popover` attribute / `position: fixed` portals, because placing `position: absolute` menus inside `overflow: hidden` containers clips options across screen widths. Ensure closed `<dialog>` elements stay hidden (`dialog:not([open]) { display: none; }`).
- **Forms:** use visible `<label>` elements above fields (never placeholder-only forms), set input font size `>= 16px` on mobile to prevent browser zoom, validate on blur, and bind error text via `aria-describedby`.
- **Outcome-first button copy:** label buttons with the exact customer outcome ("Đặt lịch tư vấn", "Nhắn Zalo báo giá", "Gửi yêu cầu") rather than vague labels ("Submit", "Click here").

## 2. Motion Discipline and `prefers-reduced-motion`

- **Duration scale:** `100–150ms` instant feedback (press/toggle), `200–300ms` state transitions (hover, dropdowns), `300–500ms` drawer/accordion transitions, `500–700ms` initial hero entrance only.
- **GPU-safe properties:** transition only `transform`, `opacity`, `color`, `background-color`, and `box-shadow` using easing tokens (`--ease-out`, `--ease-expo`). Avoid `transition: all` because it triggers layout thrash and unexpected jumps.
- **Reveal safety:** keep sections visible by default so content remains readable if JavaScript fails or headless screenshots capture mid-scroll.
- **Reduced motion:** honor `@media (prefers-reduced-motion: reduce)` by collapsing `--dur-*` tokens to `0ms` and disabling scroll/entrance transforms.

## 3. Tier 1 vs Tier 2 Token Implementation

| Stack Tier | How Tokens Wire Into Code | Editable Owner Content |
|---|---|---|
| **Tier 1 (1–3 pages)** | Pure HTML5 + `tokens.css` (`starter-tokens-brand.css` or generated via `sync-brand-to-tokens.cjs`) + lightweight vanilla JS | Keep copy, menu items, prices, and phone/Zalo links clearly grouped in HTML or `data/site-data.js` (`window.SITE_DATA` avoids `file://` CORS issues) |
| **Tier 2 (Multi-page / Astro / Next.js)** | Import `tokens.css` in global stylesheet; map Tailwind v4 `@theme` or `tailwind.config` colors/fonts straight to `var(--paper)`, `var(--ink)`, `var(--accent)`, `var(--font-display)`, `var(--font-body)` | Keep editable prose, prices, and media lists inside `src/content/` or `content/` Markdown/JSON files |

## 4. Visual Self-Critique Loop (`render-check.mjs`)

Judge rendered pixels rather than source code alone. Order matters here because running the checker first surfaces real layout breaks before cosmetic tweaks mask them:

1. **Run `scripts/render-check.mjs`** against the local HTML file or dev server URL (requires Node 22+ and Chrome/Edge/Chromium):
   ```bash
   node scripts/render-check.mjs index.html --out render-check
   ```
   It captures full-page screenshots at `375x812`, `768x1024`, and `1440x900`, prints the layout outline, and flags runtime errors, horizontal overflow, squeezed `<main>`, empty grid tracks, low contrast (`< 4.5:1` / `< 3:1`), touching text runs, clipped text, visible closed `<dialog>`, tiny touch targets (`< 40px` flagged, aim `>= 44px`), broken images, and failed fonts.
2. **Fix every `ERROR` and unexplained `WARN`**, then re-run until `render-check.mjs` exits `0`.
3. **Inspect the three viewport screenshots** (and open one interactive drawer/dialog/form state when present). Score the 12-item rubric below (`0` fails, `1` acceptable, `2` polished; aim for `>= 20/24` with zero `0`s):

| # | Criterion | Polished (`2`) looks like |
|---|---|---|
| 1 | Brief fidelity | Visibly expresses the chosen mood, 60/30/10 color balance, and signature element |
| 2 | Hierarchy | Squint test: headline, visual, and single primary action stand out at once |
| 3 | Spacing rhythm | Token-derived scale; intra-group gaps clearly tighter than section gaps |
| 4 | Alignment | Shared grid edges, flush-left readable copy, right-aligned tabular numbers |
| 5 | Vietnamese typography | Verified webfont renders cleanly; stacked marks (`Ắ Ặ Ẫ Ể Ộ Ữ Ự`) show clear breathing room (`line-height >= 1.18`) |
| 6 | Color discipline | Grayscale test holds structure; accent appears only on actions and active states |
| 7 | Depth & shape | One consistent depth strategy and one radius family page-wide |
| 8 | States & feedback | Hover, focus-visible, active, disabled, and form validation states work smoothly |
| 9 | Responsiveness | Zero horizontal scroll at `375px`; sections re-compose rather than shrinking tiny; touch targets `>= 44px` |
| 10 | Anti-AI-slop | Zero banned gradients, emoji headings, identical 3-card icon grids, em-dash titles, or fake metrics |
| 11 | Real content | Customer-focused copy in plain Vietnamese; honest `[Cần bổ sung]` markers where proof is pending |
| 12 | Craft polish | Favicon, clean `<title>`, `tabular-nums`, accessible `<dialog>`/`<details>`, crisp SVG/imagery |

4. **Fix the 3 weakest items and repeat** up to 3 rounds, updating tokens first rather than scattering one-off overrides.
5. **Independent review (`visual-ux-critic`):** hand off the rendered preview or built site (`375x812`, `768x1024`, `1440x900` screenshots + `render-report.json` + project path) to `visual-ux-critic` for final customer-clarity, diacritic, and handover verification.
