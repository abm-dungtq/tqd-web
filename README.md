<p align="center">
  <img src="assets/logo.svg" alt="Biểu tượng TQD Web Studio" width="76">
</p>

# TQD Web Studio (`tqd-web`)

**Phiên bản 2.4.1** · MIT · Claude Code · Codex · Antigravity · Gemini CLI

Bạn mô tả cửa hàng hay dịch vụ bằng lời thường, AI agent dựng giúp một website tiếng Việt xem tốt trên điện thoại, có sẵn cấu trúc cho Google và để bạn tự sửa chữ, giá, ảnh về sau. Plugin dành cho chủ quán, chủ tiệm, người làm dịch vụ không biết lập trình hay thiết kế. Người làm web cho khách bằng agent cũng dùng được.

Cần Node.js 20 trở lên. Bước chụp màn hình để kiểm tra giao diện (`render-check`) cần Node.js 22 và Chrome, Edge hoặc Chromium.

Nhánh `main` có thêm vài tính năng chưa phát hành, ghi ở mục `[Unreleased]` trong [CHANGELOG.md](CHANGELOG.md).

---

## Plugin làm gì cho bạn

1. **Hỏi bằng lời thường.** Agent hỏi từng câu một, khoảng 3 đến 4 câu, về khách hàng, dịch vụ và việc bạn muốn khách làm (gọi, nhắn Zalo, đặt lịch, hỏi giá).
2. **Cho xem mẫu trước khi làm hết.** Agent dựng phần đầu trang (Hero) bằng màu, chữ và nội dung thật để bạn duyệt. Sai màu hay sai không khí thì sửa ở đây, chưa tốn công làm các trang còn lại.
3. **Chọn công nghệ nhẹ nhất đủ dùng.**
   - Web 1 đến 3 trang: HTML tĩnh kèm `data/site-data.js`, mở thẳng bằng trình duyệt, không cần bước build.
   - Web nhiều trang, blog, danh mục: chữ, giá và ảnh nằm riêng trong `content/` để sửa không đụng vào mã.
   - Đăng nhập, lưu dữ liệu, thanh toán: chỉ làm khi bạn yêu cầu rõ. Phần này cần người có kinh nghiệm dựng và kiểm thử (xem mục "Mức đã kiểm chứng").
4. **Không bịa.** Quy tắc chung cấm tự bịa số liệu, đánh giá khách hàng hay ảnh không có thật. Chỗ còn thiếu được đánh dấu `[Cần bổ sung: ...]` để bạn điền.
5. **Bàn giao cẩm nang sửa web.** Mỗi website đi kèm tệp `HUONG-DAN-SUA-WEB.md` chỉ chỗ đổi số điện thoại, Zalo, giá và ảnh.

---

## Quy trình 6 chặng

<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="assets/workflow-dark.svg">
    <source media="(prefers-color-scheme: light)" srcset="assets/workflow-light.svg">
    <img alt="Sơ đồ quy trình 6 chặng của TQD Web Studio" src="assets/workflow-light.svg" width="100%">
  </picture>
</p>

Chủ website, bộ điều phối `tqd-web` và các kỹ năng con đi qua 6 chặng: hỏi nhu cầu, chốt màu, font và nội dung, duyệt mẫu Hero, dựng toàn bộ, khám lỗi, rồi đưa lên mạng. Có hai chốt chặn chất lượng. Ở chặng 3, bạn duyệt mẫu Hero bằng mắt. Ở chặng 5, agent chụp trang ở 3 kích thước màn hình (điện thoại, máy tính bảng, máy tính) và sửa hết lỗi chặn trước khi bàn giao. Xem từng bước trong [sơ đồ tương tác `workflow.html`](docs/diagrams/workflow.html).

Agent luôn dừng lại hỏi bạn trước khi mua tên miền hay gói trả phí, đổi DNS, đưa lên tên miền chính, bật thanh toán thật hoặc xoá dữ liệu của website đang chạy.

---

## 6 kỹ năng trong plugin

| Kỹ năng | Dùng khi | Việc chính |
|---|---|---|
| `tqd-web` | Làm web mới hoặc làm lại toàn bộ | Điều phối 6 chặng, từ hỏi nhu cầu đến bàn giao |
| `tqd-web-design` | Chọn màu, chữ, logo, làm đẹp giao diện | Gợi ý hướng thiết kế từ bộ dữ liệu offline, phối màu 60/30/10, cặp font có đủ dấu tiếng Việt, chụp kiểm tra 3 màn hình |
| `tqd-web-content` | Viết chữ trên trang, nút bấm, bài blog SEO | Viết tiếng Việt tự nhiên theo chuẩn `viet-pro`, kèm sitemap, `robots.txt`, `llms.txt` và JSON-LD |
| `tqd-web-audit` | Khám một web đang có | Tìm tràn chữ trên điện thoại, rủi ro tốc độ, lỗi trợ năng, link gãy, chữ giữ chỗ còn sót; báo lỗi theo mức ảnh hưởng tới khách và sửa khi bạn cho phép |
| `tqd-web-launch` | Gắn form, đưa web lên mạng | Form và nút liên hệ không cần máy chủ (Zalo, gọi điện, Web3Forms, Formspree, Google Sheets), triển khai lên Cloudflare Pages, Vercel hoặc Netlify, hướng dẫn trỏ tên miền, gắn công cụ đo lượt xem |
| `tqd-web-app` | Cần đăng nhập, dữ liệu hoặc thanh toán | Nhánh tuỳ chọn: tài khoản, cơ sở dữ liệu, thanh toán SePay/VietQR, Polar, Stripe |

