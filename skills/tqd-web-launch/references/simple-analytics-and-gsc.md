# Simple Analytics and Search Console Setup

Guide non-technical owners to measure visitor counts and key customer actions (calls, Zalo clicks, form submissions) without bloating page speed or asking unnecessary cookie questions. Pause for explicit owner approval before connecting external analytics or Google Search Console accounts.

## 1. Cloudflare Web Analytics vs. Google Analytics 4 (GA4)

| Option | Cookie banner needed? | What it measures | Best for |
|---|---|---|---|
| **Cloudflare Web Analytics** | No (cookieless, privacy-first) | Page views, referrers, device/country, Web Vitals | Most Tier 1 & Tier 2 small-business sites |
| **Google Analytics 4 (GA4)** | Usually yes if targeting EU/strict privacy regions | Page views plus custom CTA clicks & ad attribution | Owners running Google/Meta Ads or wanting funnel events |

Default recommendation: choose **Cloudflare Web Analytics** when the owner just wants simple visitor stats without a cookie popup; choose **GA4** when they want conversion click events or ad tracking.

## 2. Adding the Tracking Snippet

### Option A: Cloudflare Web Analytics (Cookieless)

If the domain DNS already runs through Cloudflare, enable Web Analytics in one toggle from the Cloudflare dashboard without editing HTML. Otherwise paste the single snippet Cloudflare provides before `</body>`:

```html
<!-- Cloudflare Web Analytics -->
<script defer src="https://static.cloudflareinsights.com/beacon.min.js"
  data-cf-beacon='{"token": "REPLACE_WITH_PUBLIC_BEACON_TOKEN"}'></script>
```

### Option B: Google Analytics 4 (`gtag.js`)

Paste the owner's `G-XXXXXXXXXX` Measurement ID (this is a public property identifier, never a secret key) inside `<head>`:

```html
<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());
  gtag('config', 'G-XXXXXXXXXX');
</script>
```

When using GA4 on sites serving visitors in cookie-regulated regions, add a concise privacy notice and consent toggle so non-essential analytics cookies only fire when accepted.

## 3. Tracking Key CTA Clicks (Phone, Zalo, Messenger, Forms)

Attach lightweight event delegation so clicks on `tel:`, `zalo.me`, `m.me`, and form submissions are recorded without slowing down navigation or breaking links:

```html
<script>
document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href]');
  if (!link || typeof window.gtag !== 'function') return;

  const href = link.getAttribute('href') || '';
  if (href.startsWith('tel:')) {
    window.gtag('event', 'click_phone', { link_target: href });
  } else if (href.includes('zalo.me')) {
    window.gtag('event', 'click_zalo', { link_target: href });
  } else if (href.includes('m.me')) {
    window.gtag('event', 'click_messenger', { link_target: href });
  }
});
</script>
```

For contact forms, dispatch `window.gtag('event', 'generate_lead', { method: 'contact_form' })` only after the form `fetch(...)` resolves with `response.ok` so failed submissions are not counted as leads.

## 4. Plain-Language Google Search Console (GSC) Guide

Only proceed after the owner confirms they want the site submitted under their Google account. Explain Search Console in everyday terms:

> **Google Search Console** giống như "sổ theo dõi chính thức với Google": nơi xác nhận bạn là chủ tên miền, gửi danh sách các trang trên website (`sitemap.xml`) để Google vào đọc nhanh hơn, và xem khách hàng tìm từ khóa nào để thấy bạn.

### Step-by-Step Verification and Sitemap Submission

1. **Sign in**: Have the owner open `https://search.google.com/search-console` using their business Google account.
2. **Add property**:
   - Choose **Miền (Domain)** if they have DNS access (`tenmien.vn`) — covers both `http`/`https` and `www`/non-`www`.
   - Or choose **Tiền tố URL (URL prefix)** (`https://tenmien.vn`) if using an HTML `<meta name="google-site-verification" content="...">` tag in `<head>` is simpler.
3. **Verify ownership**:
   - For **Domain**: copy the `google-site-verification=...` `TXT` record and add it in the domain DNS table (ask owner approval before editing live DNS), wait a few minutes, and click **Xác minh (Verify)**.
   - For **URL prefix**: add the `<meta>` tag inside `<head>` of `index.html`, redeploy, then click **Xác minh (Verify)**.
4. **Submit `sitemap.xml`**: In the left menu, open **Sơ đồ trang web (Sitemaps)**, enter `sitemap.xml`, and click **Gửi (Submit)**.
5. **Request initial indexing**: Paste the homepage URL into the top search bar (**Kiểm tra URL**) and click **Yêu cầu lập chỉ mục (Request indexing)** once for the homepage and key service pages.

## 5. Measurement Verification Checklist

- Load the live production URL in a clean browser window and verify zero JavaScript console errors.
- Confirm the analytics script returns HTTP `200` in browser DevTools Network tab (disable ad-blocker while verifying).
- Click a `tel:` or `zalo.me` CTA and confirm the real-time dashboard registers both a page view and the CTA event (when GA4 is used).
- Record exact analytics tool, Measurement/Beacon status, and GSC verification status in `docs/website/launch-report.md`.
