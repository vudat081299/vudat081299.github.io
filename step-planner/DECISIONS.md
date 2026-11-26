# Quyết định — step-planner

<!-- index:start -->
- PLAN-001 · Dự án là các bước có thứ tự, mỗi bước có bước con có thứ tự · `step-planner/`
- PLAN-002 · Dữ liệu chỉ ở trình duyệt, nhiều dự án, nhớ dự án mở cuối · `step-planner/`
- PLAN-003 · Bảy trạng thái, có Chờ (Pending); tiến độ không tính bỏ qua và huỷ; việc tiếp theo được tô · `step-planner/`
- PLAN-004 · Mở lại một bước (vòng lặp) có lý do, đếm vòng, chỉ rõ việc phải làm lại · `step-planner/`
- PLAN-005 · Mỗi dự án có nhật ký quyết định · `step-planner/`
- PLAN-006 · Xoá hoàn tác được; sắp xếp lại được; tìm theo chữ · `step-planner/`
- PLAN-007 · Markdown xuất ra đọc được và nhập lại được; nhập không ghi đè ngầm · `step-planner/`
- PLAN-008 · Mẫu đồ án lấy đúng từ trang đồ án · `step-planner/data/templates.json`
- PLAN-009 · Mẫu Data Science theo chuẩn CRISP-DM 1.0, áp được cho mọi dự án · `step-planner/data/templates.json`
- PLAN-010 · Không có khái niệm người làm · `step-planner/`
- PLAN-011 · Bước và bước con có tài liệu: link hoặc văn bản Markdown · `step-planner/`
- PLAN-012 · Giao diện tiếng Anh; Markdown xuất nhãn tiếng Anh, file cũ vẫn nhập · `step-planner/`
- PLAN-013 · Bước con chạy song song · `step-planner/`
- PLAN-014 · Số thứ tự đứng yên tới khi tải lại trang · `step-planner/`
- PLAN-015 · Tên trong mẫu là tiếng Anh theo tên gốc của chuẩn; nội dung mẫu tiếng Việt · `step-planner/data/templates.json`
- PLAN-016 · Mỗi dự án có phần thiết kế hệ thống: chọn theo gợi ý, tự vẽ sơ đồ, đưa thành việc · `step-planner/`
- PLAN-017 · Bàn giao giữa bước và bước con: đầu ra khai ở chỗ tạo, nơi dùng chọn đầu ra có sẵn · `step-planner/`
- PLAN-018 · Bằng chứng nghiệm thu và ngày xong: gợi ý, không chặn · `step-planner/`
- PLAN-019 · Sửa cùng lúc ở hai tab: gộp theo trường, trùng trường thì hỏi · `step-planner/`
- PLAN-020 · "Next" nói đang chờ gì; lọc theo nhóm trạng thái · `step-planner/`
- PLAN-021 · System design bắt đầu từ thứ bàn giao, kiểm phối hợp, ghi hợp đồng giữa các khâu, việc đi theo thiết kế · `step-planner/`
- PLAN-022 · Mẫu ghi loại đầu ra, khai bàn giao giữa các bước; có mẫu pipeline dữ liệu định kỳ · `step-planner/data/templates.json`
- PLAN-023 · System design phủ kiểm dữ liệu, gán nhãn, tìm kiếm và LLM; giữ cả công cụ nên tránh, kèm lý do · `step-planner/data/system-design.json`, `step-planner/js/design-core.js`
<!-- index:end -->

## PLAN-001 · Dự án là các bước có thứ tự, mỗi bước có bước con có thứ tự
24/11/2026 · `step-planner/`

Một dự án là danh sách bước chính có thứ tự; mỗi bước chứa bước con có thứ tự, đọc như một bảng: bước là hàng, bước con theo thứ tự trong hàng. Bước đánh số 1, 2, 3; bước con chỉ mang số vị trí trong hàng của nó (1, 2, 3), vì hàng đã cho biết nó thuộc bước nào. Mỗi bước có tiến độ riêng, dự án có tiến độ chung. Công cụ tên là Data Science Step Planner: ưu tiên dự án dữ liệu nhưng dùng được cho dự án bất kỳ.

## PLAN-002 · Dữ liệu chỉ ở trình duyệt, nhiều dự án, nhớ dự án mở cuối
24/11/2026 · `step-planner/`

Không có máy chủ: mọi dự án lưu trong bộ nhớ trình duyệt dưới một khoá có số phiên bản. Bộ nhớ bị chặn hay hỏng thì trang vẫn chạy và báo rõ. Có nhiều dự án: tạo (trống hoặc từ mẫu), đổi tên, nhân bản, xoá (hỏi lại), chuyển; mở lại trang thì vào dự án mở cuối.

