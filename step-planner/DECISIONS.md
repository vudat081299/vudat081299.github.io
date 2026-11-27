# Quyết định — step-planner

<!-- index:start -->
- PLAN-001 · Dự án là các bước có thứ tự, mỗi bước có bước con có thứ tự · `step-planner/`
- PLAN-002 · Dữ liệu chỉ ở trình duyệt, nhiều dự án, nhớ dự án mở cuối · `step-planner/`
- PLAN-003 · Bảy trạng thái, có Chờ (Pending); tiến độ không tính bỏ qua và huỷ; việc tiếp theo được tô · `step-planner/`
- PLAN-004 · Mở lại một bước (vòng lặp) có lý do, đếm vòng, chỉ rõ việc phải làm lại · `step-planner/`
- PLAN-005 · Mỗi dự án có nhật ký quyết định · `step-planner/`
- PLAN-006 · Xoá hoàn tác được; sắp xếp lại được; tìm theo chữ · `step-planner/`
- PLAN-007 · Markdown xuất ra đọc được và nhập lại được; nhập không ghi đè ngầm · `step-planner/`
- PLAN-009 · Mẫu Data Science theo chuẩn CRISP-DM 1.0, áp được cho mọi dự án · `step-planner/data/templates.json`
- PLAN-010 · Không có khái niệm người làm · `step-planner/`
- PLAN-011 · Bước và bước con có tài liệu: link hoặc văn bản Markdown · `step-planner/`
- PLAN-012 · Giao diện tiếng Anh; Markdown xuất nhãn tiếng Anh, file cũ vẫn nhập · `step-planner/`
- PLAN-013 · Bước con chạy song song · `step-planner/`
- PLAN-014 · Số thứ tự đứng yên tới khi tải lại trang · `step-planner/`
- PLAN-016 · Mỗi dự án có phần thiết kế hệ thống: chọn theo gợi ý, tự vẽ sơ đồ, đưa thành việc · `step-planner/`
- PLAN-017 · Bàn giao giữa bước và bước con: đầu ra khai ở chỗ tạo, nơi dùng chọn đầu ra có sẵn · `step-planner/`
- PLAN-018 · Bằng chứng nghiệm thu và ngày xong: gợi ý, không chặn · `step-planner/`
- PLAN-019 · Sửa cùng lúc ở hai tab: gộp theo trường, trùng trường thì hỏi · `step-planner/`
- PLAN-020 · "Next" nói đang chờ gì; lọc theo nhóm trạng thái · `step-planner/`
- PLAN-021 · System design bắt đầu từ thứ bàn giao, kiểm phối hợp, ghi hợp đồng giữa các khâu, việc đi theo thiết kế · `step-planner/`
- PLAN-022 · Mẫu ghi loại đầu ra, khai bàn giao giữa các bước; có mẫu pipeline dữ liệu định kỳ · `step-planner/data/templates.json`
- PLAN-023 · System design phủ kiểm dữ liệu, gán nhãn, tìm kiếm và LLM; giữ cả công cụ nên tránh, kèm lý do · `step-planner/data/system-design.json`, `step-planner/js/core/design.js`
- PLAN-024 · Mẫu Data Science on big data: CRISP-DM cho dữ liệu quá lớn hay quá nhanh cho một máy · `step-planner/data/templates.json`
- PLAN-025 · Mỗi bước và bước con cho thấy đầu vào, đầu ra đang ổn, lỗi hay không có · `step-planner/`
- PLAN-026 · System design phủ big data: HDFS, table format, xử lý stream, SQL trên file, NoSQL phân tán, học máy phân tán · `step-planner/data/system-design.json`
- PLAN-027 · System design có danh mục kiến trúc theo nhóm, gợi ý một kiến trúc mỗi nhóm từ hồ sơ dự án · `step-planner/data/system-design.json`, `step-planner/js/core/design.js`
- PLAN-028 · Chữ giao diện tiếng Anh, mọi nội dung mẫu tiếng Việt, tên chuẩn giữ trong ngoặc · `step-planner/`
- PLAN-029 · Mẫu nền tảng lakehouse mã nguồn mở: hạ tầng và dữ liệu trước, pipeline sau, có bước kiểm tuân thủ medallion · `step-planner/data/templates.json`
- PLAN-030 · System design phủ lakehouse tự host: MinIO, Hudi, catalog cho Iceberg, medallion là cách chia tầng, hồ sơ chỉ mã nguồn mở · `step-planner/data/system-design.json`, `step-planner/js/core/design.js`
- PLAN-031 · Sơ đồ System design kéo và thu phóng được; khung nhìn không lưu · `step-planner/js/ui/design.js`, `step-planner/js/ui/diagram-view.js`, `step-planner/js/core/view-math.js`
- PLAN-032 · System design phủ nguồn đẩy, trang dựng bằng JavaScript, lag của consumer; báo công cụ đã nghỉ hưu và API hỏi theo chu kỳ dùng như luồng · `step-planner/data/system-design.json`
- PLAN-033 · Mẫu đặt sẵn hồ sơ System design mà nó ngụ ý, áp một lần lúc tạo dự án · `step-planner/data/templates.json`, `step-planner/js/core/model.js`, `step-planner/js/core/design.js`
- PLAN-034 · Code tách thành logic thuần, giao diện, luật / cấu hình như md-annotate · `step-planner/js/`, `step-planner/css/`
- PLAN-035 · Gợi ý model chỉ khi dự án có model; Ingestion giữ được cả luồng lẫn lịch; báo kho thô mà kho phân tích không đọc được · `step-planner/data/system-design.json`
- PLAN-037 · Processing giữ được nhiều công cụ; công cụ lịch phục vụ dữ liệu liên tục khi kết quả xem theo lịch; Apply path theo kiến trúc xử lý và kiến trúc lưu trữ được gợi ý · `step-planner/data/system-design.json`, `step-planner/js/core/design.js`
- PLAN-038 · Đầu ra đánh dấu là sản phẩm cuối không cần nơi nhận · `step-planner/`
- PLAN-039 · Mẫu chia hai nhóm: loại dự án chung và dự án cụ thể đang làm · `step-planner/`
- PLAN-040 · Mẫu đồ án là mẫu viết tay, theo mọi luật chung của mẫu · `step-planner/data/templates.json`
- PLAN-041 · Mẫu IT5425: giám sát chấn thương Premier League, một người, từ đề tài tới demo chạy thật · `step-planner/data/templates.json`
- PLAN-042 · Kiến trúc là lựa chọn của dự án: chọn thắng hồ sơ, công cụ đã chọn thắng kiến trúc · `step-planner/`
- PLAN-043 · Trang Architecture giải thích đủ để chọn: sơ đồ luồng, câu hỏi chọn, ví dụ · `step-planner/data/system-design.json`, `step-planner/js/core/arch-diagram.js`, `step-planner/js/ui/arch-diagram.js`
- PLAN-044 · Đầu ra của bước chọn được từ đầu ra của bước con · `step-planner/`
<!-- index:end -->

