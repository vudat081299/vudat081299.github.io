# CLAUDE.md — business-analytics

Tài liệu môn Business Analytics của chương trình cao học: hai trang HTML tự chứa, không build,
không cổng riêng.

| file | là gì |
|---|---|
| `business-analytics.html` | trang học cả môn: bốn tầng phân tích, CRISP-DM, KPI tree, chất lượng dữ liệu và feature engineering, EDA, hồi quy, đánh giá phân loại, phân cụm, chuỗi thời gian, dự án môn học, bài tập kèm lời giải |
| `fraud-detection-project.html` | trang giải thích đồ án môn — phát hiện gian lận trên PaySim cộng các đặc trưng tổng hợp, từ đề bài, EDA tới kết quả mô hình — để đọc trước khi thuyết trình |

Cả hai trang tự mang CSS/JS trong file; chỉ nạp font Google và KaTeX từ jsDelivr. Mở trực tiếp
là chạy. Theme và tiến độ đọc lưu ở `localStorage` của từng trang.

Liên kết: hai trang được niêm yết ở trang chủ qua `data/collection.json` (section Master's
Degree); `fraud-detection-project.html` trỏ sang trang dạy Data Science
(`../data-science-roadmap/`), còn `../system-analysis-design/` trỏ về `business-analytics.html`.
Đổi tên hay dời một trang thì sửa cả những chỗ trỏ tới nó.

Cổng: không có cổng riêng. Thứ duy nhất soi thư mục này là cổng trang chủ
(`tools/lint-collection.py`), và nó chỉ kiểm link từ danh mục tới trang còn sống.
