# Vietnamese Typography and OKLCH Color System

Choose verified Vietnamese-capable fonts and perceptually balanced colors before writing components, so diacritics never clip and accents keep clear contrast.

## 1. Curated Vietnamese-Safe Font Pairings

Every pair below uses Google Fonts with full `vietnamese` glyph subsets (`ă, â, đ, ê, ô, ơ, ư` plus all five tone marks) and avoids generic unprompted AI defaults.

| Mood | Display Font | Body Font | Best For |
|---|---|---|---|
| **Editorial** | `Lora` (500, 600) or `Newsreader` | `Be Vietnam Pro` (400, 500, 600) | Long-form stories, boutique studios, journalism, bakeries |
| **Luxury** | `Cormorant Garamond` (500, 600) | `Be Vietnam Pro` or `Plus Jakarta Sans` | Spa, aesthetics, jewelry, fine dining, interior architecture |
| **Modern Shop** | `Plus Jakarta Sans` (600, 700) or `Bricolage Grotesque` | `Be Vietnam Pro` (400, 500) | Retail storefronts, modern cafes, lifestyle goods |
| **Organic / Craft** | `Lora` or `Fraunces` (500, 600) | `Nunito` or `Be Vietnam Pro` | Handmade ceramics, farm-to-table, tea, skincare |
| **Tech / SaaS & B2B** | `Plus Jakarta Sans` or `Manrope` (600, 700) | `Inter` or `Be Vietnam Pro` | Consulting firms, B2B services, booking apps, dashboards |

Monospace pairing for prices, invoice codes, or developer tools: `JetBrains Mono` (full Vietnamese support). Load max 2 families and 3–4 weights via Google Fonts `<link>` with `display=swap`, or self-host WOFF2 subsets.

## 2. Stacked Diacritic Line-Height & Tracking Rules

Vietnamese stacks tone marks on top of circumflex, breve, or horn (`Ắ, Ặ, Ẫ, Ể, Ộ, Ữ, Ự`). Standard English display tight-leading (`1.0` or `1.05`) clips top marks inside `overflow: hidden` boxes and collides across wrapped lines.

- **Headings (`h1`–`h3`):** set `line-height: 1.18` to `1.28` (`--leading-display: 1.2` in the starter tokens). Use `1.24–1.28` for high-ascender serifs such as `Cormorant Garamond`.
- **Body copy:** set `line-height: 1.55` to `1.7` (`1.6` editorial, `1.55` dense product UI), measure `45ch–65ch`, and base size `>= 16px` (`1rem`) on readable text and form inputs (prevents iOS Safari zoom).
- **Tracking:** keep display `letter-spacing` gentle (`-0.02em` to `0em`) because tighter negative tracking pushes acute/tilde marks into neighboring letters. Uppercase micro-labels (`11–12px`) take `+0.05em` to `+0.08em`.
- **Dark-mode weight compensation:** light text on dark backgrounds blooms optically; raise body `line-height` by `+0.05` and avoid bold `700+` body paragraphs.
- **Wrapping & numerals:** add `text-wrap: balance` on headings, `text-wrap: pretty` on paragraphs, and `font-variant-numeric: tabular-nums` on prices (`280.000đ`), menus, and KPI counters.

## 3. Zero-Fallback Glyph Verification

Mixed fallback fonts happen when a display face omits a rare Vietnamese glyph (`ự` or `Ẵ`), causing the browser to borrow one letter from Times or Arial. Verify before approving a design:

1. Include a live test block or temporary check containing the full stacked pangram:
   `Ánh nắng chiều rực rỡ phủ lên đồi cỏ xanh mượt, ắp đầy hương trà ướp nhài.`
   and uppercase capitals: `Ắ Ặ Ẫ Ể Ộ Ữ Ự Đ`.
2. Inspect in Chrome DevTools under **Computed -> Rendered Fonts** to confirm only the chosen webfont family renders (zero local system fallback).
3. Run `scripts/render-check.mjs` and confirm zero `font-failed` or `clipped-text` findings across `375x812`, `768x1024`, and `1440x900`.

## 4. OKLCH 60 / 30 / 10 Palette Construction

Use OKLCH (`oklch(Lightness% Chroma Hue)`) to build cohesive palettes where perceived brightness stays predictable across hues.

- **60% Canvas & Neutrals:** set lightness `97%–99%` for light surfaces (`--paper`) or `14%–18%` for dark surfaces, with subtle chroma `0.004–0.014` tinted toward the brand `--hue`. Mixing warm and cool grays on one page breaks cohesion, so derive every neutral from the same hue.
- **30% Supporting Surface:** use a second neutral step (`--paper-2`, `--surface-sunken`) or muted secondary band (`C = 0.015–0.04`) to separate sections without heavy box borders.
- **10% Action Accent:** reserve saturated brand color (`C = 0.12–0.18`) for the primary CTA, active navigation state, selection highlight, and keyboard focus ring. Overusing the accent on inactive icons erases visual hierarchy.
- **Mood-to-Hue Guide:**
  - Warm tones (`hue 20–85`: terracotta, roasted coffee, saffron, warm olive) suit food, craft, hospitality, and handmade retail.
  - Calm organic tones (`hue 130–175`: sage, tea leaf, jade) suit spa, wellness, and natural products.
  - Cool trust tones (`hue 210–255`: deep navy, slate cobalt) suit B2B consulting, education, clinics, and SaaS.
- **Anti-Cream Habit:** warm cream backgrounds are not automatic for every brand; carry warmth through photography and accent colors on crisp off-white (`oklch(98.5% 0.003 H)`) or rich dark ink surfaces when appropriate.

## 5. Contrast Floors and Image Harmony

| Element | Minimum Contrast (WCAG AA) | Rule |
|---|---|---|
| Body copy, labels, placeholders | **4.5 : 1** | Use `--ink` / `--ink-2`, never raw `opacity` on gray text over tinted sections |
| Large headings (`>= 24px` or `>= 18.66px bold`) | **3.0 : 1** | Applies to hero headlines on tinted bands and hero photo scrims |
| Focus rings, active borders, state icons | **3.0 : 1** | Keep `:focus-visible` crisp against both light and dark surfaces |

When placing white text over real photography, add a subtle directional gradient scrim (`rgba(..., 0.55)` behind the text region only) rather than darkening the whole photo. If the user supplies a logo or product photos, run `scripts/extract-colors.cjs` to sample dominant hex values and align the site's `--hue` and accent with their real assets.
