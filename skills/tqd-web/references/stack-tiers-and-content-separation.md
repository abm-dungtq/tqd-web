# Chiến Lược 3 Cấp Công Nghệ Ngầm & Tách Lớp Nội Dung

Người dùng không chuyên không cần biết trang web chạy bằng HTML thuần, Astro hay Next.js. Nhiệm vụ của kiến trúc này là **tự động chọn nền tảng nhẹ nhất, bền nhất và dễ sửa nhất**, ghi nhận âm thầm vào `docs/website/brief.md`.

## Bảng chọn Cấp độ ngầm

| Dấu hiệu từ nhu cầu của chủ web | Cấp độ chọn ngầm | Công nghệ đề xuất | Tại sao tối ưu cho người không chuyên |
|---|---|---|---|
| 1 trang Landing Page, Portfolio cá nhân, thiệp mời sự kiện, menu quán gọn, hoặc 2–3 trang giới thiệu ít đổi | **Tier 1: Tĩnh siêu nhẹ** | HTML5 chuẩn ngữ nghĩa + CSS Tokens (`styles/tokens.css`) + JS gọn nhẹ + file `data/site-data.js` (nếu có dữ liệu lặp) | Mở xem trực tiếp từ thư mục trên máy, tải siêu nhanh, không bao giờ hỏng do lỗi cập nhật thư viện |
| Website doanh nghiệp 4+ trang, Blog nhiều bài viết SEO, Danh mục sản phẩm / Dự án thường xuyên thêm mới | **Tier 2: Đa trang tách nội dung** | **Astro** (ưu tiên mặc định cho web nội dung/SEO) hoặc **Next.js** static/hybrid (khi có nhiều tương tác giao diện phức tạp) + Tailwind | Mọi bài viết, sản phẩm, bảng giá nằm gọn trong `src/content/` dưới dạng Markdown/JSON tách biệt khỏi giao diện |
| Yêu cầu tài khoản khách hàng, giỏ hàng lưu phiên, đặt lịch đồng bộ DB, hoặc thanh toán tự động SePay / Stripe | **Tier 3: Web App** | Next.js App Router + Managed DB (Supabase / Neon / D1) + Better Auth + SePay/Stripe *(qua `tqd-web-app`)* | Đáp ứng nghiệp vụ động, nhưng bắt buộc cảnh báo trước về khóa bí mật, giới hạn gói miễn phí và bảo trì |

## Quy tắc tách lớp nội dung dễ sửa (Zero-Code Content Layer)

Dù chạy Tier 1 hay Tier 2, dữ liệu kinh doanh hay thay đổi không được chôn sâu rải rác trong hàng trăm dòng code giao diện.

### Với Tier 1 (HTML5 + CSS Tokens + `assets/tier1-starter/`)
1. Tách màu sắc, cỡ chữ và khoảng cách vào `styles/tokens.css` (giữ luật bố cục riêng trong `styles/site.css` để cập nhật bảng màu không làm mất khung).
2. Dùng bộ khung `assets/tier1-starter/` làm nền tảng chuẩn:
   - Văn bản thật nằm sẵn trong `index.html` để Google và xem trước Zalo/Facebook đọc trọn vẹn 100% không cần JavaScript.
   - Đồng thời gắn thuộc tính `data-edit`, `data-edit-tel`, `data-edit-href` nối với `window.SITE_DATA` trong `data/site-data.js` để chủ web bấm đúp mở `index.html` trên máy (`file://`) là thấy ngay nội dung vừa sửa mà không dính lỗi CORS của `fetch('data.json')`; danh sách dùng `data-edit-list` / `data-edit-item` / `data-edit-field`, câu trộn chữ cố định với dữ liệu dùng `data-edit-template="chữ {{khóa}}"`.
   - Chạy `node scripts/sync-site-data.mjs <thu-muc-web>` sau khi chỉnh `data/site-data.js` để dựng lại mọi tệp gốc (`*.html`, `robots.txt`, `sitemap.xml`) và mọi tệp văn bản phái sinh có khuôn trong `data/templates/`; thêm `--check` để biết trang có lệch dữ liệu hay còn giá trị liên hệ gõ cứng, `--dry-run` để xem trước.

### Với Tier 2 (Astro / Next.js)
1. Cấu trúc chuẩn thư mục dễ hiểu:
   ```text
   src/content/
   ├── site.json          # Tên thương hiệu, SĐT, Zalo, địa chỉ, giờ mở cửa, link mạng xã hội
   ├── pricing.json       # Bảng giá hoặc danh mục sản phẩm/dịch vụ
   ├── home.md            # Nội dung trang chủ
   └── blog/              # Mỗi bài viết là 1 file .md có frontmatter tiếng Việt dễ đọc
   ```
2. Kiểm tra trước khi bàn giao: Khi chủ web mở thử `src/content/site.json` hay một file trong `src/content/blog/`, họ phải đọc hiểu ngay 100% mà không gặp thẻ JSX/CSS phức tạp.

### Với Tier 3 (Web App qua `tqd-web-app`)
- Lưu biến cấu hình nhạy cảm trong `.env.local` (bị `.gitignore` bỏ qua) và cung cấp `.env.example` kèm giải thích công dụng từng dòng bằng tiếng Việt dễ hiểu.
- Tách nội dung tĩnh (trang giới thiệu, điều khoản, chính sách) giống Tier 2 để chủ web vẫn tự chỉnh được câu chữ mà không chạm vào logic thanh toán hay xác thực.
