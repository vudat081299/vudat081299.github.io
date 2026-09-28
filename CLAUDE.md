# Repo này — luật chung cho mọi agent

Repo chứa nhiều project con độc lập. File này chỉ ghi thứ **vắt ngang mọi project**: bản đồ, cấu
trúc bắt buộc, tri thức để đâu, cổng, git. Luật riêng của từng project nằm trong CLAUDE.md của
project ấy — Claude Code tự nạp nó khi bạn đọc một file trong thư mục đó, nên đừng chép luật riêng
lên đây.

## Bản đồ project

| Đường dẫn | Loại | Là gì | Cổng |
|---|---|---|---|
| `index.html` | trang chủ | danh mục mọi trang, đọc từ `data/collection.json`; luật ở `.claude/rules/home.md` | `sh tools/check-index.sh` |
| `pages/` | bộ sưu tập | trang dạy học và tóm tắt sách, mỗi trang một file HTML | `sh pages/tools/check.sh` |
| `cooking/` | bộ sưu tập | công thức nấu ăn + kiến thức bếp | `sh cooking/tools/check.sh` |
| `facts/` | project | thư viện fact có kiểm chứng | `sh facts/tools/check.sh` |
| `shop/` | project | storefront nến thơm | `sh shop/tools/check.sh` |
| `cashy/` | project | app chi tiêu Vite + React — thứ duy nhất trong repo cần build | `sh cashy/tools/check.sh` |
| `masters-degree/data-science-roadmap/` | project | trang dạy Data Science | `sh masters-degree/data-science-roadmap/tools/check.sh` |
| `masters-degree/thesis-topic-selector/` | project | bảng chấm và xếp hạng đề tài luận văn | chạy tay: `node calibrate.js --check` (trong thư mục) |
| `masters-degree/business-analytics/` | project | môn Business Analytics + đồ án | — |
| `masters-degree/system-analysis-design/` | project | đồ án môn Phân tích thiết kế hệ thống | — |
| `masters-degree/research-proposal-project/` | project | đề cương nghiên cứu, từ đồ án tới luận văn | — |
| `web-builder/` | project | design system `wb-*` + trang tài liệu; nhiều trang link thẳng vào `web-builder.css` | — |
| `json-analysis/` | project | công cụ xem, sửa, so JSON | — |
| `loto/` | project | thống kê và heatmap xổ số | — |
| `read-excel-file-to-table/` | project | đọc file Excel ra bảng | — |
| `poem/` | project | thơ Việt, engine Truyện Kiều | — |
| `portfolio/` | project | portfolio + component thử nghiệm | — |
| `stuff/` | gác xép | đồ cũ, không publish, không link từ đâu | — |

`python3 tools/lint-structure.py` đỏ nếu một thư mục có mặt trong repo mà thiếu dòng ở đây.

## Cấu trúc bắt buộc — mỗi loại tri thức một chỗ

Mỗi dòng trong bản đồ có các file sau, và mỗi file chỉ làm một việc:

| File | Khi nào có | Chứa | Không chứa |
|---|---|---|---|
| `CLAUDE.md` | luôn | luật đang áp dụng: là gì, file vào, lệnh cổng, luật riêng | ngày tháng, "bản trước sai", nhật ký, số đếm sẽ trôi |
| `DECISIONS.md` | từ quyết định đầu tiên | quyết định chủ trang đã chốt — mã, ngày, phạm vi, nhóm, trạng thái | luật chi tiết (ở CLAUDE.md), chuyện riêng tư |
| `HANDOFF.md` | khi có việc dở | chỉ bốn mục: `ĐANG LÀM`, `CHƯA LÀM`, `NỢ`, `CHỜ CHỦ TRANG` | nhật ký |
| `HISTORY.md` | tuỳ | nhật ký phiên, mới nhất trên đầu | luật hiện hành |
| `README.md` | tuỳ | cho người đọc trên GitHub | luật cho agent |
| `tools/check.sh` | khi có cổng | mọi cổng của project, một lệnh; hook ở `tools/hooks/pre-commit` | — |

