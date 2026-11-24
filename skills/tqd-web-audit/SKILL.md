---
name: tqd-web-audit
description: "Inspect and fix websites (static HTML folders, local dev servers, or live URLs) for mobile and desktop layout issues, Core Web Vitals speed risks, accessibility, broken links, leftover placeholders, and search/AI discoverability, then report in plain Vietnamese by customer impact. Use when auditing, debugging layout, speed, accessibility, or SEO/GEO/AX issues, or running pre-launch checks on an existing site. Not for creating brand identity or UI from scratch (tqd-web-design), writing page copy (tqd-web-content), or setting up hosting and forms (tqd-web-launch)."
when_to_use: "Invoke when inspecting or fixing an existing website, local dev server, or HTML build folder for mobile layout, Core Web Vitals, accessibility, broken links, placeholders, or search/AI visibility."
argument-hint: "[url|folder] [--fix] [--plain-report]"
compatibility: "macOS, Linux, Windows (Node.js >= 20)"
license: "MIT"
metadata:
  author: tqd
  version: "2.4.0"
---

# tqd-web-audit: Website Health, UX & Discovery Auditor

> **Guardrails:** Follow [rules/AGENTS.md](../../rules/AGENTS.md), this plugin's always-on rules, in every reply. Read it once per session if it is not already in context.
> **Paths:** This skill's folder is `${CLAUDE_SKILL_DIR}` (Claude Code fills this in; on other hosts use the absolute path of the folder that contains this file). Every `scripts/...` and `../<skill>/scripts/...` path below is relative to that folder, not to the website project: run `node "<skill folder>/scripts/<name>" <args>`.

Inspect static HTML folders, local dev servers, or live website URLs across layout, speed, accessibility, content hygiene, and search/AI discoverability, then repair verified defects (`--fix`) or deliver a jargon-free Vietnamese report ordered by customer impact.

## When to use and boundaries

- **Use when** checking an existing website, HTML build folder, or preview URL for mobile/desktop layout defects, Core Web Vitals speed risks (LCP, CLS, INP), accessibility gaps, broken local links, leftover placeholders, or SEO/GEO/AX readiness.
- **Not for** creating a brand palette, typography system, or new page UI from scratch (route to `tqd-web-design`); authoring or rewriting persuasive copy and keyword strategy (route to `tqd-web-content`); or configuring domains, hosting, analytics, and lead forms (route to `tqd-web-launch`).
- **Safety boundary:** Audit live production URLs read-only unless the user explicitly asks to edit local source files, and pause before submitting real forms, exposing secrets, or altering live domain settings.

## Modes and flags

- **Default (Audit & Report):** Run deterministic checks, capture visual evidence, and output findings grouped by customer impact without modifying site files.
- **`--fix`:** Repair verified HTML, CSS, JS, speed, accessibility, and discovery defects directly in the local codebase, then re-run every applicable check until clean.
- **`--plain-report`:** Produce a zero-jargon owner report in everyday Vietnamese using the translation table in `references/mobile-and-visual-rubric.md` so non-technical owners immediately see what blocks customers versus what can wait.

## Checks by target type

Select the checks matching what the user provided so static builds work offline while running sites verify live HTTP and rendering behavior:

| Target | Primary Checks | Discovery & Visual Tools |
|---|---|---|
| Static HTML folder or `.html` file | Offline metadata, heading order, `alt`/`src`, placeholders, local broken links | `scripts/audit-html-health.mjs` + `../tqd-web-design/scripts/render-check.mjs` (when Chromium is available) |
| Local dev server (`http://localhost:...`) | Live layout at 3 viewports, console errors, SSR HTML, `robots.txt`, `sitemap.xml`, `llms.txt` | `../tqd-web-design/scripts/render-check.mjs` + `scripts/check-discovery-surfaces.mjs <url> --site-origin <prod>` |
| Live website URL (`https://...`) | Live rendering, mobile usability, CWV risk inspection, full SEO/GEO/AX surface audit | `../tqd-web-design/scripts/render-check.mjs` + `scripts/check-discovery-surfaces.mjs <url>` |

## Audit workflow

Execute these phases in order because baseline script output and viewport captures anchor both repair priorities and post-fix verification:

### 1. Run deterministic baseline checks

- For a local folder or single `.html` file, run the offline auditor (add `--strict-placeholders` before launch so unfinished `[Cần bổ sung` tags surface as blockers):

```bash
node scripts/audit-html-health.mjs <file.html|folder> [--strict-placeholders] [--json]
```

- For a running dev server or live URL, run the HTTP discovery scanner (pass `--site-origin <production-url>` on local previews so canonical and sitemap URLs map onto the local host):

```bash
node scripts/check-discovery-surfaces.mjs <base-url> [--site-origin <prod-url>] [--sample 10] [--json]
```

### 2. Capture viewports and inspect the 7-point rubric

