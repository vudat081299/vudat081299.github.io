# Repo này — luật chung cho mọi agent

Đây là một repo chứa **nhiều project con độc lập**, mỗi project có luật riêng trong
`CLAUDE.md` của chính nó. File này chỉ nói về thứ vắt ngang tất cả: **cổng chất lượng và
cách chúng chạy tự động**.

| Project | Luật riêng | Cổng | Lớp đang nối |
|---|---|---|---|
| `facts/` | [facts/CLAUDE.md](facts/CLAUDE.md) | `facts/tools/factlint.py check` + `verify` | 1, 2, 3 |
| `masters-degree/data-science-roadmap/` | CLAUDE.md trong thư mục đó | `node tools/gate.mjs` | 1, 2, 3 |
| `cashy/` | [cashy/CLAUDE.md](cashy/CLAUDE.md) | `node scripts/check-layers.mjs` + `oxlint` | 2 |
| `pages/` | — | `python3 pages/tools/lint-pages.py` | 2 |
| `cooking/` | — | `python3 cooking/tools/lint-cooking.py` | 2 |
| các project khác | xem thư mục | — | — |

`pages/` và `cooking/` không có CLAUDE.md riêng: mỗi trang là một tài liệu HTML tự chứa,
không có luật nội dung chung để viết ra. Cổng của chúng chỉ kiểm thứ đúng/sai khách quan —
id trùng, anchor gãy, asset thiếu, thẻ lệch. `cooking/` là bốn trang bếp (Việt, Hàn, Âu mặn,
Bánh Âu) dùng chung một khung filter/modal; tách khỏi `pages/` để gom một chỗ, nên có cổng
cùng bộ kiểm nhưng riêng thư mục.

Cổng `cashy/` cần Node ≥ 20 (oxlint cần ≥ 22). Node mặc định trên máy có thể là bản cũ do
fnm/nvm ghim, nên hook tự dò Homebrew thay vì tin vào `PATH` — nếu không nó sẽ "im lặng
pass" mà chẳng kiểm gì.

---

## Việc đầu tiên khi bắt đầu một phiên

```bash
sh facts/tools/install-hooks.sh
```

Chạy được nhiều lần, không hại gì. Nó dựng lại `.git/hooks/pre-commit` và `pre-push` thành
**bộ điều phối**. Bỏ bước này thì lớp cổng thứ hai không tồn tại trên máy bạn.

## Ba lớp cổng, và vì sao cần cả ba

| Lớp | Chạy khi | Bắt được gì | Đi theo repo |
|---|---|---|---|
| 1. `PostToolUse` | ngay sau mỗi Edit/Write | sửa bằng công cụ sửa file | có — `.claude/settings.json` |
| 2. `pre-commit` | lúc `git commit` | **mọi** thay đổi, kể cả viết bằng script | có — `*/tools/hooks/pre-commit` |
| 3. `pre-push` | lúc `git push` | trạng thái cuối của thứ sắp lên public | có |

Lớp 1 phản hồi nhanh nhất nhưng **có lỗ**: thay đổi viết bằng `python3 - <<EOF` hay `sed`
không đi qua tool Edit/Write nên nó không thấy. Lớp 2 bịt lỗ đó. Lớp 3 bịt trường hợp
`--no-verify`, commit merge, và commit cũ được cherry-pick vào.

## Quy tắc bất di bất dịch

1. **Cổng mới phải nằm trong repo, không nằm trong đầu ai.** Viết ra một script chạy được,
   đặt trong `<project>/tools/`, rồi nối vào một trong ba lớp trên.
2. **`.claude/settings.json` được theo dõi bởi git** (xem `.gitignore`). Thêm hook mới thì
   commit file đó, đừng chỉ sửa trên máy mình. Phần còn lại của `.claude/` vẫn là cục bộ.
3. **Bộ điều phối gọi mọi `*/tools/hooks/pre-commit`** trong repo, và mỗi hook con tự lọc
   theo đường dẫn của nó. Thêm project mới thì chỉ cần đặt file đúng chỗ, không phải sửa
   bộ điều phối.
4. **Đừng cài hook bằng symlink trỏ vào một project.** Repo này có nhiều project; symlink
   làm project cài sau xoá mất cổng của project cài trước. Đó là lý do bộ điều phối tồn tại.
5. **Chạy `install-hooks.sh` của project con sẽ phá bộ điều phối** (nó đặt lại symlink).
   Chạy lại `facts/tools/install-hooks.sh` là xong.

## Bỏ qua cổng

`git commit --no-verify` và `git push --no-verify` vẫn dùng được, và đôi khi đúng là cần.
Nhưng bỏ qua rồi thì phải sửa ngay sau đó — cổng bị tắt lâu là cổng đã chết.

---

## Git: repo này có nhiều phiên chạy song song

Nhiều phiên agent cùng làm việc trên các project con khác nhau và **cùng push thẳng lên
`main`**. `HEAD` cục bộ của bạn có thể bị một phiên khác vượt mặt bất cứ lúc nào, kể cả
giữa hai lệnh của cùng một lượt làm việc.

**Trước mọi lệnh viết lại lịch sử — `commit --amend`, `rebase`, `reset --hard` — phải chạy:**

```bash
git fetch origin main -q && git log --oneline -3 && git rev-list --left-right --count origin/main...HEAD
```

Nếu `HEAD` không còn là commit bạn vừa tạo thì **dừng lại**. `--amend` không amend "commit
của tôi", nó amend "commit đang là HEAD" — và nếu phiên khác vừa commit lên trên, bạn sẽ
ghi đè message của họ mà không có cảnh báo nào.

Sự cố có thật ngày 09/08/2026: một lượt `--amend` nhằm sửa số liệu trong message của
`cf8df60` đã rơi trúng `943af04` của phiên khác. Phát hiện được trước khi push, gỡ bằng
`git reset --soft 943af04`. Nếu đã push kèm `--force` thì đó là mất dữ liệu thật.

Ba quy tắc rút ra:

1. **Đã push rồi thì đừng amend.** Sửa message bằng một commit mới nói rõ chỗ sai, hoặc hỏi
   chủ repo trước khi rebase và force-push.
2. **Force-push lên `main` luôn phải hỏi**, kể cả khi commit đó là của chính bạn — bạn không
   biết phiên khác đang ở đâu.
3. **`--force-with-lease` thay cho `--force`**, luôn luôn. Nó từ chối khi remote đã đổi.