- Trang chủ không có thư mục riêng (GitHub Pages bắt `index.html` ở gốc), nên luật của nó ở
  `.claude/rules/home.md`. Luật chung cho trang sách của cả `pages/` lẫn `cooking/` ở
  `.claude/rules/book-pages.md`. Cả hai chỉ được nạp khi agent đọc file khớp `paths:` của chúng.
- Quyết định và việc dở của trang chủ, và của những gì vắt qua nhiều project, ở `DECISIONS.md` /
  `HANDOFF.md` / `HISTORY.md` ở gốc.
- `python3 tools/lint-structure.py` kiểm phần đo được: bản đồ đủ, mỗi project có CLAUDE.md, project
  có hook thì có `tools/check.sh`, CLAUDE.md không quá 200 dòng và không có ngày tháng, HANDOFF chỉ
  có bốn mục. `python3 tools/decisions.py check` kiểm sổ quyết định.

**Thêm một trang vào `pages/` hoặc `cooking/`:** làm theo `pages/CLAUDE.md`, mục *Thêm một trang*.
Tóm tắt: một file HTML theo `.claude/rules/book-pages.md`, một mục trong `data/collection.json`, trang
nói số cụ thể thì thêm `pages/tools/verify-<tên>.py` (tự được tìm, không phải khai ở đâu).

**Thêm một project thư mục:** tạo thư mục + `CLAUDE.md`, thêm một dòng vào bản đồ. Có cổng thì đặt ở
`<project>/tools/`, gom vào `<project>/tools/check.sh` (CI tự chạy), hook ở
`<project>/tools/hooks/pre-commit` (bộ điều phối tự tìm). Lên trang chủ thì thêm mục vào
`data/collection.json`.

## Tri thức để đâu

- Chủ trang trả lời một câu hỏi của agent và câu trả lời thành luật → ghi một mục vào `DECISIONS.md`
  của project đó (định dạng ở docstring của `tools/decisions.py`), và luật vào CLAUDE.md kèm mã.
  Quyết định áp cho nhiều project → `DECISIONS.md` gốc.
- Trước khi sửa một file có thể dính quyết định cũ: `python3 tools/decisions.py find <file>`.
- Repo **public** và được deploy nguyên cây: không ghi tên người thật, nơi làm việc, tiền bạc, hay vì
  sao một trang bị ẩn — kể cả trong DECISIONS.md và commit message.
- Memory của Claude Code chỉ nằm trên một máy và không vào git: chỉ dành cho chuyện riêng tư và mẹo
  của đúng máy ấy. Luật, quyết định, việc dở của repo phải nằm trong repo, để máy nào `git pull`
  cũng có (REPO-013).
- Mẹo làm việc đã trả giá mới rút ra (chạy nhiều agent, sửa hàng loạt, dẫn nguồn, kiểm trong trình
  duyệt): skill `agent-practices` trong `.claude/skills/`.
- File HTML dài: đừng Read cả file. `python3 tools/toc.py <file>` in bản đồ mục kèm dải dòng.

## Nội dung trước, UI sau

Khối **lặp** → chữ ở `data/*.json`; khối **độc nhất** → chữ ở HTML (REPO-001). Viết nội dung vào
file dữ liệu trước (chữ thuần, chưa có thẻ), rồi dựng UI đọc dữ liệu bằng vòng lặp, rồi ghép và chạy
cổng. Tách file mua được một thứ: cả tập nằm cạnh nhau nên cái lệch tự lộ, và linter kiểm được cấu
trúc. Trang văn xuôi độc nhất thì **không** tách — JSON hoá chỉ thêm một lớp gián tiếp.

- `fetch` cần HTTP: mở bằng `file://` là trang rỗng, nên trang đọc data phải có đường lỗi chỉ người
  dùng chạy `python3 -m http.server`.
- Chỉ trường có hậu tố `_html` được `innerHTML`, còn lại `textContent` / escape.
- Số liệu suy ra được thì đừng ghi tay — trong data lẫn trong tài liệu. Cổng in số khi chạy.

## Cổng: bốn lớp, và vì sao cần cả bốn

