# Nhật ký — gốc repo

Chuyện đã xảy ra ở mức cả repo: vì sao một luật tồn tại, bản trước sai ra sao. Mới nhất trên đầu.
Luật đang áp dụng ở `CLAUDE.md`; quyết định của chủ trang ở `DECISIONS.md`.

## 28/09/2026 — tầng tài liệu cho agent: mỗi loại tri thức một chỗ

- Rà kiến trúc. CLAUDE.md gốc dài 399 dòng, khoảng 3/4 là luật riêng của trang chủ, `pages/` và
  `shop/`; nó tăng từ 83 dòng (09/08) qua 33 commit. `pages/` — khu sửa nhiều nhất — không có
  CLAUDE.md; luật của nó rải ở CLAUDE.md gốc và trong memory của một máy.
- Bộ điều phối hook tìm bằng `find` nên nhặt cả hook trong `.claude/worktrees/` và bản nháp của các
  phiên: 88 hook pre-commit, 81 là bản sao; mỗi hook con bị gọi 10–14 lần một commit, và một commit
  sửa fact tốn khoảng 47 giây thay vì 4. Sửa bằng `git ls-files`. Một hook pre-push chưa từng merge
  (nhánh ngày 08/09) đang chạy nhờ một worktree bỏ quên — nay đưa vào repo.
- Tách: luật trang chủ vào `.claude/rules/home.md`, luật chung của trang sách vào
  `.claude/rules/book-pages.md`, `pages/` và `cooking/` có CLAUDE.md; quyết định vào DECISIONS.md
  từng project (REPO-011); bản đồ, hợp đồng cấu trúc và `tools/lint-structure.py` (REPO-012); deploy
  chờ cổng (REPO-014); cổng tự tìm (REPO-015).
- Luật dựng trang từng nằm trong skill `web-builder` cá nhân (bộ cổng G1–G10, mục "Before you build").
  Skill ấy ở ngoài repo và không còn trên máy; phần áp cho repo nay ở `.claude/rules/book-pages.md`.
- Một lượt rà kiến trúc trước (08/09, nhánh `claude/project-architecture-review-44b5ba`) đã đề xuất
  `pages/CLAUDE.md` và cổng lớp 3 cho pages/cooking, nhưng không bao giờ được merge.

## 21/09/2026 — trang chủ thiết kế lại, rời bộ web-builder

- Chủ trang yêu cầu thiết kế lại trang chủ không dùng bộ web-builder (REPO-003). Rời bộ thì mất bộ
  cổng G1–G9 của skill, nên `tools/smoke-index.js` ra đời. Nó bắt bốn lỗi thật mà lint mù:
  `margin-left` âm kéo theo `border-bottom` làm gạch của hàng thò ra ngoài gạch section 8px;
  `padding: 9px 0 11px` trong media query xoá mất lề ngang nên chữ chạm mép màn ở 390px;
  `flex-basis: auto` của ô tìm kiếm làm thanh trên gãy thành bốn hàng ở 320px (flex xếp dòng theo
  basis trước khi co); một bậc chữ xám chỉ đạt 2,79:1, dưới ngưỡng AA 4,5:1.
- Font: `Fraunces:opsz,wght@9..144,600..700` nặng 65 KB riêng subset latin; bỏ dải 600..700 (trang
  chỉ dùng 600) còn 34 KB. Ghim `opsz@144` còn 16 KB nhưng tiêu đề section 23–31px mảnh như sợi tóc,
  nên không ghim.
- Gỡ hai trang khỏi danh mục theo yêu cầu chủ trang (REPO-007). Đo được: trang gỡ khỏi danh mục vẫn
  trả HTTP 200 ở URL trực tiếp, vì rsync chép cả cây — nên `WITHHELD` phải kèm `--exclude`. Cùng
  ngày, một phiên thấy file nằm ngoài danh mục liền "sửa giúp" bằng cách đưa nó lên trang chủ — nên
  cổng cấm niêm yết lại.
