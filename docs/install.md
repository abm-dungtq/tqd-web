# Cài đặt TQD Web Studio

Kho GitHub (`abm-dungtq/tqd-web`) cài được trên nhiều agent. Mỗi agent đọc tệp khai báo riêng và dùng chung các thư mục `skills/`, `agents/`, `rules/`.

| Agent | Tệp khai báo | Nạp được |
| --- | --- | --- |
| Claude Code | `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` | 6 skill, 2 agent, luật qua từng skill |
| Codex (CLI, app ChatGPT desktop) | `.codex-plugin/plugin.json`, `.agents/plugins/marketplace.json` | 6 skill (`tqd-web:<tên skill>`) |
| Antigravity (App, CLI, IDE) | `plugin.json` | 6 skill, 2 agent, 1 luật luôn bật |
| Gemini CLI | `gemini-extension.json` | luật, 6 skill, 2 agent (chưa chạy thử) |
| Agent khác (Cursor, OpenCode, Copilot…) | thư mục `skills/` | chỉ 6 skill |

Plugin cần Node.js 20 trở lên, không cài thêm gói npm nào. Bước chụp màn hình cần thêm Node.js 22 và Chrome, Edge hoặc Chromium.

## Claude Code

Gõ trong phiên Claude Code:

```text
/plugin marketplace add abm-dungtq/tqd-web
/plugin install tqd-web@tqd-studio
```

Hoặc chạy từ terminal:

```bash
claude plugin marketplace add abm-dungtq/tqd-web
claude plugin install tqd-web@tqd-studio
```

Cập nhật bằng `claude plugin update tqd-web@tqd-studio`, rồi `/reload-plugins` hoặc mở phiên mới. Gỡ bằng `claude plugin uninstall tqd-web@tqd-studio`.

## Codex

```bash
codex plugin marketplace add abm-dungtq/tqd-web
codex plugin add tqd-web@tqd-studio
codex plugin list -m tqd-studio
```

Mở phiên Codex mới, skill hiện với tên `tqd-web:tqd-web`, `tqd-web:tqd-web-design`… Lệnh `/plugins` trong phiên mở trình quản lý để bật, tắt hoặc gỡ. App ChatGPT desktop đọc marketplace từ tệp trong kho (`.agents/plugins/marketplace.json`) hoặc bản cá nhân `~/.agents/plugins/marketplace.json`; khởi động lại app rồi mở Plugins Directory và chọn nguồn **TQD Studio**.

Cập nhật bằng `codex plugin marketplace upgrade tqd-studio` (chỉ áp dụng cho marketplace thêm từ Git), rồi chạy lại `codex plugin add tqd-web@tqd-studio`. Gỡ bằng `codex plugin remove tqd-web@tqd-studio`.

Codex không nạp `agents/` và không tự nạp `rules/AGENTS.md`; mỗi skill tự đọc tệp luật này lúc chạy.

## Antigravity

```bash
agy plugin install https://github.com/abm-dungtq/tqd-web
agy plugin list
```

Plugin cài vào `~/.gemini/config/plugins/tqd-web` và dùng chung cho Antigravity App, CLI và IDE. Mở **Customizations > Installed** để thấy **TQD Web Studio** cùng 3 gợi ý mở đầu. Gọi skill bằng `/tqd-web`, `/tqd-web-design`…

Cài từ bản sao trên máy bằng `agy plugin install ./tqd-web`, kiểm tra bằng `agy plugin validate --strict ./tqd-web`. Bật, tắt, gỡ bằng `agy plugin enable|disable|uninstall tqd-web`.

## Gemini CLI

Gemini CLI đã được thay bằng Antigravity CLI cho gói miễn phí và Google One từ 18/06/2026; mục này dành cho bản còn cài.

```bash
gemini extensions install https://github.com/abm-dungtq/tqd-web
```

Gemini CLI nạp `rules/AGENTS.md` qua `contextFileName`; tài liệu extension cho biết cũng nạp `skills/` và `agents/`. Lệnh cài chưa được chạy thử vì máy kiểm thử không có Gemini CLI. Gỡ bằng `gemini extensions uninstall tqd-web`.

## Agent khác (chỉ cài skill)

Với các agent đọc skill theo chuẩn `SKILL.md` (Cursor, OpenCode, GitHub Copilot, Windsurf…), cài bằng CLI `skills`.

```bash
npx skills add abm-dungtq/tqd-web
```

Thêm `--all` để cài đủ 6 skill cho mọi agent, vì các skill gọi script của nhau qua đường dẫn `../<skill>/scripts/`. Cách này không kèm `rules/AGENTS.md` và hai agent; hãy chép luật vào tệp luật dự án (`AGENTS.md`, `.cursor/rules/`…).

## Để agent tự cài

Có thể giao việc cài cho agent bằng danh sách bước dưới đây; agent tự nhận ra môi trường và chạy lệnh.

1. Nguồn cài là https://github.com/abm-dungtq/tqd-web, theo docs/install.md của kho.
2. Xác định agent đang chạy: Claude Code, Codex, Antigravity, Gemini CLI hay agent khác.
3. Chạy đúng mục cài đặt; không sửa cấu hình bằng tay khi đã có lệnh CLI.
4. Kiểm tra đủ 6 skill tqd-web, tqd-web-design, tqd-web-content, tqd-web-audit, tqd-web-launch, tqd-web-app.
5. Kiểm tra `node --version` từ 20 trở lên.
6. Báo lại lệnh đã chạy, kết quả và bước tiếp theo.

## Đã kiểm chứng

Kiểm trên macOS với bản 2.3.0. Mỗi lần dùng thư mục cấu hình tạm, không đụng cài đặt thật.

| Agent | Lệnh | Kết quả |
| --- | --- | --- |
| Claude Code | `claude plugin validate .`; `claude plugin marketplace add` + `install` từ thư mục kho | đạt; 6 skill, 2 agent |
| Codex CLI 0.169.0 | `codex plugin marketplace add` + `codex plugin add` từ thư mục kho | đạt; `codex debug prompt-input` liệt kê đủ 6 skill `tqd-web:*` |
| Antigravity CLI 1.5.14 | `agy plugin validate --strict .`; `agy plugin install` từ URL GitHub | 0 cảnh báo; 6 skill, 2 agent, 1 luật |
| `skills` CLI | `npx skills add <kho> --list` | thấy đủ 6 skill |
| Gemini CLI | không có trên máy kiểm thử | chưa chạy thử |
