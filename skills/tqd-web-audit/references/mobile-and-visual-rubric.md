# Mobile, Desktop & Visual Inspection Rubric

Inspect every website across three standard viewports — **375x812** (phone), **768x1024** (tablet), and **1440x900** (desktop) — because a layout that looks balanced on a laptop often breaks on a real phone screen.

## Capturing Screenshots & Layout Diagnostics

When Node 22+ and a local Chromium-based browser are available, reuse the `render-check.mjs` visual checker from the sibling `tqd-web-design` skill (run from the plugin root or pass its full path) before judging by eye:

Path is relative to the tqd-web-audit skill folder.

```bash
node ../tqd-web-design/scripts/render-check.mjs <index.html|url> --out .audit-shots --viewports 375x812,768x1024,1440x900
```

Review both the generated `render-report.json` findings and the full-page PNG screenshots at all three sizes. If no local browser is installed, record clearly that live pixel inspection was skipped rather than assuming a pass.

## 7-Point Practical Inspection

| # | Check | Pass Criteria Across `375x812`, `768x1024`, `1440x900` | Common Failure Modes |
|---|---|---|---|
| 1 | **First-screen clarity** | Within 5 seconds above the fold, a first-time visitor knows what is offered, who it helps, and the clearest next action (Call, Zalo, Book, Buy). | Vague hero slogan, oversized header pushing headline off-screen, multiple competing CTAs of equal weight. |
| 2 | **Horizontal overflow** | Zero sideways scroll (`scrollWidth <= innerWidth`), including a quick narrow check around 320px width. | Fixed pixel widths, `100vw` ignoring scrollbars, wide tables without scroll wrappers, long unbreakable URLs or phone strings. |
| 3 | **Vietnamese accents & type** | Verified Vietnamese font coverage (`Be Vietnam Pro`, `Plus Jakarta Sans`, `Inter`, `Lora`); heading `line-height` 1.18–1.28, body `line-height` >= 1.55. | Stacked diacritics (`ắ, ặ, ẫ, ể, ộ, ữ, ự`) colliding vertically or clipped by `overflow: hidden` / tight line boxes; mixed fallback font weights. |
| 4 | **Tap targets >= 44px** | Buttons, nav links, mobile menu toggles, form inputs, and Zalo/call CTAs measure at least 44x44 CSS px on touch screens (`375x812`, `768x1024`) with clean gaps. | Cramped footer links, tiny 24px icon-only buttons, closely stacked links causing accidental taps. |
| 5 | **Readable contrast** | Body text reaches WCAG AA `>= 4.5:1`; large headings (`>= 24px` or bold `>= 18.66px`) and active UI borders reach `>= 3:1`. | Light gray text on white (`#9ca3af` on `#ffffff`), white headline text over bright hero photos without a dark scrim. |
| 6 | **Honest proof & clean content** | Real products, prices, photos, and business contacts only; zero generic AI clichés (purple-cyan neon gradients, 3-card icon walls, em-dash heading spam). | `lorem ipsum`, `TODO`, `example.com`, unreplaced `[Cần bổ sung: ...]`, invented `10,000+` counters or stock-photo testimonials. |
| 7 | **Zero console & media errors** | Clean browser console, zero failed network requests, zero broken images (`naturalWidth === 0`), zero failed fonts, no closed `<dialog>` rendered visibly. | Missing `/images/...` path, dead third-party script, relative URL failing on nested subpages, uncaught JS error on load. |

## Classification by Customer Impact

Group findings into two plain tiers instead of technical severity codes:

- **Chặn trải nghiệm khách (Fix before sharing/launching):** Anything that stops a visitor from reading, navigating, trusting, or contacting the business — horizontal scroll on mobile, clipped Vietnamese text, unreadable contrast, broken buttons/links/images, leftover placeholder text, missing `<title>`/`<h1>`, or JS runtime errors.
- **Nên nâng cấp (Improve next):** Items that work today but slow down loading, weaken Google/AI presentation, or look rough around the edges — heavy unoptimized hero images, missing `llms.txt`, optional JSON-LD enrichment, or minor visual spacing polish.

## Plain-Vietnamese Translation Table (For `--plain-report`)

Use this mapping when writing the owner report so non-technical business owners understand the real impact without developer jargon:

| Technical Symptom | Plain-Vietnamese Explanation | Impact Tier |
|---|---|---|
| `horizontal-overflow` | Trang bị tràn ngang trên điện thoại, khách phải kéo sang hai bên mới đọc hết chữ. | Chặn trải nghiệm khách |
| `clipped-text` / tight line-height | Dấu tiếng Việt ở tiêu đề bị dính hoặc cắt mất nét, khiến người đọc khó nhìn. | Chặn trải nghiệm khách |
| `low-contrast` | Màu chữ hơi nhạt so với nền, ra nắng hoặc nhìn màn hình điện thoại sẽ rất khó đọc. | Chặn trải nghiệm khách |
| `small-touch-target` | Nút bấm hoặc đường link hơi nhỏ, khách bấm bằng ngón tay trên điện thoại dễ chạm nhầm. | Chặn trải nghiệm khách |
| `broken-link` / `broken-image` | Có nút bấm dẫn sang trang lỗi hoặc hình ảnh không tải lên được. | Chặn trải nghiệm khách |
| `placeholder` (`TODO`, `lorem ipsum`, `example.com`, `[Cần bổ sung`) | Trên trang vẫn còn sót chữ mẫu hoặc chỗ chờ điền thông tin thật, khách xem sẽ thiếu tin cậy. | Chặn trải nghiệm khách |
| `runtime-error` (Console error) | Trang có lỗi kỹ thuật ngầm khi chạy, dễ làm kẹt nút mở menu hoặc gửi form đặt hàng. | Chặn trải nghiệm khách |
| Missing `<title>` / `<meta description>` / `<h1>` | Thiếu tên trang hoặc mô tả ngắn cho Google, khi chia sẻ link hoặc tìm kiếm sẽ hiển thị sơ sài. | Chặn trải nghiệm khách |
| Missing `img[alt]` | Hình ảnh chưa có dòng mô tả ngắn để Google hiểu nội dung ảnh và hỗ trợ người khiếm thị. | Nên nâng cấp |
| Poor LCP / unoptimized hero image | Ảnh đầu trang dung lượng lớn nên mạng 4G mở ra hơi chậm trong vài giây đầu. | Nên nâng cấp |
| CLS / layout shift | Lúc mới tải, chữ và nút bị nhảy xuống do ảnh chưa giữ sẵn khung kích thước. | Nên nâng cấp |
| Heavy blocking JS (INP risk) | Trang chạy nhiều mã xử lý nặng khiến lúc bấm nút trên điện thoại hơi khựng nhẹ. | Nên nâng cấp |
| Missing `llms.txt` / JSON-LD enrichment | Chưa có bản tóm tắt chuẩn giúp công cụ AI (ChatGPT, Gemini, Perplexity) trích dẫn gọn thông tin cửa hàng. | Nên nâng cấp |
