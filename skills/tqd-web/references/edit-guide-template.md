# Mẫu Hướng Dẫn Tự Sửa Web Cho Chủ Website (`HUONG-DAN-SUA-WEB.md`)

Khi bàn giao website ở Pha 4, tạo file `HUONG-DAN-SUA-WEB.md` đặt ngay tại thư mục gốc của dự án website. Viết bằng tiếng Việt gần gũi, thay đúng tên file và số dòng/tên mục thực tế vừa tạo.

## Khung mẫu chuẩn

```markdown
# Hướng Dẫn Tự Cập Nhật Website — <Tên Thương Hiệu>

Chào bạn, trang web của bạn được sắp xếp để bạn có thể tự đổi **chữ, giá bán, hình ảnh, số điện thoại và link Zalo** mà không cần hiểu về lập trình.

---

## 1. Muốn sửa thông tin liên hệ (SĐT, Zalo, Địa chỉ, Giờ mở cửa)
- **Mở file:** `<đường dẫn file thực tế, ví dụ: data/site-data.js hoặc src/content/site.json>`
- **Tìm dòng có chữ:** `phone`, `zalo`, `address`
- **Lưu ý nhỏ:** Gõ nội dung mới vào giữa hai dấu ngoặc kép `"..."`; đừng xóa dấu ngoặc kép hay dấu phẩy đang có.
- **Sửa cùng lúc:** tên thương hiệu hoặc số điện thoại nếu xuất hiện ở dòng khác trong cùng tệp (ví dụ `metaTitle`).

## 2. Muốn thay hình ảnh thật của cửa hàng
- **Thư mục chứa ảnh:** `<ví dụ: images/ hoặc public/images/>`
- **Cách làm nhanh nhất:** Chuẩn bị ảnh rõ nét (khuyên dùng khổ ngang cho ảnh bìa, dung lượng dưới 500KB để web tải nhanh), đặt **trùng tên** với ảnh cũ rồi chép đè vào thư mục trên (hoặc đổi đường dẫn tên ảnh mới trong file nội dung).

## 3. Muốn chỉnh giá dịch vụ, câu giới thiệu hoặc viết thêm bài
- **Chỉnh nội dung trang / bảng giá:** Mở `<file nội dung thực tế>` và sửa phần chữ tiếng Việt bên trong.
- **Muốn thêm/bớt một mục trong danh sách** `<tên danh sách thực tế, ví dụ offerings>`: chép nguyên một khối `{ ... }`, dán ngay bên dưới, thêm dấu phẩy giữa hai khối; khối cuối không có dấu phẩy phía sau. Mỗi mục giữ đủ các dòng như mục đầu; luôn giữ ít nhất 1 mục.
- **Những chỗ đang đánh dấu `[Cần bổ sung: ...]`:** Đây là những thông tin studio chừa sẵn để bạn điền dữ liệu thật của mình (không bịa số liệu ảo).

## 4. Cách xem thử ngay trên máy trước khi đưa lên mạng
- *(Nếu là Tier 1)*: Nhấp đúp chuột vào file `index.html` để mở thẳng bằng Chrome hoặc Safari.
- *(Nếu là Tier 2/3)*: Mở Chat với trợ lý AI và nhắn đúng một câu: *"Mở bản xem trước trang web giúp tôi kiểm tra thay đổi mới"*.
- **Nếu trang hiện băng vàng báo lỗi:** tệp dữ liệu vừa thiếu dấu ngoặc kép hoặc dấu phẩy. Hoàn tác dòng vừa sửa, hoặc nhờ trợ lý AI kiểm tra `<file dữ liệu thực tế>`.

## 5. Nhờ trợ lý AI sửa nhanh (Khuyên dùng — An toàn 100%)
Nếu ngại mở file thủ công, bạn chỉ cần mở thư mục này lên và nhắn cho AI những câu bình thường như:
- *"Đổi số Zalo trên toàn trang sang 09xx.xxx.xxx giúp mình."*
- *"Cập nhật giá gói Cơ bản từ 500k lên 650k."*
- *"Thay ảnh bìa đầu trang bằng tấm ảnh `mat-tien-moi.jpg` mình vừa chép vào thư mục ảnh."*
- *"Kiểm tra lại xem mình vừa sửa có bị lỗi chữ hay tràn màn hình điện thoại không, rồi cập nhật lên mạng."*

## 6. Điều cần tránh để web không bị lỗi
- Không xóa hoặc đổi tên các file có đuôi `.css`, `.mjs`, `.json` cấu hình nếu chưa sao lưu.
- Không chia sẻ các file có tên `.env` (nếu có) lên mạng hoặc gửi vào nhóm chat công khai.
```
