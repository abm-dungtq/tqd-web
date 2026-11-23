# Bảng Kiểm Xuất Bản Website (Launch Checklist)

Dùng ở Pha 6 cùng `tqd-web-launch`. Ghi nhận trạng thái từng mục là **Đạt**, **Chưa đạt**, hoặc **Không áp dụng** vào `docs/website/launch-report.md` kèm bằng chứng quan sát được (link, kết quả lệnh kiểm tra, đường dẫn ảnh chụp).

## 1. Địa chỉ & Độ an toàn truy cập
- Trang chạy qua HTTPS ổn định; không báo cảnh báo bảo mật trình duyệt.
- Nếu dùng tên miền riêng: `www` và tên miền gốc (apex) tự chuyển hướng thống nhất về một địa chỉ chính.
- Bản xem trước / thử nghiệm không để Google lập chỉ mục nhầm (nếu tách staging riêng).

## 2. Trang & Nội dung thật
- Mọi trang trong `docs/website/sitemap.md` mở được (mã 200), không gãy nút bấm hoặc liên kết nội bộ.
- Đã kiểm tra sạch chữ mẫu (`lorem ipsum`, `TODO`) và rà soát toàn bộ thẻ `[Cần bổ sung: ...]`.
- Không còn nội dung mẫu của khung starter (tên tiệm, địa chỉ, số điện thoại, tên miền mẫu); đã chạy kiểm tra đồng bộ dữ liệu.
- Trang báo lỗi `404.html` hiển thị thân thiện kèm nút quay về Trang chủ.
- Có đầy đủ thông tin chân trang tối thiểu (liên hệ, chính sách bảo mật / điều khoản nếu có thu thập thông tin khách).

## 3. Trải nghiệm điện thoại, tốc độ & SEO cơ bản
- Hiển thị gọn gàng trên 3 cỡ màn hình (`375x812`, `768x1024`, `1440x900`), không tràn ngang, nút bấm đủ lớn (>= 44px), chữ tiếng Việt không lỗi font hay đè dấu.
- Mỗi trang có tiêu đề (`<title>`) và mô tả (`meta description`) riêng, ảnh có văn bản thay thế (`alt`), có ảnh chia sẻ mạng xã hội (Open Graph) và biểu tượng tab trình duyệt (favicon).
- Tệp `sitemap.xml` và `robots.txt` hoạt động hợp lệ (cùng `llms.txt` nếu có nội dung dịch vụ/blog).

## 4. Nhận khách hàng & Đo lường
- Nút gọi nhanh (`tel:`), link Zalo / Messenger mở đúng người nhận.
- Form liên hệ / đặt lịch đã gửi thử 1 lượt thật (hoặc xác nhận luồng sandbox) và thấy dữ liệu tới nơi.
- Đã gắn bộ đếm lượt xem nhẹ nhàng (Cloudflare Web Analytics hoặc GA4) theo đúng đồng ý của chủ web.

## 5. Bàn giao cho người không chuyên
- Có file `HUONG-DAN-SUA-WEB.md` tại thư mục gốc, khớp đúng cấu trúc file thực tế vừa xây.
- Các tệp nội dung tách riêng đọc hiểu dễ dàng.

## 6. Nhánh Web App (Chỉ áp dụng với Tier 3)
- Đăng ký / đăng nhập / quên mật khẩu / đăng xuất hoạt động trơn tru trên bản chạy thử.
- Thanh toán (SePay/VietQR hoặc Stripe/Polar) đã chạy thử thành công ở chế độ thử nghiệm và chỉ bật khóa thật sau khi chủ web xác nhận.
- Đã hướng dẫn sao lưu dữ liệu và bảo vệ khóa bí mật ngoài Git.
