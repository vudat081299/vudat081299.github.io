# CLAUDE.md — research-proposal-project

Tài liệu môn Research Proposal Project: một trang HTML tự chứa, không build, không cổng riêng.

| file | là gì |
|---|---|
| `research-proposal-project.html` | "biến project thành master thesis" — bản đồ bảy phần, tư duy nghiên cứu, literature review, methodology, thống kê suy diễn, từ phân tích tới hệ hỗ trợ quyết định, viết luận văn, phản biện; kèm suy diễn, ví dụ số, code và template |

Trang tự mang CSS/JS trong file; chỉ nạp font Google và KaTeX từ jsDelivr. Mở trực tiếp là chạy.
Theme lưu ở `localStorage`.

Liên kết: trang được niêm yết ở trang chủ qua `data/collection.json` (section Master's Degree),
cùng mục với `../thesis-topic-selector/` — việc chọn đề tài luận văn nằm ở thư mục đó, có
`CLAUDE.md` và bộ tiêu chí riêng.

Cổng: không có cổng riêng. Thứ duy nhất soi thư mục này là cổng trang chủ
(`tools/lint-collection.py`), và nó chỉ kiểm link từ danh mục tới trang còn sống.