## PLAN-001 · Dự án là các bước có thứ tự, mỗi bước có bước con có thứ tự
24/11/2026 · `step-planner/`

Một dự án là danh sách bước chính có thứ tự; mỗi bước chứa bước con có thứ tự, đọc như một bảng: bước là hàng, bước con theo thứ tự trong hàng. Bước đánh số 1, 2, 3; bước con chỉ mang số vị trí trong hàng của nó (1, 2, 3), vì hàng đã cho biết nó thuộc bước nào. Mỗi bước có tiến độ riêng, dự án có tiến độ chung. Công cụ tên là Data Science Step Planner: ưu tiên dự án dữ liệu nhưng dùng được cho dự án bất kỳ.

## PLAN-002 · Dữ liệu chỉ ở trình duyệt, nhiều dự án, nhớ dự án mở cuối
24/11/2026 · `step-planner/`

Không có máy chủ: mọi dự án lưu trong bộ nhớ trình duyệt dưới một khoá có số phiên bản. Bộ nhớ bị chặn hay hỏng thì trang vẫn chạy và báo rõ. Có nhiều dự án: tạo (trống hoặc từ mẫu), đổi tên, nhân bản, xoá (hỏi lại), chuyển; mở lại trang thì vào dự án mở cuối.

## PLAN-003 · Bảy trạng thái, có Chờ (Pending); tiến độ không tính bỏ qua và huỷ; việc tiếp theo được tô
24/11/2026 · `step-planner/`

Bước con có bảy trạng thái, theo thứ tự: mới (New), đang làm, chờ (Pending), bị chặn, xong, bỏ qua, huỷ. Chờ là đang đợi người hay việc ngoài tầm tay của nhóm và sẽ tự xong mà nhóm không phải làm gì (bên liên quan duyệt, cấp quyền dữ liệu, nhà cung cấp giao hàng, một lần huấn luyện dài); bị chặn là vướng một vấn đề mà nhóm phải ra tay gỡ. Bỏ qua là việc không cần với dự án này. Huỷ là việc đã quyết không làm nhưng giữ thẻ để theo dõi, kèm lý do (chọn huỷ thì luôn được hỏi lý do). Chờ và bị chặn có ghi chú tuỳ chọn (chờ gì, vướng gì) hiện trên thẻ; đổi qua lại giữa chờ, bị chặn, huỷ thì giữ ghi chú, sang trạng thái khác thì bỏ. Bấm chip đi ba trạng thái cơ bản mới → đang làm → xong; trạng thái khác chọn từ danh sách hay hộp sửa. Tiến độ = xong / (tổng − bỏ qua − huỷ); thẻ chờ tính là còn mở, quá hạn vẫn báo trễ. Việc tiếp theo là các bước con còn mở của vị trí đầu tiên còn việc, trừ thẻ chờ và thẻ bị chặn: cả hai đang đợi, không phải việc làm được ngay, nên một thẻ bị chặn không bao giờ là việc tiếp theo; vị trí ấy chỉ còn thẻ chờ hay bị chặn thì không có việc tiếp theo, vì các bước sau phụ thuộc nó.

## PLAN-004 · Mở lại một bước (vòng lặp) có lý do, đếm vòng, chỉ rõ việc phải làm lại
24/11/2026 · `step-planner/`

Việc dữ liệu lặp (CRISP-DM quay lại pha trước): khi một bước sau cho thấy một bước trước phải làm lại, người dùng mở lại bước ấy, bắt buộc ghi lý do. Chỉ mở lại được khi bước có ít nhất một bước con đã xong: mở lại là gửi việc đã xong về làm lại; bước chưa xong việc nào thì cứ làm tiếp, không cần vòng mới. Mỗi lần mở lại là một vòng mới (lần đầu là vòng 2, lần sau tăng tiếp, kể cả sau khi đã đóng vòng). Khi mở lại, người dùng chọn những bước con đã xong cần làm lại (mặc định không cái nào): chúng về trạng thái mới và mang dấu "làm lại" tới khi xong lại, nên nhìn bảng là biết đúng việc nào phải làm lại. Bước đang mở lại hiện vòng, ngày, lý do và còn mấy việc phải làm lại; làm lại xong hết thì mời đóng vòng. Nhật ký quyết định tự ghi một dòng; cả thao tác mở lại, cũng như đóng vòng, hoàn tác được. Dấu làm lại đi theo khi xuất / nhập. Dấu làm lại chỉ thuộc bước đang mở lại: dời bước con sang bước khác thì mất dấu (hoàn tác việc dời thì trả lại).

## PLAN-005 · Mỗi dự án có nhật ký quyết định
24/11/2026 · `step-planner/`

Mỗi dự án giữ danh sách quyết định: ngày, quyết định, vì sao, và bước liên quan nếu có; thêm, sửa và xoá được (xoá có Hoàn tác). Quyết định tự ghi khi mở lại một bước gắn với bước ấy. Kiến trúc chọn ở System design (PLAN-042) cũng tự ghi: mỗi nhóm kiến trúc đã chọn một quyết định, gồm kiến trúc đã chọn và lý do của lựa chọn; đổi kiến trúc hay lý do thì sửa đúng quyết định ấy, không thêm quyết định mới (đổi kiến trúc thì ngày là hôm nay); bỏ chọn thì quyết định ấy bị xoá. Dự án tạo từ mẫu có kiến trúc chọn sẵn mở ra đã có các quyết định ấy. Quyết định tự ghi đi qua xuất / nhập Markdown và JSON như mọi quyết định. Bước gắn với quyết định đi theo khi xuất / nhập Markdown và JSON; file cũ không có thông tin này vẫn nhập được. Markdown ghi bước gắn kèm số thứ tự của nó, nên hai bước trùng tên vẫn phân biệt được.

## PLAN-006 · Xoá hoàn tác được; sắp xếp lại được; tìm theo chữ
24/11/2026 · `step-planner/`

Xoá bước, bước con hay quyết định đều hoàn tác được, trả về đúng chỗ; xoá một bước còn bước con thì hỏi lại trước. Bước và bước con sắp xếp lại bằng kéo thả (chuột và chạm, thấy trước chỗ sẽ thả) hoặc chỉ bằng bàn phím, và bước con chuyển được sang bước khác; bước không có nút lên xuống. Bước con nhân bản được. Tìm theo chữ, không phân biệt hoa thường và dấu.

## PLAN-007 · Markdown xuất ra đọc được và nhập lại được; nhập không ghi đè ngầm
24/11/2026 · `step-planner/`

Xuất Markdown cho người đọc, theo một khuôn cố định để nhập lại ra đúng cấu trúc; Markdown viết tay cũng nhập được. Xuất JSON một dự án hoặc sao lưu tất cả; tải file hoặc chép. Nhập (file hay dán) hiện xem trước số bước, bước con và mọi cảnh báo; mặc định tạo dự án mới, hoặc chọn thay dự án đang mở (hoàn tác được). Không bao giờ ghi đè mà không hỏi.

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

