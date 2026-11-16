# Viết Nội Dung và Bài Website Tiếng Việt Chuẩn `viet-pro`

Tài liệu này kết nối `tqd-web-content` với hệ thống **Viết Pro (`viet-pro`)** để vừa soạn nội dung trang web (Trang chủ, Giới thiệu, Dịch vụ, Bảng giá, Microcopy giao diện), vừa viết bài Blog/SEO/GEO tự nhiên như người Việt viết thật.

## 1. Cơ chế kích hoạt (Ưu tiên `viet-pro`, dự phòng độc lập)

- **Khi máy có cài sẵn skill `viet-pro` và CLI (`viet-pro` trên `PATH` hoặc `~/.local/bin/viet-pro`):** Kích hoạt quy trình biên tập `viet-pro` kết hợp các lệnh kiểm tra CLI bên dưới để chốt giọng văn, đo điểm AI và đóng dấu SHA-256 trước khi xuất bản.
- **Khi chạy trên máy không cài `viet-pro`:** Áp dụng trực tiếp toàn bộ chuẩn cấu trúc 3 bề mặt, kỷ luật chống văn dịch và bảng tự kiểm bên dưới để vẫn cho ra nội dung sạch lỗi, không phụ thuộc công cụ ngoài.

## 2. Kỷ luật lập ý tiếng Việt & Khóa giọng thương hiệu

1. **Lập dàn ý trực tiếp bằng tiếng Việt có chủ thể:** Mọi luận điểm phải viết theo cấu trúc **Chủ thể thật + Động từ hành động + Hệ quả/con số cụ thể**. Tránh nghĩ theo cụm danh từ tiếng Anh rồi dịch ngược (*"Việc tối ưu hóa quy trình..."*, *"Trong bối cảnh kỷ nguyên số..."*).
2. **Giữ giọng nhất quán bằng `.viet-pro.json`:** Ở dự án website mới, chạy `viet-pro init <thu-muc-du-an>` một lần để khóa:
   - Ngôi xưng cố định từ đầu trang tới chân trang (`chúng tôi` hoặc tên cửa hàng gọi khách là `bạn` hoặc `Anh/Chị`).
   - Danh sách từ khóa thương hiệu và tên riêng cần bảo toàn (`keep_terms` trong `.viet-pro.json`, hoặc truyền cờ `--keep "Tên thương hiệu"` khi chạy `gate` và `compare`).
3. **Chống sáo ngữ và bảo toàn sự thật:** Loại bỏ các từ rỗng (*nâng tầm, giải pháp đột phá, hàng đầu, hoàn hảo tuyệt đối, 100% thành công*). Nếu thiếu đánh giá khách hàng, ảnh thật hoặc số liệu đo lường, gắn thẻ `[Cần bổ sung: ...]` thay vì tự sáng tác.

## 3. Ba bề mặt nội dung website theo chuẩn `viet-pro`

### A. Trang đích, Trang chủ & Trang dịch vụ (`landing-page`)
Mỗi trang bán hàng hoặc giới thiệu dịch vụ tuân theo 6 khối theo mạch tâm lý người mua:
1. **Khối Hero (hiểu trong 5 giây):** Tiêu đề nêu rõ *giúp ai + xử lý việc gì + kết quả cụ thể*; 1 câu phụ nói rõ cách làm; 1 nút hành động chính dùng động từ trực diện (*"Đặt lịch tư vấn"*, *"Nhắn Zalo báo giá"*); 1 tín hiệu tin cậy có nguồn thật.
2. **Vấn đề thực tế của khách:** Mô tả 2 đến 3 tình huống khách đang vướng bằng chi tiết vận hành hằng ngày thay vì hù dọa cảm tính.
3. **Cách làm và phần bàn giao:** Trình bày 3 đến 4 bước hoặc hạng mục khách nhận được sau khi sử dụng dịch vụ.
4. **Bằng chứng thật:** Trích nhận xét thật, hình chụp thật hoặc con số kèm ngữ cảnh/thời gian; nếu thiếu thì ghi `[Cần bổ sung: ...]`.
5. **Phù hợp với ai & Bảng giá minh bạch:** Nêu rõ gói nào hợp ai để giảm câu hỏi lặp lại khi tư vấn.
6. **FAQ gỡ rào cản & CTA cuối trang:** Trả lời thẳng 3 đến 5 thắc mắc phổ biến (thời gian giao hàng, bảo hành, chi phí phát sinh) rồi nhắc lại hành động liên hệ.

### B. Chữ giao diện ngắn & Biểu mẫu (`ui-microcopy`)
Áp dụng cho toàn bộ nút bấm, ô nhập form, thông báo lỗi, trạng thái trống và hộp thoại:
- **Nhãn nút bấm (1–4 từ):** Mở bằng động từ cụ thể kèm đối tượng (*"Gửi yêu cầu báo giá"*, *"Lưu thông tin"*, *"Xóa mục đã chọn"*), không dùng nhãn mơ hồ (*"OK"*, *"Xác nhận"*).
- **Thông báo lỗi đủ 3 phần:** (1) Chuyện gì vừa xảy ra + (2) Lý do cụ thể + (3) Cách xử lý ngay. Không đổ lỗi người dùng và không lộ mã lỗi kỹ thuật thô.
- **Gợi ý ô nhập (placeholder):** Chỉ đưa ví dụ định dạng (*"Ví dụ: 0912345678"*); điều kiện bắt buộc đặt cố định bên dưới ô nhập để không biến mất khi khách gõ.
- **Trạng thái hoàn tất & trống:** Báo rõ kết quả ngay sau khi bấm gửi (*"Đã nhận thông tin! Chúng tôi sẽ gọi lại trong 15 phút."*) và hướng dẫn bước đầu khi danh sách chưa có dữ liệu.

