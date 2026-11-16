---
name: tqd-web-content
description: "Write and polish natural Vietnamese website copy, UI microcopy, and SEO/GEO blog articles by integrating viet-pro standards and CLI gates with editable docs/website/content/ and src/content/ storage. Use when writing or humanizing landing pages, service descriptions, form microcopy, keyword-mapped articles, sitemaps, robots.txt, llms.txt, or JSON-LD schema. Not for visual design or color tokens (tqd-web-design), site-wide technical or UX audits (tqd-web-audit), or deployment, forms, and checkout wiring (tqd-web-launch)."
when_to_use: "Invoke for website copy, UI microcopy, humanizing web prose, SEO/GEO blog articles (article, pillar, comparison), keyword sitemaps, or JSON-LD via viet-pro and bundled scripts; route layout/styling to tqd-web-design, audits to tqd-web-audit, and deploy/forms to tqd-web-launch."
argument-hint: "[copy|microcopy|humanize|article|seo|schema] [page-or-topic]"
compatibility: "macOS, Linux, Windows (Node.js >= 20)"
license: "MIT"
metadata:
  author: tqd
  version: "2.0.0"
---

# TQD Web Content

Write real, persuasive, human-sounding website copy in plain Vietnamese (or the user's requested language) and structure every page for both Google Search and AI answer engines (GEO). Separate editable text, prices, and contact details cleanly into `docs/website/content/` and `src/content/` so non-technical business owners can update their site without touching HTML, CSS, or application code.

This skill generates JSON-LD structured data and XML sitemaps as clean, framework-agnostic static files via bundled Node.js scripts without WP or PHP CMS plugins or external server dependencies.

## Scope and Hand-offs

- **Owned by `tqd-web-content`:** Landing and product copy, pricing framing, Vietnamese CRO checks, keyword-intent mapping, `docs/website/sitemap.md`, blog articles, `<title>`/`<meta>`/Open Graph copy, `robots.txt`, `sitemap.xml`, `llms.txt`, `<page>.md` twins, and JSON-LD generation and validation.
- **Not for visual design (`tqd-web-design`):** Brand voice foundations, color palettes, typography tokens, and page layouts belong to `tqd-web-design`.
- **Not for site-wide audits (`tqd-web-audit`):** Live browser visual critique, Core Web Vitals checks, and rendered HTML health audits belong to `tqd-web-audit`.
- **Not for launch wiring (`tqd-web-launch`):** Domain DNS setup, production deployment, Zalo/form/webhook integration, analytics, and checkout belong to `tqd-web-launch`.

## Content Storage Layout

Keep planning copy and editable site data separate from presentation components so owners can safely update offers, phone numbers, and prices later:

- **Planning & hand-off drafts:**
  - `docs/website/sitemap.md` — URL inventory, search intent, primary CTA, and schema type per page.
  - `docs/website/content/<page>.md` — approved page copy sections, FAQ answers, and metadata before or alongside build.
- **Production editable content:**
  - `src/content/pages/<page>.md` (or `.json`) — page headlines, service descriptions, pricing tiers, and testimonials.
  - `src/content/blog/<slug>.md` — search-led articles with clean frontmatter (`title`, `description`, `publishedAt`, `author`, `coverImage`).
  - `src/content/site.json` — global phone, Zalo link, opening hours, address, and social links shared across pages and JSON-LD.

## Discovery and Language Handling

- **Read existing project context first:** When `docs/website/brief.md` or `docs/website/brand.md` exists, reuse its audience, brand tone, primary CTA, and confirmed proof rather than re-asking answered questions.
- **Plain-language intake when facts are missing:** Ask one focused everyday question at a time (who buys, what makes them hesitate, real prices or warranty terms, preferred contact channel) instead of asking technical SEO or framework questions.
- **Vietnamese default and other languages:** Write in clear, natural Vietnamese by default. When the user requests English or another language, keep the same anti-AI-slop, truth-grounding, and SEO/GEO structure in the requested language and skip `viet-pro gate` since `viet-pro` targets Vietnamese prose.

## Editorial, Truth, and `viet-pro` Integration

1. **Use `viet-pro` for Vietnamese website copy and articles:** Load `references/viet-pro-web-writing.md` whenever drafting, rewriting, or humanizing Vietnamese pages, UI microcopy, or blog articles. When the `viet-pro` CLI is installed (`command -v viet-pro` or `~/.local/bin/viet-pro`), initialize project voice with `viet-pro init`, follow its Thinking-to-Prose discipline (active Vietnamese subjects, zero translationese), and validate drafts through the CLI pipeline below.
2. **Ban cliché AI fluff:** Exclude empty phrasing such as `"nâng tầm trải nghiệm"`, `"giải pháp đột phá"`, `"hàng đầu"`, `"tối ưu hóa quy trình"`, `"Seamless"`, `"Elevate"`, and excessive em-dashes (`—`). Replace vague adjectives with concrete numbers, delivery times, materials, warranties, or customer outcomes.
3. **Ground every claim in user facts:** Base specs, turnaround times, prices, guarantees, and testimonials strictly on facts supplied by the user or recorded in `docs/website/brief.md`. When proof is missing, insert honest `[Cần bổ sung: ...]` markers (for example `[Cần bổ sung: 2 phản hồi thật kèm tên khách hàng]`) rather than fabricating reviews, ratings, or partner counts.
4. **`viet-pro` CLI verification pipeline (with graceful fallback):**
   - **Audit existing pages before rewriting:** `viet-pro scan <old.md>` to measure AI-slop score (`0-100`).
   - **Check SEO/GEO article limits:** `viet-pro check-platform blog-seo <article.md> --surface <article|pillar|comparison> --keyword "<từ khóa>" --slug "<slug>" --title "<meta title>" --description "<meta desc>"`.
   - **Protect prices, links, and numbers after edits:** `viet-pro compare <before.md> <after.md>`.
   - **Run full editorial gate & SHA-256 stamp:** `viet-pro gate <file.md>` (add `--platform blog-seo --surface ...` for articles, and `--review-ticket <02-review-ticket.md>` for **any** draft `>= 800` words). If `flagged_defects` remain or `rhythm_score_0_to_3 < 2.0`, revise and rerun up to two rounds.
   - **Fallback when `viet-pro` is absent on host:** Apply the built-in 3-surface structure and anti-AI-slop rules in `references/viet-pro-web-writing.md` plus the 12-point CRO check in `references/conversion-copy-vn.md`, and report honestly that the automated `viet-pro` CLI gate did not run.

## Mode Routing and References

Load only the reference file that matches the active sub-task so context stays focused:

| Mode | When to choose | Load reference | Primary deliverable |
|---|---|---|---|
| `copy` | Landing page, hero, pricing, CTA, or service/product copy | `references/viet-pro-web-writing.md` + `references/conversion-copy-vn.md` | `docs/website/content/<page>.md`, `src/content/` |
| `microcopy` | Buttons, form labels, errors, empty states, confirmation notices | `references/viet-pro-web-writing.md` | UI copy map / `src/content/site.json` |
| `humanize` | Rewrite stiff AI website prose while keeping exact specs and numbers | `references/viet-pro-web-writing.md` (`scan`, `compare`, `gate`) | Polished page copy + comparison result |
| `article` | Sitemap planning, Vietnamese keyword intent, blog (`article`, `pillar`, `comparison`) | `references/viet-pro-web-writing.md` + `references/keyword-and-article-playbook.md` | `docs/website/sitemap.md`, `src/content/blog/<slug>.md` |
| `seo` | Page meta tags, Open Graph, `robots.txt`, `sitemap.xml`, `llms.txt`, `.md` twins | `references/seo-and-geo-surfaces.md` | Meta specs, `robots.txt`, `sitemap.xml`, `llms.txt` |
| `schema` | Generating or validating JSON-LD structured data | `references/schema-recipes.md` | `<page>-schema.json` or inline JSON-LD |

## SEO, GEO, and Schema Summary

- **One search intent per URL:** Map buying, comparing, learning, and local queries cleanly so pages reinforce rather than compete with one another.
- **Google vs. AI answer engines:** Google Search evaluates indexed HTML, speed, and helpful content (ignoring `llms.txt` and `.md` twins). Ship `robots.txt` rules allowing search/citation bots (`OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot`), curated `/llms.txt`, and `<page>.md` twins with `X-Robots-Tag: noindex` to support AI retrieval without indexing duplication.
- **Active Schema.org focus:** Emit `Organization`, `LocalBusiness`, `Product`, `Article`, and `BreadcrumbList` matching visible page text and absolute `https://` URLs. Google stopped showing FAQ rich results on `2026-05-07` and retired `HowTo` rich results in 2023, so keep FAQs visible for human readers rather than chasing retired rich snippets.

## Bundled Scripts (Node.js >= 20, macOS / Linux / Windows)

Run scripts from the `tqd-web-content` skill directory or pass their path explicitly:

```bash
# Generate JSON-LD (article, product, organization, localbusiness, breadcrumb, faq, howto)
node scripts/generate-schema.cjs product --data product.json --output product-schema.json

# Validate JSON-LD via file or stdin (exits 0 on pass, 1 on errors)
node scripts/validate-schema.cjs -f product-schema.json
cat product-schema.json | node scripts/validate-schema.cjs

# Generate XML sitemap (omits lastmod when undated; escapes XML special characters)
node scripts/generate-sitemap.cjs https://example.com ./public/sitemap.xml --pages pages.json

# Run bundled script unit tests
node --test scripts/tests/*.mjs
```

## Owner Handover Expectations

When content changes are finished for a website project, align editable paths and labels with the site's `HUONG-DAN-SUA-WEB.md` guide so the owner knows:

- Which exact files under `src/content/` hold headlines, prices, phone numbers, and Zalo links.
- Which `[Cần bổ sung: ...]` placeholders still await real photos, testimonials, or certificates before launch.
- How to add a new blog post in `src/content/blog/` using the frontmatter template in `references/keyword-and-article-playbook.md` and regenerate `sitemap.xml` when URLs change.

## Working Sequence

Order matters for multi-page projects because URL mapping and truth boundaries lock downstream copy, internal links, and structured data:

1. Collect real business facts, customer objections, primary conversion channel (Zalo, call, booking, buy), and unverified gaps from `docs/website/brief.md` or the owner.
2. Plan or update `docs/website/sitemap.md` when working across multiple pages so each URL owns one clear intent.
3. Draft conversion pages and articles into `docs/website/content/` and `src/content/`, inserting `[Cần bổ sung: ...]` wherever real proof is missing.
4. Run `viet-pro gate` (via `viet-pro` on `PATH` or `~/.local/bin/viet-pro`, or the built-in fallback checks when absent), generate `sitemap.xml` and JSON-LD blocks, and validate every schema file before handing off to `tqd-web-design` or `tqd-web-launch`.

## Done Criteria

Work in `tqd-web-content` is complete when all applicable checks pass with observed evidence:

- Editable copy exists in `docs/website/content/` and/or `src/content/` with zero banned AI clichés and explicit `[Cần bổ sung: ...]` tags on any unconfirmed claims, stats, or reviews.
- Vietnamese prose passes `viet-pro gate` (`rhythm_score_0_to_3 >= 2.0` and zero defects) or records the built-in fallback scan honestly if `viet-pro` is unavailable on the host.
- Generated `sitemap.xml` contains only canonical indexable HTML URLs (no `.md` twins) with proper XML escaping.
- Every generated JSON-LD file passes `node scripts/validate-schema.cjs -f <file>` with exit code `0`, and `node --test scripts/tests/*.mjs` passes cleanly.
