# SEO and GEO Discoverability Surfaces

Prepare every public page so both traditional search engines (Google, Bing) and AI answer engines (`OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot`) can crawl, understand, and cite the site accurately.

## Google Search vs. AI Answer Engines (Scope Boundary)

- **Google Search and AI Overviews:** Google relies on ordinary indexable HTML, clear hierarchy, fast loading, and helpful original content. Google ignores `llms.txt` and `.md` twin files for ranking and AI Overview selection, so treat those extra files as helpful support for AI agents rather than Google ranking levers.
- **AI Search and Coding Assistants:** Answer engines and developer tools benefit from server-rendered HTML, explicit crawler rules in `robots.txt`, curated `llms.txt` summaries, and clean `<page>.md` twins. Never promise guaranteed AI citations or rankings; implement these surfaces as clean infrastructure and verify their HTTP responses.

## 1. Per-Page On-Page SEO Contract

Keep one primary search intent per URL and make every HTML page self-describing without client-side JS delays:

| Element | Target standard | Practical check |
|---|---|---|
| `<title>` | 50–60 characters, unique per page | Put primary topic first, brand at end (`Bàn gỗ sồi 1m4 giao lắp tại HCM \| Xưởng Minh Anh`) |
| `<meta name="description">` | 150–160 characters, unique per page | Summarize concrete benefit + subtle CTA (`Báo giá tận xưởng, bảo hành 24 tháng. Nhắn Zalo xem mẫu thật.`) |
| Heading hierarchy | One `<h1>`, ordered `<h2>` -> `<h3>` | `<h1>` matches visitor intent (distinct from `<title>`); avoid skipping `<h2>` to `<h4>` |
| URL slug | Lowercase, hyphen-separated, ASCII | `/ban-lam-viec-go-soi` instead of `/product?id=42` or noisy dates |
| Canonical tag | Self-referencing absolute HTTPS URL | `<link rel="canonical" href="https://example.com/ban-lam-viec-go-soi">` |

## 2. Open Graph and Social Cards

Include complete social metadata on every shareable page so Zalo, Facebook, X, and LinkedIn previews render cleanly:

```html
<meta property="og:title" content="Bàn làm việc gỗ sồi 1m4 theo yêu cầu" />
<meta property="og:description" content="Đóng trực tiếp tại xưởng TP.HCM, bảo hành kết cấu 24 tháng." />
<meta property="og:url" content="https://example.com/ban-lam-viec-go-soi" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Xưởng Gỗ Minh Anh" />
<meta property="og:image" content="https://example.com/images/og-ban-go-soi.jpg" />
<meta property="og:image:alt" content="Bàn làm việc gỗ sồi tự nhiên 1m4 đặt tại phòng làm việc" />
<meta name="twitter:card" content="summary_large_image" />
```

Use an absolute `https://` JPG or PNG at `1200x630` for `og:image`. When updating an existing social card image, change its filename or query version so platforms fetch the new preview instead of serving stale cache.

## 3. `robots.txt` Policy and AI Crawler Tokens

Place `robots.txt` at the domain root (`/robots.txt`) with an absolute `Sitemap:` URL. Distinguish between three bot categories before writing rules, because blocking a search crawler removes the site from that engine's live citations:

| Category | Bot tokens | Purpose |
|---|---|---|
| Search & AI citation | `OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot`, `Googlebot`, `Bingbot` | Live search indexing and cited answers |
| User-requested fetch | `ChatGPT-User`, `Claude-User`, `Perplexity-User` | On-demand retrieval triggered by a user prompt |
| Model training tokens | `GPTBot`, `ClaudeBot`, `Google-Extended`, `CCBot` | Training data opt-in/out (owner choice) |

Default citation-friendly `robots.txt` template (confirm any training-crawler blocks with the owner before adding):

```txt
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/

User-agent: OAI-SearchBot
Allow: /

User-agent: Claude-SearchBot
Allow: /

User-agent: PerplexityBot
Allow: /

Sitemap: https://example.com/sitemap.xml
```

Verify that CDN or firewall bot-protection settings do not silently block these user-agents at the edge. Leave `noindex` pages crawlable in `robots.txt` so crawlers can actually see the `noindex` directive.

## 4. `sitemap.xml` Generation (`scripts/generate-sitemap.cjs`)

Include only canonical `200`-status indexable HTML URLs in `sitemap.xml`. Exclude redirects, `noindex` pages, draft pages, and `.md` twins. Only emit `<lastmod>` when you have a genuine content-change date; omitting `<lastmod>` is better than resetting every page to today's deploy date.

Prepare a JSON page list (`pages.json`):

```json
[
  { "url": "/", "priority": "1.0", "changefreq": "weekly", "lastmod": "2026-05-10" },
  { "url": "/bang-gia", "priority": "0.9", "changefreq": "monthly", "lastmod": "2026-05-08" },
  { "url": "/lien-he", "priority": "0.7", "changefreq": "yearly" }
]
```

Generate the XML sitemap locally via Node.js (escaping XML special characters automatically):

```bash
node scripts/generate-sitemap.cjs https://example.com ./public/sitemap.xml --pages pages.json
```

## 5. `llms.txt` and Markdown Page Twins (`<page>.md`)

For documentation, service guides, and multi-page sites, expose clean machine-readable text alongside HTML pages:

- **`/llms.txt`:** Follow the `llmstxt.org` outline with an `# H1` site name, a `>` one-sentence summary, and curated `## Section` lists linking to `.md` page twins (`- [Bảng giá dịch vụ](https://example.com/bang-gia.md): Chi phí trọn gói và thời gian bàn giao`). Keep `llms.txt` curated rather than dumping every URL on the site.
- **Markdown twins (`<page>.md`):** Mirror each public HTML page at `/<slug>.md` (and `/index.md` or `/index.html.md` for `/`), served as `text/markdown; charset=utf-8` without navigation menus, cookie banners, or footer scripts. Start with `# Page Title`, canonical URL, and updated date.
- **Discovery & non-duplication headers:** Add `<link rel="alternate" type="text/markdown" href="/bang-gia.md">` inside the HTML `<head>`, and serve `X-Robots-Tag: noindex` on `.md` twins and `llms.txt` so search engines keep indexing the HTML page rather than the raw Markdown file.