- `betting-strategy-lab`: chủ trang chỉ muốn bỏ link, vẫn lên web → tách `UNLISTED` khỏi `WITHHELD`
  (PAGES-003).
- Thứ tự 8 section đổi (REPO-004 → REPO-005). Luật thứ tự trong section được viết ra vì thiếu nó thì
  `Data & AI` xếp ngược chiều học và `Thinking` để kho tra cứu dẫn đầu.
- Đo độ dài mô tả: 35 mô tả dài 24→193 ký tự (trung vị 77). Mọi ngưỡng chung đều là số bịa, nên cổng
  không kiểm độ dài.
- `gates.yml` trước đó chỉ chạy `lint-pages.py`, dù CLAUDE.md nói lớp 4 chạy cổng của mọi project: hai
  cổng `verify-*` sống vài tuần chỉ trên máy người viết. Thêm vào `gates.yml`; từ 28/09 CI tự tìm.
- Tài liệu về `lint-shop.py` từng hứa hai phép kiểm không tồn tại ("`cat` phải trỏ vào danh mục có
  thật", "tag của bộ chọn mùi phải khớp `mood`") — `cat` thậm chí không phải một trường của
  `shop.json`. Tài liệu hứa nhiều hơn cổng làm là cách một cổng chết mà không ai biết.
- Ba phép kiểm svg / cây tiêu đề / aria-label vào `lint-pages.py` theo kiểu bánh cóc: bốn trang cũ còn
  nợ, ghi trong bảng `DEBT`.

## 20/09/2026 — keyspace phím tắt hết, trang mồ côi

- 36 ô phím (`0-9a-z`) dùng hết; `wealth-roadmap` là mục thứ 37 → `key` thành trường tuỳ chọn.
- `family-insurance-benefits.html` và `jazz-piano-theory.html` đã viết xong mà nằm ngoài danh mục
  nhiều tháng: mở được bằng URL trực tiếp nên không gì tự lộ ra. → `lint-collection.py` kiểm chiều
  ngược: mọi trang `pages/` và `cooking/` phải có một mục.
- `shop/` có CLAUDE.md riêng vì năm trang dùng chung một shell, nội dung ở `data/shop.json`, và giá
  suy ra chứ không ghi tay.
- `desc` của section vi phạm luật chủ đề ở ba chỗ (Cooking, Science, Master's) → luật áp cả cho `desc`
  của section. Một section một trục: bỏ ô `Pages` chứa lẫn công cụ với giáo trình.

## 08/09/2026 — mô tả chỉ nói chủ đề; nội dung trước, UI sau

- Đo: 12/31 mô tả nói về bộ máy của trang ("4 acts", "Searchable", "(Anh/Việt)"). `(Anh/Việt)` không
  phải ngoại lệ mà khớp giọng láng giềng → bộ mẫu quan trọng hơn luật. Rà cả 31, sửa 12 (REPO-002).
- Trang chủ và bốn trang công thức chuyển sang `data/*.json` (REPO-001).

## 10/08/2026 — cổng cho cashy và pages, pre-push cho facts

- Quyết định lúc ấy: `pages/` và `cooking/` không có CLAUDE.md riêng vì "không có luật nội dung chung
  để viết ra". Đảo ngày 28/09: luật chung của trang sách có thật, chỉ là nằm trong memory một máy.

## 09/08/2026 — sự cố `--amend`

- Một lượt `--amend` nhằm sửa số liệu trong message của `cf8df60` đã rơi trúng `943af04` của phiên
  khác. Phát hiện trước khi push, gỡ bằng `git reset --soft 943af04`. Nếu đã push kèm `--force` thì
  đó là mất dữ liệu thật. → luật "fetch trước khi viết lại lịch sử" ở CLAUDE.md gốc, và
  `tools/agent/guard-git.py`.
