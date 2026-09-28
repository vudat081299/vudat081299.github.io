/* ============================================================================
   hook-state.mjs — MỘT bản luật cho câu "ba lớp tự động đã cài chưa"

   Vì sao tách ra thành file riêng: câu hỏi này từng có HAI cách trả lời trong repo,
   và chúng nói ngược nhau. `gate.mjs` (cổng G-HOOK) đã được sửa ở phiên (p) để hiểu
   bộ điều phối; `session.mjs` thì chưa, nên lúc mở phiên 2026-08-12 nó báo "2/3 lớp
   CHƯA cài" trong khi cả hai hook vẫn đang chạy thật. Đó là false negative tệ nhất:
   nó đẩy người ta đi cài lại, mà cài lại bằng script của project con thì đúng cái
   thao tác CLAUDE.md ở gốc repo cảnh báo (đặt symlink, xoá mất bộ điều phối).

   Cùng một luật viết hai chỗ thì sớm muộn cũng lệch. Đây là chỗ duy nhất.
   ========================================================================== */

import { readFileSync, existsSync, realpathSync } from 'node:fs';
import { join, isAbsolute } from 'node:path';
import { execFileSync } from 'node:child_process';

const same = (a, b) => { try { return realpathSync(a) === realpathSync(b); } catch { return false; } };

/* Hook git nằm ở đâu. KHÔNG phải lúc nào cũng là <gốc>/.git/hooks: trong một worktree thì
   .git là một FILE, và hook nằm ở thư mục chung của mọi worktree — đúng chỗ bộ điều phối
   (tools/install-hooks.sh ở gốc repo) cài vào, vì nó hỏi `git rev-parse --git-path hooks`.
   Hỏi đúng câu đó ở đây; git không trả lời được thì mới đoán <gốc>/.git/hooks. */
function gitHooksDir(gitRoot) {
  try {
    const p = execFileSync('git', ['-C', gitRoot, 'rev-parse', '--git-path', 'hooks'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (p) return isAbsolute(p) ? p : join(gitRoot, p);
  } catch { /* không phải repo git, hoặc không có git: rơi xuống cách đoán cũ */ }
  return join(gitRoot, '.git', 'hooks');
}

/* Ba cách cài git hook đều được nhận, và cách thứ ba là cách repo này đang dùng:
     1. symlink thẳng tới tools/hooks/<name>  (cách cài cũ của install-hooks.sh ở thư mục
        này — nay nó gọi bộ điều phối, vì symlink xoá cổng của mọi project khác)
     2. một dòng gọi sang, thêm vào hook có sẵn
     3. BỘ ĐIỀU PHỐI — repo có nhiều project, mỗi project một bộ hook riêng, nên hook
        ở .git/hooks/ chỉ là một vòng lặp qua mọi file git theo dõi khớp mẫu đường dẫn
        "sao / tools / hooks / tên-hook" rồi gọi từng cái. (Viết mẫu đó ra bằng ký tự thật
        trong khối chú thích này sẽ ĐÓNG SỚM chính nó — dấu sao + gạch chéo là dấu đóng
        comment.) Nó KHÔNG chứa chuỗi "data-science-roadmap" nào, nên cách kiểm cũ báo
        CHƯA CÀI trong khi hook vẫn chạy thật. */
export function gitHookOk(name, { hooksDir, gitRoot, marker }) {
  const p = join(gitHooksDir(gitRoot), name);
  if (!existsSync(p)) return false;
  if (same(p, join(hooksDir, name))) return true;
  const src = readFileSync(p, 'utf8');
  if (src.includes(`${marker}/tools/hooks/${name}`)) return true;
  // Bộ điều phối: quét theo mẫu đường dẫn, và hook của thư mục này có tồn tại.
  return src.includes(`*/tools/hooks/${name}`) && existsSync(join(hooksDir, name));
}

/* Trả về ba lớp theo đúng thứ tự CLAUDE.md §3, mỗi lớp { when, what, ok }.
   `when` là cách gọi ngắn (dùng khi liệt kê lớp đang tắt), `what` là tên đầy đủ. */
export function hookLayers({ hooksDir, gitRoot, marker = 'data-science-roadmap' }) {
  const cs = join(gitRoot, '.claude', 'settings.json');
  const opts = { hooksDir, gitRoot, marker };
  return [
    { when: 'sau mỗi Edit/Write', what: 'Claude Code PostToolUse (sau mỗi Edit)',
      ok: existsSync(cs) && readFileSync(cs, 'utf8').includes(marker) },
    { when: 'lúc commit', what: 'git pre-commit (lúc commit)', ok: gitHookOk('pre-commit', opts) },
    { when: 'lúc push',   what: 'git pre-push (lúc push = deploy)', ok: gitHookOk('pre-push', opts) },
  ];
}
