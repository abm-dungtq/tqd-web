---
name: tqd-web-design
description: "Translate plain-language vibe or industry descriptions into complete website visual identities: brand palettes, Vietnamese-safe typography, SVG logos, design tokens, art-directed Hero previews, and responsive UI layouts verified across viewports. Use when defining visual identity, designing a page or UI layout, building a brand kit, or redesigning an existing website's look and feel. Not for full end-to-end site orchestration (tqd-web), copywriting or SEO content (tqd-web-content), or live site health and SEO audits (tqd-web-audit)."
when_to_use: "Invoke when the user wants visual direction, brand colors, Vietnamese font pairing, an SVG logo/favicon, design tokens, a Hero preview, or responsive UI design."
argument-hint: "[brand|redesign|preview|logo] [project-path]"
compatibility: "macOS, Linux, Windows (Node.js >= 22)"
license: "MIT"
metadata:
  author: tqd
  version: "2.3.0"
---

# TQD Web Design: Visual Identity, Tokens, and Art-Directed UI

> **Guardrails:** Follow [rules/AGENTS.md](../../rules/AGENTS.md), this plugin's always-on rules, in every reply. Read it once per session if it is not already in context.
> **Paths:** This skill's folder is `${CLAUDE_SKILL_DIR}` (Claude Code fills this in; on other hosts use the absolute path of the folder that contains this file). Every `scripts/...` and `../<skill>/scripts/...` path below is relative to that folder, not to the website project: run `node "<skill folder>/scripts/<name>" <args>`.

Translate plain-language business vibes ("ấm áp thủ công", "chuyên nghiệp đáng tin cho khách doanh nghiệp") into complete visual identities: color palettes, Vietnamese-safe typography, clean SVG logos, `tokens.css`, art-directed Hero previews, and responsive Tier 1 / Tier 2 UI layouts.

## Activation Boundary

- **Owned here:** visual discovery, `docs/website/brand.md`, SVG logo/monogram/favicon creation, Vietnamese typography and OKLCH palette design, `tokens.css` generation, Hero preview approval, responsive Tier 1 / Tier 2 layout craft, and multi-viewport visual verification.
- **Hand off adjacent work:** end-to-end multi-phase site creation goes to `tqd-web`; page copywriting, keyword mapping, and SEO content go to `tqd-web-content`; live production health, broken link, and technical SEO audits go to `tqd-web-audit`.
- **Precedence:** user-supplied logos, photography, accepted brand guidelines, and existing design systems override starter defaults.

## Choose the Design Route

| Request | Primary Reference & Starter | Output |
|---|---|---|
| New brand & website direction | `references/aesthetic-directions-and-industries.md`, `assets/starter-tokens-brand.css` | `docs/website/brand.md`, `tokens.css`, Hero preview |
| Logo, monogram, or favicon only | `references/logo-and-brand-kit.md`, `scripts/extract-colors.cjs` | Light/dark SVG marks, `favicon.svg`, `docs/website/brand.md` |
| Redesign existing site visuals | Existing CSS/components + `references/taste-exemplars.md` | Updated `tokens.css` and layout diff |
| App, booking portal, or dashboard UI | `data/surfaces.json` via `scripts/design-intel.mjs`, `assets/starter-tokens-product.css`, `references/responsive-component-craft.md` | Product tokens + state map + accessible interactive screens |

## Design Intelligence Lookup (Offline)

Before proposing visual directions, pull a short list from the curated dataset instead of inventing a palette or font pair from memory:

```bash
node "${CLAUDE_SKILL_DIR}/scripts/design-intel.mjs" "<ngành + mood>" --surface landing
```

Surfaces: `landing` (default), `menu`, `booking`, `dashboard`, `auth`, `settings`.

