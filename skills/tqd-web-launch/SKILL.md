---
name: tqd-web-launch
description: "Take a finished static or Astro/Next.js website live with zero monthly server cost: wire zero-server contact and lead forms (Zalo, click-to-call, Messenger, Web3Forms, Formspree, Google Sheets), run pre-launch safety checks, deploy to Cloudflare Pages, Vercel, or Netlify, guide custom domain DNS in plain steps, attach lightweight analytics, and create plain-Vietnamese handover docs. Use when launching a completed site, wiring contact forms, pointing a domain, or setting up simple visitor tracking (including Vietnamese requests like \"đưa web lên mạng\", \"gắn form Zalo\", \"trỏ tên miền\"). Not for visual design (use tqd-web-design), page copy or SEO content (use tqd-web-content), pre-launch quality or SEO audits (use tqd-web-audit), or dynamic user accounts, database backends, and online payments (use tqd-web-app)."
when_to_use: "Invoke when a finished website needs lead forms, zero-cost deployment, custom domain DNS guidance, or lightweight analytics; route visual design to tqd-web-design, page copy or SEO writing to tqd-web-content, quality/SEO audits to tqd-web-audit, and dynamic accounts or payments to tqd-web-app."
argument-hint: "[forms|deploy|domain|analytics] [project-path]"
compatibility: "macOS, Linux, Windows (Node.js >= 20)"
license: "MIT"
metadata:
  author: tqd
  version: "2.1.0"
---

# tqd-web-launch: Go Live with Zero Server Cost

Help non-technical website owners take their finished site live cleanly with `$0` monthly hosting and zero-server lead capture. Translate technical terms (DNS records, CNAME, HTTPS, analytics snippets) into plain everyday outcomes when talking to the owner, and ask one focused question at a time whenever owner input is missing.

## When to Use and Handoffs

Use this skill once the website design and pages are ready to connect to customers and go online. Hand off adjacent work to its dedicated owner:

| Request outside launch scope | Hand off to |
|---|---|
| Visual layout, branding, colors, or typography | `tqd-web-design` |
| Page copy, UI microcopy, or SEO/GEO blog articles | `tqd-web-content` |
| Broken links, mobile responsiveness, accessibility, speed, or SEO audit | `tqd-web-audit` |
| Login accounts, databases, dashboards, or online checkout/payments | `tqd-web-app` |

## Modes and Inputs

- **Full launch** (no mode flag): Run phases 1 through 6 in sequence on `[project-path]` (defaults to current working directory).
- **`forms`**: Wire or repair Zalo, click-to-call, Messenger, Web3Forms/Formspree, or Google Sheets lead capture, then verify one test submission.
- **`deploy`**: Run preflight checks and publish to Cloudflare Pages, Vercel, or Netlify.
- **`domain`**: Guide custom domain DNS records, apex/`www` canonical redirect, and HTTPS verification.
- **`analytics`**: Attach Cloudflare Web Analytics or GA4 + CTA click events, and guide Google Search Console setup.

Before editing files, inspect the project (`docs/website/brief.md`, existing provider config, and HTML/content files) so you only ask the owner for missing details:
- Real phone number, Zalo link or OA, Messenger username, or target email/Google Sheet for customer leads.
- Custom domain name and where it was registered (if pointing a domain now).
- Hosting account choice when no provider binding exists yet.

## Authority and Secret Boundaries

- Pause and ask for explicit owner approval before buying a domain or paid plan, changing live DNS records, deploying to a production custom domain, or connecting external analytics and Search Console accounts, because those changes affect billing, live traffic, and owner-controlled accounts.
- Exclude `.env` files, API secrets, private keys, and credentials from git commits, publish folders, `docs/website/launch-report.md`, and `HUONG-DAN-SUA-WEB.md` so sensitive tokens are never exposed publicly.

## Launch Workflow

Order matters here because preflight checks catch leaked `.env` files or unfinished `[Cần bổ sung` copy before upload, and preview deploys confirm everything renders before pointing a live domain. Load only the reference file needed for the active phase.

### 1. Wire Customer Contact and Zero-Server Lead Forms

Load `references/zero-server-lead-capture.md` when wiring contact buttons or forms.
- Confirm the owner's real phone number, Zalo target (`https://zalo.me/...`), Messenger username (`https://m.me/...`), or target inbox/Google Sheet before editing HTML.
- Wire static forms with Web3Forms, Formspree, or a Google Apps Script webhook, including a hidden honeypot spam field and an instant Vietnamese confirmation state (`Đã gửi thành công!`).
- Send one real test submission or inspect live links to confirm inquiries reach the owner.

### 2. Run Pre-Launch Safety Checks

For Tier 1 sites with `data/site-data.js`, check that the pages still match the owner's data before anything else. Exit `1` means the site drifted: run the same command without `--check`, then check again.

```bash
node ../tqd-web/scripts/sync-site-data.mjs <site-dir> --check
```

Run the bundled Node.js (>= 20, macOS/Linux/Windows) preflight script against the publish folder (`dist`, `out`, or static root) before uploading:

