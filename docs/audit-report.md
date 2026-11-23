# Báo cáo kiểm toán phản biện và tái kiến trúc Plugin tqd-web v2.0

## 1. Mục tiêu nâng cấp

Kho `/Volumes/1/AGY/tqd-web` trước đây chứa **19 thư mục skill rời** (`464` tệp, `3,93 MB`). Khi đóng gói thành **1 Plugin giúp người không biết lập trình hay thiết kế vẫn làm được website chất lượng cao**, kiến trúc cũ bộc lộ bốn nhóm lỗi lớn về chân dung người dùng, phụ thuộc ngoài, rác kỹ thuật và bản quyền.

## 2. Chẩn đoán 19 skill cũ

- **Lệch chân dung người dùng:** Ngoài `tqd-web/SKILL.md` điều phối 7 pha, **18 skill còn lại sao từ bộ `ak-*` của kỹ sư**: `16/18` skill trùng `97,1%`–`99,8%` (`tqd-advise` `99,8%`, `tqd-frontend-design` `99,4%`). Pha 1 hỏi *"stack preference"*, *"locales"*, *"non-goals"*, kéo theo Next.js App Router, Turborepo và `k6`, gây chặn người mới và thiếu dữ liệu tách rời để tự sửa.
- **Đứt gãy phụ thuộc:** Nhiều skill gọi `ak-cook`, `ak-code-review`, `ak-github`, `ak-plan`, `ak-diagram`, `ak-ui-ux-pro-max`; hỏng 2 liên kết `../ak-brainstorm/references/ultra-verifier-mode.md` và `../ak-design/references/handoff-gate.md`; `sync-brand-to-tokens.cjs` trỏ nhầm `.claude/skills/tqd-design-system/...`; `inject-brand-context.test.js` lỗi thiếu module.
- **Phình to, rác và dính bản quyền GPL-2.0:** `skill_standard_report.py` báo **15/19 skill lỗi** (82 cảnh báo: `59` tệp quá 300 dòng, `11` thiếu ghi chú HĐH, `5` thiếu test, `5` liên kết hỏng, `2` thiếu phần chuẩn). `tqd-design-system` lẫn 8 CSV và 4 script làm slide; `tqd-web-frameworks` thừa Turborepo; `tqd-seo` (`151` tệp, `1,805 MB`) gói plugin WordPress `GPL-2.0-or-later`.
- **Thiếu khung Plugin chuẩn:** Thiếu `plugin.json`, `.claude-plugin/plugin.json`, `gemini-extension.json`, `assets/logo.svg`, `rules/AGENTS.md` và subagent nội bộ.

## 3. Kiến trúc tái thiết lập v2.0

Plugin mới gọn còn **1 bộ luật chung (`rules/AGENTS.md`: Gemini CLI tự nạp; Claude Code nạp qua từng skill) + 2 subagent nội bộ + 6 skill tự chủ**, cho web giới thiệu, bán hàng gọn, blog SEO và Web App tùy chọn.

| Thành phần v2.0 | Vai trò chính | Kế thừa từ v1 | Loại bỏ |
|---|---|---|---|
| `rules/AGENTS.md` | Cấm thuật ngữ kỹ thuật, hỏi từng câu, duyệt mẫu bằng mắt | Quy tắc an toàn | Hỏi stack, hỏi dồn |
| `agents/` | `web-builder` và `visual-ux-critic` tự dựng, tự chấm điểm | Thay `ak-cook`, `ak-code-review` | Phụ thuộc `agentkit` |
| `tqd-web` | Cửa chính A tới Z, chọn ngầm 3 cấp, xuất `HUONG-DAN-SUA-WEB.md` | `tqd-web`, `tqd-advise`, `tqd-bootstrap` | Luồng CLI, Mobile |
| `tqd-web-design` | Màu 60/30/10, chữ tiếng Việt, logo SVG, `tokens.css`, `render-check.mjs` | `brand`, `logo`, `design-system`, `frontend`, `ui-styling` | Tài nguyên Slide |
| `tqd-web-content` | Tích hợp `viet-pro` viết bài, chữ bán hàng, SEO tiếng Việt, AI/GEO | `copywriting`, `seo` (site, từ khóa) | WordPress `GPL-2.0` |
| `tqd-web-audit` | Khám 3 màn hình, tốc độ, trợ năng, kiểm HTML ngoại tuyến | `web-testing`, `enhance-ux-ax` | `k6`, `contract-testing` |
| `tqd-web-launch` | Form miễn phí (Zalo, Web3Forms, Sheets), Cloudflare/Vercel, đo lường | `deploy`, `analytics` | OAuth chặn luồng |
| `tqd-web-app` | Nhánh tùy chọn: đăng nhập, dữ liệu serverless, SePay/VietQR/Stripe | `databases`, `backend`, `better-auth`, `payment` | 7 cổng phụ ít dùng |

## 4. Điểm nâng cấp thực chiến cho người không biết code

1. **Chọn ngầm 3 cấp & khung mẫu Cấp 1:** Bộ `tier1-starter` gắn sẵn chữ SEO/Zalo thật và tự cập nhật khi mở `file://`; `sync-site-data.mjs` đồng bộ ngược vào HTML tĩnh, Open Graph và JSON-LD; `sync-brand-to-tokens.cjs` xuất đủ hệ biến cỡ chữ, khoảng cách và bóng đổ.
2. **Xem trước & bắt lỗi Việt Nam:** Duyệt phần đầu trang bằng mắt rồi quét SĐT/Zalo giả, JSON-LD ngoại tuyến, 3 cỡ màn hình và kiểm thử E2E xuyên suốt 6 skill.
3. **Bàn giao quyền tự sửa:** Xuất `HUONG-DAN-SUA-WEB.md` chỉ rõ nơi đổi số Zalo, bảng giá và ảnh.

## 5. Đối chiếu Trước và Sau

| Tiêu chí | Phiên bản cũ (v1.x) | Phiên bản mới (v2.1) |
|---|---|---|
| Số skill | 19 skill kỹ sư rời rạc | 6 skill theo chặng tạo web |
| Cảnh báo chuẩn | 82 cảnh báo ở 15/19 skill | 0 lỗi, 0 cảnh báo (kể cả `claude plugin validate`) |
| Phụ thuộc ngoài | Gọi `ak-cook`, `../ak-*` | 0 phụ thuộc ngoài, có test E2E liên thông |
| Giấy phép | Dính `GPL-2.0-or-later` | 100% giấy phép MIT |
| Trải nghiệm người mới | Hỏi stack, SSR, Turborepo | Hỏi nhu cầu thật, đồng bộ 2 chiều, kèm cẩm nang sửa |