Trong một lần mở trang, số của bước và bước con không đổi khi đổi chỗ: cái vừa dời giữ số cũ, nên người dùng nhìn hàng là biết mình vừa hoán đổi những gì. Số chỉ đánh lại khi tải lại trang, hoặc khi người dùng tự bấm đánh số lại. Cái mới thêm trong lần mở trang ấy chưa có số, có dấu riêng (không dùng chữ "New", trùng tên trạng thái). Ngoại lệ: dự án còn trống khi số được chụp lần đầu thì cái thêm vào nhận số thật ngay, cho tới lần đầu một số đã có phải đổi (dời, xoá giữa chừng); từ đó dự án ấy theo luật trên như mọi dự án. Lý do: dấu "vừa thêm" chỉ sống tới lần tải lại, mà dự án dựng từ trống thì cái nào cũng mang dấu, nên dấu ấy không còn nói lên gì.

## PLAN-016 · Mỗi dự án có phần thiết kế hệ thống: chọn theo gợi ý, tự vẽ sơ đồ, đưa thành việc
25/11/2026 · `step-planner/`

Ngoài các bước, mỗi dự án có phần System design cho người làm một mình từ dữ liệu tới sản phẩm. Người dùng trả lời hồ sơ dự án (cỡ dữ liệu, dữ liệu mới tới bao lâu, người dùng nhận kết quả thế nào, ai dùng, ngân sách, có cần GPU), rồi đi qua từng khâu theo đường đi của dữ liệu: nguồn, lấy dữ liệu, lưu thô, xử lý, kho truy vấn, huấn luyện, theo dõi mô hình, phục vụ dự đoán, giao diện, và ba khâu vận hành (đóng gói, nơi chạy, giám sát). Mỗi khâu có giải thích, các phương án thật kèm khi nào chọn, khi nào tránh, chi phí, độ khó, link chính thức và lệnh bắt đầu; phương án hợp hồ sơ được gợi ý. Người dùng chọn một hay nhiều phương án, tự ghi công cụ khác, đánh dấu khâu không cần, ghi lý do; phương án không chọn được gập đi. Lựa chọn tự thành sơ đồ luồng dữ liệu (tải được), và thành bước "System build" trên bảng, mỗi khâu một bước con có tiêu chí xong và link. Danh mục khâu và phương án nằm ở file dữ liệu, có nguồn chính thức. Thiết kế đi theo dự án khi xuất / nhập Markdown và JSON.

## PLAN-017 · Bàn giao giữa bước và bước con: đầu ra khai ở chỗ tạo, nơi dùng chọn đầu ra có sẵn
26/11/2026 · `step-planner/`

Mỗi bước và bước con khai được đầu ra của nó: tên, đường dẫn file hay link, và hợp đồng một dòng (một dòng là gì, khoá, cam kết, cách kiểm). Nơi cần dùng chọn đầu ra đã khai ở chỗ khác trong dự án làm đầu vào; một đầu ra có nhiều nơi dùng, một nơi nhận nhiều đầu vào. Liên kết theo đầu ra chứ không theo vị trí, nên dời, kéo, đổi bước không làm mất. Bảng cho thấy ai giao cho ai và nhảy tới được bên giao hay bên nhận, mà không đổi thứ tự công việc. Mở lại một bước thì nêu những nơi đang dùng đầu ra của phần được làm lại để kiểm lại, và ghi vào nhật ký. Xoá bên giao rồi hoàn tác thì liên kết trở lại. Bàn giao đi theo khi xuất / nhập Markdown và JSON; nhân bản và nhập giữ đúng liên kết. Sắp xếp lại làm bên nhận đứng trước bên giao, hay cùng nhóm song song với bên giao (hai việc chạy cùng lúc nên bên nhận không chờ được đầu ra; người dùng phải xếp một trước một sau), thì liên kết không bị xoá mà tạm treo: dữ liệu giữ nguyên đầu vào và nguồn của nó, bảng không nối hai bên, nơi sửa và lúc dời đều báo; xếp lại đúng thứ tự thì liên kết tự nối lại. Nơi sửa báo trước khi lưu, theo chỗ đang chọn ở đó: chọn một đầu ra đứng sau, hay đổi chỗ khiến nguồn đứng sau, đều báo sẽ treo; lưu tạo liên kết treo thì báo như lúc dời.

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

System design (PLAN-016) mở bằng câu hỏi dự án giao ra gì; mỗi lối có luồng tối thiểu, vì sao hợp, khi nào nên đổi lối, khâu cần và khâu bỏ được, công cụ gợi ý và mốc nghiệm thu. Áp một lối chỉ điền khâu chưa quyết, không bỏ khâu mà hồ sơ nói là cần (lối báo cáo mà sản phẩm dùng LLM: khâu tìm kiếm để trống), chỉ chọn phương án hợp hồ sơ (không có thì để khâu trống), và không tự chọn phương án hay bỏ khâu làm luật phối hợp báo (trừ luật chỉ nhắc cách dùng, như host miễn phí ngủ). Danh mục có luật phối hợp giữa các lựa chọn, dựa trên tài liệu chính thức; một luật chỉ báo khi các khâu liên quan đã quyết. Mỗi đường nối giữa hai khâu liền nhau ghi được hợp đồng bàn giao (đi qua gì, giao gì, đọc ở đâu, hai bên hứa gì, kiểm thế nào) và thành một việc tích hợp trên bảng. Việc sinh từ thiết kế đi theo thiết kế: đổi thiết kế thì trang cho xem việc mới, việc đổi, việc không còn, người dùng chọn cập nhật, giữ cũ và thêm mới, huỷ hay giữ; việc đã chọn giữ thành việc của người dùng, các lần sau không hỏi lại; không bao giờ đè ghi chú, tài liệu của người dùng; một lần hoàn tác trả hết. Bỏ đánh dấu "không cần" của một khâu thì lựa chọn cũ của nó về lại. Thiết kế đi theo khi xuất / nhập Markdown cho người và AI đọc.

## PLAN-022 · Mẫu ghi loại đầu ra, khai bàn giao giữa các bước; có mẫu pipeline dữ liệu định kỳ
26/11/2026 · `step-planner/data/templates.json`

Mỗi mẫu ghi loại đầu ra (báo cáo, mô hình dự đoán / app, tính năng app, pipeline dữ liệu, đồ án môn) và mô tả nói khi nào chọn, phần nào bỏ được khi làm một mình. Bước và bước con của mẫu khai đầu ra (tên, đường dẫn quy ước, hợp đồng một dòng) và đầu vào lấy từ đầu ra của bước trước; dữ liệu chỉ chảy xuôi. Mẫu pipeline dữ liệu định kỳ theo vòng đời data engineering: chạy lại không sinh trùng, phát hiện đổi schema, cổng chất lượng trước khi công bố (lô lỗi thì giữ bản sạch tốt gần nhất), chạy bù, nhật ký chạy, độ mới, cảnh báo, runbook. Trong mẫu Data Science, giữ baseline hoặc kết luận chưa có tín hiệu là kết quả hợp lệ của pha Modeling.