When Node 22+ and a local Chrome, Edge, or Chromium binary exist, capture screenshots and DOM diagnostics across `375x812`, `768x1024`, and `1440x900` by running the sibling `tqd-web-design` visual checker (from the plugin's `skills/` directory):

```bash
node ../tqd-web-design/scripts/render-check.mjs <index.html|url> --out .audit-shots --viewports 375x812,768x1024,1440x900
```

Inspect the rendered screenshots and DOM diagnostics against `references/mobile-and-visual-rubric.md`:
1. First-screen clarity (5-second test: offer, audience, single primary CTA).
2. Zero horizontal overflow across `375x812`, `768x1024`, and `1440x900` (and 320px narrow reflow).
3. Clean Vietnamese diacritics (`Be Vietnam Pro` / verified faces, heading `line-height` 1.18–1.28, body `>= 1.55`).
4. Tap targets `>= 44x44px` on touch screens with comfortable spacing.
5. Readable WCAG AA contrast (`>= 4.5:1` body, `>= 3:1` large headings and controls).
6. Honest proof and zero placeholder leaks (`lorem ipsum`, `TODO`, `example.com`, `[Cần bổ sung`, or AI visual clichés).
7. Zero browser console errors, failed network loads, or broken images.

### 3. Audit speed, accessibility, and discovery gaps

- Review hero image loading, explicit media dimensions, `font-display: swap`, non-blocking JS, semantic landmarks (`<header>`, `<nav>`, `<main>`, `<footer>`), `:focus-visible`, `prefers-reduced-motion`, and accessible form validation using `references/speed-and-accessibility-fixes.md`.
- Review `robots.txt`, `sitemap.xml`, `llms.txt`, self-referencing canonicals, Open Graph cards, valid JSON-LD, and custom `404.html` using `references/ax-discovery-checklist.md`.

### 4. Apply fixes (`--fix`) and re-verify

- Apply deterministic technical repairs in the project's existing stack without inventing reviews/metrics or removing real owner copy: add missing `<html lang>`, viewport, unique titles/descriptions, heading order, `img` `alt` and dimensions, `preload`/`fetchpriority="high"`, `font-display: swap`, `defer`, `:focus-visible`, `prefers-reduced-motion`, `robots.txt`, `sitemap.xml`, `llms.txt`, and `404.html`.
- Ask the owner before filling missing `[Cần bổ sung: ...]` business facts, replacing real copy, or changing AI training-crawler policy (`GPTBot`, `ClaudeBot`, `Google-Extended`).
- Re-run `scripts/audit-html-health.mjs`, `scripts/check-discovery-surfaces.mjs` (when a URL is running), and `../tqd-web-design/scripts/render-check.mjs` (when browser rendering applies) so every fix is backed by fresh passing output.

### 5. Coordinate isolated visual sign-off

For release sign-off or after `--fix` repairs, delegate an independent visual review to the `visual-ux-critic` agent, passing the target path or URL, captured `.audit-shots/` PNG paths, and latest script outputs. Fix any blocking visual defect `visual-ux-critic` identifies and re-run the checks.

## Plain-Vietnamese report format

Present findings in everyday Vietnamese ordered by customer impact rather than developer jargon (use the translation table in `references/mobile-and-visual-rubric.md`, especially with `--plain-report`):

```markdown
# Báo Cáo Kiểm Tra Website: <Tên/URL>
- **Phạm vi đã kiểm tra:** Điện thoại (375x812), Máy tính bảng (768x1024), Máy tính (1440x900), tốc độ & Google/AI.

## 1. Chặn trải nghiệm khách (Cần sửa ngay)
- **[Mô tả dễ hiểu theo góc nhìn khách hàng]** — *Bằng chứng:* `file:line` hoặc ảnh chụp. *Cách xử lý:* ...

## 2. Nên nâng cấp (Giúp tải nhanh & lên Google/AI tốt hơn)
- **[Mô tả lợi ích khi nâng cấp]** — *Bằng chứng:* ... *Cách xử lý:* ...
```

Cite observed evidence for every finding (`file:line`, viewport, screenshot path, or script exit output). State clearly if any browser or live-URL check could not run so unexecuted checks are never reported as passes.

## Resources

- `references/mobile-and-visual-rubric.md` — 7-point viewport inspection across `375x812`, `768x1024`, `1440x900` and plain-Vietnamese symptom translation table.
- `references/speed-and-accessibility-fixes.md` — static and framework recipes for LCP, CLS, INP, semantic landmarks, `focus-visible`, `prefers-reduced-motion`, and safe form validation.
- `references/ax-discovery-checklist.md` — SEO/GEO/AX checklist (`robots.txt`, `sitemap.xml`, `llms.txt`, canonicals, Open Graph, JSON-LD, custom `404.html`) and script usage.
- `scripts/audit-html-health.mjs` — standard-library Node >= 20 offline HTML & local-link checker (cross-platform: macOS, Linux, Windows).
- `scripts/check-discovery-surfaces.mjs` — standard-library Node >= 20 HTTP SEO/GEO/AX discovery scanner (cross-platform: macOS, Linux, Windows).

## Done when

- All applicable checks (`audit-html-health.mjs`, `check-discovery-surfaces.mjs`, and `../tqd-web-design/scripts/render-check.mjs`) have executed or any environment limitation is explicitly noted.
- Findings are reported in plain, jargon-free Vietnamese grouped under **Chặn trải nghiệm khách** and **Nên nâng cấp** with concrete evidence.
- In `--fix` mode, all targeted blockers are repaired, re-verified clean (`exit 0`), and signed off with `visual-ux-critic` when visual rendering applies.
