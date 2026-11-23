<p align="center">
  <img src="assets/logo.svg" alt="Biểu tượng TQD Web Studio" width="76">
</p>

# TQD Web Studio (`tqd-web`)

**Phiên bản 2.1.0** · MIT · Antigravity IDE · Claude Code · Gemini CLI

Luật chung nằm ở `rules/AGENTS.md`: Gemini CLI tự nạp, Claude Code nạp qua từng skill, Antigravity chưa kiểm chứng.

Plugin giúp **người không biết lập trình hay thiết kế** tự tạo website đẹp, dễ xem trên điện thoại, chuẩn Google và dễ sửa nội dung về sau. Chỉ cần mô tả cửa hàng hoặc dịch vụ bằng lời hằng ngày, hệ thống tự xử lý từ phối màu, chữ tiếng Việt đến đưa web lên mạng.

---

## Điểm khác biệt cho người không chuyên

1. **Không hỏi thuật ngữ kỹ thuật:** Hỏi từng câu một (3 đến 4 câu ngắn) về khách hàng, dịch vụ và mục tiêu chính.
2. **Duyệt mẫu thật bằng mắt:** Dựng phần đầu trang với màu và chữ thật để bạn xem trước khi làm hết các trang.
3. **Tự chọn công nghệ nhẹ nhất:**
   - Web ngắn 1 đến 3 trang dùng HTML tĩnh và `data/site-data.js`, mở xem thẳng trên máy.
   - Web nhiều trang, blog hoặc danh mục tách riêng phần chữ, giá, ảnh để tự sửa an toàn.
   - Chỉ mở nhánh Web App (đăng nhập, dữ liệu, thanh toán SePay/VietQR) khi bạn thật sự cần.
4. **Không bịa số liệu ảo:** Chỗ thiếu ảnh hay con số thật giữ rõ thẻ `[Cần bổ sung: ...]`.
5. **Kèm cẩm nang tự sửa:** Xuất xưởng cùng tệp `HUONG-DAN-SUA-WEB.md` chỉ rõ nơi đổi SĐT, Zalo, giá và ảnh.

---

## Quy trình vận hành 6 chặng

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/workflow-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="assets/workflow-light.svg">
    <img alt="Sơ đồ quy trình vận hành 6 chặng của TQD Web Studio" src="assets/workflow-light.svg" width="100%">
  </picture>
</p>

Sơ đồ minh họa luồng phối hợp giữa **Chủ website**, bộ điều phối `tqd-web` và dàn kỹ năng qua hai vòng kiểm soát chất lượng: duyệt mẫu Hero bằng mắt ở Chặng 3 và tự khám sửa 3 màn hình ở Chặng 5. Mở [sơ đồ tương tác (`workflow.html`)](docs/diagrams/workflow.html) để xem chi tiết từng bước.

---

## Hệ thống 6 kỹ năng bên trong Plugin

| Lệnh / Kỹ năng | Khi nào dùng | Việc xử lý chính |
|---|---|---|
| `tqd-web` | Làm website mới từ đầu hoặc làm lại toàn bộ | Điều phối trọn gói 6 chặng từ hỏi nhu cầu đến khi web chạy trên mạng |
| `tqd-web-design` | Chọn màu, tạo logo, làm đẹp giao diện | Phối màu 60/30/10, chọn cặp chữ tiếng Việt sắc nét, kiểm tra ảnh chụp 3 màn hình |
| `tqd-web-content` | Viết chữ bán hàng, nút bấm và bài SEO | Tích hợp `viet-pro` viết nội dung và blog tự nhiên, chống sáo ngữ AI, chuẩn Google/AI |
| `tqd-web-audit` | Khám lỗi trang web đang có | Kiểm tra tràn chữ trên điện thoại, tốc độ tải, link gãy, JSON-LD và sửa lỗi trực tiếp |
| `tqd-web-launch` | Gắn nút Zalo, form nhận khách và đưa lên mạng | Kết nối form không tốn phí máy chủ, xuất bản miễn phí, gắn tên miền và đo lượt xem |
| `tqd-web-app` | Cần đăng nhập, cơ sở dữ liệu hoặc thanh toán | Nhánh tùy chọn kết nối tài khoản, dữ liệu serverless và SePay/VietQR/Stripe |

---

## Bắt đầu nhanh bằng 3 câu gợi ý

Sau khi bật plugin, bạn có thể nhắn thẳng một trong các yêu cầu sau:

- *"Làm cho mình trang web giới thiệu cửa hàng, có bảng giá đẹp và nút nhắn Zalo đặt hàng"*
- *"Thiết kế lại giao diện website hiện tại cho gọn, dễ xem trên điện thoại và chuẩn Google"*
- *"Kiểm tra lỗi hiển thị, tốc độ tải trang và viết thêm bài chuẩn SEO cho website của mình"*

---

## Cài đặt Plugin đa nền tảng

### 1. Antigravity IDE
Sao chép hoặc liên kết thư mục kho này vào `~/.gemini/config/plugins/tqd-web`, sau đó mở trang Tùy chỉnh (Customizations) để kiểm tra **TQD Web Studio** đã bật.

### 2. Claude Code
```bash
/plugin marketplace add abm-dungtq/tqd-web
/plugin install tqd-web@tqd-studio
```

### 3. Gemini CLI
Cài đặt trực tiếp từ GitHub hoặc thư mục kho có tệp `gemini-extension.json`:
```bash
gemini extensions install https://github.com/abm-dungtq/tqd-web
```

---

## Tài liệu kiểm toán & Giấy phép

- Xem quá trình phản biện và tái cấu trúc từ 19 skill cũ lên bản 2.1 tại [docs/audit-report.md](docs/audit-report.md).
- Phân phối theo giấy phép **MIT** ([LICENSE.txt](LICENSE.txt) và [NOTICE.txt](NOTICE.txt)).
