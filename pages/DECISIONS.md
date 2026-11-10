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
- PAGES-009 · hidden-curriculum: tự trọng và hành vi đời thường · `pages/hidden-curriculum.html`, `pages/data/hidden-curriculum.json`
- PAGES-010 · hidden-curriculum: yêu đương và cách xây quan hệ · `pages/hidden-curriculum.html`, `pages/data/hidden-curriculum.json`
- PAGES-011 · hidden-curriculum: sức hút và nhịp tiến triển trong yêu đương · `pages/hidden-curriculum.html`, `pages/data/hidden-curriculum.json`
- PAGES-012 · hidden-curriculum: hàm ý và giới hạn của lời nói lấp lửng · `pages/hidden-curriculum.html`
- PAGES-013 · hidden-curriculum: xử lý khi chưa rõ ý người khác · `pages/hidden-curriculum.html`
- PAGES-014 · hidden-curriculum: tâm kế · `pages/hidden-curriculum.html`, `pages/data/hidden-curriculum.json`
- PAGES-015 · hidden-curriculum: dạy tư duy, luật chỉ giữ khi thật cần, viết đơn giản nhất · `pages/hidden-curriculum.html`, `pages/data/hidden-curriculum.json`
- PAGES-016 · hidden-curriculum: hành trang cho người 26 tuổi, rà toàn trang · `pages/hidden-curriculum.html`, `pages/data/hidden-curriculum.json`
- PAGES-017 · hidden-curriculum: bỏ điều hiển nhiên, giữ điều đúc kết · `pages/hidden-curriculum.html`, `pages/data/hidden-curriculum.json`
- PAGES-018 · hidden-curriculum: nói chuyện phiếm, tâm thế tán tỉnh, tỏ ý với đồng nghiệp · `pages/hidden-curriculum.html`, `pages/data/hidden-curriculum.json`
- PAGES-019 · ai-native-workflow: agent làm phần lớn vòng đời, người giữ phần quyết và kiểm · `pages/ai-native-workflow.html`
- PAGES-020 · hidden-curriculum: điều thường chỉ học được sau khi trả giá · `pages/hidden-curriculum.html`
- PAGES-021 · hidden-curriculum: tổng quan trước, đọc trong khung · `pages/hidden-curriculum.html`
- PAGES-022 · hidden-curriculum: Gỡ rối trong đầu · `pages/hidden-curriculum.html`, `pages/data/hidden-curriculum.json`
- PAGES-023 · Trang sách: nắm đủ tư duy với ít thời gian đọc nhất · `pages/books-in-brief.html`, `pages/a-short-history-of-nearly-everything.html`, `pages/how-to-lie-with-statistics.html`, `pages/how-to-win-every-argument.html`, `pages/the-little-blue-reasoning-book.html`, `pages/how-money-works.html`
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

Trang có mục trong `hold` của `data/collection.json` (REPO-021), không có trong `sections`. Vẫn lên web: đừng
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

## PAGES-009 · hidden-curriculum: tự trọng và hành vi đời thường
07/10/2026 · `pages/hidden-curriculum.html`, `pages/data/hidden-curriculum.json`

Bổ sung cách rèn sự vững vàng qua tự trọng, giao tiếp, chủ động và lựa chọn đời thường; mở rộng theo cơ chế để dùng ở nhiều tình huống.
Không quy mọi hành vi về thiếu giá trị bản thân hay mục đích sống; phân biệt phẩm giá, năng lực và đánh giá bên ngoài.
Chủ trang giao quyền chọn tích hợp hoặc tách trang; giữ nguyên lý và giới hạn luôn hiện, để ví dụ và bài tập trong phần mở rộng.

## PAGES-010 · hidden-curriculum: yêu đương và cách xây quan hệ
08/10/2026 · `pages/hidden-curriculum.html`, `pages/data/hidden-curriculum.json`

Bổ sung kinh nghiệm yêu đương từ làm quen, nhắn tin và hẹn gặp đến xây quan hệ, bất đồng và quyết định tiếp tục hay dừng.
Đối chiếu nghiên cứu với kinh nghiệm truyền miệng; hướng tới hiểu và lựa chọn hai chiều, giảm suy tính trong giao tiếp.
Tự review phần mới, sửa rồi review lại khi chưa đạt; giữ nguyên lý và điều kiện quan trọng ở bản thu gọn.

## PAGES-011 · hidden-curriculum: sức hút và nhịp tiến triển trong yêu đương
09/10/2026 · `pages/hidden-curriculum.html`, `pages/data/hidden-curriculum.json`

Bổ sung kỹ năng tạo sức hút, tán tỉnh, đọc sự đáp lại và chọn nhịp từ làm quen đến khi đã yêu vào các mục hiện có.
Giải thích yếu tố chiến lược; phân biệt chú ý, thiện cảm, theo đuổi và cam kết, đối chiếu cả tác dụng lẫn giới hạn của “làm giá”.
Giữ nguyên lý ở bản gọn, ví dụ và nghiên cứu ở phần mở rộng; tự review, sửa rồi kiểm lại trước commit và push main.

