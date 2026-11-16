# Hướng Dẫn Tự Cập Nhật Website — Tiệm Bánh An Lành

Trang web này được thiết kế để bạn tự thay chữ giới thiệu, bảng giá, số điện thoại, link Zalo và hình ảnh mà không cần chỉnh vào mã giao diện.

## 1. Muốn sửa tên tiệm, số điện thoại, link Zalo hoặc giá bán

- Mở tệp `data/site-data.js` bằng bất kỳ trình soạn thảo chữ nào trên máy.
- Tìm các dòng như `phoneDisplay`, `phoneTel`, `zaloUrl`, `address` hoặc danh sách `offerings`.
- Gõ nội dung mới vào giữa hai dấu nháy đơn `'...'`.
- Lưu tệp rồi nhấp đúp mở `index.html` trên Chrome hoặc Safari để thấy thay đổi ngay lập tức.

## 2. Muốn thay hình ảnh cửa hàng

- Chép ảnh mới vào thư mục `images/` (nên chọn ảnh rõ nét dưới 500 KB).
- Đổi tên ảnh trùng với tên cũ (`hero-bakery.svg` hoặc cập nhật đường dẫn `src` trong `index.html`).

## 3. Đồng bộ lên Google & AI trước khi đưa bản mới lên mạng

Khi cần cập nhật bản chính thức lên mạng sau khi sửa `data/site-data.js`, hãy mở trợ lý AI trong thư mục này và nhắn một câu ngắn: *"Đồng bộ dữ liệu mới từ `data/site-data.js` vào trang web và cập nhật lên mạng giúp mình"*.
