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

- **Chặn force-push lên `main` ở phía GitHub** (Settings → Rules → Rulesets, hoặc Branches → "Block force
  pushes"). Hook trên máy chỉ chặn được agent ở máy đã cài; luật ở GitHub thì không ai lách được.
- **Gộp ba lệnh `PostToolUse` trong `.claude/settings.json` thành một bộ điều phối**, cùng kiểu với
  pre-commit: tự gọi `<project>/tools/hooks/post-edit.sh` nếu có. Hiện mỗi project một lệnh chép gần
  giống nhau, thêm project là phải sửa settings.json — cũng là file agent không được tự sửa.
- **Dọn nhánh đã xong trên GitHub.** Rà ngày 28/09: các nhánh chỉ còn trên origin đã gộp hết vào main
  (`code-repo-clone`, `educational-facts`, `family-insurance-page-restructure`, `funny-bardeen`,
  `jazz-piano-theory-guide`, `review-knowledge-pages`, `vibrant-shannon`), cùng
  `origin/refactor/componentize-and-confirm` (kiến trúc Cashy cũ), `origin/claude/ds-roadmap-review-brainstorm-wufnd0`
  (đã có trên main), `origin/p1` (bản chép codepen cũ) và `origin/claude/mobile-responsive-optimization-476773`
  (đã có trên main, trừ một sửa navbar — đã ghi ở `pages/HANDOFF.md`). Giữ
  `origin/claude/amazing-ramanujan-wwc35z`: trùng đầu main, có thể là một phiên đang chạy. Xoá nhánh
  trên remote không hoàn tác được — chờ chủ repo đồng ý.

## CHƯA LÀM

- **Nối `calibrate.js --check` của `masters-degree/thesis-topic-selector/` vào một lớp cổng** — lệnh kiểm
  có sẵn nhưng chưa lớp nào chạy nó.

## NỢ

- CLAUDE.md dài quá 200 dòng hoặc còn mốc ngày: số đo ở bảng `DEBT_LINES` / `DEBT_DATES` trong
  `tools/lint-structure.py` (bánh cóc — chỉ được giảm).