| Lớp | Chạy khi | Bắt được | Nằm ở |
|---|---|---|---|
| 1. `PostToolUse` | ngay sau mỗi Edit/Write của Claude | sửa bằng công cụ sửa file | `.claude/settings.json` |
| 2. `pre-commit` | `git commit` | mọi thay đổi, kể cả viết bằng script | `*/tools/hooks/pre-commit` |
| 3. `pre-push` | `git push` | `--no-verify`, commit merge, commit cherry-pick vào | `*/tools/hooks/pre-push` |
| 4. GitHub Actions | push lên `main` và mọi PR | thứ ba lớp trên bỏ sót vì chúng chạy trên máy người sửa | `.github/workflows/gates.yml` |

- Lớp 2 và 3 cần bộ điều phối: `sh tools/install-hooks.sh` (chạy nhiều lần vô hại). Nó gọi mọi
  `*/tools/hooks/<event>` mà git theo dõi — chỉ file trong repo, không nhặt bản sao trong worktree.
  Thêm project thì đặt hook đúng chỗ là xong, không phải sửa bộ điều phối.
- Lớp 4 chạy cổng của **mọi** project, không chỉ project vừa sửa: nó tự tìm mọi `*/tools/check.sh`.
  Repo có nhiều phiên song song, và một thay đổi ở đây làm hỏng chỗ kia là chuyện đã xảy ra.
- **Deploy chỉ chạy sau khi lớp 4 xanh** (REPO-014): cổng đỏ thì web giữ bản cũ.
- Cả bốn lớp đều không bắt được **hành vi**: lint đọc cú pháp và dữ liệu, không bấm nút. Project có
  logic chạy trong trình duyệt thì cần thêm tầng mở trình duyệt thật rồi đo (`shop/tools/smoke.js`,
  `tools/smoke-index.js`).

## Luật bất di bất dịch

1. **Cổng mới phải nằm trong repo, không nằm trong đầu ai.** Viết thành script trong
   `<project>/tools/`, gom vào `tools/check.sh`, nối vào một lớp ở trên.
2. **`.claude/settings.json`, `.claude/skills/`, `.claude/rules/` được git theo dõi** (xem
   `.gitignore`); phần còn lại của `.claude/` là cục bộ. Thêm hook, skill hay rule thì commit — nếu
   không, quy trình chỉ chạy trên đúng một máy.
3. **Đừng cài hook bằng symlink trỏ vào một project**: project cài sau xoá mất cổng của project trước.
   Đó là lý do bộ điều phối tồn tại.
4. **`--no-verify` dùng được khi thật cần**, nhưng bỏ qua xong phải sửa ngay — cổng tắt lâu là cổng
   đã chết.

## Git: nhiều phiên chạy song song

Nhiều phiên agent cùng làm trên các project con và **cùng push thẳng lên `main`**. `HEAD` cục bộ có
thể bị phiên khác vượt mặt bất cứ lúc nào, kể cả giữa hai lệnh của cùng một lượt làm việc.

**Trước mọi lệnh viết lại lịch sử — `commit --amend`, `rebase`, `reset --hard` — chạy:**

```bash
git fetch origin main -q && git log --oneline -3 && git rev-list --left-right --count origin/main...HEAD
```

Nếu `HEAD` không còn là commit bạn vừa tạo thì **dừng lại**: `--amend` sửa "commit đang là HEAD",
không phải "commit của tôi", nên nó ghi đè message của phiên khác mà không cảnh báo. Chuyện này đã
xảy ra (xem `HISTORY.md`).

1. **Đã push rồi thì đừng amend.** Sửa bằng một commit mới nói rõ chỗ sai.
2. **Force-push lên `main` luôn phải hỏi chủ repo**, kể cả khi commit là của bạn.
3. **`--force-with-lease` thay cho `--force`**, luôn luôn.
4. **Làm trong worktree thì mọi lệnh trỏ vào worktree** (`git -C "$WT" …`). Checkout chính thường
   đang giữ việc dở chưa commit của chủ repo — ghi vào đó là trộn hai việc vào nhau.
5. **Yêu cầu gồm nhiều gạch đầu dòng thì mỗi gạch một commit**, cổng xanh ở mọi commit, push một lần
   cuối (REPO-009).