## PLAN-023 · System design phủ kiểm dữ liệu, gán nhãn, tìm kiếm và LLM; giữ cả công cụ nên tránh, kèm lý do
26/11/2026 · `step-planner/data/system-design.json`, `step-planner/js/core/design.js`

Hồ sơ hỏi thêm loại dữ liệu (bảng, văn bản, ảnh / âm thanh) và sản phẩm có tìm kiếm hay LLM không. Có khâu kiểm dữ liệu, gán nhãn, tìm kiếm và truy xuất; khâu không hợp hồ sơ được báo là thường không cần, áp lối thì thành không cần. Danh mục giữ cả công cụ người học hay nghe tên nhưng nên tránh khi làm một mình (Hadoop, Kubernetes, feature store, cụm Elasticsearch tự chạy), kèm lý do, lựa chọn thay và luật báo. Gợi ý ưu tiên thứ tự công cụ mà lối ghi; hồ sơ dùng để loại phương án không hợp, không để đẩy hạng.

## PLAN-024 · Mẫu Data Science on big data: CRISP-DM cho dữ liệu quá lớn hay quá nhanh cho một máy
26/11/2026 · `step-planner/data/templates.json`

Có mẫu Data Science cho big data, khung là sáu pha CRISP-DM, thêm một bước thu nạp và lưu trữ (Kafka, vùng thô bất biến, bronze / silver / gold) trước pha hiểu dữ liệu. Pha hiểu bài toán quyết định có cần cụm máy không (khối lượng, tốc độ) và kết quả cần mới tới mức nào (batch hay real-time). Khám phá trên mẫu bằng pandas trước, rồi kiểm trên toàn bộ bằng Spark. Pha mô hình chọn giữa huấn luyện phân tán bằng Spark MLlib và gộp hay lấy mẫu xuống một máy, ghi lý do. Đánh giá cả chỉ số mô hình lẫn số đo hệ thống (thời gian, shuffle, mở rộng khi dữ liệu tăng, tài nguyên). Triển khai theo kiến trúc Lambda: batch layer, speed layer, serving layer, giám sát drift, độ trễ, độ mới. Ví dụ xuyên suốt là clickstream thương mại điện tử; ghi chú trỏ tới bài giảng môn Lưu trữ và xử lý dữ liệu lớn.

## PLAN-025 · Mỗi bước và bước con cho thấy đầu vào, đầu ra đang ổn, lỗi hay không có
26/11/2026 · `step-planner/`

Sau khi sắp xếp lại, người dùng nhìn bảng là biết bước, bước con nào có bàn giao hỏng mà không phải mở từng cái. Mỗi bước con cho thấy riêng trạng thái đầu vào và đầu ra: ổn, lỗi hay không có. Đầu vào lỗi khi một đầu vào đang treo (nguồn giờ đứng sau hay chạy song song với nó) hoặc trỏ tới đầu ra không còn. Đầu ra lỗi khi một đầu ra không có nơi nhận đang nối (không ai dùng, hoặc chỉ những nơi dùng đang treo), hoặc có một nơi dùng đang treo dù nơi dùng khác còn nối: bên giao cũng được báo để biết phải dời. Đầu vào của bước gộp đầu vào của nó và của mọi bước con, vì mẫu thường chỉ khai đầu vào ở bước con: bước có đầu vào khi nó hoặc một bước con nhận từ ngoài bước (nhận từ bước con cùng bước là việc bên trong, không tính); lỗi khi một đầu vào trong số ấy lỗi, kể cả đầu vào bên trong, và nói được bước con nào giữ nó. Đầu ra của bước gộp đầu ra của nó và của mọi bước con, đối xứng với đầu vào: lỗi khi một đầu ra trong số ấy lỗi, và nói được bước con nào giữ nó; một đầu ra hỏng của bước con không bị đầu ra ổn khác che. Chỉ có một phía thì phía kia là không có; không có cả hai thì không hiện gì. Mỗi trạng thái nói được bằng chữ cái gì hỏng và vì sao; trạng thái đổi ngay sau mỗi lần dời, kéo, sửa đầu vào / đầu ra, xoá hay hoàn tác. Đầu vào mà đầu ra nguồn đã bị xoá vẫn giữ, qua lần tải lại và xuất / nhập, và báo lỗi tới khi người dùng gỡ nó hoặc hoàn tác việc xoá; nơi sửa cho thấy nó để gỡ, trạng thái không tự đổi khi không ai làm gì.

## PLAN-026 · System design phủ big data: HDFS, table format, xử lý stream, SQL trên file, NoSQL phân tán, học máy phân tán
26/11/2026 · `step-planner/data/system-design.json`

Danh mục có các công cụ big data người học gặp trong môn dữ liệu lớn, mỗi cái kèm khi nào dùng, khi nào tránh, link chính thức: HDFS, Delta Lake và Iceberg ở kho thô (kho thô chọn được cả chỗ lưu lẫn table format), consumer Python, Spark Structured Streaming và Flink ở khâu xử lý, Hive, Trino, Cassandra, HBase ở kho, Spark MLlib và Databricks ở khâu huấn luyện. Luật phối hợp báo khi: dữ liệu cỡ cụm mà xử lý bằng thư viện một máy; dữ liệu liên tục cần trả lời ngay mà xử lý theo lô; Kafka mà không gì đọc topic; công cụ stream cho dữ liệu không stream; HDFS, Cassandra, HBase với ngân sách miễn phí hay trên host chỉ chạy app; BigQuery sandbox (ngân sách miễn phí) cho dữ liệu vừa hay lớn; công cụ cụm hay MLlib cho dữ liệu vừa một máy.

## PLAN-027 · System design có danh mục kiến trúc theo nhóm, gợi ý một kiến trúc mỗi nhóm từ hồ sơ dự án
26/11/2026 · `step-planner/data/system-design.json`, `step-planner/js/core/design.js`

Sau hồ sơ dự án, System design có trang kiến trúc chia bốn nhóm: dữ liệu nằm ở đâu (file + một database, warehouse, data lake, lakehouse có tầng Bronze / Silver / Gold), xử lý thế nào (batch ETL, batch ELT, streaming, Lambda, Kappa), người dùng nhận kết quả qua gì (báo cáo tĩnh, một app, frontend + backend API, microservices, serverless), model trả lời lúc nào (batch prediction, online prediction, đặc trưng từ luồng, RAG). Mỗi kiến trúc nói nó là gì, khi nào dùng, khi nào tránh, luồng, công cụ theo từng khâu và nguồn. Mỗi nhóm gợi ý một kiến trúc kèm lý do một dòng, từ hồ sơ, lối và các khâu đã quyết; khâu đã quyết thắng hồ sơ, trừ khi hồ sơ nói ngược (công cụ stream cho dữ liệu tới một lần hay theo ngày; Serving Not needed mà sản phẩm dùng LLM); chưa đủ câu trả lời thì chưa gợi ý. Kiến trúc được gợi ý luôn có công cụ dùng được với hồ sơ ở mỗi khâu của nó. Ba lối "What do you deliver?" chính là ba kiến trúc của nhóm app; chọn lối được ngay từ kiến trúc. Data mesh chỉ được nhắc là cách tổ chức nhiều đội, dự án nhỏ không cần. Gợi ý không lưu vào dự án; người dùng chọn kiến trúc của từng nhóm theo PLAN-042, gợi ý vẫn hiện bên cạnh lựa chọn.

