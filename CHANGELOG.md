# Changelog

Mọi thay đổi đáng chú ý của plugin `tqd-web` được ghi ở đây. Định dạng theo [Keep a Changelog](https://keepachangelog.com/vi/1.1.0/), phiên bản theo [Semantic Versioning](https://semver.org/lang/vi/).

## [2.4.0] - 2026-11-24

### Thêm

- `design-intel.mjs --refs <thư mục>` (hoặc `TQD_DESIGN_REFS`): xếp hạng thêm một thư mục DESIGN.md người dùng tự có (ví dụ export Refero Styles) theo thẻ thị giác và 0..n thẻ ngành; thiếu bằng chứng thì gán `unknown`. Thư mục phải nằm ngoài repo; plugin không kèm, không chuyển đổi nội dung bên thứ ba. Module mới `scripts/design-refs.mjs`, quy tắc ở `references/external-design-md.md`.
- `scripts/design-refs-tag.mjs <thư mục>`: gắn thẻ offline và ghi `local-tags.json` vào chính thư mục refs; `design-intel --refs` dùng thẻ này nếu có. Cờ `--jev` (tắt mặc định, cần `TYPESAFE_API_KEY`) gửi phần mô tả (không gửi token/CSS) của file còn `unknown` cho TypeSafe Jev, mỗi ngành một câu hỏi noul nên một style có thể nhiều ngành. Đường Jev chỉ được test với server giả, chưa gọi API thật.
- 8 test cho `design-refs-tag`: offline không gọi mạng, thiếu key thoát 2, Jev chỉ nhận file `unknown` và không nhận token, chạy lại giữ kết quả Jev đã trả phí (chỉ gửi lại file đổi mô tả hoặc lỗi; chạy offline sau khi sửa mô tả giữ kết quả cũ dạng `stale`), bản ghi Jev chưa có `hash` (định dạng của commit 5dded3d) được giữ và gắn hash thay vì bị xoá, `local-tags.json` hỏng không bị ghi đè, lỗi Jev giữ thẻ đang có và thoát 1, `local-tags.json` hỏng làm `design-intel` thoát 1. Một test đầu-cuối: sửa mô tả → (gắn thẻ offline) → `design-intel` không xếp hạng bằng thẻ Jev cũ.
- 7 test mới: fallback khi không khớp, và `--refs` trên 5 fixture tự viết (xếp hạng quán cà phê, ẩn dụ một lần không gán ngành, style `unknown` vẫn tìm được qua thẻ thị giác, nhiều ngành, biến môi trường, mã thoát lỗi).
- Đóng gói cho Codex: `.codex-plugin/plugin.json` (6 skill, giao diện tiếng Việt, logo) và marketplace `.agents/plugins/marketplace.json` (`tqd-web@tqd-studio`). Đã cài thử bằng Codex CLI 0.169.0: nạp đủ 6 skill `tqd-web:*`.
- `plugin.json` (Antigravity) thêm `$schema`, `license`, `keywords`; `agy plugin validate --strict` 0 cảnh báo, `agy plugin install` từ URL GitHub cài 6 skill, 2 agent, 1 luật.
- `docs/install.md`: hướng dẫn cài, cập nhật, gỡ cho Claude Code, Codex, Antigravity, Gemini CLI và agent chỉ đọc skill (`npx skills add`), kèm đoạn lệnh để agent tự cài. README rút mục Cài đặt thành bảng trỏ tới tài liệu này.
- Test: kiểm tra phiên bản và tên ở `.codex-plugin/plugin.json`; mọi đường dẫn trong các tệp khai báo (logo, skills, marketplace, luật) phải tồn tại.

### Sửa

- `design-intel`: truy vấn không khớp từ khoá nào nay trả `"matched": false` kèm ghi chú fallback; `--plan` liệt kê tham khảo thay vì tự chọn hướng. Trước đây điểm cộng bề mặt (+4) làm cảnh báo không bao giờ hiện.
- `tqd-web-app` Verification Status: SePay/Polar verifier và `checkout-helper.js` có unit test offline; Stripe chỉ có hướng dẫn tham khảo, không có script xác thực đi kèm.
- `design-intel --refs`: thẻ trong `local-tags.json` mà `hash` không còn khớp phần mô tả hiện tại, hoặc đã gắn `stale`, không còn được dùng để xếp hạng; script dùng thẻ offline mới tính, trả `references.staleTags` và in cảnh báo chạy lại `design-refs-tag.mjs`. Kết quả Jev vẫn được giữ trên đĩa.
- `README`, `NOTICE`, các tệp khai báo plugin và 6 `SKILL.md` sang `2.4.0`.

### Ghi chú

- `.gitignore` chặn `refero-styles/`, `design-refs/` và `local-tags.json` để tránh lỡ commit thư viện bên thứ ba hoặc dữ liệu suy ra từ nó.

## [2.3.0] - 2026-11-23

### Thêm

- `tqd-web-design/scripts/design-intel.mjs`: tra cứu thiết kế offline, không mạng, không Python, không gói npm. Nhận mô tả ngành + mood và một bề mặt (`landing`, `menu`, `booking`, `dashboard`, `auth`, `settings`), trả về hướng phong cách, bảng màu, cặp font, luật UX và trạng thái bắt buộc. `--plan` xuất kế hoạch dựng cụ thể; `--check` tự kiểm dữ liệu và ngân sách 150 KB.
- Dữ liệu curate trong `tqd-web-design/data/`: 14 hướng phong cách, 21 bảng màu đã kiểm tương phản 4.5:1, 10 cặp font có subset tiếng Việt, 29 luật UX, 6 bề mặt. Nguồn MIT `nextlevelbuilder/ui-ux-pro-max-skill` commit `281e4537`, ghi ở `NOTICE.txt`, `data/README.md` và `data/LICENSE-upstream.txt`.
- 13 test `intel:` kiểm dữ liệu, tương phản, whitelist font, ghi công, CLI, `--check` và `--plan`.

### Thay đổi

- `tqd-web-design`: bước tra cứu trước khi đề xuất hướng; bề mặt app (`dashboard`, `auth`, `settings`) có trạng thái trống/đang tải/lỗi và ghi chú quyền.
- `tqd-web-app`: thêm bảng **Verification Status**. Cloudflare Workers + D1 (UI + API, trạng thái lỗi/rỗng, kiểm quyền) **chưa được triển khai hay kiểm chứng**; Next.js + Neon/Supabase mới ở mức tài liệu, chưa có test đầu-cuối. D1 là một lựa chọn DB, không phải mặc định.
- `README`, `NOTICE`, `plugin.json`, marketplace và 6 `SKILL.md` sang `2.3.0`.

### Ghi chú

- Không thêm dependency npm hay Python; Tier 1 vẫn mở trực tiếp bằng `file://`.
- Dữ liệu giữ dưới 150 KB; `design-intel` chỉ gợi ý, quyết định vẫn ở người thiết kế và chủ web.

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
- `sync-site-data.mjs` trả mã 2 khi không đọc hoặc ghi được tệp (quyền, thư mục, hết chỗ), tách khỏi mã 1 của dữ liệu lệch; tệp tạm có tên riêng cho từng lần chạy nên hai lần chạy không ghi đè lên nhau.
- Danh sách có mục lồng cùng loại thẻ không còn bị cắt cụt; mục mẫu thiếu `data-edit-field` hoặc đặt thuộc tính lên thẻ có thẻ con báo lỗi dữ liệu thay vì giữ nguyên trang cũ.
- Thẻ meta có dấu nháy đơn trong nội dung vẫn được cập nhật khi mô tả đổi.
- Khuôn `data/templates/` không còn câu mô tả quy trình, sản phẩm hay tiêu đề riêng của tiệm bánh mì (`Thực đơn bánh mỗi ngày`, `đặt bánh`, `giữ bánh nóng`); mọi câu trong tệp dựng ra đều lấy từ `data/site-data.js` hoặc là nhãn trung tính, nên trang làm móng hay sửa xe không bị lẫn chữ của tiệm bánh.
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
