# Quyết định — pages/

Quyết định chủ trang đã chốt cho từng trang trong `pages/`. Quyết định chung cho `pages/` và `cooking/` ở
`DECISIONS.md` gốc.

<!-- index:start -->
- PAGES-001 · Trang giải thích dễ hiểu mà đủ kiến thức · `pages/*.html`
- PAGES-002 · jazz-piano-theory: giao diện tự do · `pages/jazz-piano-theory.html`
- PAGES-003 · betting-strategy-lab: không có trên trang chủ nhưng vẫn lên web · `pages/betting-strategy-lab.html`
- PAGES-004 · ML 101 và Toán cho ML: đổi cấu trúc lớn thì chỉ đề xuất · `pages/machine-learning-101.html`, `pages/mathematics-for-machine-learning.html`
<!-- index:end -->

## PAGES-001 · Trang giải thích dễ hiểu mà đủ kiến thức
09/09/2026 · `pages/*.html`

Dễ hiểu cho người không chuyên, và đủ, đúng kiến thức. Ý nào visualize được thì phải visualize. Khuôn "ba ô"
chỉ là một cách đã dùng, không bắt buộc.

## PAGES-002 · jazz-piano-theory: giao diện tự do
25/09/2026 · `pages/jazz-piano-theory.html`

Giao diện "liner notes" hiện tại do chủ trang yêu cầu, không dựng theo skill hay bộ web-builder. Chuyển động
nằm trong script "LỚP GIAO DIỆN" cuối trang; sửa giao diện thì sửa ở đó, đừng đụng các module hành vi.

## PAGES-003 · betting-strategy-lab: không có trên trang chủ nhưng vẫn lên web
21/09/2026 · `pages/betting-strategy-lab.html`

Trang nằm trong `UNLISTED` của `tools/lint-collection.py`. Đừng thêm `--exclude` cho nó trong `deploy.yml`.

## PAGES-004 · ML 101 và Toán cho ML: đổi cấu trúc lớn thì chỉ đề xuất
25/09/2026 · `pages/machine-learning-101.html`, `pages/mathematics-for-machine-learning.html`

Tách trang, tách hay đảo chương thì chỉ đề xuất, không tự làm. Danh sách đề xuất ở `pages/HANDOFF.md`.