## PLAN-028 · Chữ giao diện tiếng Anh, mọi nội dung mẫu tiếng Việt, tên chuẩn giữ trong ngoặc
26/11/2026 · `step-planner/` · thay cho PLAN-015

Mọi chữ thuộc giao diện là tiếng Anh: nút, tiêu đề, gợi ý khi rê chuột, nhãn cho trình đọc màn hình, tiêu đề hộp thoại, mục menu, thông báo, chỗ trống, chữ gợi ý trong ô nhập, tên trạng thái; trong System design thêm tên khâu, tên phương án, nhãn câu hỏi hồ sơ và lựa chọn, tên lối, tên kiến trúc. Mọi nội dung của mẫu là tiếng Việt: tên mẫu, tên bước, tên bước con, mục tiêu, tiêu chí xong, ghi chú, tên và mô tả đầu ra, loại đầu ra; lời giải thích, hướng dẫn, cảnh báo của System design cũng tiếng Việt. Tên bước, bước con theo một chuẩn ghi tiếng Việt và giữ tên gốc tiếng Anh trong ngoặc để người học nhận ra thuật ngữ, ví dụ "Hiểu dữ liệu (Data Understanding)". Tên công cụ, thư viện, file, lệnh, URL giữ nguyên. Một cổng kiểm luật này để nó không trôi.

## PLAN-029 · Mẫu nền tảng lakehouse mã nguồn mở: hạ tầng và dữ liệu trước, pipeline sau, có bước kiểm tuân thủ medallion
26/11/2026 · `step-planner/data/templates.json`

Có mẫu cho dự án dựng nền tảng dữ liệu lakehouse tự chạy bằng công cụ mã nguồn mở, đủ chung cho mọi nhóm; stack của một nhóm cụ thể (Docker Compose, MinIO, Iceberg + Polaris, Spark, dbt, DuckDB, Superset) chỉ là ví dụ trong ghi chú. Thứ tự: phạm vi và kiểm kê nguồn, hạ tầng dạng code (một lệnh dựng mọi dịch vụ, kiểm sức khoẻ), lưu trữ + table format + catalog, bronze, silver, gold; sau đó giả lập luồng, dashboard, rồi mới điều phối pipeline; cuối cùng tài liệu và một bước kiểm tuân thủ medallion trả lời có bằng chứng câu "README và hệ thống còn đúng medallion không". Bronze giữ nguồn nguyên dạng, chỉ thêm, có metadata thu nạp, nạp lại không trùng; silver ép kiểu, khử trùng, có test và cổng chất lượng trước gold; gold là bảng nghiệp vụ dựng bằng dbt, mỗi câu hỏi của dashboard một bảng; dashboard chỉ đọc gold. Mỗi lựa chọn công cụ ghi giấy phép và tình trạng bảo trì, không chỉ tên. Trong mọi mẫu, không đầu vào nào đứng trước hay cùng ô với đầu ra nó dùng, và không đầu vào nào trỏ tới đầu ra không có.

## PLAN-030 · System design phủ lakehouse tự host: MinIO, Hudi, catalog cho Iceberg, medallion là cách chia tầng, hồ sơ chỉ mã nguồn mở
26/11/2026 · `step-planner/data/system-design.json`, `step-planner/js/core/design.js`

Danh mục đủ cho một nhóm tự dựng lakehouse mã nguồn mở: object storage tự host (MinIO, nói rõ bản cộng đồng đã ngừng bảo trì, chỉ còn mã nguồn, và lựa chọn thay), Hudi bên cạnh Delta Lake và Iceberg, DuckDB truy vấn bảng trên object storage, máy của nhóm làm nơi chạy, và Data Studio, Power BI, Looker bên cạnh Superset, Metabase, mỗi công cụ BI nói rõ cách nối với DuckDB, Trino. Catalog cho Iceberg (Polaris, Hive Metastore, Nessie, JDBC) chọn ngay ở khâu lưu thô, cùng chỗ lưu và table format, không thêm khâu mới; Iceberg không có catalog thì báo. Hồ sơ có câu "chỉ mã nguồn mở, tự host": trả lời có thì dịch vụ được quản lý không hợp, và dữ liệu lớn được gợi ý lakehouse tự host thay warehouse. Medallion (bronze / silver / gold) là một nhóm kiến trúc riêng: cách chia tầng theo chất lượng, độc lập với nơi lưu; gợi ý khi dữ liệu tới đều, lớn hay đã có table format, còn bộ dữ liệu cố định thì hai tầng thô + sạch. dbt nói chọn adapter theo engine; Docker Compose cho một máy, Kubernetes chỉ khi thật sự cần nhiều node; chưa có nguồn stream thật thì giả lập bằng script phát lại CSV vào Kafka. Luật mới nhắc MinIO trên host không giữ đĩa và file DuckDB dùng chung với Superset, báo DuckDB không đọc được Hudi. Áp lối không lấy phương án nào vẫn làm luật báo: khi ấy khâu để trống cho người dùng quyết.

## PLAN-031 · Sơ đồ System design kéo và thu phóng được; khung nhìn không lưu
26/11/2026 · `step-planner/js/ui/design.js`, `step-planner/js/ui/diagram-view.js`, `step-planner/js/core/view-math.js`

Sơ đồ System design là một khung nhìn: người dùng kéo và thu phóng để xem phần mình cần, bằng chuột, bàn phím hay cảm ứng, và về lại khung ban đầu bằng một thao tác. Khung nhìn chỉ sống trong một lần mở trang: vẽ lại sơ đồ (sửa thiết kế) giữ khung đang xem; tải lại trang luôn về cỡ thật và vị trí ban đầu; không ghi vào dự án, không ghi vào bộ nhớ, không xuất. Sơ đồ không giành cuộn của trang: cuộn thường chỉ kéo sơ đồ sau khi người dùng chọn vào sơ đồ, thu phóng cần phím bổ trợ hay hai ngón. Kéo để xem không tính là bấm vào khâu hay đường nối.

## PLAN-032 · System design phủ nguồn đẩy, trang dựng bằng JavaScript, lag của consumer; báo công cụ đã nghỉ hưu và API hỏi theo chu kỳ dùng như luồng
26/11/2026 · `step-planner/data/system-design.json`

