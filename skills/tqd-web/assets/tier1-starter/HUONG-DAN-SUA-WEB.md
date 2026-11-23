# Hướng Dẫn Tự Cập Nhật Website

Trang web này được thiết kế để bạn tự thay chữ giới thiệu, bảng giá, số điện thoại, link Zalo và hình ảnh mà không cần chỉnh vào mã giao diện.

## 1. Muốn sửa tên tiệm, số điện thoại, link Zalo hoặc giá bán

- Mở tệp `data/site-data.js` bằng bất kỳ trình soạn thảo chữ nào trên máy.
- Tìm các dòng như `"phoneDisplay"`, `"phoneTel"`, `"zaloUrl"`, `"address"` hoặc danh sách `"offerings"`.
- Gõ nội dung mới vào giữa hai dấu ngoặc kép `"..."`; đừng xóa dấu ngoặc kép hay dấu phẩy đang có.
- Tên tiệm hoặc số điện thoại nếu xuất hiện ở dòng khác trong tệp (ví dụ `metaTitle`) cũng cần sửa cùng lúc.
- Lưu tệp rồi nhấp đúp mở `index.html` trên Chrome hoặc Safari để thấy thay đổi ngay lập tức.

## 2. Muốn thêm hoặc bớt một món

- Mở `data/site-data.js`, tìm danh sách `"offerings"`.
- Muốn thêm: chép nguyên một khối `{ ... }` trong danh sách, dán ngay bên dưới, thêm dấu phẩy giữa hai khối; khối cuối cùng không có dấu phẩy phía sau.
- Mỗi món phải giữ đủ các dòng như món đầu tiên (`title`, `summary`, `price`).
- Muốn bớt: xóa trọn một khối `{ ... }` cùng dấu phẩy, luôn giữ lại ít nhất 1 món.

## 3. Muốn thay hình ảnh cửa hàng

- Chép ảnh mới vào thư mục `images/` (nên chọn ảnh rõ nét dưới 500 KB).
- Đổi tên ảnh trùng với tên cũ (`hero-bakery.svg` hoặc cập nhật đường dẫn `src` trong `index.html`).

## 4. Nếu trang hiện băng vàng báo lỗi

- Băng vàng nghĩa là tệp dữ liệu vừa bị gõ thiếu dấu ngoặc kép hoặc thiếu dấu phẩy.
- Hoàn tác dòng vừa sửa (Ctrl/Cmd + Z) rồi lưu lại, hoặc nhờ trợ lý AI kiểm tra tệp `data/site-data.js`.

## 5. Đồng bộ lên Google & AI trước khi đưa bản mới lên mạng

Khi cần cập nhật bản chính thức lên mạng sau khi sửa `data/site-data.js`, hãy mở trợ lý AI trong thư mục này và nhắn một câu ngắn: *"Đồng bộ dữ liệu mới từ `data/site-data.js` vào trang web và cập nhật lên mạng giúp mình"*.
