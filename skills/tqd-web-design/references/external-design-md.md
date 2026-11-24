# Thư viện DESIGN.md bên ngoài (`--refs`)

`design-intel.mjs` có thể xếp hạng một thư mục `DESIGN.md` mà người dùng tự có, ví dụ bản export từ Refero Styles, Google Stitch, hoặc DESIGN.md của chính thương hiệu khách. Plugin **không** kèm và không chuyển đổi các file đó.

```bash
node "${CLAUDE_SKILL_DIR}/scripts/design-intel.mjs" "quán cà phê ấm cúng" --refs "/đường/dẫn/ngoài/repo/refero-styles"
# hoặc đặt một lần cho cả phiên
export TQD_DESIGN_REFS="/đường/dẫn/ngoài/repo/refero-styles"
```

## Quyền dùng: tách hai câu hỏi

1. **Phân phối công khai: không.** Không commit thư mục vào repo này hay repo của khách, không chuyển nó thành JSON trong `data/`, không đăng lại thành thư viện. Điều khoản Refero (§10, Terms of Use cập nhật 12/11/2026) cấm công bố Refero Content thành thư viện/dataset độc lập hoặc phân phối lại.
2. **Dùng cho việc thiết kế nội bộ/cho khách: tùy quyền của người đang giữ file.** Refero cho phép dùng trong "client or internal design work" theo gói dịch vụ áp dụng, và loại các tính năng tải xuống có tài liệu khỏi lệnh cấm trích xuất hàng loạt. Kích thước bộ file hay việc nhận từ người khác **tự nó không chứng minh** vi phạm hay được phép. Nếu chưa rõ file đến từ gói nào, ghi là *chưa xác minh* và hỏi người cung cấp hoặc support@refero.design trước khi dùng cho dự án trả tiền.

Kể cả khi được phép, file DESIGN.md **không** cho quyền dùng logo, ảnh, font độc quyền hay mã nguồn của thương hiệu gốc.

Không gửi nội dung thư mục cho dịch vụ AI bên thứ ba (để phân loại hay tóm tắt) khi chưa xác nhận quyền đó.

## Script đọc gì

- Mỗi file `*.md` ở cấp đầu của thư mục (bỏ qua `_*.md`, file > 512 KB): tên (`# … — Style Reference`), câu tóm tắt (`> …`), `**Theme:**`, `**Density:**`, mã màu trong `## Tokens — Colors`, tên font trong `## Tokens — Typography`.
- **Thẻ thị giác** lấy từ theme + câu tóm tắt: `dark`, `light`, `warm`, `cool`, `minimal`, `luxury`, `playful`, `bold`, `editorial`, `natural`, `technical`, `retro`.
- **Thẻ ngành** (0..n) lấy từ phần mở đầu + `## Imagery`, chỉ khi từ khoá lặp ≥ 2 lần. Một lần nhắc thường là ẩn dụ ("coffee-black", "gallery wall"). Không đủ bằng chứng thì gán `unknown`. File `unknown` vẫn được tìm qua thẻ thị giác: "tường gallery đen trên trắng" có thể hợp cho tiệm gốm, studio ảnh hay quán cà phê tối giản.
- Đây là heuristic từ khoá, không phải phân loại có kiểm chứng. Luôn đọc lại file trước khi đề xuất.

## Gắn thẻ trước một lần: `design-refs-tag.mjs`

```bash
node "${CLAUDE_SKILL_DIR}/scripts/design-refs-tag.mjs" "/đường/dẫn/ngoài/repo/refero-styles"
```

- Chạy offline, ghi `local-tags.json` vào **chính thư mục refs**, không ghi vào repo. Mỗi file có `industries` (0..n hoặc `unknown`), `visual`, `source`. Sau đó `design-intel --refs` đọc thẻ từ file này (`"localTags": true`, cột `ngành … (jev)` nếu nguồn là Jev). File hỏng thì `design-intel` thoát mã 1; xoá hoặc chạy lại.
- Trên bộ Refero 1.341 file, heuristic để lại khoảng 76% `unknown` vì phần lớn mô tả là thẩm mỹ, không nói ngành.
- `--jev` (tắt mặc định) gửi các file còn `unknown` cho TypeSafe Jev (`POST https://api.typesafe.ai/v1/systemone`, model `jev-latest`, cần `TYPESAFE_API_KEY`). Mỗi ngành là một câu hỏi noul riêng; nhận ngành khi xác suất ≥ `--threshold` (mặc định 0.7), nên một style có thể có nhiều ngành.
  - Chỉ gửi tên, câu tóm tắt, đoạn mô tả và `## Imagery` (≤ 2.000 ký tự/file); không gửi token, CSS hay HTML mẫu.
  - **Chỉ bật khi người giữ file đã xác nhận được phép gửi nội dung cho bên thứ ba.** Có phí theo token của TypeSafe.
  - File gọi lỗi giữ thẻ đang có (offline, hoặc kết quả Jev cũ nếu file đang stale) kèm `jevError`; script vẫn ghi kết quả và thoát mã 1.
  - Chạy lại (offline hay `--jev`) không bao giờ xoá kết quả Jev đã có. Phần mô tả không đổi (so bằng `hash`) thì dùng lại. Đã đổi thì giữ kết quả cũ, gắn `"stale": true`; chỉ `--jev` gọi thành công mới thay nó. Bản ghi Jev cũ chưa có `hash` được coi là khớp và gắn hash ở lần chạy đầu. `--jev` chỉ gửi file mới `unknown`, file stale và file lỗi lần trước. `local-tags.json` hỏng thì script dừng (mã 1), không ghi đè. File được ghi tạm rồi đổi tên nên ngắt giữa chừng không làm hỏng bản cũ.
  - Đường gọi Jev chỉ được test với server giả trong repo; chưa kiểm chứng với API thật.

## Chuyển thành thiết kế của khách

1. Đọc tối đa 3 file được gợi ý, chỉ ở các mục **Tokens**, **Layout**, **Do's and Don'ts**. Không chép `Quick Start` CSS, HTML mẫu hay mô tả component nguyên văn.
2. Rút ra nguyên tắc: thang chữ, nhịp khoảng cách, số màu nhấn, độ bo góc, mật độ.
3. Viết `tokens.css` mới bằng tên biến của starter. Thay font gốc bằng một cặp trong `data/font-pairs.json` (có subset tiếng Việt). Chỉnh màu nhấn cho đạt 4.5:1.
4. Pha ít nhất hai nguồn, hoặc một nguồn với bảng màu của khách. Không dựng lại nhận diện của một thương hiệu cụ thể.
5. Ghi trong `docs/website/brand.md`: "Cảm hứng cấu trúc từ: <tên style>". Không ghi tên đó lên site.
6. Chạy `render-check.mjs` như mọi thiết kế khác.
