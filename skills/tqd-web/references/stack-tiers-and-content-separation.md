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

### Với Tier 1 (HTML5 + CSS Tokens)
1. Tách mọi màu sắc, cỡ chữ, khoảng cách vào `styles/tokens.css`.
2. Nếu trang có danh sách lặp (thực đơn món, bảng giá gói, câu hỏi thường gặp, thông tin liên hệ dùng nhiều nơi), gom vào một file dữ liệu rõ ràng (hoặc các khối HTML đánh dấu chú thích tiếng Việt rõ ràng):
   - Đặt chú thích tiếng Việt trực tiếp cạnh nơi sửa, ví dụ:
     `<!-- SUA-NHANH: Sửa số điện thoại và link Zalo ngay tại đây -->`
   - Hoặc tách biến cấu hình đơn giản trong `content/site-config.json` / `data/site-data.js` (lưu ý nếu mở bằng `file://` trực tiếp không qua server, nhúng dữ liệu vào `data/site-data.js` dạng biến toàn cục `window.SITE_DATA = { ... }` để tránh lỗi CORS khi bấm đúp mở `index.html`!).
   - Đây là chi tiết thực tế quan trọng: `fetch('data.json')` trên `file://` bị trình duyệt chặn CORS, khiến người không chuyên mở `index.html` thấy trang trắng! Với Tier 1 thuần HTML, luôn dùng dữ liệu render sẵn trong HTML hoặc `data/site-data.js` để bấm đúp mở được ngay lập tức.

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