Khâu nguồn có thêm nguồn đẩy qua WebSocket (dùng được cho dữ liệu liên tục) và trình duyệt không giao diện cho trang chỉ hiện dữ liệu sau khi chạy JavaScript. Khâu giám sát có đo lag của consumer group Kafka cho dữ liệu liên tục. Oozie có trong danh mục như công cụ nên tránh: đã nghỉ hưu, vẫn tính là công cụ chạy theo lịch, chọn nó thì báo và chỉ sang cron hay Airflow. Dữ liệu liên tục mà nguồn chỉ là API hay trang web phải hỏi theo chu kỳ, không có nguồn đẩy đi kèm, thì báo: hạn mức gọi chặn độ mới. Kiến trúc Lambda nói cách gộp batch view và real-time view tại mốc as-of, và nhận consumer Python làm speed layer; kiến trúc streaming nhận nguồn WebSocket.

## PLAN-033 · Mẫu đặt sẵn hồ sơ System design mà nó ngụ ý, áp một lần lúc tạo dự án
26/11/2026 · `step-planner/data/templates.json`, `step-planner/js/core/model.js`, `step-planner/js/core/design.js`

Mỗi mẫu (trừ mẫu trống) mang sẵn phần hồ sơ System design mà nội dung của nó thật sự ngụ ý, và lối "What do you deliver?" khi mẫu chỉ rõ thứ bàn giao; câu nào mẫu không nói thì để trống cho người dùng trả lời. Ví dụ: lakehouse mã nguồn mở là dữ liệu lớn, dạng bảng, theo lịch, tự host, miễn phí, vài người dùng, lối pipeline; báo cáo thống kê là dữ liệu nhỏ, dạng bảng, cố định, đọc bằng báo cáo, lối báo cáo. Mẫu đặt hồ sơ, lối và kiến trúc mà nội dung của nó thật sự chọn (PLAN-042). Mẫu chung không chọn sẵn công cụ: gợi ý ở từng khâu đi từ hồ sơ và kiến trúc như mọi dự án. Mẫu của một dự án cụ thể mà nhóm đã chốt stack thì mang sẵn stack ấy ở từng khâu: công cụ đã chọn (một hay nhiều mỗi khâu, cả công cụ ngoài danh mục), khâu không cần và lý do; dự án mới mở ra đã có sơ đồ hệ thống đủ, không luật phối hợp nào báo. Đó là quyết định thật của dự án, đứng trên kiến trúc và hồ sơ: Apply path không đổi khâu đã đặt. Khâu còn đúng như mẫu đặt thì System design nói nó đến từ mẫu; đổi lựa chọn thì thôi nói. Bộ đặt sẵn chép vào dự án đúng một lần, lúc tạo dự án từ mẫu; sau đó nó là dữ liệu của dự án, người dùng đổi hay bỏ mọi câu được. Dự án đã có, nhân bản, nhập Markdown hay JSON không bị đụng tới; tạo từ mẫu trống vẫn bắt đầu với System design trống. Khi hồ sơ, lối và kiến trúc còn đúng như mẫu đặt, System design nói chúng đến từ mẫu nào; người dùng đổi một câu thì thôi nói. Mỗi bộ đặt sẵn phải cho gợi ý kiến trúc hợp với mẫu, và "Apply path" trên nó không chọn phương án lệch hồ sơ hay làm luật báo.

## PLAN-034 · Code tách thành logic thuần, giao diện, luật / cấu hình như md-annotate
26/11/2026 · `step-planner/js/`, `step-planner/css/`

Code của Step Planner theo cùng nguyên tắc với md-annotate (MDAN-070) để dễ bảo trì: logic thuần (dữ liệu vào, dữ liệu ra,
không chạm trình duyệt) tách khỏi giao diện; luật và cấu hình (mẫu, danh mục System design, token) nằm ở dữ liệu và token;
mỗi tính năng một module trong lớp của nó; thứ dùng ở hai chỗ trở lên nằm một chỗ chung. Tách lại không đổi hành vi hay
giao diện của trang.

## PLAN-035 · Gợi ý model chỉ khi dự án có model; Ingestion giữ được cả luồng lẫn lịch; báo kho thô mà kho phân tích không đọc được
26/11/2026 · `step-planner/data/system-design.json`

Nhóm kiến trúc "model trả lời lúc nào" chỉ gợi ý theo hồ sơ (độ trễ, độ mới) khi khâu Training đã quyết; Serving đã chọn thì vẫn quyết như trước; Training Not needed mà Serving chưa chọn thì nhóm không cần; chưa quyết cả hai thì chưa gợi ý, kể cả với bộ đặt sẵn của mẫu. Khâu Ingestion chọn được nhiều công cụ, để một dự án vừa có luồng (Kafka) vừa có job theo lịch (Lambda, nạp bù, luồng giả lập cạnh pipeline theo ngày). Spark, Databricks dùng được cả khi dữ liệu tới liên tục (lớp batch đọc bảng bronze do job stream ghi). Luật mới báo: BigQuery làm kho phân tích mà kho thô là R2, MinIO hay HDFS (BigQuery chỉ nạp, đọc từ Cloud Storage hay file trên máy); MinIO hay catalog tự host mà chỉ đóng gói bằng requirements, uv, không có Docker Compose. Lối pipeline gợi ý Docker Compose ngay sau requirements và đo lag Kafka trước tiên ở khâu giám sát (chỉ hợp dữ liệu liên tục).

## PLAN-037 · Processing giữ được nhiều công cụ; công cụ lịch phục vụ dữ liệu liên tục khi kết quả xem theo lịch; Apply path theo kiến trúc xử lý và kiến trúc lưu trữ được gợi ý
27/11/2026 · `step-planner/data/system-design.json`, `step-planner/js/core/design.js`

