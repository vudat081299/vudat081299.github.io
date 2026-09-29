# HANDOFF — gốc repo

Việc dở ở mức cả repo. Việc của một project nằm trong HANDOFF.md của project ấy.

## CHỜ CHỦ TRANG

- **Đăng ký hai hook Claude Code trong `.claude/settings.json`.** Script đã có trong repo:
  `tools/agent/session-start.sh` (đầu mỗi phiên tự chạy `tools/install-hooks.sh`) và
  `tools/agent/guard-git.py` (chặn `commit --amend` / `rebase` / `reset --hard` khi chưa kiểm HEAD, chặn
  mọi force-push). Agent không được tự sửa hook của chính nó, nên chủ repo phải tự thêm hai khoá này vào
  object `"hooks"`, cạnh `PostToolUse` đang có:

  ```json
  "SessionStart": [
    { "hooks": [ { "type": "command", "timeout": 30,
      "command": "f=\"$CLAUDE_PROJECT_DIR/tools/agent/session-start.sh\"; [ -f \"$f\" ] || exit 0; sh \"$f\"" } ] }
  ],
  "PreToolUse": [
    { "matcher": "Bash", "hooks": [ { "type": "command", "timeout": 30,
      "command": "f=\"$CLAUDE_PROJECT_DIR/tools/agent/guard-git.py\"; [ -f \"$f\" ] || exit 0; python3 \"$f\"" } ] }
  ]
  ```

- **Gộp ba lệnh `PostToolUse` trong `.claude/settings.json` thành một bộ điều phối**, cùng kiểu với
  pre-commit: tự gọi `<project>/tools/hooks/post-edit.sh` nếu có. Hiện mỗi project một lệnh chép gần
  giống nhau, thêm project là phải sửa settings.json — cũng là file agent không được tự sửa.

## CHƯA LÀM

- **Nối `calibrate.js --check` của `masters-degree/thesis-topic-selector/` vào một lớp cổng** — lệnh kiểm
  có sẵn nhưng chưa lớp nào chạy nó.

## NỢ

- Chữ trên thanh trên cùng còn tiếng Việt ở 9 trang, trái REPO-016 (tiêu đề tab đã đổi hết, có cổng):
  `ai-native-workflow`, `betting-strategy-lab`, `family-insurance-benefits`, `jazz-piano-theory`,
  `machine-learning-101`, `machine-learning`, `mathematics-for-machine-learning`, `wealth-roadmap`
  (trong `pages/`) và `masters-degree/research-proposal-project/research-proposal-project.html`.
  Đổi xong thì đo tràn ngang ở 320 px — tên tiếng Anh thường dài hơn, và thanh trên cùng có luật cắt
  chữ riêng (`web-builder/CLAUDE.md`).
- **Lớp 3 soi cây làm việc, không soi commit được đẩy.** Mọi pre-push (gốc, `facts/`, ds-roadmap) chạy
  cổng trên file đang có trong thư mục: commit `--no-verify` mang lỗi mà cây đã sửa (chưa commit) vẫn
  đẩy được, còn cây có việc dở thì bị chặn oan. Sửa: bộ điều phối pre-push dựng
  `git worktree add --detach <sha>` tạm cho sha được đẩy rồi chạy hook con ở đó.
- **`deploy.yml` còn hai lối vòng qua cổng, trái REPO-014.** `workflow_dispatch` deploy nhánh được chọn
  mà không qua "Cổng chất lượng"; và chạy lại một lần cổng cũ phát lại `workflow_run` với `head_sha`
  cũ, nên có thể đè web bằng commit cũ (suy từ cách `workflow_run` chạy, chưa thử). Sửa: job build
  dừng nếu `head_sha` không còn là đầu `main`; dispatch chỉ cho `refs/heads/main`.
- **`pages/tools/run-verify.py` không có sàn.** Tìm ra 0 cổng `verify-*.py` (đổi tên, lỗi glob) thì
  không in gì và thoát 0 ở cả bốn lớp; sửa chính `run-verify.py` thì hook pages báo "không chạm trang
  nào có cổng kiến thức". Sửa: không đối số mà tìm ra 0 cổng thì thoát 1; `run-verify.py` đổi thì
  chạy hết.
- **`cashy/tools/check.sh` không chạy `tsc -b` hay vitest, trong khi deploy build bằng `tsc -b`.** Lỗi
  kiểu qua mọi cổng rồi làm deploy đỏ — cả site đứng ở bản cũ mà không cổng nào báo. Sửa: có
  `node_modules` thì `check.sh` chạy thêm `tsc -b` (và `vitest run`).
- **`tools/toc.py` ra bản đồ sai khi `<section id>` lồng trong một nhóm có h2 riêng.** Trên
  `pages/books-in-brief.html`, h2 "Người khác…" bị gắn id và dải dòng của section sách Manson đứng
  trước nó, và `--where kahneman` báo không có mục dù `<section id="kahneman">` có thật. Ba tài liệu bảo
  dùng toc.py cho file dài (CLAUDE.md gốc, `pages/CLAUDE.md`, `.claude/rules/book-pages.md`); tới khi
  sửa, đối chiếu kết quả của nó với `grep -n '<h2\|<section id'`. Kèm: `toc.py … | head` ném
  BrokenPipeError.
- CLAUDE.md dài quá 200 dòng hoặc còn mốc ngày: số đo ở bảng `DEBT_LINES` / `DEBT_DATES` trong
  `tools/lint-structure.py` (bánh cóc — chỉ được giảm).
