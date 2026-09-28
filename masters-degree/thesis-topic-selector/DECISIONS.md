# Quyết định — thesis-topic-selector

<!-- decisions: prefix=THESIS; nhóm=nội dung, dữ liệu, quy trình -->

Những gì chủ trang đã chốt cho bảng chọn đề tài luận văn. Luật đang áp dụng nằm ở
[CLAUDE.md](CLAUDE.md), tiêu chí chấm ở [thesis-topic-rubric.md](thesis-topic-rubric.md), còn
nhật ký từng bản nằm ngay trong changelog của trang.

<!-- index:start -->
**dữ liệu**
- THESIS-002 — Ưu tiên đề tài có dữ liệu dễ lấy · `masters-degree/thesis-topic-selector/thesis-topic-selector.html`

**quy trình**
- THESIS-001 — Chấm theo rubric trước khi thêm bất kỳ đề tài nào · `masters-degree/thesis-topic-selector/thesis-topic-selector.html`, `masters-degree/thesis-topic-selector/thesis-topic-rubric.md`
<!-- index:end -->

### THESIS-001 — Chấm theo rubric trước khi thêm bất kỳ đề tài nào
- **Ngày:** 31/07/2026
- **Phạm vi:** masters-degree/thesis-topic-selector/thesis-topic-selector.html, masters-degree/thesis-topic-selector/thesis-topic-rubric.md
- **Nhóm:** quy trình
- **Trạng thái:** đang áp dụng
- **Quyết định:** mỗi đề tài mới phải được chấm theo `thesis-topic-rubric.md` trước khi vào danh
  sách — không phải chấm sau, không phải chấm mẫu. Lời chủ trang: "mỗi khi có thêm đề tài nào
  thì phải review với file rubric trước cho đề tài đó trước khi thêm vào danh sách".
- **Vì sao:** rubric là bộ lọc hội tụ, không bù trừ — một blocker thất bại là loại — nên chấm sau
  khi đã thêm là muộn. Bằng chứng: bản 8 được thêm mà không qua chấm, và khi chấm bù ở bản 11
  thì 9 trong 11 đề tài đã tra ra có công trình làm đúng câu hỏi ấy.
- **Đừng:** thêm một đề tài chưa chạy B8 (tra công trình gần nhất).
- **Nguồn:** lời chủ trang ngày 31/07/2026; changelog của trang, bản 11 và bản 12; commit
  8491b5c, cf62e89.
- **Chi tiết:** thesis-topic-rubric.md

### THESIS-002 — Ưu tiên đề tài có dữ liệu dễ lấy
- **Ngày:** 31/07/2026
- **Phạm vi:** masters-degree/thesis-topic-selector/thesis-topic-selector.html
- **Nhóm:** dữ liệu
- **Trạng thái:** đang áp dụng
- **Quyết định:** khi mở rộng danh sách, ưu tiên đề tài có dữ liệu dễ lấy — mở, tải trực tiếp,
  không cần credential.
- **Nguồn:** changelog của trang, bản 9 ("Ưu tiên dữ liệu dễ lấy, theo yêu cầu"); commit 9eb3e38.

Cách bản 9 áp nó: phần lớn đề tài mới dùng dữ liệu tải thẳng; đề tài nào cần thủ tục xin thì
ghi phương án B trong `d.risk`, và việc của ngày 1 trong spike là gửi đơn.
