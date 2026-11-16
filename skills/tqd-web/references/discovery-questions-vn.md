# Câu Hỏi Khám Phá Cho Người Dùng Không Chuyên

Dùng bộ câu hỏi dưới đây ở Pha 1 của `tqd-web`. Hỏi **tối đa 1 câu mỗi lượt**, ưu tiên đưa 3–4 lựa chọn gợi ý kèm 1 lựa chọn tự nhập để người dùng trả lời trong vài giây. Ngừng hỏi ngay khi đã đủ thông tin chốt bản tóm tắt dự án.

## Bộ 4 câu hỏi chuẩn (Hỏi nối tiếp theo ngữ cảnh)

### Câu 1: Mục tiêu & hành động của khách hàng
> "Website mới của bạn phục vụ lĩnh vực gì, và khi khách hàng vào xem xong, bạn muốn họ làm hành động nào nhất?"
- Gợi ý lựa chọn:
  - Nhắn Zalo / gọi điện / đặt lịch hẹn ngay
  - Xem bảng giá dịch vụ, hồ sơ năng lực rồi điền form tư vấn
  - Xem danh mục sản phẩm / thực đơn và gửi đơn đặt hàng nhanh
  - Đọc bài viết chuyên môn, xây dựng uy tín cá nhân hoặc thương hiệu

### Câu 2: Khách hàng mục tiêu & cảm giác thẩm mỹ
> "Bạn muốn khách hàng nhìn vào website sẽ cảm nhận phong cách nào, và có trang web nào bạn từng thấy thích mắt không?"
- Gợi ý lựa chọn:
  - Sạch sẽ, hiện đại, tối giản và đáng tin cậy (phù hợp dịch vụ, doanh nghiệp, giáo dục)
  - Ấm áp, gần gũi, giàu hình ảnh đời thực (phù hợp quán ăn, tiệm bánh, spa, thủ công)
  - Sang trọng, tinh tế, khoảng thở rộng (phù hợp thời trang, kiến trúc, làm đẹp cao cấp)
  - Trẻ trung, nổi bật, cá tính rõ nét (phù hợp studio sáng tạo, sự kiện, sản phẩm mới)

### Câu 3: Phạm vi trang & chất liệu có sẵn
> "Bạn dự định trang web có những mục/trang nào, và hiện bạn đã có sẵn logo, ảnh chụp thật hay bảng giá chưa?"
- Gợi ý lựa chọn:
  - Chỉ 1 trang giới thiệu gọn (Landing Page có đầy đủ thông tin + nút liên hệ)
  - Khoảng 3–5 trang chính (Trang chủ, Giới thiệu, Dịch vụ/Sản phẩm, Liên hệ)
  - Nhiều trang kèm chuyên mục Tin tức / Blog chia sẻ để lên top Google
  - *(Nếu chưa có logo hoặc ảnh, thông báo nhẹ nhàng rằng studio sẽ tạo logo chữ/biểu tượng gọn và đánh dấu rõ chỗ gắn ảnh thật của cửa hàng)*

### Câu 4: Kênh nhận khách & dự định đưa lên mạng
> "Khi có khách quan tâm, bạn muốn nhận thông báo qua đâu (Zalo, số điện thoại, Email hay Google Sheets) và bạn đã có tên miền riêng chưa?"
- Gợi ý lựa chọn:
  - Dùng link chạy thử miễn phí trước (`.pages.dev` hoặc `.vercel.app`), nhận khách qua Zalo + SĐT
  - Đã có tên miền riêng, cần hỗ trợ gắn vào trang web miễn phí chi phí máy chủ
  - Muốn làm thêm form gửi thông tin khách hàng về Email / Google Sheets tự động

*(Chỉ hỏi thêm câu thứ 5 nếu người dùng nhắc tới đăng nhập tài khoản, quản lý tồn kho phức tạp, hoặc thanh toán tự động qua ngân hàng — khi đó kích hoạt cảnh báo vận hành của `tqd-web-app`.)*

---

## Mẫu `docs/website/brief.md` (Ngôn ngữ đời thường)

```markdown
# Hồ Sơ Dự Án Website: <Tên thương hiệu / cửa hàng>

## 1. Mục tiêu chính
- **Lĩnh vực:** <Mô tả 1 câu>
- **Hành động khách hàng quan trọng nhất:** <Ví dụ: Nhắn Zalo đặt bàn / Điền form nhận báo giá>

## 2. Khách hàng & Phong cách
- **Khách hàng mục tiêu:** <Ai sẽ xem trang này?>
- **Cảm giác thương hiệu:** <Ấm áp / Sang trọng / Hiện đại tối giản...>

## 3. Danh sách trang (Sitemap sơ bộ)
1. Trang chủ — Giới thiệu giá trị chính, điểm nổi bật, nút hành động
2. ...

## 4. Chất liệu hiện có & Cần chủ web bổ sung sau
- Đã có: <Tên shop, SĐT/Zalo, bảng giá sơ bộ...>
- Đánh dấu `[Cần bổ sung]`: <Ảnh thật đội ngũ / Địa chỉ cụ thể...>

## 5. Kênh liên hệ & Xuất bản
- **Nhận khách qua:** <Zalo + Gọi nhanh + Form gửi về Email>
- **Địa chỉ web dự kiến:** <Chạy thử miễn phí hoặc tên miền riêng>

## 6. Quyết định kỹ thuật ngầm (Studio tự chọn thay chủ web)
- **Cấp độ kiến trúc:** <Tier 1 / Tier 2 / Tier 3> — <Lý do 1 câu>
- **Nơi lưu nội dung để chủ web tự sửa:** <Ví dụ: File `site-data.js` hoặc thư mục `content/`>
- **Nền tảng xuất bản:** <Cloudflare Pages / Vercel (0đ/tháng)>
```