## PLAN-003 · Bảy trạng thái, có Chờ (Pending); tiến độ không tính bỏ qua và huỷ; việc tiếp theo được tô
24/11/2026 · `step-planner/`

Bước con có bảy trạng thái, theo thứ tự: mới (New), đang làm, chờ (Pending), bị chặn, xong, bỏ qua, huỷ. Chờ là đang đợi người hay việc ngoài tầm tay của nhóm và sẽ tự xong mà nhóm không phải làm gì (bên liên quan duyệt, cấp quyền dữ liệu, nhà cung cấp giao hàng, một lần huấn luyện dài); bị chặn là vướng một vấn đề mà nhóm phải ra tay gỡ. Bỏ qua là việc không cần với dự án này. Huỷ là việc đã quyết không làm nhưng giữ thẻ để theo dõi, kèm lý do (chọn huỷ thì luôn được hỏi lý do). Chờ và bị chặn có ghi chú tuỳ chọn (chờ gì, vướng gì) hiện trên thẻ; đổi qua lại giữa chờ, bị chặn, huỷ thì giữ ghi chú, sang trạng thái khác thì bỏ. Bấm chip đi ba trạng thái cơ bản mới → đang làm → xong; trạng thái khác chọn từ danh sách hay hộp sửa. Tiến độ = xong / (tổng − bỏ qua − huỷ); thẻ chờ tính là còn mở, quá hạn vẫn báo trễ. Việc tiếp theo là các bước con còn mở của vị trí đầu tiên còn việc, trừ thẻ chờ; vị trí ấy chỉ còn thẻ chờ thì không có việc tiếp theo, vì các bước sau phụ thuộc nó.

## PLAN-004 · Mở lại một bước (vòng lặp) có lý do, đếm vòng, chỉ rõ việc phải làm lại
24/11/2026 · `step-planner/`

Việc dữ liệu lặp (CRISP-DM quay lại pha trước): khi một bước sau cho thấy một bước trước phải làm lại, người dùng mở lại bước ấy, bắt buộc ghi lý do. Chỉ mở lại được khi bước có ít nhất một bước con đã xong: mở lại là gửi việc đã xong về làm lại; bước chưa xong việc nào thì cứ làm tiếp, không cần vòng mới. Mỗi lần mở lại là một vòng mới (lần đầu là vòng 2, lần sau tăng tiếp, kể cả sau khi đã đóng vòng). Khi mở lại, người dùng chọn những bước con đã xong cần làm lại (mặc định không cái nào): chúng về trạng thái mới và mang dấu "làm lại" tới khi xong lại, nên nhìn bảng là biết đúng việc nào phải làm lại. Bước đang mở lại hiện vòng, ngày, lý do và còn mấy việc phải làm lại; làm lại xong hết thì mời đóng vòng. Nhật ký quyết định tự ghi một dòng; cả thao tác mở lại, cũng như đóng vòng, hoàn tác được. Dấu làm lại đi theo khi xuất / nhập. Dấu làm lại chỉ thuộc bước đang mở lại: dời bước con sang bước khác thì mất dấu (hoàn tác việc dời thì trả lại).

## PLAN-005 · Mỗi dự án có nhật ký quyết định
24/11/2026 · `step-planner/`

Mỗi dự án giữ danh sách quyết định: ngày, quyết định, vì sao, và bước liên quan nếu có; thêm, sửa và xoá được (xoá có Hoàn tác). Quyết định tự ghi khi mở lại một bước gắn với bước ấy. Bước gắn với quyết định đi theo khi xuất / nhập Markdown và JSON; file cũ không có thông tin này vẫn nhập được. Markdown ghi bước gắn kèm số thứ tự của nó, nên hai bước trùng tên vẫn phân biệt được.

## PLAN-006 · Xoá hoàn tác được; sắp xếp lại được; tìm theo chữ
24/11/2026 · `step-planner/`

Xoá bước, bước con hay quyết định đều hoàn tác được, trả về đúng chỗ; xoá một bước còn bước con thì hỏi lại trước. Bước và bước con sắp xếp lại bằng kéo thả (chuột và chạm, thấy trước chỗ sẽ thả) hoặc chỉ bằng bàn phím, và bước con chuyển được sang bước khác; bước không có nút lên xuống. Bước con nhân bản được. Tìm theo chữ, không phân biệt hoa thường và dấu.

## PLAN-007 · Markdown xuất ra đọc được và nhập lại được; nhập không ghi đè ngầm
24/11/2026 · `step-planner/`

