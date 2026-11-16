# TQD Web Studio (`tqd-web`)

Plugin giúp **người chưa từng học lập trình hay thiết kế** vẫn tự tạo được trang web chuyên nghiệp, dễ xem trên điện thoại, chuẩn Google và dễ dàng tự sửa chữ, giá bán hay hình ảnh về sau.

Bạn chỉ cần mô tả cửa hàng hoặc dịch vụ của mình bằng ngôn ngữ hằng ngày. Mọi phần việc phức tạp như chọn màu, ghép chữ tiếng Việt không lỗi dấu, canh khung điện thoại, gắn nút nhắn Zalo và đưa trang web lên mạng đều được xử lý gọn gàng từng bước.

---

## Điểm khác biệt dành riêng cho người không chuyên

1. **Không hỏi thuật ngữ kỹ thuật:** Trợ lý chỉ hỏi 3 đến 4 câu ngắn về khách hàng, dịch vụ và mục tiêu kinh doanh của bạn (hỏi từng câu một, có sẵn gợi ý để chọn nhanh).
2. **Xem trước giao diện thật trước khi làm trọn bộ:** Phần đầu trang web được dựng chạy thử ngay với màu sắc và hình dáng thật để bạn nhìn tận mắt và góp ý trước khi làm các trang còn lại.
3. **Tự chọn công nghệ nhẹ nhất ở hậu trường:**
   - Trang giới thiệu ngắn 1 đến 3 trang được làm siêu gọn, bấm đúp là mở xem ngay trên máy.
   - Web nhiều trang, có mục tin tức hoặc bảng sản phẩm được tách riêng phần chữ, giá và ảnh ra thư mục nội dung riêng để bạn sửa an toàn mà không sợ hỏng khung trang.
   - Chỉ mở nhánh Web App (đăng nhập, lưu đơn hàng, thanh toán chuyển khoản SePay/VietQR) khi bạn thật sự cần và đã nắm rõ cách vận hành.
4. **Không bịa đánh giá hay con số ảo:** Khi bạn chưa kịp gửi ảnh thật hoặc số liệu cụ thể, trang web chừa sẵn vị trí đánh dấu rõ ràng để bạn điền sau, giữ trọn uy tín thương hiệu.
5. **Bàn giao kèm cẩm nang dễ hiểu:** Mọi website xuất xưởng đều đi kèm tệp `HUONG-DAN-SUA-WEB.md` chỉ rõ nơi đổi số điện thoại, link Zalo, giá dịch vụ và ảnh chụp cửa hàng.

---

## Hệ thống 6 kỹ năng bên trong Plugin

| Lệnh / Kỹ năng | Khi nào dùng | Việc xử lý chính |
|---|---|---|
| `tqd-web` | Làm website mới từ đầu hoặc làm lại toàn bộ | Dẫn dắt trọn gói 6 chặng từ hỏi ý tưởng đến khi web chạy trên mạng |
| `tqd-web-design` | Chọn màu, tạo logo, làm đẹp giao diện | Phối màu 60/30/10, chọn cặp chữ tiếng Việt sắc nét, kiểm tra ảnh chụp 3 màn hình |
| `tqd-web-content` | Viết chữ bán hàng, chữ nút bấm và bài chuẩn SEO | Tích hợp `viet-pro` viết nội dung web và bài blog tự nhiên, chống sáo ngữ AI, tối ưu Google và công cụ AI |
| `tqd-web-audit` | Khám lỗi trang web đang có | Kiểm tra tràn chữ trên điện thoại, tốc độ tải, link gãy và sửa lỗi trực tiếp |
| `tqd-web-launch` | Gắn nút Zalo, form nhận khách và đưa lên mạng | Kết nối form không tốn phí máy chủ, xuất bản miễn phí, gắn tên miền và đo lượt xem |
| `tqd-web-app` | Cần đăng nhập, cơ sở dữ liệu hoặc thanh toán tự động | Nhánh tùy chọn kết nối tài khoản, dữ liệu serverless và SePay/VietQR/Stripe |

---

## Bắt đầu nhanh bằng 3 câu gợi ý

Sau khi bật plugin, bạn có thể gõ thẳng một trong các câu sau để thử ngay:

- *"Làm cho mình trang web giới thiệu cửa hàng, có bảng giá đẹp và nút nhắn Zalo đặt hàng"*
- *"Thiết kế lại giao diện website hiện tại cho sang trọng, dễ xem trên điện thoại và chuẩn Google"*
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

## Tài liệu kiểm toán kiến trúc & Giấy phép

- Xem chi tiết quá trình phản biện và tái cấu trúc từ 19 skill cũ lên phiên bản 2.1 tại [docs/audit-report.md](docs/audit-report.md).
- Phân phối theo giấy phép **MIT** ([LICENSE.txt](LICENSE.txt) và [NOTICE.txt](NOTICE.txt)).
