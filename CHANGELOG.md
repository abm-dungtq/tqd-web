# Changelog

Mọi thay đổi đáng chú ý của plugin `tqd-web` được ghi ở đây. Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/), phiên bản theo [Semantic Versioning](https://semver.org/lang/vi/).

## [2.2.0] - 2026-11-23

### Bảo mật

- Bộ xác thực webhook SePay đóng mặc định: không còn chế độ `none` ngầm định, callback OAuth2 trả về Promise không còn được coi là hợp lệ, và kết quả luôn được dựng từ đúng chuỗi body đã kiểm chữ ký.
- `sync-site-data.mjs` không còn thực thi `data/site-data.js`: đã bỏ `node:vm`, dữ liệu được đọc bằng `JSON.parse`.

### Thay đổi phá vỡ

- `new SePayWebhookVerifier()` giờ ném lỗi. Chế độ `none` phải khai báo rõ `allowUnauthenticated: true` và bị từ chối khi `NODE_ENV=production`. Bộ xác thực bất đồng bộ dùng `processAsync()` / `verifyAuthenticationAsync()`.
- `data/site-data.js` phải là JSON trong một câu gán `window.SITE_DATA = { ... };` với ngoặc kép; mã cập nhật trang chuyển sang `scripts/hydrate.js` của starter.
- `loadSiteDataSandboxed` bị xóa, thay bằng `parseSiteData`. `syncLlmsTxt` bị xóa: `llms.txt`, `llms-full.txt`, `index.html.md` được dựng từ khuôn trong `data/templates/`.
- Khóa `hero.secondaryCta` bị bỏ khỏi dữ liệu mẫu.
- `sync-site-data.mjs` thoát mã 1 khi số điện thoại, link Zalo, địa chỉ, giờ mở cửa hoặc tên miền bị gõ cứng ngoài ràng buộc.

### Sửa lỗi

- Sync dựng lại mọi tệp gốc: `*.html`, `robots.txt`, `sitemap.xml`, `llms*.txt`, `*.html.md`; mỗi tệp tự suy tên miền của nó nên một tệp còn bản cũ vẫn được sửa đúng ở lần chạy sau.
- Thêm/bớt mục trong danh sách và dấu nháy đơn trong chữ không còn làm hỏng trang.
- Audit và preflight chặn khung starter chưa sửa hoặc sửa nửa chừng: tên tiệm, địa chỉ, số điện thoại mẫu, tên miền `.example` / `.test` / `.invalid`, kể cả khi chỉ còn trong `<title>`, `robots.txt`, `sitemap.xml` hay tệp văn bản.
- `sync-site-data.mjs` trả mã 2 khi không đọc hoặc ghi được tệp (quyền, thư mục, hết chỗ), tách khỏi mã 1 của dữ liệu lệch; tệp tạm có tên riêng cho từng lần chạy và được dọn khi ghi hỏng.
- Danh sách có mục lồng cùng loại thẻ không còn bị cắt cụt; mục mẫu thiếu `data-edit-field` hoặc đặt thuộc tính lên thẻ có thẻ con báo lỗi dữ liệu thay vì giữ nguyên trang cũ.
- Thẻ meta có dấu nháy đơn trong nội dung vẫn được cập nhật khi mô tả đổi.
- Khuôn `data/templates/llms-full.txt` không còn câu mô tả quy trình và sản phẩm riêng của tiệm bánh mì; mọi câu trong tệp dựng ra đều lấy từ `data/site-data.js`.
- Đường dẫn script trong tài liệu chạy được khi plugin đã cài ở thư mục khác (kể cả đường dẫn có dấu cách); mỗi `SKILL.md` nêu thư mục của skill.
- Luật `rules/AGENTS.md` được nạp qua từng skill trên Claude Code và chỉ áp cho việc làm web.

### Thêm

- `sync-site-data.mjs --check` báo lệch dữ liệu và giá trị liên hệ gõ cứng mà không ghi tệp.
- Thuộc tính `data-edit-list` / `data-edit-item` / `data-edit-field` cho danh sách, `data-edit-template` cho câu trộn chữ cố định với dữ liệu.
- Khuôn văn bản `data/templates/<tên-tệp>` với `{{khóa}}` và `{{#each khóa}}`.
- `processAsync()` / `verifyAuthenticationAsync()` cho bộ xác thực webhook.
- Băng báo lỗi tiếng Việt khi tệp dữ liệu gõ sai, hiện khi mở trang qua `file://`.
- CI chạy `node --test` trên Node 20, 22, 24.
- Bộ eval hành vi trong `evals/` cho 4 cam kết với chủ web, kèm baseline `evals/baseline-2.2.0.md`.
- Test một nguồn phiên bản và test tính di động của tài liệu.

### Chuyển từ 2.1

1. Đổi `data/site-data.js` sang ngoặc kép đúng chuẩn JSON và xóa đoạn mã cập nhật trang ở cuối tệp.
2. Chép `scripts/hydrate.js` từ `assets/tier1-starter/` và thêm hai thẻ script (`data/site-data.js`, `scripts/hydrate.js`) vào cuối `index.html`.
3. Đổi khuôn danh sách sang `data-edit-list` / `data-edit-item` / `data-edit-field` kèm hai chú thích `<!-- list:khóa -->` và `<!-- /list:khóa -->`.
4. Tạo khuôn trong `data/templates/` cho `llms.txt` và mọi tệp văn bản khác có chứa thông tin liên hệ.
5. Chạy `node scripts/sync-site-data.mjs <thư-mục>` rồi sửa mọi chỗ bị báo gõ cứng cho tới khi `--check` thoát `0`.

## [2.1.0] - 2026-11-16

Starter Tier 1, đồng bộ dữ liệu hai chiều, kiểm tra ngoại tuyến và bộ test E2E.

## [2.0.0] - 2026-11-16

Bản plugin đầu tiên: 6 skill, 2 subagent nội bộ.
