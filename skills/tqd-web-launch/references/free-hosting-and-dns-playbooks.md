# Free Hosting and Plain-Language DNS Playbooks

Use this reference when publishing Tier 1 (static HTML/CSS/JS) or Tier 2 (Astro, static/hybrid Next.js) sites at `$0` monthly hosting cost and guiding non-technical owners through custom domain setup.

## 1. Choosing Between Cloudflare Pages, Vercel, and Netlify

| Platform | Best fit | Publish folder | Official pricing & limits |
|---|---|---|---|
| **Cloudflare Pages** | Tier 1 static HTML & Astro sites; fast Asia/Vietnam edge CDN | `.` (Tier 1) or `dist` (Astro) | Check `developers.cloudflare.com/pages/platform/limits/` |
| **Vercel** | Tier 2 Next.js sites or projects already using `.vercel/` | Auto-detected (`out` for static export, `.next` for Next.js) | Check `vercel.com/pricing` |
| **Netlify** | Tier 1 static sites or projects using `netlify.toml` / drag-and-drop | `.` (Tier 1), `dist`, or `out` | Check `netlify.com/pricing/` |

Default rule: if the project already has a binding (`wrangler.toml`, `.vercel/`, or `netlify.toml`), keep that host unless the user asks to switch. Otherwise default Tier 1 static sites and Astro sites to **Cloudflare Pages**, and Next.js sites to **Vercel**.

## 2. Check Installed CLI Tools and Project Bindings First

Before deploying or asking the owner to install anything, check what is already installed and bound:

```bash
# macOS / Linux
command -v wrangler vercel netlify

# Windows PowerShell
Get-Command wrangler, vercel, netlify -ErrorAction SilentlyContinue
```

Check existing config files (`wrangler.toml`, `wrangler.json`, `.vercel/`, `vercel.json`, `netlify.toml`, `_headers`) to avoid creating a duplicate project on the wrong account.

## 3. Exact Preview & Production Deploy Commands

Always deploy a preview URL first and verify the rendered pages before pointing a live custom domain.

### Cloudflare Pages (`wrangler`)

```bash
# 1. Sign in once (opens browser OAuth)
npx --yes wrangler login   # or: wrangler login

# 2. Preview deployment (non-production branch)
wrangler pages deploy ./dist --project-name <ten-du-an> --branch preview

# 3. Production deployment (after owner confirms preview & preflight passes)
wrangler pages deploy ./dist --project-name <ten-du-an> --branch main

# Rollback reference
wrangler pages deployment list --project-name <ten-du-an>
```

For Tier 1 static HTML sites at the project root, create a clean `dist/` copy (excluding `.git`, `.env`, docs, or drafts) or deploy the clean publish directory after running preflight checks.

### Vercel (`vercel`)

```bash
vercel login          # sign in once
vercel                # deploy preview URL
vercel --prod         # deploy production (after explicit owner approval)
vercel rollback <url> # rollback if needed
```

### Netlify (`netlify`)

```bash
netlify login                     # sign in once
netlify deploy --dir=dist         # draft preview URL
netlify deploy --dir=dist --prod  # production (after explicit owner approval)
```

## 4. Custom Domain & DNS Explained in Plain Vietnamese

Pause and ask for explicit approval before buying a domain or changing live DNS records. Never make up DNS values from memory; copy the exact target host or IP shown inside the hosting provider's Custom Domains screen.

### Visual Explanation for Non-Technical Owners

Use this everyday explanation instead of networking jargon:

> **Tên miền** (`tenmien.vn`) giống như **số nhà** trên danh thiếp, còn **bảng DNS** ở nơi mua tên miền (Mắt Bảo, Tenten, Nhân Hòa, P.A Việt Nam, Namecheap, Cloudflare) giống như **bảng chỉ đường** báo cho trình duyệt biết ngôi nhà website đang đặt tại máy chủ nào.
>
> Bạn cần trỏ hai dạng địa chỉ:
> 1. **Địa chỉ chính không có www** (`tenmien.vn`, trong bảng DNS thường ký hiệu là `@`).
> 2. **Địa chỉ có www** (`www.tenmien.vn`, ký hiệu là `www`).
> Chọn một địa chỉ làm **địa chỉ chính duy nhất** và để địa chỉ còn lại tự động chuyển hướng sang, giúp Google không hiểu nhầm là hai trang web trùng nhau.

### Common DNS Record Patterns

| Host | Record type | Typical target shown by provider | Purpose |
|---|---|---|---|
| `www` | `CNAME` | `<project>.pages.dev`, `cname.vercel-dns.com`, or `<site>.netlify.app` | Points `www.tenmien.vn` to the host |
| `@` (apex) | `CNAME` (Cloudflare DNS flattening / ALIAS) or `A` | Exact CNAME/ALIAS or IPv4 address shown in the host dashboard | Points `tenmien.vn` to the host |

Steps to guide the owner safely:
1. Open the host dashboard (Cloudflare Pages / Vercel / Netlify) -> **Custom domains** -> add `tenmien.vn` and `www.tenmien.vn`.
2. Screenshot or copy the exact record table the host displays.
3. Ask the owner for approval, then have them open their registrar's **Quản lý DNS** screen, remove conflicting old `A`/`CNAME` records for `@` and `www` only after confirming no existing site needs them, and enter the new values.
4. Set canonical redirect in the host dashboard (for example `www.tenmien.vn` -> `tenmien.vn`, or vice versa).
5. Wait 5–30 minutes (occasionally up to 24 hours) for DNS propagation.

## 5. HTTPS and Staging `noindex` Verification

- **HTTPS check**: Open both `http://tenmien.vn` and `http://www.tenmien.vn` (or check with `curl -I`) to verify both redirect to the single canonical `https://` URL with a valid TLS certificate and zero browser security warnings.
- **Prevent preview URLs from appearing in Google**:
  - On **Cloudflare Pages**, preview deployments (`*.pages.dev` branch URLs) automatically receive `X-Robots-Tag: noindex`, or add a `_headers` rule on preview builds if needed while keeping production indexable.
  - On **Vercel**, preview deployments (`*.vercel.app`) automatically serve `X-Robots-Tag: noindex`; verify the production custom domain does NOT send `noindex`.
  - Confirm `https://<custom-domain>/robots.txt` allows crawling (`Allow: /`) and points to `https://<custom-domain>/sitemap.xml`.