Xuất Markdown cho người đọc, theo một khuôn cố định để nhập lại ra đúng cấu trúc; Markdown viết tay cũng nhập được. Xuất JSON một dự án hoặc sao lưu tất cả; tải file hoặc chép. Nhập (file hay dán) hiện xem trước số bước, bước con và mọi cảnh báo; mặc định tạo dự án mới, hoặc chọn thay dự án đang mở (hoàn tác được). Không bao giờ ghi đè mà không hỏi.

## PLAN-008 · Mẫu đồ án lấy đúng từ trang đồ án
24/11/2026 · `step-planner/data/templates.json`

Có sáu mẫu: dự án Data Science theo CRISP-DM, đồ án môn đang học, phân tích thống kê không học máy, tính năng app iOS / Flutter, pipeline dữ liệu định kỳ, và trống. Mẫu đồ án chỉ lấy các giai đoạn, việc, sản phẩm và tiêu chí xong của trang đồ án, không thêm nội dung, không tên người thật.

## PLAN-009 · Mẫu Data Science theo chuẩn CRISP-DM 1.0, áp được cho mọi dự án
24/11/2026 · `step-planner/data/templates.json`

Mẫu Data Science theo chuẩn CRISP-DM 1.0: bước là sáu pha, bước con là các việc chung (generic task) của từng pha, tiêu chí xong là sản phẩm đầu ra chuẩn của việc ấy. Mẫu đủ tổng quát để áp cho mọi dự án dữ liệu, không gắn vào bài toán nào. Chỗ CRISP-DM 1.0 đã cũ (tái lập, giám sát mô hình, model card, nghiệm thu) bổ sung từ CRISP-ML(Q), TDSP và Model Cards, có ghi nguồn. Riêng việc chia train / validation / test dời lên ngay sau ghép dữ liệu để tránh rò rỉ.

## PLAN-010 · Không có khái niệm người làm
24/11/2026 · `step-planner/`

Công cụ không quản lý thành viên hay người làm: không danh sách thành viên, không giao bước con cho ai, không lọc "việc của tôi", mẫu không ghi người làm. File và dữ liệu cũ có thông tin người vẫn nhập và mở được; thông tin người bị bỏ.

## PLAN-011 · Bước và bước con có tài liệu: link hoặc văn bản Markdown
24/11/2026 · `step-planner/`

Mỗi bước có tài liệu riêng cho cả bước, mỗi bước con có tài liệu riêng. Một tài liệu là một link (chỉ http(s), mở tab mới) hoặc một văn bản Markdown viết ngay trong công cụ, đọc được ở dạng đã dựng. Thêm, sửa, xoá được; xoá có Hoàn tác. Tìm kiếm khớp cả tên tài liệu. Tài liệu đi theo khi xuất / nhập Markdown và JSON; file cũ không có tài liệu vẫn nhập được.

## PLAN-012 · Giao diện tiếng Anh; Markdown xuất nhãn tiếng Anh, file cũ vẫn nhập
24/11/2026 · `step-planner/`

Mọi chữ trên giao diện là tiếng Anh: nút, trạng thái, thông báo, cảnh báo khi nhập. Trạng thái "chưa làm" tên là New. Markdown xuất ra dùng nhãn tiếng Anh (định dạng 3); file định dạng cũ có nhãn tiếng Việt và mọi kiểu viết tay đã nhận trước đây vẫn nhập được. Nội dung người dùng và nội dung mẫu giữ nguyên ngôn ngữ của nó.

## PLAN-013 · Bước con chạy song song
24/11/2026 · `step-planner/`

Trong một bước, nhiều bước con có thể chạy song song rồi mới tới bước con kế tiếp (ví dụ ba việc song song rồi mới tới việc sau). Các bước con song song chiếm chung một vị trí trong hàng và mang số con của vị trí ấy (3.1, 3.2, 3.3). Bước con tạo song song được, nhập vào nhóm song song hay tách ra được, bằng kéo thả, bàn phím hay hộp sửa. "Việc tiếp theo" là mọi việc còn mở của vị trí đầu tiên còn việc; tiến độ không đổi. Nhóm song song đi theo khi xuất / nhập Markdown và JSON.

## PLAN-014 · Số thứ tự đứng yên tới khi tải lại trang
24/11/2026 · `step-planner/`

Trong một lần mở trang, số của bước và bước con không đổi khi đổi chỗ: cái vừa dời giữ số cũ, nên người dùng nhìn hàng là biết mình vừa hoán đổi những gì. Số chỉ đánh lại khi tải lại trang, hoặc khi người dùng tự bấm đánh số lại. Cái mới thêm trong lần mở trang ấy chưa có số, có dấu riêng (không dùng chữ "New", trùng tên trạng thái).

