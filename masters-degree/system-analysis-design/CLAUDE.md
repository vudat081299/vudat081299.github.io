# CLAUDE.md — system-analysis-design

Tài liệu môn Phân tích và Thiết kế Hệ thống (System Analysis and Design): một trang HTML, không
build, không cổng riêng.

| file | là gì |
|---|---|
| `social-housing-chatbot-project.html` | trang giải thích đầy đủ đồ án môn — chatbot tư vấn nhà ở xã hội: bài toán, actor và use case, kiến trúc ba lớp, luồng RAG, bảo mật DLP, thiết kế lớp và cơ sở dữ liệu, bộ UML, kịch bản kiểm thử, và những chỗ báo cáo tự mâu thuẫn |

Trang **không tự chứa CSS**: nó nạp `../../web-builder/web-builder.css` (token + component
`wb-*` của bộ web-builder). Sửa file đó là đổi luôn trang này — kiểm lại nó khi đụng vào bộ.

Liên kết: trang được niêm yết ở trang chủ qua `data/collection.json` (section Master's Degree);
nó trỏ về trang chủ (`../../index.html`) và sang `../business-analytics/business-analytics.html`.

Cổng: không có cổng riêng. Thứ duy nhất soi thư mục này là cổng trang chủ
(`tools/lint-collection.py`), và nó chỉ kiểm link từ danh mục tới trang còn sống.
