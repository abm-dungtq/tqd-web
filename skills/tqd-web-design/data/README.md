# Dữ liệu thiết kế (curate)

Nguồn: [`nextlevelbuilder/ui-ux-pro-max-skill`](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill),
commit `281e4537afb11333ac9947783779aaf314ebfbf2`, giấy phép MIT (xem `LICENSE-upstream.txt`).

## Đây là gì

Tập con **đã chọn lọc và viết lại** cho website nhỏ của chủ doanh nghiệp Việt Nam:

| Tệp | Số bản ghi | Nguồn gốc |
|---|---:|---|
| `styles.json` | 14 hướng phong cách | `styles.csv` |
| `palettes.json` | 21 bảng màu | `colors.csv` |
| `font-pairs.json` | 10 cặp font | `typography.csv` + danh sách font có subset tiếng Việt của plugin |
| `ux-rules.json` | 29 luật UX | `ux-guidelines.csv` |
| `surfaces.json` | 6 bề mặt (landing, menu, booking, dashboard, auth, settings) | `landing.csv`, `app-interface.csv` |

Không có mã Python, component React, hay tài liệu nào của bản AgentKit trong thư mục này.
Mọi bảng màu đã qua kiểm tương phản 4.5:1; mọi cặp font chỉ dùng họ có subset `vietnamese`.

## Đã sửa gì so với nguồn

- Chọn các dòng phù hợp website nhỏ; bỏ stack di động/desktop không liên quan.
- Viết lại nhãn, mô tả, `bestFor`, `avoid` bằng tiếng Việt; không chép nguyên văn.
- `finance-dark` dùng màu phụ của bảng gốc làm accent vì màu chính trùng nền, nút sẽ vô hình.
- Thêm `surfaces` cho từng style và luật quyền cho dashboard/settings.

## Kiểm tra

```bash
node --test skills/tqd-web-design/scripts/tests/design-intel.test.mjs
```

Test kiểm: JSON hợp lệ, id duy nhất, tương phản, whitelist font, ngân sách 150 KB,
và `NOTICE.txt` có đúng commit + giấy phép.

## Cập nhật dữ liệu

1. Đọc commit mới của upstream; chỉ lấy dòng thuộc phạm vi trên.
2. So `styles.csv`, `colors.csv`, `typography.csv`, `ux-guidelines.csv`, `landing.csv`, `app-interface.csv`.
3. Viết lại mô tả tiếng Việt; không chép câu gốc.
4. Chạy test; nếu bảng màu mới trượt 4.5:1 thì bỏ hoặc chỉnh và ghi lý do.
5. Cập nhật commit trong tệp này và trong `NOTICE.txt`.

Giữ dữ liệu dưới 150 KB để plugin nhẹ và dễ soát.