---

## Mức đã kiểm chứng

| Phần | Tình trạng |
|---|---|
| Web 1 đến 3 trang (HTML tĩnh) | Có bộ khung mẫu và script đồng bộ nội dung, có test tự động |
| Web nhiều trang (Astro, Next.js) | Có hướng dẫn, chưa có bộ khung mẫu dựng sẵn |
| Đăng nhập, cơ sở dữ liệu | Chưa kiểm chứng. Cần lập trình viên có kinh nghiệm dựng và kiểm thử trên nền tảng đã chọn (môi trường thử, kiểm tra bảo mật) |
| Xác thực webhook SePay, Polar | Có script và test chạy offline, chưa gọi môi trường thử thật |
| Stripe | Chỉ có tài liệu hướng dẫn, chưa có script xác thực đi kèm |
| Triển khai, trỏ DNS | Theo checklist và chờ bạn duyệt trước khi đổi DNS; plugin không tự đổi DNS |

---

## Gợi ý thiết kế offline

Trước khi đề xuất màu và font, agent tra một bộ dữ liệu nhỏ đi kèm plugin thay vì tự nghĩ ra:

```bash
node skills/tqd-web-design/scripts/design-intel.mjs "quán cà phê ấm cúng" --surface landing
```

Lệnh trả về vài hướng thiết kế, bảng màu đã kiểm tra độ tương phản, cặp font hiển thị đủ dấu tiếng Việt và các quy tắc trải nghiệm. Không cần mạng, Python hay npm. Nếu câu mô tả không khớp từ khoá nào, lệnh nói rõ là không khớp thay vì tự chọn bừa một hướng.

Từ bản 2.4.0, bạn có thể thêm `--refs <thư mục>` để agent tra thêm một thư mục DESIGN.md của riêng mình, ví dụ bản tải từ Refero Styles. Thư mục đó phải nằm ngoài repo; plugin không kèm, không chép lại nội dung của bên thứ ba. Quyền dùng và cách chuyển thành thiết kế riêng nằm trong [external-design-md.md](skills/tqd-web-design/references/external-design-md.md).

Với thư mục này, agent sẽ hỏi bạn chọn một trong hai cách đoán ngành cho từng mẫu:

- **Không dùng Jev** (mặc định): miễn phí, chạy trên máy, không gửi gì ra ngoài. Nhiều mẫu sẽ chưa rõ ngành nhưng vẫn tìm được theo màu sắc, phong cách.
- **Dùng Jev**: Jev là dịch vụ AI trả phí của công ty TypeSafe, đọc phần mô tả để đoán ngành chính xác hơn. Cần tài khoản TypeSafe, tốn phí theo lượng chữ, và phần mô tả của các mẫu chưa rõ ngành sẽ được gửi lên máy chủ của họ.

Không biết chọn gì thì cứ chọn "không dùng"; agent không bao giờ tự bật Jev.

---

## Bắt đầu nhanh

Sau khi bật plugin, nhắn cho agent một câu như:

- *"Làm cho mình trang web giới thiệu cửa hàng, có bảng giá đẹp và nút nhắn Zalo đặt hàng"*
- *"Thiết kế lại giao diện website hiện tại cho gọn, dễ xem trên điện thoại và chuẩn Google"*
- *"Kiểm tra lỗi hiển thị, tốc độ tải trang và viết thêm bài chuẩn SEO cho website của mình"*

---

## Cài đặt

Hướng dẫn đầy đủ cho từng agent, kèm cập nhật, gỡ cài đặt và đoạn lệnh để agent tự cài: [docs/install.md](docs/install.md).

| Agent | Lệnh |
| --- | --- |
| Claude Code | `/plugin marketplace add abm-dungtq/tqd-web` rồi `/plugin install tqd-web@tqd-studio` |
| Codex (CLI, app ChatGPT desktop) | `codex plugin marketplace add abm-dungtq/tqd-web` rồi `codex plugin add tqd-web@tqd-studio` |
| Antigravity (App, CLI, IDE) | `agy plugin install https://github.com/abm-dungtq/tqd-web` |
| Gemini CLI | `gemini extensions install https://github.com/abm-dungtq/tqd-web` (chưa chạy thử) |
| Cursor, OpenCode, Copilot… | `npx skills add abm-dungtq/tqd-web` (chỉ skill, không kèm luật chung và agent phụ) |

Luật chung của plugin nằm ở `rules/AGENTS.md`. Antigravity nạp tệp này như luật luôn bật, Gemini CLI nạp qua `contextFileName`, Claude Code và Codex nạp qua từng skill.

---

## Tài liệu và giấy phép

- Lịch sử thay đổi: [CHANGELOG.md](CHANGELOG.md).
- Quá trình rà soát và gộp 19 skill cũ thành 6 skill: [docs/audit-report.md](docs/audit-report.md).
- Giấy phép **MIT** và ghi công bên thứ ba: [LICENSE.txt](LICENSE.txt), [NOTICE.txt](NOTICE.txt).
