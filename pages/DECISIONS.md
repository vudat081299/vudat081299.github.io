# Quyết định — pages/

<!-- decisions: prefix=PAGES; index=phạm-vi; nhóm=nội dung, giao diện, xuất bản -->

Quyết định chủ trang đã chốt cho từng trang trong `pages/`. Mục lục gom theo trang. Quyết định áp cho
cả `pages/` lẫn `cooking/` nằm ở `DECISIONS.md` gốc. Tra theo file:
`python3 tools/decisions.py find pages/<trang>.html`.

<!-- index:start -->
**`pages/*.html`**
- PAGES-001 — Trang giải thích: dễ hiểu nhưng đủ kiến thức, visualize được thì phải visualize

**`pages/betting-strategy-lab.html`**
- PAGES-003 — betting-strategy-lab: không có trên trang chủ nhưng vẫn lên web

**`pages/jazz-piano-theory.html`**
- PAGES-002 — jazz-piano-theory: giao diện tự do, không dựng theo skill

**`pages/machine-learning-101.html`**
- PAGES-004 — ML 101 và Toán cho ML: đề xuất cấu trúc lớn chỉ đề xuất, không tự làm

**`pages/mathematics-for-machine-learning.html`**
- PAGES-004 — ML 101 và Toán cho ML: đề xuất cấu trúc lớn chỉ đề xuất, không tự làm
<!-- index:end -->

### PAGES-001 — Trang giải thích: dễ hiểu nhưng đủ kiến thức, visualize được thì phải visualize
- **Ngày:** 09/09/2026
- **Phạm vi:** pages/*.html
- **Nhóm:** nội dung
- **Trạng thái:** đang áp dụng
- **Quyết định:** Trang giải thích một chủ đề chuyên môn phải dễ hiểu tới mức người không chuyên cũng
  theo được, **và** đủ kiến thức — cả hai là ràng buộc, không cái nào đổi lấy cái kia. Ý nào visualize
  được thì bắt buộc visualize.
- **Vì sao:** "dễ hiểu" không có nghĩa là cắt bớt; đơn giản hoá mà làm phát biểu thành sai là hỏng cả hai.
- **Đừng:** coi khuôn "ba ô" (chuyện sờ được → ký hiệu chuẩn → dùng ở đâu) là bắt buộc — đó là cách một
  phiên chọn để đáp ứng yêu cầu, chủ trang chưa duyệt lại.
- **Nguồn:** lời chủ trang khi đặt làm trang Toán cho Học máy: "giải thích sao cho trẻ con cấp 1 cũng
  hiểu, nhưng phải đủ kiến thức nhé, tôi nghĩ cái nào visualize được thì phải visualize đấy".

### PAGES-002 — jazz-piano-theory: giao diện tự do, không dựng theo skill
- **Ngày:** 25/09/2026
- **Phạm vi:** pages/jazz-piano-theory.html
- **Nhóm:** giao diện
- **Trạng thái:** đang áp dụng
- **Quyết định:** Chủ trang bác giao diện cũ (dựng bằng skill) và yêu cầu thiết kế lại tự do, giữ nguyên
  tính năng: bộ "liner notes" hiện tại. Mọi chuyển động mới nằm trong một `<script>` "LỚP GIAO DIỆN"
  riêng ở cuối trang, chỉ đọc trạng thái và thêm class.
- **Đừng:** đưa trang về lại một skill hay bộ web-builder; sửa giao diện thì sửa ở lớp giao diện, đừng
  đụng các module hành vi.
- **Nguồn:** commit f5210e7 (hành vi giữ nguyên, đo trên toàn bộ thao tác).

### PAGES-003 — betting-strategy-lab: không có trên trang chủ nhưng vẫn lên web
- **Ngày:** 21/09/2026
- **Phạm vi:** pages/betting-strategy-lab.html
- **Nhóm:** xuất bản
- **Trạng thái:** đang áp dụng
- **Quyết định:** Trang push thẳng lên `main` như mọi trang, chỉ là trang chủ không trỏ tới. Nó nằm trong
  `UNLISTED` của `tools/lint-collection.py`, và cổng đòi `deploy.yml` KHÔNG có `--exclude` cho nó.
- **Đừng:** thêm `--exclude` cho trang này vì "trang chủ không link tới" — như thế là làm nhiều hơn điều
  được yêu cầu, trang sẽ biến mất khỏi web.
- **Nguồn:** commit 16f2c58.

### PAGES-004 — ML 101 và Toán cho ML: đề xuất cấu trúc lớn chỉ đề xuất, không tự làm
- **Ngày:** 25/09/2026
- **Phạm vi:** pages/machine-learning-101.html, pages/mathematics-for-machine-learning.html
- **Nhóm:** nội dung
- **Trạng thái:** đang áp dụng
- **Quyết định:** Sau đợt rà hai trang theo bộ tiêu chí sư phạm của chủ trang, việc tách trang, tách
  chương hay đảo chương thì chỉ đề xuất, không tự làm. Danh sách đề xuất đang chờ nằm ở
  `pages/HANDOFF.md`, mục CHỜ CHỦ TRANG.
- **Nguồn:** đợt rà 24–25/09/2026 (commit d76644c tới 60ec8d5).