## PLAN-015 · Tên trong mẫu là tiếng Anh theo tên gốc của chuẩn; nội dung mẫu tiếng Việt
24/11/2026 · `step-planner/data/templates.json`

Tên mẫu, tên bước và tên bước con của các mẫu viết tiếng Anh, theo đúng tên gốc của chuẩn: pha và generic task của CRISP-DM 1.0, khâu và việc của PPDAC. Mục tiêu, tiêu chí xong, ghi chú và mô tả mẫu giữ tiếng Việt. Mẫu đồ án môn học giữ nguyên chữ của trang đồ án.

## PLAN-016 · Mỗi dự án có phần thiết kế hệ thống: chọn theo gợi ý, tự vẽ sơ đồ, đưa thành việc
25/11/2026 · `step-planner/`

Ngoài các bước, mỗi dự án có phần System design cho người làm một mình từ dữ liệu tới sản phẩm. Người dùng trả lời hồ sơ dự án (cỡ dữ liệu, dữ liệu mới tới bao lâu, người dùng nhận kết quả thế nào, ai dùng, ngân sách, có cần GPU), rồi đi qua từng khâu theo đường đi của dữ liệu: nguồn, lấy dữ liệu, lưu thô, xử lý, kho truy vấn, huấn luyện, theo dõi mô hình, phục vụ dự đoán, giao diện, và ba khâu vận hành (đóng gói, nơi chạy, giám sát). Mỗi khâu có giải thích, các phương án thật kèm khi nào chọn, khi nào tránh, chi phí, độ khó, link chính thức và lệnh bắt đầu; phương án hợp hồ sơ được gợi ý. Người dùng chọn một hay nhiều phương án, tự ghi công cụ khác, đánh dấu khâu không cần, ghi lý do; phương án không chọn được gập đi. Lựa chọn tự thành sơ đồ luồng dữ liệu (tải được), và thành bước "System build" trên bảng, mỗi khâu một bước con có tiêu chí xong và link. Danh mục khâu và phương án nằm ở file dữ liệu, có nguồn chính thức. Thiết kế đi theo dự án khi xuất / nhập Markdown và JSON.

## PLAN-017 · Bàn giao giữa bước và bước con: đầu ra khai ở chỗ tạo, nơi dùng chọn đầu ra có sẵn
26/11/2026 · `step-planner/`

Mỗi bước và bước con khai được đầu ra của nó: tên, đường dẫn file hay link, và hợp đồng một dòng (một dòng là gì, khoá, cam kết, cách kiểm). Nơi cần dùng chọn đầu ra đã khai ở chỗ khác trong dự án làm đầu vào; một đầu ra có nhiều nơi dùng, một nơi nhận nhiều đầu vào. Liên kết theo đầu ra chứ không theo vị trí, nên dời, kéo, đổi bước không làm mất. Bảng cho thấy ai giao cho ai và nhảy tới được bên giao hay bên nhận, mà không đổi thứ tự công việc. Mở lại một bước thì nêu những nơi đang dùng đầu ra của phần được làm lại để kiểm lại, và ghi vào nhật ký. Xoá bên giao rồi hoàn tác thì liên kết trở lại. Bàn giao đi theo khi xuất / nhập Markdown và JSON; nhân bản và nhập giữ đúng liên kết. Sắp xếp lại làm bên nhận đứng trước bên giao thì liên kết không bị xoá mà tạm treo: dữ liệu giữ nguyên đầu vào và nguồn của nó, bảng không nối hai bên, nơi sửa và lúc dời đều báo; xếp lại đúng thứ tự thì liên kết tự nối lại.

## PLAN-018 · Bằng chứng nghiệm thu và ngày xong: gợi ý, không chặn
26/11/2026 · `step-planner/`

Tài liệu của bước hay bước con đánh dấu được là bằng chứng cho tiêu chí "Done when" (một lần chạy, báo cáo, test, commit). Bước con ghi ngày sang Done; rời Done thì bỏ ngày; dữ liệu cũ không có ngày thì để trống, không đoán. Vừa xong một bước con có tiêu chí xong mà chưa có bằng chứng thì trang gợi ý thêm, không bao giờ chặn đánh dấu xong. Bằng chứng và ngày xong đi theo khi xuất / nhập Markdown và JSON.

## PLAN-019 · Sửa cùng lúc ở hai tab: gộp theo trường, trùng trường thì hỏi
26/11/2026 · `step-planner/`