## PAGES-012 · hidden-curriculum: hàm ý và giới hạn của lời nói lấp lửng
09/10/2026 · `pages/hidden-curriculum.html`

Đối chiếu tư duy “người khôn ăn nói nửa chừng”; chỉ bổ sung phần có ích và có điều kiện vào các mục giao tiếp, yêu đương hiện có.
Phân biệt kiệm lời, nói tế nhị, giữ riêng tư và gợi mở với mập mờ tạo kỳ vọng sai; làm rõ thông tin người kia cần để quyết định.
Giữ nguyên lý ở bản gọn, ví dụ và bằng chứng ở phần mở rộng; tự review trước commit và push main.

## PAGES-013 · hidden-curriculum: xử lý khi chưa rõ ý người khác
10/10/2026 · `pages/hidden-curriculum.html`

Bổ sung khung chung để xử lý lời nói và tin nhắn chưa rõ ý vào mục đọc người, nối sang phần nhắn tin.
Tách dữ kiện khỏi suy đoán, xem ngữ cảnh, hỏi điều cần quyết định và điều chỉnh theo phản hồi; không mặc định động cơ theo giới hay phủ nhận lời từ chối.
Giữ nguyên lý ở bản gọn, ví dụ và bằng chứng ở phần mở rộng; tích hợp vào các mục hiện có để tránh kéo dài tài liệu bằng các tình huống lặp.

## PAGES-014 · hidden-curriculum: tâm kế
12/10/2026 · `pages/hidden-curriculum.html`, `pages/data/hidden-curriculum.json`

Bổ sung tâm kế vào mục thế và cam kết: phân biệt mưu lược hợp lệ với thao túng bằng phép thử công khai.
Dạy để nhận ra và phòng thủ, không để dùng; nêu bằng chứng về lợi và giá của tâm kế cùng giới hạn của nó.
Các chiêu kèm dấu hiệu và cách đáp không buộc tội ai; không lặp bảng Cialdini, chiêu trong yêu đương trỏ sang Phần 7.

## PAGES-015 · hidden-curriculum: dạy tư duy, luật chỉ giữ khi thật cần, viết đơn giản nhất
12/10/2026 · `pages/hidden-curriculum.html`, `pages/data/hidden-curriculum.json`

Trang dạy tư duy, không dạy luật. Chỉ giữ một quy định khi thiếu nó người đọc dễ mất tiền, mất an toàn hay mất quyền khó lấy lại, và nguyên tắc tư duy chưa đủ dẫn tới việc đúng; còn lại xoá.
Quy định giữ lại viết thành một câu việc cần làm, không số điều, số nghị định trong thân bài; chi tiết đổi theo năm thì bảo người đọc kiểm quy định hiện hành.
Viết đơn giản, dễ hiểu nhất có thể: câu ngắn, từ thường, thuật ngữ phải giải nghĩa; giữ nguyên lý và điều kiện, cắt chi tiết không đổi được quyết định.

## PAGES-016 · hidden-curriculum: hành trang cho người 26 tuổi, rà toàn trang
18/10/2026 · `pages/hidden-curriculum.html`, `pages/data/hidden-curriculum.json`

Mục đích: hành trang có đòn bẩy cao cho người khoảng 26 tuổi, ít vốn, ít quen biết: ăn nói khéo, làm giàu, xử lý tình huống xã hội, yêu đương, thành công từ điểm xuất phát thấp.
Rà mọi mục theo bốn câu: đúng chưa (đối chiếu nguồn gốc), hợp mục đích chưa, gọn nhất chưa, còn thiếu mảng nào; tự sửa, không hỏi lại chủ trang.
Mảng thiếu bổ sung vào mục có sẵn, ngắn, có nguồn; phần thêm trả bằng phần cắt.

## PAGES-017 · hidden-curriculum: bỏ điều hiển nhiên, giữ điều đúc kết
19/10/2026 · `pages/hidden-curriculum.html`, `pages/data/hidden-curriculum.json`

Người đọc là người trưởng thành, có học, hiểu pháp luật và lẽ thường: xoá điều ai cũng biết — luật định sẵn, điều cấm, thủ tục, đạo lý suông, phép lịch sự quen thuộc, định nghĩa giáo khoa, lời rào đón lặp lại.
Chỉ giữ điều người từng trải đúc kết thành nguyên tắc: kinh nghiệm, triết lý, cơ chế, bằng chứng trái trực giác, kỹ thuật cụ thể, đánh đổi và điều kiện áp dụng; không thêm danh sách điều cấm tuyệt đối.
Một quy định chỉ ở lại khi trái trực giác và làm sai thì mất lớn, khó lấy lại (chặt hơn PAGES-015); điều hiển nhiên chỉ giữ khi là tiền đề của một ý không hiển nhiên.