### C. Bài viết Website / Blog chuẩn SEO & GEO (`--platform blog-seo`)
Chọn đúng 1 trong 3 bề mặt qua cờ `--surface`:
- **`article` (mặc định, từ 600 chữ trở lên):** Bài hướng dẫn hoặc giải đáp chuyên sâu một nhu cầu tìm kiếm cụ thể.
- **`pillar` (từ 1.500 chữ trở lên, tối thiểu 4 `## H2`):** Bài trụ cột bao quát chủ đề lớn, dẫn liên kết nội bộ tới các bài `article` vệ tinh.
- **`comparison` (từ 800 chữ trở lên, bắt buộc có bảng Markdown):** Bài so sánh `A vs B` cho người sắp mua, mở đầu 100 chữ bằng kết luận ai nên chọn gì, kèm bảng tiêu chí cụ thể và kết bằng quy tắc *"Chọn A nếu... / Chọn B nếu..."*.

**Chuẩn On-Page & Answer-First (GEO) cho cả 3 bề mặt bài viết:**
- **Metadata 3 mức:** `title` tối đa 60 ký tự (chứa từ khóa chính, không lạm dụng dấu hai chấm); `description` tối đa 155 ký tự; `slug` chữ thường không dấu nối bằng `-`, tối đa 75 ký tự (`cham-soc-da-nhay-cam`).
- **Mật độ từ khóa tự nhiên:** Từ khóa chính xuất hiện ở `# H1`, trong 150 chữ đầu và giữ mật độ dưới `3,5%`.
- **Trả lời thẳng dưới mỗi `## H2`:** Mở đầu mỗi mục bằng kết luận trực diện dài khoảng 40–60 chữ trước khi giải thích chi tiết (tránh câu mở rào đón chung chung và tránh đoạn mở dài quá 90 chữ gây cảnh báo `seo-h2-wall` / `geo-question-h2-no-direct-answer`).
- **Dẫn nguồn số liệu:** Mọi con số `%` hoặc mức tăng `gấp N lần` đều gắn nguồn ngay cạnh, trừ ví dụ minh họa đã ghi rõ giả định.

## 4. Quy trình CLI `viet-pro` khi viết & biên tập cho website

Chạy tuần tự các lệnh sau (thay đường dẫn tệp theo dự án thực tế):

```bash
# Dùng `viet-pro` nếu đã có trên PATH, hoặc `~/.local/bin/viet-pro`
# 1. Khởi tạo giọng thương hiệu một lần cho dự án web
viet-pro init <thu-muc-du-an>

# 2. Quét điểm AI (0-100) của nội dung web cũ trước khi viết lại
viet-pro scan <tep-cu.md>

# 3. Kiểm tra chuẩn SEO & GEO cho bài viết blog trước khi kiểm duyệt cuối
viet-pro check-platform blog-seo <bai-viet.md> \
  --surface article --keyword "<tu-khoa>" --slug "<url-slug>" \
  --title "<meta-title>" --description "<meta-description>"

# 4. Chạy cổng kiểm duyệt đầy đủ (so sánh bảo toàn số liệu, lint tiếng Việt, nhịp văn, stamp SHA-256)
viet-pro gate <tep-noi-dung.md> \
  --before <tep-cu.md> --keep "<Tên Thương Hiệu>"

# Với BẤT KỲ bản thảo >= 800 chữ (bài dài hoặc trang đích dài), tạo 02-review-ticket.md hợp lệ;
# nếu là bài blog chuẩn SEO/GEO thì truyền thêm cờ `--platform blog-seo`:
viet-pro gate <bai-viet.md> \
  --platform blog-seo --surface article --keyword "<tu-khoa>" \
  --slug "<url-slug>" --title "<meta-title>" --description "<meta-description>" \
  --keep "<Tên Thương Hiệu>" --review-ticket <02-review-ticket.md>
```

**Xử lý kết quả cổng kiểm duyệt:**
- Nếu có `WARN` về cụm văn dịch (`translationese-cluster`), cụm sáo ngữ (`ai-buzzword-cluster`) hoặc placeholder `[ảnh: ...]` / `[liên kết: ...]`, hay khi `rhythm_score_0_to_3 < 2.0`, chỉnh lại văn phong và chạy lại cổng tối đa hai vòng.
- Dùng `viet-pro compare <tep-cu.md> <tep-moi.md>` bất cứ lúc nào biên tập lại nội dung sẵn có để bảo đảm không rơi mất giá bán, số điện thoại, link Zalo hay thông số kỹ thuật.
