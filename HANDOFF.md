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

## NỢ

- CLAUDE.md dài quá 200 dòng hoặc còn mốc ngày: số đo ở bảng `DEBT_LINES` / `DEBT_DATES` trong
  `tools/lint-structure.py` (bánh cóc — chỉ được giảm).
