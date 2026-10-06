# Quyết định — pages/

Quyết định chủ trang đã chốt cho từng trang trong `pages/`. Quyết định chung cho `pages/` và `cooking/` ở
`DECISIONS.md` gốc.

<!-- index:start -->
- PAGES-001 · Trang giải thích dễ hiểu mà đủ kiến thức · `pages/*.html`
- PAGES-002 · jazz-piano-theory: giao diện tự do · `pages/jazz-piano-theory.html`
- PAGES-003 · betting-strategy-lab: không có trên trang chủ nhưng vẫn lên web · `pages/betting-strategy-lab.html`
- PAGES-004 · ML 101 và Toán cho ML: đổi cấu trúc lớn thì chỉ đề xuất · `pages/machine-learning-101.html`, `pages/mathematics-for-machine-learning.html`
- PAGES-005 · hidden-curriculum: nằm trong danh sách ẩn · `pages/hidden-curriculum.html`
- PAGES-007 · hidden-curriculum: kho mô hình đòn bẩy cao, sâu hơn nhiều · `pages/hidden-curriculum.html`, `pages/data/hidden-curriculum.json`
- PAGES-008 · hidden-curriculum: rà nội dung, sửa có điều kiện và nén chữ · `pages/hidden-curriculum.html`, `pages/data/hidden-curriculum.json`
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

## PAGES-005 · hidden-curriculum: nằm trong danh sách ẩn
04/10/2026 · `pages/hidden-curriculum.html`

Trang có mục trong `hold` của `data/collection.json` (REPO-020), không có trong `sections`. Vẫn lên web: đừng
thêm nó vào `WITHHELD`, `UNLISTED` hay `--exclude` của `deploy.yml`.

## PAGES-007 · hidden-curriculum: kho mô hình đòn bẩy cao, sâu hơn nhiều
05/10/2026 · `pages/hidden-curriculum.html`, `pages/data/hidden-curriculum.json` · thay cho PAGES-006

Mục tiêu: có được, giữ được, dùng được tiền tài, quyền lực, lòng người, qua những mô hình mà nhiều người chỉ học được
sau nhiều năm. Thuần kiến thức, không dẫn chuyện. Mỗi ý phải đổi được một quyết định; sâu hơn nhiều: luật kèm cơ chế,
bằng chứng, giới hạn, việc làm và nhãn độ tin. Không giáo điều, không khái quát về tầng lớp, không dạy thao túng.
Khái niệm cốt lõi ở thư viện mô hình (file JSON), nối với nhau và với các mục.

## PAGES-008 · hidden-curriculum: rà nội dung, sửa có điều kiện và nén chữ
06/10/2026 · `pages/hidden-curriculum.html`, `pages/data/hidden-curriculum.json`

Rà cả luận điểm lẫn diễn đạt: giữ ý đúng, sửa sai hoặc thiếu điều kiện, chỉ bổ sung điều đổi được cách quyết định.
Rút câu dài, dẫn nhập và ý lặp; không thêm mục chỉ để đủ checklist mô hình. Giữ thiết kế, tập trung chất lượng nội dung.
Ưu tiên xương sống và chủ đề dùng được với ít kiến thức; phân biệt nguyên lý dùng rộng với kiến thức theo tình huống.
Độ dài không tự là lỗi; kiểm cả thời gian tiếp thu và bản in PDF, giữ chiều sâu có ích để tra cứu.
Thu gọn phải giữ nguyên lý, cách dùng và điều kiện quan trọng luôn hiện; bản PDF gọn cũng phải hiểu đúng khi đọc riêng.