Khâu Processing chọn được nhiều công cụ, để một dự án ghi cả công cụ stream lẫn công cụ lô: Lambda, hay job stream ghi bảng bronze rồi dbt, Spark batch biến đổi theo lịch. dbt dùng được cả khi dữ liệu tới liên tục, làm lớp batch; người dùng cần câu trả lời ngay mà Processing chỉ có công cụ lô thì báo; Kafka mà Processing không có công cụ stream đọc topic thì báo, kể cả khi chưa trả lời câu độ trễ. Ingestion có Kafka bên cạnh công cụ lịch (Lambda, nạp bù) thì không báo nạp theo lô cho dữ liệu liên tục. dbt test mà Processing không có dbt thì báo. Công cụ chạy theo lịch (cron, GitHub Actions, Prefect, Dagster, Airflow) dùng được khi dữ liệu tới liên tục mà kết quả chỉ xem theo lịch: gom phần mới thành lô rồi chạy job batch; người dùng cần câu trả lời ngay mà Ingestion chỉ có công cụ lịch thì báo. "Apply path", trong các phương án hợp hồ sơ, ưu tiên công cụ mà kiến trúc xử lý đang gợi ý liệt kê ở khâu ấy, rồi mới tới thứ tự gợi ý của lối: dữ liệu liên tục xem theo lịch ra công cụ lịch và công cụ lô của batch ETL; chưa trả lời câu độ trễ thì ra Kafka và công cụ stream của kiến trúc streaming; dữ liệu lớn ra công cụ của batch ELT (dbt, Spark) thay vì Dask. Apply path vẫn chọn một công cụ mỗi khâu; công cụ thứ hai (lớp batch, nạp bù) người dùng tự thêm. Kho thô và kho phân tích theo kiến trúc lưu trữ đang gợi ý trước, rồi mới tới kiến trúc xử lý: dữ liệu cỡ cụm ra object storage hay table format và engine SQL của lakehouse (DuckDB trên Iceberg, Trino), không ra kho kết quả của streaming (ClickHouse); dữ liệu vừa một máy ra thư mục dự án hay DVC và một database. Kho phân tích là lựa chọn chính của khâu; kho phục vụ của kiến trúc stream (Cassandra, Redis) người dùng tự thêm. Lakehouse dựng trên object storage nào cũng được (S3, R2, GCS, MinIO); "files + one database" gồm cả PostgreSQL được host (Supabase, Neon). Apply path không theo cách chia tầng (medallion, hai tầng): nó độc lập với nơi lưu, theo nó thì mọi pipeline chưa trả lời cỡ dữ liệu ra MinIO. Nhóm nào người dùng đã chọn kiến trúc thì Apply path theo kiến trúc đã chọn thay cho kiến trúc gợi ý (PLAN-042).

## PLAN-038 · Đầu ra đánh dấu là sản phẩm cuối không cần nơi nhận
27/11/2026 · `step-planner/`

Người dùng đánh dấu được một đầu ra là sản phẩm cuối (báo cáo, slide, app, runbook): thứ giao cho người ngoài dự án, không bước nào sau dùng. Đầu ra cuối không ai dùng là ổn, không báo lỗi; đầu ra cuối có nơi dùng thì xét như mọi đầu ra, một nơi dùng đang treo vẫn là lỗi. Đầu ra không đánh dấu mà không ai dùng vẫn báo lỗi, để đầu ra bị quên vẫn lộ ra. Đầu ra của bước gộp bước con theo cùng luật: bước ổn khi mọi đầu ra của nó và của các bước con có nơi nhận đang nối hoặc là sản phẩm cuối không ai dùng, và không đầu ra nào có nơi dùng đang treo. Dấu đi theo đầu ra qua lưu, nhân bản, xuất / nhập Markdown và JSON. Mẫu đánh dấu sẵn các sản phẩm cuối thật của nó, nên dự án mới từ mẫu không có đầu ra lỗi; sản phẩm trung gian không đánh dấu.

## PLAN-039 · Mẫu chia hai nhóm: loại dự án chung và dự án cụ thể đang làm
27/11/2026 · `step-planner/`

Mẫu chia hai nhóm. Mẫu chung là một loại dự án (CRISP-DM, Data Science trên big data, báo cáo thống kê, tính năng app, pipeline dữ liệu, lakehouse) và mẫu trống, áp được cho bài toán bất kỳ. Dự án cụ thể là bài chủ trang đang làm (hiện là đồ án môn IT5425). Nhóm của mẫu ghi ở dữ liệu của mẫu, không suy từ id hay tên; mẫu không ghi nhóm là mẫu chung, mẫu trống luôn là mẫu chung. Mọi nơi chọn mẫu tách hai nhóm, mẫu chung trước; trong mỗi nhóm giữ thứ tự của danh sách mẫu.

## PLAN-040 · Mẫu đồ án là mẫu viết tay, theo mọi luật chung của mẫu
27/11/2026 · `step-planner/data/templates.json` · thay cho PLAN-008

Có mẫu cho các loại dự án hay gặp (Data Science, phân tích thống kê không học máy, tính năng app, dữ liệu), mẫu cho dự án cụ thể chủ trang đang làm (đồ án môn đang học) và đúng một mẫu trống; danh sách ở `data/templates.json`. Mẫu đồ án không sinh từ trang đồ án và không phải khớp với trang ấy: chủ trang có thể đổi hướng đồ án mà trang môn học chưa đổi theo. Mẫu đồ án theo mọi luật chung của mẫu: dữ liệu chỉ chảy xuôi, sản phẩm cuối đánh dấu, mở ra không có đầu ra lỗi, không ngoại lệ riêng. Không tên người thật.

## PLAN-041 · Mẫu IT5425: giám sát chấn thương Premier League, một người, từ đề tài tới demo chạy thật
27/11/2026 · `step-planner/data/templates.json`

Mẫu đồ án môn IT5425 (Data Management and Visualization) dẫn một người làm, không chia vai, không họp nhóm, từ đề tài tới một bản demo chạy thật về giám sát chấn thương ở Premier League: cả 20 CLB, vài mùa gần đây, đủ bốn phương pháp của đề (phát hiện ngoại lai, ANOM, CUSUM, SPRT), mỗi phương pháp nói thống kê, cách chọn tham số và biểu đồ. Mẫu cho thấy rõ ba phần của môn: khái niệm big data nói thật (dữ liệu nhỏ, chọn kiến trúc vì quản trị dữ liệu), quản trị dữ liệu (nguồn và giấy phép, medallion, mô hình dữ liệu có grain, khớp định danh giữa nguồn, kiểm chất lượng, đúng thời điểm, lineage), trực quan hoá (dashboard). Không học máy làm lõi: nhãn chấn thương thiếu có hệ thống và đặc trưng ít, nên dùng số kỳ vọng Poisson / nhị thức âm, lý do ghi trong mẫu. Stack là lakehouse mã nguồn mở tự chạy của nhóm (Docker Compose, object storage, Parquet, Iceberg với catalog Polaris, dbt và DuckDB, Superset; nguồn HTML và CSV, luồng giả lập về sau); chỗ nào không hợp đồ án một người thì mẫu vẫn khuyên và ghi lý do ngay trong ghi chú (bỏ Spark, Kubernetes, Hudi; thay Kafka bằng phát lại theo vòng đấu; ghim object storage; dashboard đọc bản Gold chỉ đọc; không dựa vào tính năng còn thử nghiệm). Hạ tầng dựng và thử trước, dữ liệu sau, phương pháp sau nữa. Dự án mới từ mẫu có System design đã quyết ở mọi khâu theo stack của nhóm (PLAN-033): trang HTML Wikipedia đọc bằng Beautiful Soup cùng file CSV, JSON tĩnh; script nạp chạy theo lịch bằng cron, không Prefect; MinIO ghim bản, bảng Iceberg trên file Parquet, catalog Polaris; dbt + DuckDB, kiểm bằng dbt tests; DuckDB trên Iceberg; Superset; Docker Compose chạy trên máy người làm; giám sát bằng log mỗi lượt nạp và kết quả kiểm; không học máy nên huấn luyện, theo dõi mô hình, phục vụ dự đoán không cần. Dữ liệu thô của bên thứ ba không vào repo public. Số liệu và link trong mẫu chỉ lấy từ nguồn đã mở. Repo tham khảo chỉ để học cách làm, không phải đề bài.