```bash
node scripts/preflight-launch-check.mjs <publish-dir> --json
```

| Flag or exit code | Meaning |
|---|---|
| `--json` / `--allow-placeholders` / `--help` | Machine JSON output / downgrade placeholder blockers to warnings / usage help |
| Exit `0` | Ready to deploy (zero blockers; review any `404.html`, `robots.txt`, or `sitemap.xml` warnings) |
| Exit `1` | Blocker found: missing/empty `index.html`, exposed `.env`/`.git`/keys, leftover `TODO`/`FIXME`/`lorem ipsum`/`[Cần bổ sung`, starter demo content, or a reserved `.example`/`.test`/`.invalid` domain |
| Exit `2` | Usage error or unreadable target folder |

Preflight blocks starter demo content (the starter brand, address, and sample phone number) and reserved demo domains, in HTML as well as in `robots.txt`, `sitemap.xml`, `llms*.txt`, and `*.html.md`.

Resolve every exit-`1` blocker before deploying; pass `--allow-placeholders` only for early staging previews requested by the owner.

### 3. Deploy to Free Static Hosting

Load `references/free-hosting-and-dns-playbooks.md` when choosing or running a host deploy.
- Inspect existing provider bindings (`wrangler.toml`, `.vercel/`, `netlify.toml`) first so an existing site stays on its configured host.
- Check installed CLI tools (`wrangler`, `vercel`, `netlify`) before suggesting an install or login command.
- Deploy a preview build first (`wrangler pages deploy`, `vercel`, or `netlify deploy`) and verify the rendered preview URL; wait for explicit owner approval before pushing to production.

### 4. Guide Custom Domain DNS and HTTPS

Follow the plain-Vietnamese visual steps in `references/free-hosting-and-dns-playbooks.md`:
- Copy the exact `CNAME` / `A` / `ALIAS` targets shown in the hosting provider's Custom Domains panel rather than guessing IPs.
- Guide the owner visually through pointing both root (`@`) and `www` and setting one canonical redirect, pausing for approval before any live DNS edit.
- Verify `http://` redirects cleanly to `https://` on the single canonical host and preview URLs remain protected (`noindex`) while production `robots.txt` allows crawling.

### 5. Attach Lightweight Analytics and Search Console

Load `references/simple-analytics-and-gsc.md` when adding tracking or search indexing.
- Recommend cookieless Cloudflare Web Analytics by default so the site needs no cookie popup, or wire GA4 (`gtag.js`) plus `tel:` / `zalo.me` / `m.me` / form conversion tracking when the owner runs campaigns.
- After explicit owner approval, walk the owner step by step through verifying Google Search Console and submitting `sitemap.xml`.

### 6. Deliver Plain-Vietnamese Handover Docs

Create or update two owner-friendly Vietnamese files in the target website project, keeping both free of secrets or jargon:

1. **`docs/website/launch-report.md`** (Báo cáo đưa web lên mạng):
   - Địa chỉ website chính thức (Production URL) và link xem thử (Preview URL).
   - Nơi lưu trữ (`Cloudflare Pages` / `Vercel` / `Netlify`), thư mục xuất bản, và lệnh quay lại bản cũ khi cần.
   - Kênh nhận khách hàng (Zalo, số gọi nhanh, form/Google Sheet) kèm bằng chứng đã thử thành công.
   - Trạng thái tên miền, chuyển hướng `www`/non-`www`, chứng chỉ HTTPS, và kết quả `preflight-launch-check.mjs`.
   - Trạng thái thống kê (Cloudflare Web Analytics hoặc GA4), Google Search Console, và danh sách việc còn chờ chủ web duyệt (nếu có).
2. **`HUONG-DAN-SUA-WEB.md`** (at the target website project root):
   - Bảng chỉ dẫn từng file cần mở để sửa số điện thoại, link Zalo, bảng giá, chữ giới thiệu, và ảnh sản phẩm.
   - Lưu ý giữ nguyên các cặp thẻ mở/đóng và đường dẫn tệp để không làm vỡ giao diện.
   - Cách chạy lại lệnh kiểm tra trước khi đăng và đẩy bản sửa mới lên mạng chỉ trong vài bước ngắn.

## Done When

- `scripts/preflight-launch-check.mjs` exits `0` on the final publish directory (or remaining warnings are documented in `docs/website/launch-report.md`).
- `sync-site-data.mjs --check` exits `0` for a Tier 1 site with `data/site-data.js`.
- Contact channels (`tel:`, `zalo.me`, `m.me`, or static form) are wired to real owner targets and verified with a test click or submission.
- Live deployment URL responds with HTTP `200`, valid HTTPS, and verified DNS/canonical redirect (or preview-only status is clearly noted if domain DNS is awaiting owner action).
- Analytics and Search Console status are verified or recorded as pending owner approval.
- Both `docs/website/launch-report.md` and `HUONG-DAN-SUA-WEB.md` are created and free of exposed secrets.
