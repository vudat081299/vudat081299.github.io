# Quyết định — facts/

<!-- index:start -->
- FACTS-001 · Một lỗi được chỉ ra là mẫu của cả một lớp lỗi · `facts/`
- FACTS-002 · Fact phải tự chứa: người 15 tuổi chưa học ngành đó đọc là hiểu · `facts/data/*.json`, `facts/tools/factlint.py`
- FACTS-003 · Fact đúng mà đọc xong không cầm được gì thì cũng loại · `facts/data/*.json`
- FACTS-004 · Fact sửa huyền thoại: tóm tắt nói cái đúng, không kể lịch sử cái sai · `facts/data/*.json`, `facts/tools/factlint.py`
- FACTS-005 · Thư viện là nguồn học tập, đọc không thấy học thuật; có thêm truyện · `facts/`
- FACTS-006 · Việc chính là thêm truyện, thêm fact và sửa diễn giải, từ nguồn uy tín · `facts/`
- FACTS-007 · Truyện có trục phân loại riêng và nhóm riêng trên thanh chủ đề · `facts/data/manifest.json`, `facts/data/chuyen/*.json`, `facts/app.js`, `facts/index.html`, `facts/tools/factlint.py`
- FACTS-008 · Đích quy mô: khoảng 3.000 fact và 500 truyện · `facts/data/`
- FACTS-009 · Truyện: không tự bịa, nguồn chính thống, được nhiều người công nhận · `facts/data/chuyen/*.json`, `facts/data/manifest.json`, `facts/tools/factlint.py`
- FACTS-010 · Thêm truyện Sherlock Holmes, truyện ứng xử có thật, truyện về tâm lý học · `facts/data/chuyen/*.json`, `facts/data/manifest.json`
- FACTS-011 · Fact ưu tiên ngắn gọn: `q` và `d` tuỳ chọn, không có sàn độ dài · `facts/data/*.json`, `facts/data/manifest.json`, `facts/tools/factlint.py`
<!-- index:end -->

## FACTS-001 · Một lỗi được chỉ ra là mẫu của cả một lớp lỗi
12/08/2026 · `facts/`

Chủ trang chỉ ra một fact hỏng thì đừng chỉ sửa fact ấy: tìm cơ chế, đo lớp lỗi trên cả thư viện, nối luật vào
`factlint.py`, rà sạch, rồi mới báo xong. Vì: chủ trang không muốn làm người review.

## FACTS-002 · Fact phải tự chứa: người 15 tuổi chưa học ngành đó đọc là hiểu
12/08/2026 · `facts/data/*.json`, `facts/tools/factlint.py`

Fact chỉ đọc được khi đã biết thuật ngữ của ngành thì không có người đọc nào: viết lại bằng lời thường, hoặc bỏ.

## FACTS-003 · Fact đúng mà đọc xong không cầm được gì thì cũng loại
12/08/2026 · `facts/data/*.json`

Qua ba cổng thế giới / mỏ neo / một câu chưa đủ: người đọc phải cầm về được một điều về thế giới. Fact định nghĩa một
thước đo phải viết lại thành một phép đo bằng chính thước đo ấy.

## FACTS-004 · Fact sửa huyền thoại: tóm tắt nói cái đúng, không kể lịch sử cái sai
24/08/2026 · `facts/data/*.json`, `facts/tools/factlint.py`

Fact sửa huyền thoại phát biểu điều đúng, và phần tóm tắt diễn giải chính điều ấy. Nguồn gốc của niềm tin sai chỉ được
làm câu phụ.

## FACTS-005 · Thư viện là nguồn học tập, đọc không thấy học thuật; có thêm truyện
24/08/2026 · `facts/`

Thư viện là nguồn học tập kiểu *Mười vạn câu hỏi vì sao*: đọc lần nào cũng học thêm một thứ, và không thấy học thuật.
Truyện ngắn là loại nội dung thứ hai, bên cạnh fact.

## FACTS-006 · Việc chính là thêm truyện, thêm fact và sửa diễn giải, từ nguồn uy tín
24/08/2026 · `facts/`

Ưu tiên: thêm truyện, thêm fact, sửa diễn giải các fact đang có — từ nguồn uy tín, diễn giải tốt. Lớp giải thích "vì
sao" chỉ là việc phụ.

## FACTS-007 · Truyện có trục phân loại riêng và nhóm riêng trên thanh chủ đề
25/08/2026 · `facts/data/manifest.json`, `facts/data/chuyen/*.json`, `facts/app.js`, `facts/index.html`, `facts/tools/factlint.py`

Truyện không mượn `cat`/`sub` của fact. Nó có trục `kieu` khai ở `manifest.kieu_chuyen`, chia theo hình dạng câu chuyện,
và có nhóm riêng trên thanh chủ đề.

## FACTS-008 · Đích quy mô: khoảng 3.000 fact và 500 truyện
25/08/2026 · `facts/data/`

Thư viện hướng tới khoảng 3.000 fact và khoảng 500 truyện. Không nới cổng nào để kịp số.

## FACTS-009 · Truyện: không tự bịa, nguồn chính thống, được nhiều người công nhận
25/08/2026 · `facts/data/chuyen/*.json`, `facts/data/manifest.json`, `facts/tools/factlint.py`

Truyện gì cũng được, miễn không do agent tự nghĩ ra, có nguồn chính thống và được nhiều người đánh giá là hay; truyện
cổ Grimm hay canon Sherlock Holmes đều nhận. "Được công nhận" buộc vào `manifest.tuyen_tap`, không vào cảm nhận của
người viết.

## FACTS-010 · Thêm truyện Sherlock Holmes, truyện ứng xử có thật, truyện về tâm lý học
25/08/2026 · `facts/data/chuyen/*.json`, `facts/data/manifest.json`

Thư viện nhận truyện ngắn Sherlock Holmes, truyện có thật về ứng xử và đối nhân xử thế, và truyện giúp hiểu tâm lý học.
Chúng vào trục `kieu` thành ba hình dạng có cổng riêng, không thành kiểu chia theo đề tài.

## FACTS-011 · Fact ưu tiên ngắn gọn: `q` và `d` tuỳ chọn, không có sàn độ dài
25/08/2026 · `facts/data/*.json`, `facts/data/manifest.json`, `facts/tools/factlint.py`

Fact ngắn gọn, diễn giải đơn giản. `q` và `d` tuỳ chọn; có `d` thì viết vừa đủ, một câu là xong thì một câu. Đừng đặt
lại sàn độ dài, và đừng dùng `manifest.day_du` làm điều kiện chặn.