- The script reads `data/*.json` only: 14 style directions, 21 contrast-checked palettes, 10 Vietnamese-safe font pairs, 29 UX rules, and 6 surface maps. No network, Python, or npm dependency.
- If the query matches no keyword, the output says so (`"matched": false`) and `--plan` lists references instead of choosing a direction; ask the owner for an industry and mood before proceeding.
- Use it as a shortlist, not a decision: confirm one direction in plain language with the owner, then write `docs/website/brand.md` and `tokens.css` as usual.
- For `dashboard`, `auth`, and `settings`, the brief also lists required empty/loading/error states and permission notes. Those are design guidance only: this skill does not build a running app, API, or database. A Cloudflare Workers + D1 app slice is **not implemented or verified** here; hand runtime work to `tqd-web-app` and state that limitation before promising it.
- Add `--json` for machine-readable output, `--limit 1-5` to change the number of style candidates, `--plan` for a build checklist, and `--check` to validate the dataset and its 150 KB budget.
- **External DESIGN.md library (optional):** `--refs <dir>` or `TQD_DESIGN_REFS=<dir>` also ranks a folder of DESIGN.md files the user already holds (e.g. Refero Styles exports) by visual tags and zero-or-more industry tags (`unknown` when evidence is thin). Keep that folder outside every repository, never commit or convert it, treat its usage rights as unverified unless the holder confirms them, and borrow structure only (scale, rhythm, colour discipline) with Vietnamese-safe fonts. `scripts/design-refs-tag.mjs <dir>` pre-tags the folder into `<dir>/local-tags.json` offline; its `--jev` flag (off by default, needs `TYPESAFE_API_KEY`) sends untagged descriptions to TypeSafe Jev and must only be used once the holder confirms that sharing is allowed. Rules: `references/external-design-md.md`.

## Workflow Order (Preview Before Full Build)

Visual approval precedes full multi-page construction so misaligned colors, fonts, or layout rhythm are corrected on a single Hero preview rather than across an entire site.

### 1. Plain-Language Discovery and Visual Directions

Never ask non-technical users about OKLCH numbers, CSS custom properties, Tailwind classes, or modular font ratios. Ask at most one focused question per turn to learn:
- **Audience and goal:** who visits the site and the single clearest customer action (Call, Zalo, Book, Buy).
- **Existing assets:** logo files, product photography, storefront colors, or reference websites they like.
- **Desired mood:** 2–3 feelings customers should sense on first load.

Translate their industry and mood into **2–3 plain-language visual directions** tied to the sector playbooks in `references/aesthetic-directions-and-industries.md` (F&B/cafes, Spa/beauty, Retail/craft, B2B consulting, Courses/personal brands). When a logo or photo already exists, inspect dominant hex colors with:

```bash
node scripts/extract-colors.cjs <image-path> --brand-file docs/website/brand.md
```

### 2. Brand Kit, SVG Logo, and Vietnamese-Safe Tokens

Record confirmed identity choices in `docs/website/brand.md` using the structure in `references/logo-and-brand-kit.md` so both people and token scripts read the same source of truth.

- **SVG logo and favicon:** keep supplied marks intact when valid; otherwise propose 2–3 geometric SVG concepts (wordmark, monogram, or emblem) on a square `viewBox` (`0 0 64 64`), shipping high-contrast light and dark variants plus a simplified `32x32` `favicon.svg`.
- **Vietnamese-safe typography (`references/vietnamese-typography-and-color.md`):** choose verified Google Fonts with full `vietnamese` subsets and keep `--leading-display: 1.2` (`1.18–1.28`) so stacked diacritics (`Ắ Ặ Ẫ Ể Ộ Ữ Ự`) never clip:
  - Editorial / Craft: `Lora` display + `Be Vietnam Pro` body
  - Luxury / Spa: `Cormorant Garamond` display + `Be Vietnam Pro` body
  - Modern Shop / SaaS / B2B: `Plus Jakarta Sans` display + `Be Vietnam Pro` or `Inter` body
- **OKLCH 60/30/10 palette:** tint 60% neutral canvas toward one brand hue, spend 30% on supporting surfaces, and reserve 10% accent for primary actions and focus rings (`>= 4.5:1` body text, `>= 3:1` headings and UI controls).
- **Token files:** start from `assets/starter-tokens-brand.css` (landing, shop, editorial) or `assets/starter-tokens-product.css` (booking portal, dashboard, settings), or generate `design-tokens.json` and `tokens.css` straight from `docs/website/brand.md`:

```bash
node scripts/sync-brand-to-tokens.cjs \
  --brand docs/website/brand.md \
  --json-out docs/website/design-tokens.json \
  --css-out styles/tokens.css
```

### 3. Art-Directed Hero Preview and Responsive Tiers

Build a real HTML/CSS Hero preview (plus the first supporting section) using actual brand colors, Vietnamese fonts, SVG logo, and real or `[Cần bổ sung]` content so the user evaluates the site in a browser before full rollout.

