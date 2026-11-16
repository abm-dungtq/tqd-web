# Search & AI Discovery Checklist (SEO + GEO + AX)

Search engines and AI answer engines rely on server-rendered HTML, open crawler rules, clean metadata, and consistent links. Fix foundational HTML and crawler access first, then add machine-readable hygiene like `llms.txt`.

## 1. Discovery Surfaces Checklist

| Surface | What Pass Looks Like | Common Pitfalls |
|---|---|---|
| **`robots.txt`** | Served as `text/plain` at `/robots.txt`, lists an absolute `Sitemap: https://...`, allows `*` and AI search bots (`OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot`). | Staging `Disallow: /` shipped to production; CDN bot rules blocking answer bots; pairing `Disallow` with `noindex` (blocks Google from reading `noindex`). |
| **`sitemap.xml`** | Valid XML `<urlset>` or `<sitemapindex>` listing only canonical `200` HTML URLs with truthful `lastmod` dates. | Relative URLs, staging origins on production, listing `404` / `noindex` / redirect pages or `.md` twins. |
| **`llms.txt`** | Served at `/llms.txt` with `# Brand Name`, `> one-line summary`, and `## Section` links to clean markdown summaries/twins; includes `X-Robots-Tag: noindex`. | Dumping a raw URL list without context, pointing to broken `.md` URLs, or selling `llms.txt` as a search ranking trick rather than agent hygiene. |
| **Canonicals** | Every indexable page has one absolute, self-referencing `<link rel="canonical" href="https://...">` in server HTML matching the sitemap URL. | Relative canonicals (`/about`), canonicals injected only by client JS, or every subpage pointing canonical to `/`. |
| **Core `<head>`** | Server HTML includes `<html lang="vi">` (or site locale), `<meta name="viewport">`, unique `<title>` (~50–60 chars), and unique `<meta name="description">` (~120–160 chars). | Duplicate titles across pages, empty `<div id="root"></div>` without SSR/SSG text, or leftover placeholder values. |
| **Open Graph & X** | `og:title`, `og:description`, `og:url`, `og:type`, fetchable absolute HTTPS `og:image` (1200x630 JPG/PNG), `og:image:alt`, and `twitter:card` = `summary_large_image`. | Relative `og:image` path, missing `og:image` asset, or `example.com` copied from a template. |
| **JSON-LD** | Valid `<script type="application/ld+json">` (`Organization`/`LocalBusiness`, `WebSite`, `BreadcrumbList`, `Article`/`Product`) matching visible copy exactly. | Invalid JSON syntax, fabricated review ratings, or retired `FAQPage`/`HowTo` schema used expecting search rich cards. |
| **Custom `404.html`** | Friendly Vietnamese message, clear button back to Homepage plus phone/Zalo link, `<meta name="robots" content="noindex">`, root-relative `/styles/...` paths. | Default server 404 page, broken relative CSS/images on nested URLs like `/blog/missing`, or dead-end page with no CTA. |

Note on AI crawler policies: keep AI search/citation bots (`OAI-SearchBot`, `Claude-SearchBot`, `PerplexityBot`) allowed unless the owner specifically requests blocking them. Training crawlers (`GPTBot`, `ClaudeBot`, `CCBot`, `Google-Extended`, `Applebot-Extended`) remain an explicit owner decision — record the policy rather than flipping it silently.

## 2. Minimal Templates for Missing Static Files

- **`robots.txt`** (replace `https://tenmien.vn` with the verified domain):

```txt
User-agent: *
Allow: /

Sitemap: https://tenmien.vn/sitemap.xml
```

- **`llms.txt`** (optional agent index; keep facts synced with HTML pages):

```markdown
# Tên Doanh Nghiệp

> Mô tả một câu rõ ràng về sản phẩm hoặc dịch vụ chính và khu vực phục vụ.

## Thông tin chính
- [Trang chủ](https://tenmien.vn/index.md): Giới thiệu dịch vụ, điểm mạnh và cách liên hệ.
- [Bảng giá](https://tenmien.vn/bang-gia.md): Chi tiết các gói dịch vụ và thời gian thực hiện.
```

## 3. Verifying with Bundled Scripts

Run both standard-library Node scripts (`Node.js >= 20`, zero npm installs required; supported on macOS, Linux, Windows):

### A. Offline Build / Static HTML Audit (`scripts/audit-html-health.mjs`)

Use on a local static folder, build output (`dist/`, `out/`), or single `.html` file:

```bash
node scripts/audit-html-health.mjs <file.html|build-dir> [--strict-placeholders] [--json]
```

What it checks deterministically:
1. `<html lang>` presence and non-empty value.
2. `<meta name="viewport">` presence (warns if `user-scalable=no` or `maximum-scale=1` blocks zoom).
3. Non-empty `<title>` and `<meta name="description">`, plus uniqueness across every page in the directory.
4. Exactly one `<h1>` per page and sequential heading order (`h1` -> `h2` -> `h3` without skipped levels).
5. Every `<img>` has an `alt` attribute (allowing `alt=""` for decorative images) and a non-empty `src`.
6. Leftover placeholders: `lorem ipsum`, `TODO`, `example.com` (errors), plus `[Cần bổ sung` (warning by default; error with `--strict-placeholders` before launch).
7. Local relative and root-relative `href` / `src` / `srcset` / `poster` targets resolve inside the build directory (supporting static clean URLs like `/about` -> `about/index.html` or `about.html`).

Exit codes: `0` clean (no errors), `1` errors found, `2` usage or I/O failure.

### B. Live / Dev-Server Discovery Audit (`scripts/check-discovery-surfaces.mjs`)

Use when a local dev server, preview URL, or live domain is running:

```bash
node scripts/check-discovery-surfaces.mjs <base-url> [--site-origin <prod-origin>] [--sample 10] [--json]
```

When scanning a local preview whose `<link rel="canonical">` and `sitemap.xml` already use the production domain, pass `--site-origin https://tenmien.vn` so sitemap URLs map onto the running preview host and get sampled properly.

What it verifies over HTTP:
1. `/robots.txt` text format, `Sitemap:` directive, wildcard blocks, and AI search vs training crawler policies.
2. `/sitemap.xml` (including one level of `<sitemapindex>`), valid `<loc>` URLs, and absence of `.md` twins inside the sitemap.
3. `/llms.txt` and `/llms-full.txt` formatting, plus `X-Robots-Tag: noindex` advisory.
4. Per sampled page: `<title>`, meta description, viewport, `<html lang>`, canonical URL, Open Graph tags + fetchable `og:image`, Twitter card, parseable JSON-LD, server-rendered text length (`>= 200` chars), markdown alternates (`.md` URLs), and `Vary: Accept` when negotiating `Accept: text/markdown`.

Exit codes: `0` clean (no errors), `1` errors found, `2` server unreachable or invalid arguments.