## PLAN-042 · Kiến trúc là lựa chọn của dự án: chọn thắng hồ sơ, công cụ đã chọn thắng kiến trúc
27/11/2026 · `step-planner/`

Ở trang Architecture, mỗi nhóm kiến trúc (nơi lưu, chia tầng, xử lý, cách người dùng nhận kết quả, lúc model trả lời) cho chọn đúng một kiến trúc hay để chưa chọn; chưa chọn thì như trước: theo gợi ý từ hồ sơ, lối và các khâu đã quyết. Mỗi lựa chọn ghi được một dòng lý do (vì sao chọn kiến trúc này, kiểu ADR), hiện cạnh lựa chọn; bỏ chọn là bỏ lý do. Lựa chọn và lý do lưu trong dự án, đi theo khi xuất / nhập Markdown và JSON; kiến trúc không còn trong danh mục bị bỏ khi nhập hay khi sửa thiết kế. Nhóm app không có chỗ lưu riêng: chọn kiến trúc có lối là chọn lối, bỏ chọn là bỏ lối. Gợi ý vẫn hiện cạnh lựa chọn kèm lý do. Thứ tự ưu tiên: công cụ người dùng đã chọn ở một khâu, rồi kiến trúc đã chọn, rồi hồ sơ. Apply path và trang từng khâu xếp công cụ của kiến trúc đã chọn lên trước theo thứ tự kiến trúc ấy ghi; công cụ ấy vẫn dùng được khi hồ sơ nói khác ở câu mà kiến trúc đứng trên (nơi lưu: cỡ dữ liệu; xử lý: cỡ, độ mới, độ trễ), các câu ràng buộc khác (tự host, ngân sách, loại dữ liệu, số người dùng) vẫn xét. Khâu tuỳ chọn của lối mà kiến trúc đã chọn có công cụ thì Apply path vẫn điền. Kiến trúc cần vài công cụ ở một khâu thì Apply path thêm công cụ kế tiếp tới khi hết luật báo (lakehouse: object storage, table format, catalog). Cách chia tầng không lái công cụ. Hồ sơ nói khác kiến trúc đã chọn thì không chặn: trang nói hồ sơ gợi ý gì, lựa chọn vẫn giữ, hợp khi mục đích là học hay trình bày kiến trúc ấy; luật hồ sơ ↔ công cụ mà kiến trúc đã chọn giải thích (Kafka cho dữ liệu theo ngày khi đã chọn Kappa) chỉ là lời nhắc, không đếm là cảnh báo. Khâu đã chọn ngược kiến trúc thì báo như mọi luật phối hợp: lakehouse mà kho thô không có table format, data lake không có object storage, warehouse mà kho phân tích không phải warehouse, kiến trúc stream không có công cụ stream, Lambda không có lớp batch, Kappa không có log sự kiện, batch chỉ có công cụ stream, Batch ELT biến đổi ngoài kho, kiến trúc model mà Serving hay Search không khớp. Mẫu đặt sẵn kiến trúc khi nội dung của nó chọn: lakehouse-oss chọn Lakehouse và Medallion; IT5425 trả lời thật dữ liệu dưới 1 GB và chọn Lakehouse (lý do: thể hiện Big Data và quản trị dữ liệu theo yêu cầu môn), Medallion, Batch ELT; với các kiến trúc ấy, khi chưa khâu nào quyết, Apply path ra MinIO, Iceberg, Polaris, dbt, dbt tests, DuckDB trên Iceberg, Superset, Docker Compose mà không phải thêm tay. Mẫu IT5425 còn mang sẵn stack nhóm đã chốt (PLAN-033, PLAN-041).

## PLAN-043 · Trang Architecture giải thích đủ để chọn: sơ đồ luồng, câu hỏi chọn, ví dụ
27/11/2026 · `step-planner/data/system-design.json`, `step-planner/js/core/arch-diagram.js`, `step-planner/js/ui/arch-diagram.js`

Người học chưa quen kiến trúc dữ liệu phải hiểu đủ để tự chọn. Mỗi kiến trúc có sơ đồ luồng dữ liệu: các thành phần (nguồn, phần xử lý, dữ liệu được lưu, người dùng hay đầu ra), dữ liệu đi từ đâu tới đâu, đường chỉ chạy khi cần, và vùng cho thấy phần nào nằm chung một chỗ (ví dụ biến đổi chạy trong hay ngoài kho); sơ đồ đi kèm luồng chữ có sẵn, đọc được trên điện thoại. Mỗi kiến trúc có một ví dụ là loại hệ thống có thật hay gặp, lấy từ nguồn đã dẫn. Mỗi nhóm mở đầu bằng vài câu hỏi chọn, mỗi câu trả lời chỉ tới kiến trúc nó nghiêng về và mở được kiến trúc ấy; câu hỏi đứng trước chỗ chọn của nhóm. Đầu trang nói các nhóm là những lựa chọn độc lập và ghép với nhau (Lambda là cách xử lý, medallion là cách chia tầng: không loại nhau). Sơ đồ, câu hỏi, ví dụ nằm trong danh mục cùng nguồn, không lưu vào dự án.

## PLAN-044 · Đầu ra của bước chọn được từ đầu ra của bước con
27/11/2026 · `step-planner/`

Sản phẩm thật của một bước thường đã khai ở một bước con của nó (mô hình ở bước con huấn luyện, báo cáo ở bước con viết báo cáo); khai lại ở bước là chép trùng. Bước chọn được một hay nhiều đầu ra của các bước con của chính nó làm đầu ra của bước. Lựa chọn là tham chiếu, không phải bản sao: tên, đường dẫn, hợp đồng, dấu sản phẩm cuối chỉ nằm ở đầu ra của bước con, sửa ở đó thì bước theo ngay; bỏ chọn ở bước không xoá đầu ra của bước con, còn xoá đầu ra ở bước con thì bước thôi chọn nó. Bước chỉ chọn được đầu ra của bước con đang nằm trong nó, vì đầu ra của bước nói thay cho phần việc của chính bước: bước con dời sang bước khác hay bị xoá thì bước cũ thôi chọn, bước mới không tự chọn; hoàn tác việc dời hay xoá thì lựa chọn trở lại. Nhân bản bước con không làm bản sao thành đầu ra của bước. Đầu ra được chọn vẫn là một đầu ra: nơi khác dùng nó như trước, nơi chọn đầu vào và trạng thái đầu ra (PLAN-025) tính nó một lần, nói rõ nó là đầu ra của bước nào và bước con nào giữ nó. Lựa chọn đi theo khi lưu, khi sửa ở hai tab (gộp theo trường), nhân bản dự án, xuất / nhập Markdown và JSON; file cũ không có lựa chọn nhập như trước.
