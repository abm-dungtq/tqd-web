# Zero-Server Lead Capture Playbook

Recipes for connecting customer inquiries on Tier 1 static HTML and Tier 2 Astro/Next.js sites with zero monthly server cost. Always verify the real phone number, Zalo link, or inbox address with the site owner before testing.

## 1. Choosing the Right Contact Channel

| Visitor intent | Best zero-server channel | Typical owner preference in Vietnam |
|---|---|---|
| Immediate questions or booking | Click-to-call (`tel:`) + Zalo link | Fast response on phone |
| Social chat with product photos | Facebook Messenger (`m.me/`) or Zalo | Already managing fanpage/Zalo |
| Quote request or consultation form | Web3Forms or Formspree | Delivered directly to Gmail |
| Order log or multi-staff follow-up | Google Sheets via Apps Script | Spreadsheet tracking without CRM cost |

## 2. Zalo, Click-to-Call, and Messenger Links

Format link targets cleanly (no spaces, dots, or parentheses inside `href`) while keeping readable spacing in visible button text:

```html
<!-- Click-to-call -->
<a href="tel:0912345678" aria-label="Gọi ngay số 0912 345 678">
  Gọi ngay: 0912 345 678
</a>

<!-- Zalo chat (replace with owner phone or Zalo OA username) -->
<a href="https://zalo.me/0912345678" target="_blank" rel="noopener noreferrer">
  Nhắn Zalo tư vấn
</a>

<!-- Facebook Messenger (replace with page username) -->
<a href="https://m.me/tenfanpagecuaBan" target="_blank" rel="noopener noreferrer">
  Nhắn Messenger
</a>
```

### Floating Mobile Quick-Bar Pattern

On phones, a compact sticky bottom bar keeps Call and Zalo one tap away without cluttering desktop screens. Add bottom padding to `body` on mobile so the bar never covers footer links or copyright text:

```css
.mobile-cta-bar {
  display: none;
}

@media (max-width: 767px) {
  body { padding-bottom: 72px; }
  .mobile-cta-bar {
    position: fixed;
    inset-inline: 0;
    bottom: 0;
    z-index: 40;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    padding: 10px 12px calc(10px + env(safe-area-inset-bottom));
    background: #ffffff;
    border-top: 1px solid #e5e7eb;
  }
}
```

## 3. Static HTML Contact Forms (Web3Forms & Formspree)

Use static form endpoints when the owner wants inquiries emailed directly without running a backend server. Both services include a zero-CAPTCHA honeypot field and a free tier; check each provider's site for current monthly submission quotas.

- **Web3Forms**: Post to `https://api.web3forms.com/submit` with a hidden `access_key` input and `name="botcheck"` honeypot.
- **Formspree**: Post to `https://formspree.io/f/<form-id>` with `Accept: application/json` in the `fetch` headers and `name="_gotcha"` honeypot.

The Web3Forms `access_key` and Formspree form ID are public client-side form identifiers, not private secrets. Never embed SMTP passwords, Gmail app passwords, or private API keys in HTML or client JavaScript.

### Accessible Form + Instant Vietnamese Feedback

```html
<form id="lead-form" action="https://api.web3forms.com/submit" method="POST">
  <input type="hidden" name="access_key" value="REPLACE_WITH_PUBLIC_ACCESS_KEY">
  <input type="hidden" name="subject" value="Khách hàng mới từ website">
  <!-- Honeypot spam guard (Web3Forms uses botcheck; Formspree uses _gotcha) -->
  <input type="checkbox" name="botcheck" tabindex="-1" aria-hidden="true"
         style="position:absolute;left:-9999px;">

  <label for="lead-name">Họ và tên</label>
  <input id="lead-name" name="name" type="text" required autocomplete="name">

  <label for="lead-phone">Số điện thoại hoặc Zalo</label>
  <input id="lead-phone" name="phone" type="tel" required autocomplete="tel">

  <label for="lead-note">Nhu cầu cần tư vấn</label>
  <textarea id="lead-note" name="message" rows="3"></textarea>

  <button type="submit">Gửi thông tin</button>
  <p id="lead-status" role="status" aria-live="polite" hidden></p>
</form>

<script>
const form = document.getElementById('lead-form');
const statusEl = document.getElementById('lead-status');

if (form && statusEl) {
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    statusEl.hidden = false;
    statusEl.textContent = 'Đang gửi thông tin...';

    try {
      const response = await fetch(form.action, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form),
      });
      if (!response.ok) throw new Error('Request failed');
      form.reset();
      statusEl.textContent = 'Đã gửi thành công! Chúng tôi sẽ liên hệ lại sớm nhất.';
    } catch {
      statusEl.textContent = 'Chưa gửi được qua biểu mẫu. Vui lòng gọi hoặc nhắn Zalo trực tiếp giúp chúng tôi.';
    } finally {
      submitBtn.disabled = false;
    }
  });
}
</script>
```

For Formspree, swap `form.action` to `https://formspree.io/f/<form-id>`, remove `access_key`, and rename `botcheck` to `_gotcha`.

## 4. Google Sheets Webhook via Google Apps Script

When the owner prefers seeing every inquiry as a row in Google Sheets:

1. Ask the owner to open their Google Sheet, choose **Tiện ích mở rộng -> Apps Script**, and paste the script below.
2. Choose **Triển khai (Deploy) -> Tùy chọn triển khai mới -> Ứng dụng web (Web app)**.
3. Set **Thực thi dưới danh nghĩa (Execute as)** to **Tôi (Me)** and **Ai có quyền truy cập (Who has access)** to **Bất kỳ ai (Anyone)**.
4. Authorize once when Google prompts and copy the `/exec` Web App URL into the form `action` attribute.

```javascript
function doPost(e) {
  var p = e.parameter || {};
  if (p._honey) {
    return ContentService.createTextOutput(JSON.stringify({ ok: true }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(['Thời gian', 'Họ tên', 'Số điện thoại', 'Nội dung']);
  }
  sheet.appendRow([new Date(), p.name || '', p.phone || '', p.message || '']);
  return ContentService.createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}
```

Use `new FormData(form)` without custom `Content-Type` headers so the browser sends a simple POST request without a CORS preflight failure. Add a hidden `<input type="text" name="_honey" tabindex="-1" aria-hidden="true" style="position:absolute;left:-9999px;">` in the HTML form.

## 5. Verification Before Launch

- Send one real test inquiry (with `[TEST]` prefix in the name field) after wiring the endpoint.
- Confirm the owner sees the test email or spreadsheet row before declaring the form complete.
- Confirm Zalo and phone links open cleanly on a mobile viewport without obscuring footer content.