- **Tier 1 (1–3 pages: Landing, Menu, Portfolio):** semantic HTML5 + `tokens.css` + lightweight progressive JS with zero build step required.
- **Tier 2 (Multi-page Business, Blog, Catalog):** Astro or Next.js importing `tokens.css` and mapping Tailwind `@theme` or theme config values directly to `var(--paper)`, `var(--ink)`, `var(--accent)`, `var(--font-display)`, and `var(--font-body)`, keeping editable copy and prices isolated in content files.
- **Anti-AI-slop rules (`references/aesthetic-directions-and-industries.md`):** reject unprompted purple-cyan gradients, gradient text, emoji heading spam, identical 3-card icon grids everywhere, em-dashes (`—`) in UI headings, `lorem ipsum`, and fabricated testimonials or round metrics (`10,000+`).
- **Component & mobile quality (`references/taste-exemplars.md`, `references/responsive-component-craft.md`):**
  - Rank content visually and separate unrelated groups with whitespace before adding borders.
  - Wire complete interaction states (`hover`, `focus-visible`, `active`, `disabled`, loading/error) with `prefers-reduced-motion` fallbacks.
  - Keep mobile touch targets `>= 44x44px`, use `min-height: 100dvh` on full-bleed heroes, and build overlays with native `<dialog>` or `popover` so menus never clip inside `overflow: hidden`.

### 4. Visual Self-Critique and Independent Verification

Judge rendered pixels before declaring design work finished (`references/responsive-component-craft.md`).

1. Run the multi-viewport layout and screenshot checker (Node 22+ and Chrome/Edge/Chromium):
   ```bash
   node scripts/render-check.mjs index.html --out render-check
   ```
2. Fix every reported `error` (horizontal overflow, squeezed `<main>`, broken images, visible closed `<dialog>`, runtime JS error) and unexplained `warn` (low contrast, clipped text, tiny touch targets, failed fonts).
3. Inspect the `375x812`, `768x1024`, and `1440x900` screenshots against the 12-item craft rubric (target `>= 20/24`, zero `0`s), verify zero Vietnamese font fallback jumps, and refine through tokens up to 3 rounds.
4. Hand off the rendered preview or built site to `visual-ux-critic` for independent first-screen clarity, Vietnamese diacritic, and owner-handover review.

## Done When

- `docs/website/brand.md`, SVG logo/favicon assets (when created), and `tokens.css` reflect the user-approved visual direction.
- New brands start from a `design-intel.mjs` brief (or the brief is explicitly waived by the owner); app surfaces include the required empty/loading/error states listed in `data/surfaces.json`.
- `scripts/render-check.mjs` exits `0` across `375x812`, `768x1024`, and `1440x900` with clean screenshots and rubric scores logged (if no headless browser is available, report skipped browser checks explicitly).
- `visual-ux-critic` passes the layout for customer clarity, Vietnamese typography, mobile touch targets, and anti-AI-slop compliance.

## Bundled Resources

| File | Purpose |
|---|---|
| `assets/starter-tokens-brand.css` | Brand/editorial OKLCH + Vietnamese font token starter |
| `assets/starter-tokens-product.css` | Product/portal OKLCH + fixed-rem token starter |
| `references/vietnamese-typography-and-color.md` | Vietnamese font pairings, diacritic leading, OKLCH 60/30/10, contrast |
| `references/aesthetic-directions-and-industries.md` | Aesthetic directions, 5 Vietnamese industry playbooks, anti-AI-slop rules |
| `references/logo-and-brand-kit.md` | SVG mark/favicon rules and `docs/website/brand.md` template |
| `references/taste-exemplars.md` | Code-backed typical vs tasteful UI comparisons |
| `references/responsive-component-craft.md` | Accessible states, motion, Tier 1/2 wiring, `render-check` rubric |
| `references/external-design-md.md` | Optional `--refs` DESIGN.md library: usage rights, tagging limits, conversion rules |
| `scripts/extract-colors.cjs` | Extract brand palette from `brand.md` and check color compliance |
| `scripts/sync-brand-to-tokens.cjs` | Generate `design-tokens.json` and `tokens.css` directly from `brand.md` |
| `scripts/render-check.mjs` | Multi-viewport headless Chrome layout & screenshot diagnostic runner |
| `scripts/design-intel.mjs` | Offline lookup over the curated style, palette, font, UX and surface data |
| `data/*.json` | Curated design dataset (MIT, upstream commit pinned in `data/README.md`) |
| `scripts/tests/design-intel.test.mjs` | Data integrity, contrast, font whitelist, attribution and CLI tests |
| `scripts/tests/design-scripts.test.mjs` | Unit/CLI tests for color extraction and token sync |
| `scripts/tests/render-check.test.mjs` | Automated fixture tests for `render-check.mjs` |