## PAGES-018 · hidden-curriculum: nói chuyện phiếm, tâm thế tán tỉnh, tỏ ý với đồng nghiệp
25/10/2026 · `pages/hidden-curriculum.html`, `pages/data/hidden-curriculum.json`

Nói chuyện phiếm và bắt sóng là kỹ năng cần có trên trang; đặt trong mục nghe và hỏi (6.1), không tách mục riêng.
Phần yêu đương trả lời được: tâm thế khi bắt đầu tán tỉnh, cách tiến từng bước tới tỏ ý, dấu hiệu dễ đọc sai, và cách làm việc tiếp với đồng nghiệp sau khi bị từ chối.
Khác biệt trung bình theo giới chỉ nêu khi có nguồn, kèm điều kiện, không dùng để đoán một người cụ thể (PAGES-013).

## PAGES-019 · ai-native-workflow: agent làm phần lớn vòng đời, người giữ phần quyết và kiểm
08/11/2026 · `pages/ai-native-workflow.html`

Trang dạy dùng AI để agent làm nhiều nhất có thể suốt vòng đời phần mềm (dev, ship, bug, tính năng, bảo trì), con người còn giữ gì, và các công ty hàng đầu đã công bố cách làm nào.
Viết cho cả dev lẫn người không chuyên: đơn giản trước, sâu sau; ưu tiên sơ đồ và bảng, giao diện tối giản; thuật ngữ khó có popup mở bằng rê chuột, bàn phím và chạm.
Có bộ AI cho cả đội (file nào, để làm gì, thêm role ra sao) theo đúng cơ chế Claude Code, đối chiếu Codex; secret không bao giờ nằm trong file.

## PAGES-020 · hidden-curriculum: điều thường chỉ học được sau khi trả giá
09/11/2026 · `pages/hidden-curriculum.html`

Trang dạy điều người thường chỉ học được sau khi trả giá, nhờ một hoàn cảnh hiếm có, hoặc sau khi đã sống qua.
Mỗi mục nội dung có một dòng `hc-paid` “Thường học được sau khi …”; dòng ấy hiện trên thẻ tổng quan và trong mục.

## PAGES-021 · hidden-curriculum: tổng quan trước, đọc trong khung
09/11/2026 · `pages/hidden-curriculum.html`

Mở trang là thấy tổng quan một lượt: mục đích, bản đồ các phần, Gỡ rối trong đầu, rồi mỗi mục một thẻ.
Bấm thẻ thì mục mở trong khung đọc: bảng bên phải ở máy tính, tấm kéo từ đáy ở điện thoại (≤ 720px).
Esc, nút Đóng, Back và vuốt xuống đều đóng khung; liên kết `#s-…` mở thẳng mục, kể cả khi mở trang.
Mạch bài vẫn nằm trong HTML cho bản in và khi không có JS; mọi id, mô hình và liên kết giữ nguyên.
Màu và chữ theo trang chủ: mực, trắng, giấy ấm, một xanh lá; thêm vàng đất cho dòng “Thường học được sau khi”.

## PAGES-022 · hidden-curriculum: Gỡ rối trong đầu
09/11/2026 · `pages/hidden-curriculum.html`, `pages/data/hidden-curriculum.json`

Khối riêng gần đầu trang, ngoài các phần đánh số: những vòng nghĩ quen về tiền, yêu đương, ánh nhìn người khác,
công việc, gia đình và chính mình, mỗi cái một câu gỡ. Câu gỡ một câu, chỉ dài hơn khi thật cần; lý do tối đa
một câu ngắn; bỏ câu sáo rỗng. Mỗi suy nghĩ có nhãn độ tin, nguồn khi có, và mục đọc thêm.

## PAGES-023 · Trang sách: nắm đủ tư duy với ít thời gian đọc nhất
10/11/2026 · `pages/books-in-brief.html`, `pages/a-short-history-of-nearly-everything.html`, `pages/how-to-lie-with-statistics.html`, `pages/how-to-win-every-argument.html`, `pages/the-little-blue-reasoning-book.html`, `pages/how-money-works.html`

Mục đích cao nhất: người đọc nắm đủ tư duy và kiến thức của sách mà tốn ít thời gian hơn nhiều so với đọc bản đầy đủ; bố cục logic trước, trang trí sau.
Sách mà giá trị nằm ở cả mạch lập luận thì có trang riêng; sách chỉ cần lõi ý và cách nghĩ thì vào `books-in-brief.html`.
Trang sách mới dùng thiết kế mới, không theo khuôn web-builder của các trang sách cũ; trang dài nhiều mục thì đầu trang phải thấy tổng quan mọi mục.
