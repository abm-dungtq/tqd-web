# SVG Logo Rules and Brand Kit (`brand.md`)

Establish a durable visual identity in `docs/website/brand.md`, keep SVG marks razor-sharp at every size, and sync colors directly into `design-tokens.json` and `tokens.css`.

## 1. SVG Logo, Monogram, and Emblem Standards

If the user already has a logo file, inspect it, extract dominant hex colors with `scripts/extract-colors.cjs`, and preserve their brand mark. When no logo exists, propose 2–3 clean vector concepts before finalizing:

- **Wordmark:** brand name set in the chosen display typeface with refined tracking and a subtle typographic accent (ideal for boutiques, personal brands, agencies).
- **Monogram:** 1–2 initials inside a geometric frame or clean negative-space cut (ideal for F&B, spas, consulting).
- **Emblem / Icon Mark:** simple symbol tied directly to the craft (a leaf vein, coffee bean split, roof line, thread needle).

### Technical SVG Rules
- **Square `viewBox` for marks:** use `viewBox="0 0 64 64"` (or `0 0 32 32` for favicon) on an integer grid with `<= 8` clean primitives (`<path>`, `<circle>`, `<rect>`). Keep strokes `>= 2px` in a 32px box so lines do not vanish at 16px favicon scale.
- **High-contrast light and dark variants:** ship both a dark-ink mark for light headers and a light-ink mark for dark backgrounds/footers, or use `fill="currentColor"` / `stroke="currentColor"` on monochrome marks so CSS handles polarity switches automatically.
- **Wordmark lockups:** keep a clear buffer of at least `25%` of the mark's width around the logo. Size navbar logos around `32–40px` tall on desktop with `alt="<Tên thương hiệu>"`.
- **Favicon & social sizes:** export `favicon.svg` (`viewBox="0 0 32 32"`, simplified silhouette without tiny inner text), and note `180x180` Apple touch icon and `1200x630` Open Graph share card when building the site.
- **Self-contained vector only:** never embed base64 raster `<image>` tags or external font URLs inside an `.svg` logo file (convert custom wordmark glyphs or keep HTML text alongside a pure geometric mark).

## 2. Syncing `brand.md` to Design Tokens

Use the bundled scripts to verify color consistency and generate project tokens directly from `docs/website/brand.md`:

```bash
# Inspect palette extracted from brand.md
node scripts/extract-colors.cjs --palette --brand-file docs/website/brand.md

# Preview token sync without writing files
node scripts/sync-brand-to-tokens.cjs --brand docs/website/brand.md --dry-run

# Generate design-tokens.json and tokens.css
node scripts/sync-brand-to-tokens.cjs \
  --brand docs/website/brand.md \
  --json-out docs/website/design-tokens.json \
  --css-out styles/tokens.css
```

Run `--dry-run` first when updating an existing site so any custom tokens in `styles/tokens.css` can be preserved intentionally.

## 3. Standard `docs/website/brand.md` Template

Write `docs/website/brand.md` using the headings and Quick Reference table below so both humans and `scripts/sync-brand-to-tokens.cjs` / `scripts/extract-colors.cjs` read the exact same source of truth:

```markdown
# Brand Identity: [Tên Thương Hiệu]

- **Tagline / Positioning:** [1 câu mô tả giá trị cốt lõi bằng ngôn ngữ khách hàng]
- **Industry & Register:** [Ngành nghề] ([Brand | Product])
- **Visual Direction:** [Tên hướng thẩm mỹ, ví dụ: Ấm áp thủ công / Tối giản hiện đại]
- **Brand Voice:** [3 tính từ, ví dụ: Chân thành, Rõ ràng, Ấm áp]
- **Signature Element:** [1 điểm nhấn thị giác đặc trưng]

## Quick Reference

| Role | Value | Notes |
|---|---|---|
| Primary Color | #8B4513 (Terracotta Clay) | Primary CTA, active states |
| Secondary Color | #2F4F4F (Deep Slate) | Supporting bands, headings |
| Accent Color | #D97706 (Warm Amber) | Subtle highlights and focus ring |
| Display Font | Lora | Vietnamese subset enabled, line-height 1.2 |
| Body Font | Be Vietnam Pro | Vietnamese subset enabled, line-height 1.6 |

## Color Palette

### Primary
- **Base** | #8B4513 | Main action buttons and brand focal point
- **Dark** | #6B340E | Hover and pressed states
- **Light** | #F4EAE1 | Soft tinted badges or surface highlights

### Secondary
- **Base** | #2F4F4F | Supporting contrast sections and icons
- **Light** | #E6ECEC | Soft supporting background

### Accent
- **Base** | #D97706 | Focus ring and key indicator

### Neutral
- **Canvas (`--paper`)** | #FAF8F5 | 60% main background (warm-tinted off-white)
- **Surface (`--paper-2`)** | #F2EDE6 | 30% section contrast surface
- **Text (`--ink`)** | #1C1917 | Primary body copy (>= 4.5:1 contrast)
- **Muted (`--ink-2`)** | #57534E | Captions and metadata (>= 4.5:1 contrast)

### Semantic
- **Success** | #15803D | Confirmation and completed states
- **Warning** | #B45309 | Caution notices
- **Danger** | #B91C1C | Validation errors

## Logo & Assets

- **Mark concept:** [Monogram / Wordmark / Emblem description]
- **Light background logo:** `public/logo-dark-ink.svg`
- **Dark background logo:** `public/logo-light-ink.svg`
- **Favicon:** `public/favicon.svg` (square 32x32 viewBox)

## Visual Guardrails

- Keep 60% neutral canvas, 30% supporting surface, 10% primary accent.
- Avoid purple-cyan default gradients, emoji headings, and em-dashes in UI titles.
- Confirm real photography or `[Cần bổ sung]` slots before publishing.
```