Khi lưu một bước, bước con hay quyết định, trang chỉ ghi những trường người dùng đã đổi lên bản mới nhất, nên thay đổi của tab khác ở trường khác được giữ. Hai tab đổi cùng một trường sang hai giá trị khác nhau thì hỏi giữ bên nào, không ghi đè âm thầm. Mục đã bị tab khác xoá thì hỏi tạo lại hay bỏ phần sửa. Vị trí của mục chỉ đổi khi người dùng tự đổi.

## PLAN-020 · "Next" nói đang chờ gì; lọc theo nhóm trạng thái
26/11/2026 · `step-planner/`

"Next" vẫn không vượt qua chỗ chờ (PLAN-003), nhưng khi vị trí đầu tiên còn việc chỉ còn thẻ chờ hay bị chặn thì trang nói đang chờ thẻ nào, vì sao, và cho xem việc làm được ngay. Bảng lọc được theo nhóm trạng thái: làm được ngay, đang chờ, xong, bỏ qua hay huỷ; lọc kết hợp với tìm. Bộ lọc thuộc từng tab, không lưu.

## PLAN-021 · System design bắt đầu từ thứ bàn giao, kiểm phối hợp, ghi hợp đồng giữa các khâu, việc đi theo thiết kế
26/11/2026 · `step-planner/`

System design (PLAN-016) mở bằng câu hỏi dự án giao ra gì; mỗi lối có luồng tối thiểu, vì sao hợp, khi nào nên đổi lối, khâu cần và khâu bỏ được, công cụ gợi ý và mốc nghiệm thu. Áp một lối chỉ điền khâu chưa quyết. Danh mục có luật phối hợp giữa các lựa chọn, dựa trên tài liệu chính thức; một luật chỉ báo khi các khâu liên quan đã quyết. Mỗi đường nối giữa hai khâu liền nhau ghi được hợp đồng bàn giao (đi qua gì, giao gì, đọc ở đâu, hai bên hứa gì, kiểm thế nào) và thành một việc tích hợp trên bảng. Việc sinh từ thiết kế đi theo thiết kế: đổi thiết kế thì trang cho xem việc mới, việc đổi, việc không còn, người dùng chọn cập nhật, giữ cũ và thêm mới, huỷ hay giữ; không bao giờ đè ghi chú, tài liệu của người dùng; một lần hoàn tác trả hết. Bỏ đánh dấu "không cần" của một khâu thì lựa chọn cũ của nó về lại. Thiết kế đi theo khi xuất / nhập Markdown cho người và AI đọc.

## PLAN-022 · Mẫu ghi loại đầu ra, khai bàn giao giữa các bước; có mẫu pipeline dữ liệu định kỳ
26/11/2026 · `step-planner/data/templates.json`

Mỗi mẫu ghi loại đầu ra (báo cáo, mô hình dự đoán / app, tính năng app, pipeline dữ liệu, đồ án môn) và mô tả nói khi nào chọn, phần nào bỏ được khi làm một mình. Bước và bước con của mẫu khai đầu ra (tên, đường dẫn quy ước, hợp đồng một dòng) và đầu vào lấy từ đầu ra của bước trước; dữ liệu chỉ chảy xuôi. Mẫu pipeline dữ liệu định kỳ theo vòng đời data engineering: chạy lại không sinh trùng, phát hiện đổi schema, cổng chất lượng trước khi công bố (lô lỗi thì giữ bản sạch tốt gần nhất), chạy bù, nhật ký chạy, độ mới, cảnh báo, runbook. Trong mẫu Data Science, giữ baseline hoặc kết luận chưa có tín hiệu là kết quả hợp lệ của pha Modeling.

## PLAN-023 · System design phủ kiểm dữ liệu, gán nhãn, tìm kiếm và LLM; giữ cả công cụ nên tránh, kèm lý do
26/11/2026 · `step-planner/data/system-design.json`, `step-planner/js/design-core.js`

Hồ sơ hỏi thêm loại dữ liệu (bảng, văn bản, ảnh / âm thanh) và sản phẩm có tìm kiếm hay LLM không. Có khâu kiểm dữ liệu, gán nhãn, tìm kiếm và truy xuất; khâu không hợp hồ sơ được báo là thường không cần, áp lối thì thành không cần. Danh mục giữ cả công cụ người học hay nghe tên nhưng nên tránh khi làm một mình (Hadoop, Kubernetes, feature store, cụm Elasticsearch tự chạy), kèm lý do, lựa chọn thay và luật báo. Gợi ý ưu tiên thứ tự công cụ mà lối ghi; hồ sơ dùng để loại phương án không hợp, không để đẩy hạng.
