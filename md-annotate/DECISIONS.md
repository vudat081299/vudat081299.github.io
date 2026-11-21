# Quyết định — md-annotate

<!-- index:start -->
- MDAN-001 · Tab Nguồn tô màu cú pháp kiểu VS Code · `md-annotate/`
- MDAN-005 · Vùng làm việc khoảng 70% màn hình, ở giữa · thay cho MDAN-003 · `md-annotate/`
- MDAN-006 · Preview giống GitHub, cuộn theo nhau ở Split · `md-annotate/`
- MDAN-007 · Giao diện tiếng Anh, gợi ý và prompt tiếng Việt · thay cho MDAN-004 · `md-annotate/`
- MDAN-008 · Code tách theo tính năng, logic tách khỏi giao diện, không build · `md-annotate/`
- MDAN-009 · Một màu xanh sáng, thang token cho chữ, bo góc, chiều cao · thay cho MDAN-002 · `md-annotate/`
- MDAN-010 · Dải đọc: chữ của mục cha vẫn sáng khi rê vào mục con · `md-annotate/js/ui/focus.js`, `md-annotate/css/focus.css`
- MDAN-011 · Cảnh báo trùng đoạn theo chữ, không theo chỗ · `md-annotate/js/core/comments.js`
- MDAN-012 · Nhận xét nhiều dòng chọn theo số dòng · `md-annotate/`
- MDAN-013 · Đánh dấu đoạn đã đọc kỹ, xem còn lại bao nhiêu · `md-annotate/`
- MDAN-014 · Hộp của các dòng đã chọn không đóng khi bấm ra ngoài · `md-annotate/js/ui/popup.js`, `md-annotate/js/ui/picks.js`
- MDAN-015 · Hộp Settings giữa màn hình, nền mờ; bảng phím tắt mới · `md-annotate/`
- MDAN-016 · Dải tiến độ cạnh khung, gợi ý đã đọc theo thời gian đọc · `md-annotate/`
- MDAN-017 · Một bộ dấu đã đọc, khai báo một chỗ · `md-annotate/css/**`
- MDAN-018 · Thanh cuộn không chạm góc bo · `md-annotate/css/**`, `md-annotate/js/ui/minimap.js`
- MDAN-019 · Chọn một dải dòng bằng Shift + bấm hoặc kéo trên lề số · `md-annotate/js/ui/picks.js`
- MDAN-020 · Vòng focus chỉ hiện sau phím Tab · `md-annotate/css/**`, `md-annotate/js/main.js`, `md-annotate/js/ui/tree.js`, `md-annotate/js/ui/bar.js`
- MDAN-021 · Độ sáng của khối đã đọc chỉnh ở Settings · `md-annotate/`
- MDAN-022 · Một phiên là một cây folder + file, lưu trong trình duyệt · `md-annotate/`
- MDAN-024 · Mở file từ đĩa thêm vào cây cạnh file đang mở · `md-annotate/`
- MDAN-025 · Prompt cho mọi file là một tuỳ chọn, mặc định chỉ file đang mở · `md-annotate/`
- MDAN-026 · Không nền mờ sau tấm nhận xét khi chọn nhiều dòng · `md-annotate/js/ui/popup.js`, `md-annotate/css/mobile.css`
- MDAN-027 · Tên phiên tự đặt không đổi theo file đang mở · `md-annotate/js/core/session.js`
- MDAN-028 · Undo của xoá / chuyển chỉ trả lại đúng mục ấy · `md-annotate/js/core/session.js`, `md-annotate/js/ui/files.js`
- MDAN-029 · Một file chưa có tên thật thì prompt không ghi tên tệp · `md-annotate/js/core/session.js`
- MDAN-030 · Nạp folder: file chữ xét theo đuôi · `md-annotate/js/core/text.js`
- MDAN-031 · Nạp folder vào phiên trống mở file nông nhất · `md-annotate/js/core/tree.js`
- MDAN-032 · Nạp folder hiện cây mà không ghi lựa chọn ẩn / hiện · `md-annotate/js/ui/tree.js`, `md-annotate/js/ui/files.js`
- MDAN-036 · Thanh trên ở điện thoại giữ nút chính, còn lại trong menu More · `md-annotate/index.html`, `md-annotate/js/ui/bar.js`, `md-annotate/css/mobile.css`
- MDAN-037 · Cây file docked nằm sát mép trái màn hình, vùng làm việc căn giữa phần còn lại · `md-annotate/css/tree.css`, `md-annotate/css/base.css`, `md-annotate/js/ui/tree.js`, `md-annotate/js/core/panes.js`
- MDAN-045 · Focus mode và Dim reviewed gộp bằng số mờ hơn, dòng dưới chuột luôn sáng · `md-annotate/`
- MDAN-060 · Thanh bên cây file: thụt đều mọi cấp, thẻ cho file mở, đổi tên ngay trên tên, nút Files ở mép trái · `md-annotate/css/tree.css`, `md-annotate/index.html`, `md-annotate/js/ui/tree.js`
- MDAN-050 · Chọn dòng bằng chạm: nhấn giữ số dòng · `md-annotate/js/ui/picks.js`, `md-annotate/js/ui/popup.js`, `md-annotate/data/shortcuts.json`
- MDAN-051 · Thanh trên ở điện thoại tự ẩn khi cuộn xuống · `md-annotate/js/ui/bar.js`, `md-annotate/css/mobile.css`
- MDAN-053 · Mở tấm nhận xét thì đoạn đang nhận xét nằm ngay trên tấm · `md-annotate/js/ui/popup.js`, `md-annotate/js/ui/selection.js`, `md-annotate/js/core/place.js`
- MDAN-054 · Màn cảm ứng: Return trong ô nhận xét là xuống dòng · `md-annotate/js/ui/popup.js`
- MDAN-061 · Cây file không tự ẩn khi chật; chỉ điện thoại là tấm trượt, đóng sẵn · thay cho MDAN-035 · `md-annotate/js/ui/tree.js`, `md-annotate/js/ui/views.js`, `md-annotate/js/core/panes.js`, `md-annotate/css/tree.css`
- MDAN-062 · Không có dòng mô tả dưới tên trang · `md-annotate/index.html`, `md-annotate/css/base.css`
- MDAN-063 · Cây file nông không cuộn ngang; ⋯ một cột cố định ở mép phải hàng · `md-annotate/css/tree.css`, `md-annotate/js/ui/tree.js`
- MDAN-064 · Kéo từ nền hai bên văn bản là bôi đen văn bản; thanh trên và panel không bôi đen được · `md-annotate/js/ui/selection.js`, `md-annotate/css/base.css`
- MDAN-065 · Hàng cây file cao hơn: 32px · `md-annotate/css/tree.css`
- MDAN-066 · Tô màu code theo loại file, chỉ tải khi cần · `md-annotate/js/core/langs.js`, `md-annotate/js/core/file-type.js`, `md-annotate/js/ui/highlight.js`
- MDAN-067 · Preview và Split chỉ cho file markdown · `md-annotate/js/core/langs.js`, `md-annotate/js/core/file-type.js`, `md-annotate/js/ui/views.js`
- MDAN-068 · Cây file: đệm đáy, ô lọc file theo mẫu · `md-annotate/css/tree.css`, `md-annotate/js/ui/tree.js`, `md-annotate/js/ui/tree-find.js`, `md-annotate/js/core/tree-find.js`
- MDAN-069 · Hộp Shortcuts thành Help, thêm phần tìm file · `md-annotate/index.html`, `md-annotate/js/ui/help.js`, `md-annotate/data/shortcuts.json`, `md-annotate/data/search-help.json`
- MDAN-070 · Code đơn giản nhất mà dễ đọc; giao diện, logic, luật tách nhau; thứ dùng chung ở một chỗ · `md-annotate/`
- MDAN-071 · Văn bản dài: đổi bề rộng vùng chữ không đứng hình · `md-annotate/`
- MDAN-072 · Hộp prompt bôi đen được chữ của nó · `md-annotate/css/base.css`, `md-annotate/js/ui/selection.js`
- MDAN-073 · File code không có Focus mode và đánh dấu đã đọc · `md-annotate/`
- MDAN-074 · File không phải markdown: một tab Source, Edit là nút bật / tắt · `md-annotate/index.html`, `md-annotate/js/ui/views.js`, `md-annotate/css/views.css`
- MDAN-075 · Ô lọc file: chờ gõ xong, mẫu chỉ thử phần đầu tên · `md-annotate/js/ui/tree-find.js`, `md-annotate/js/core/tree-find.js`
- MDAN-076 · Cổng xanh thì push main ngay, smoke chạy sau · `md-annotate/`
- MDAN-079 · Nét đứt theo khối đang đọc: xám là khối hiện tại, xanh là gợi ý; viên thuốc Accept N · thay cho MDAN-077, MDAN-078 · `md-annotate/css/review.css`, `md-annotate/js/ui/review.js`, `md-annotate/js/ui/dwell.js`, `md-annotate/index.html`, `md-annotate/data/shortcuts.json`
- MDAN-080 · Cây sâu cuộn ngang, tự cuộn tới tên file đang mở · `md-annotate/js/ui/tree.js`, `md-annotate/js/core/place.js`
- MDAN-081 · Tab Review và dòng đã đọc trong prompt chỉ ở file markdown · `md-annotate/js/ui/panel.js`, `md-annotate/js/ui/prompt.js`, `md-annotate/js/core/file-type.js`, `md-annotate/js/core/prompt.js`
- MDAN-082 · Prompt chỉ kể dòng đã đọc, mỗi tệp ghi tên một lần · `md-annotate/js/core/prompt.js`, `md-annotate/js/core/review.js`
<!-- index:end -->

## MDAN-001 · Tab Nguồn tô màu cú pháp kiểu VS Code
19/11/2026 · `md-annotate/`

Tab *Nguồn* tô màu markdown như trình soạn VS Code: đầu mục, dấu nhấn, chữ link và URL (xanh dương), mã, trích
khối, dấu danh sách, bảng, đường kẻ, thẻ HTML, chuỗi trong ngoặc kép. Bộ tách token tự viết, theo dòng, không
thư viện; chỉ bọc chữ trong `<span>`, nên text của khung đúng bằng nguồn. Màu là token `--sx-*`, ≥ 4,5:1 trên nền
và trên highlight. Nút *Tô màu* (mặc định bật, nhớ trong trình duyệt) trả về chữ trơn.

## MDAN-005 · Vùng làm việc khoảng 70% màn hình, ở giữa · thay cho MDAN-003
19/11/2026 · `md-annotate/`

Vùng làm việc rộng 70% khung nhìn, căn giữa, không hẹp hơn 1280px (màn nhỏ hơn thì tràn hết, lề 24px; điện thoại
16px). Panel rộng 360px, kéo mép trái được (320–560px) hoặc thu thành thanh dọc 56px vẫn giữ nút chép; cả hai nhớ
trong trình duyệt. *Song song* có khi mỗi khung được ≥ 420px: hai khung cao trọn khung nhìn, cuộn riêng, vách giữa
kéo được và nhớ tỉ lệ. Chữ ở *Preview* mặc định rộng hết khung. Người dùng chỉnh bề rộng vùng làm việc, khổ chữ và cỡ chữ *Preview*
trong hộp *Layout*; mặc định là các số trên.

## MDAN-006 · Preview giống GitHub, cuộn theo nhau ở Split
19/11/2026 · `md-annotate/`

*Preview* dựng markdown theo kiểu GitHub: font hệ thống, màu Primer sáng / tối, tiêu đề h1–h2 có gạch dưới, khối
code xám có tô màu theo ngôn ngữ, bảng sọc, hộp `[!NOTE]` / `[!TIP]` / `[!IMPORTANT]` / `[!WARNING]` / `[!CAUTION]`.
Ở *Split*, cuộn một khung thì khung kia cuộn theo để cùng một đoạn nằm giữa cả hai; tắt được trong *Layout*.

## MDAN-007 · Giao diện tiếng Anh, gợi ý và prompt tiếng Việt · thay cho MDAN-004
19/11/2026 · `md-annotate/`

Chữ giao diện bằng tiếng Anh: nút, nhãn, tooltip, placeholder giao diện, toast, hộp thoại, văn bản mẫu; `lang="en"`.
Nội dung đi vào prompt bằng tiếng Việt: gợi ý nhận xét mặc định, câu số dòng, `Văn bản gốc:`, câu mẫu và ví dụ của lời
dẫn đầu / cuối. Số đếm của gợi ý tiếng Anh cũ chuyển về gợi ý tiếng Việt tương ứng qua `renamed`; phiên đã lưu không
đổi. `desc` trên trang chủ vẫn tiếng Việt (REPO-002).

## MDAN-008 · Code tách theo tính năng, logic tách khỏi giao diện, không build
19/11/2026 · `md-annotate/`

Chủ trang muốn cấu trúc đơn giản, phân chia mục đích rõ ràng, để agent sau sửa nhanh, và sửa giao diện không làm hỏng
logic (cũng như ngược lại). `index.html` chỉ còn markup; CSS tách theo mục đích trong `css/`. JS là module ES: logic
thuần trong `js/core/` (dữ liệu vào, dữ liệu ra, không DOM, không `localStorage`), giao diện trong `js/ui/` (đọc DOM,
gọi logic, ghi DOM, sự kiện trong `init…` của chính module), `js/main.js` gọi theo thứ tự. Vẫn không có bước build.
Đổi lại, trang không chạy qua `file://`: mở bằng `file://` chỉ thấy lời báo cách mở qua HTTP.

## MDAN-009 · Một màu xanh sáng, thang token cho chữ, bo góc, chiều cao · thay cho MDAN-002
19/11/2026 · `md-annotate/`

Chủ trang thấy trang dùng quá nhiều sắc xanh: chỉ giữ xanh sáng `--accent` (`#22c55e` sáng, `#4ade80` tối). Nền nhạt,
highlight, gạch chân, vùng chọn phản chiếu pha từ chính nó; không còn xanh đậm. Xanh sáng trên nền trắng chỉ ~2,3:1 nên
không làm chữ: chữ từng xanh thành mực, nhấn bằng vạch, nền nhạt hoặc huy hiệu; chữ trên nền xanh là `--on-accent`.
Cỡ chữ, bo góc, chiều cao điều khiển và khoảng cách theo thang token ở `css/tokens.css`; mỗi họ component (nút, nhóm tab,
ô nhập, chip, huy hiệu, thẻ, hộp thoại) cùng cao, cùng bo, cùng chữ, cùng trạng thái. Nền, mực và font vẫn chép từ trang chủ.

## MDAN-010 · Dải đọc: chữ của mục cha vẫn sáng khi rê vào mục con
19/11/2026 · `md-annotate/js/ui/focus.js`, `md-annotate/css/focus.css`

Ở dải đọc, rê vào một mục con của danh sách thì mục con sáng, các mục cùng cấp mờ; chữ của mục cha vẫn sáng (nút chữ
không làm mờ riêng được bằng opacity). Đừng bọc chữ trong phần tử mới hay đổi cách làm mờ chỉ để làm mờ phần ấy.

## MDAN-011 · Cảnh báo trùng đoạn theo chữ, không theo chỗ
19/11/2026 · `md-annotate/js/core/comments.js`

"Same passage as comment #N" hiện khi đoạn trích mới có cùng chữ với một nhận xét đã có, kể cả ở chỗ khác trong văn
bản: hai mục ấy trông y hệt nhau trong prompt. Chỉ cảnh báo, không chặn lưu.

## MDAN-012 · Nhận xét nhiều dòng chọn theo số dòng
19/11/2026 · `md-annotate/`

Một nhận xét có thể gắn vào nhiều dòng không liền nhau. Chỉ chọn bằng lề số dòng (*Source* và khung Source của *Split*),
không bằng bôi đen: bấm đúp số dòng thì vào chế độ chọn dòng, bấm một lần để thêm / bỏ dòng; Esc hoặc Save thì thoát,
Cancel đóng hộp nhưng giữ các dòng (màn cảm ứng: MDAN-050). Ngoài chế độ, bấm số dòng và bôi đen chữ giữ như cũ. Hộp nhận xét của chế độ này
có nút kéo đi chỗ khác; lần mở sau hộp về chỗ mặc định. Mỗi dải dòng liền là một đoạn trích; prompt gọn ghi
`3. L12 "…"; L15-16 "…" — nhận xét`, nhận xét một đoạn ra chữ y như trước.

## MDAN-013 · Đánh dấu đoạn đã đọc kỹ, xem còn lại bao nhiêu
19/11/2026 · `md-annotate/`

Chủ trang đọc soát không theo thứ tự (vài đoạn rải rác trước, rồi từ trên xuống) nên cần đánh dấu chỗ đã đọc và thấy
chỗ còn lại. Đơn vị là khối (mỗi mục cấp cao của danh sách là một đơn vị), gộp lên theo section. Ghi nhận xét không tự
đánh dấu. Khối đã đọc mà chữ đổi thì thành "đã đổi" (○), tính là chưa đọc; chuyển chỗ mà chữ giữ nguyên thì vẫn ✓; dấu
không tìm lại được thì báo, không mất lặng lẽ. Đánh dấu bằng phím X (Shift+X cả section, J / K tới chỗ chưa đọc), làn mảnh
cạnh khối (không phải lề số dòng), nút ✓ Reviewed trong hộp nhận xét, nút cạnh tiêu đề; điện thoại có nút "✓ Done · next".
Tab *Review* có tiến độ, dàn ý section và *Dim reviewed* (chỉ làm mờ, không gập). Prompt có thể thêm một dòng tiếng Việt
nói dòng nào đã đọc kỹ; mặc định tắt.

## MDAN-014 · Hộp của các dòng đã chọn không đóng khi bấm ra ngoài
19/11/2026 · `md-annotate/js/ui/popup.js`, `md-annotate/js/ui/picks.js`

Đang chọn nhiều dòng thì hộp nhận xét ở lại khi bấm chữ, panel, nền trang hay cuộn: chỉ Esc (thoát chế độ, ẩn hộp),
Save (lưu, thoát), Done (thoát) và Cancel (ẩn hộp, giữ các dòng; màn cảm ứng thì thoát, MDAN-050) đóng nó. Sau Cancel, bấm một số dòng thì hộp hiện lại với các dòng
đang chọn. Hộp của đoạn bôi đen và hộp sửa vẫn đóng khi bấm ra ngoài như cũ.

## MDAN-015 · Hộp Settings giữa màn hình, nền mờ; bảng phím tắt mới
19/11/2026 · `md-annotate/`

Hộp chỉnh giao diện (nút thanh trượt ở thanh trên) đổi tên thành *Settings*, mở giữa màn hình, nền sau mờ, cả ở điện
thoại; Esc hoặc bấm nền mờ thì đóng. Hộp vẫn áp thay đổi ngay khi kéo: nền chỉ mờ nhẹ và hộp hẹp, để vẫn thấy chữ ở hai
bên thay đổi theo. Nút *Shortcuts* ở đầu hộp Settings (hoặc phím `?` khi không gõ trong ô nhập) mở bảng phím tắt cùng
kiểu giữa màn hình, nền mờ. Bảng chỉ liệt kê phím và cú bấm mới thêm (cú bấm chuột, chạm cũng tính là phím tắt), chữ
ở `data/shortcuts.json`: nhận xét nhiều dòng, đánh dấu đã đọc.


## MDAN-016 · Dải tiến độ cạnh khung, gợi ý đã đọc theo thời gian đọc
19/11/2026 · `md-annotate/`

Chủ trang soát Tech Design không theo thứ tự rồi đọc từ trên xuống, nên cần thấy cả văn bản đã đọc tới đâu. Mỗi khung có
một dải mảnh ở mép phải (trái thanh cuộn), hai đầu bo tròn: đoạn theo vị trí từng khối, đặc là đã đọc, rỗng là đã đổi
chữ, nhạt là chưa đọc. Bên trái dải là thanh cuộn tự vẽ: con trượt xám, chấm ở nhận xét; ở Split nó thay thanh cuộn hệ
thống của khung, để không có hai thanh song song. Hai cột cùng bề rộng, bằng con trượt của thanh cuộn hệ thống, ở cả hai
khung; cùng chiều cao, cách nhau một khe nhỏ. Bấm / kéo thì cuộn tới. Điện thoại ẩn dải; màn cảm ứng chỉ xem. Khối nằm ở dải đọc
đủ lâu (khoảng 40% số từ ở 230 từ/phút, 4–60 giây) rồi người đọc tự cuộn qua thì được gợi ý (nút "Accept N
suggested"; dấu gợi ý là ✓ mờ viền đứt xanh trên nền xanh nhạt, MDAN-079); gợi ý không bao giờ tự thành dấu. Mặc định bật, tắt được ở tab Review; gợi ý không lưu, chỉ trong phiên đang
mở. Tab ẩn, cửa sổ mất focus, rảnh tay, cuộn do trang (J / K / X, dải tiến độ) không tính.

## MDAN-017 · Một bộ dấu đã đọc, khai báo một chỗ
20/11/2026 · `md-annotate/css/**`

Mọi dấu đã đọc (làn cạnh khối, dàn ý tab Review) và ô đánh dấu của form dùng chung một bộ: cùng cỡ, cùng ảnh ✓, cùng
màu cho từng trạng thái, khai báo một lần rồi dùng lại. ✓ là ảnh, không phải ký tự, để luôn nằm giữa ô. Dấu căn giữa
dòng đầu của khối.

## MDAN-018 · Thanh cuộn không chạm góc bo
20/11/2026 · `md-annotate/css/**`, `md-annotate/js/ui/minimap.js`

Vùng nào có góc bo x thì thanh cuộn (tự vẽ hay của hệ thống) cách mép trên / dưới ở góc ấy ít nhất x, để khi cuộn tới
đầu hoặc cuối con trượt không bị góc bo cắt hay dính vào đường cong. Áp cho mọi vùng cuộn của trang.

## MDAN-019 · Chọn một dải dòng bằng Shift + bấm hoặc kéo trên lề số
20/11/2026 · `md-annotate/js/ui/picks.js`

Ở chế độ chọn nhiều dòng, chọn từng dòng một thì chậm. Shift + bấm lề số dòng: chưa vào chế độ thì vào với dòng ấy,
đã vào thì thêm cả dải liền từ dòng bấm gần nhất. Đang chọn thì kéo trên lề để thêm cả dải (bắt đầu ở dòng chưa chọn)
hoặc bỏ cả dải (bắt đầu ở dòng đã chọn).

## MDAN-020 · Vòng focus chỉ hiện sau phím Tab
20/11/2026 · `md-annotate/css/**`, `md-annotate/js/main.js`, `md-annotate/js/ui/tree.js`, `md-annotate/js/ui/bar.js`

Điều khiển bằng Tab / Space giữ nguyên, nhưng vòng focus (viền đậm quanh nút) chỉ hiện từ lần bấm Tab đầu. Mở hộp
thoại, đóng hộp, chạm hay bấm chuột thì không có vòng; bấm chuột / chạm tắt nó tới lần Tab sau. Áp cả máy tính và
điện thoại. Mũi tên, Home, End trong cây file, menu của nó và menu *More* của thanh trên cũng là dùng bàn phím: bật vòng như Tab.

## MDAN-021 · Độ sáng của khối đã đọc chỉnh ở Settings
20/11/2026 · `md-annotate/`

Hộp *Settings* có mục *Dim reviewed blocks*: cùng công tắc với ô *Dim reviewed* ở tab Review, thêm thanh kéo độ sáng
của khối đã đọc (10–80%, mặc định 40%), áp ngay khi kéo.

## MDAN-022 · Một phiên là một cây folder + file, lưu trong trình duyệt
20/11/2026 · `md-annotate/`

Một phiên chứa cả một cây folder và file chữ, sâu bao nhiêu cũng được, mỗi file có nhận xét và dấu đã đọc riêng; cây
hiện ở cột trái (máy hẹp: tấm trượt trái). Cây lưu trong bộ nhớ trình duyệt, một khoá cho cả phiên. Nạp folder từ đĩa là
bản sao (bỏ mục ẩn, `node_modules`, file không phải chữ hay lớn hơn 1 MB); tải về từng file `.md`, một folder hay cả
phiên `.zip`. Trang không ghi ngược ra đĩa; lớp lưu tách riêng để sau có thể thêm chế độ folder thật mà không đổi nghiệp vụ.
Phiên một văn bản cũ thành cây một file, prompt giữ nguyên.

## MDAN-024 · Mở file từ đĩa thêm vào cây cạnh file đang mở
20/11/2026 · `md-annotate/`

Mở hay thả một file: file đang mở còn trống (không chữ, không nhận xét) và chưa có tên thật (người dùng chưa đặt tên)
thì file ấy nhận chữ và tên; không thì file mới
vào cùng folder với file đang mở và được mở. Không còn mở phiên mới, không ghi ô *Folder*. *Sample text* giữ như cũ:
phiên có nội dung thì mở phiên mới.

## MDAN-025 · Prompt cho mọi file là một tuỳ chọn, mặc định chỉ file đang mở
20/11/2026 · `md-annotate/`

*Options* có ô *All files* (lưu theo phiên, ẩn khi phiên có một file). Tắt: prompt, chép, tải chỉ gồm file đang mở.
Bật: một prompt gom nhận xét của mọi file theo thứ tự cây, mỗi file một mục `## Tệp <đường dẫn>`, số chạy tiếp. Tab
*Comments* luôn chỉ liệt kê file đang mở.

## MDAN-026 · Không nền mờ sau tấm nhận xét khi chọn nhiều dòng
20/11/2026 · `md-annotate/js/ui/popup.js`, `md-annotate/css/mobile.css`

Trên điện thoại, hộp nhận xét của các dòng chọn ở lề số là tấm đáy không có nền mờ phía sau: người dùng vẫn chạm lề số
các dòng khác để thêm / bỏ dòng, nền mờ khiến trông như trang bị khoá. Tấm của đoạn bôi đen và tấm sửa nhận xét vẫn có nền mờ nhẹ.

## MDAN-027 · Tên phiên tự đặt không đổi theo file đang mở
20/11/2026 · `md-annotate/js/core/session.js`

Phiên chưa được đặt tên thì tên tự đặt là tên folder khi gốc cây chỉ có một folder; không thì tiêu đề (hay dòng có chữ
đầu tiên) của file đầu tiên theo thứ tự cây có chữ. Mở file khác trong cây không đổi tên phiên ở History và đầu cây.

## MDAN-028 · Undo của xoá / chuyển chỉ trả lại đúng mục ấy
20/11/2026 · `md-annotate/js/core/session.js`, `md-annotate/js/ui/files.js`

Undo chèn lại file / folder vừa xoá (cùng chữ, nhận xét, dấu đã đọc) hay đưa mục vừa chuyển về chỗ cũ, vào cây như nó
đang là: file mới, tên mới, chữ gõ sau lần xoá đều giữ. Folder cha không còn thì về gốc; tên trùng thì thêm số (-2). Đã
sang phiên khác thì Undo vẫn trả mục về phiên của nó, kể cả phiên đã bị bỏ vì trống sau khi xoá file cuối.

## MDAN-029 · Một file chưa có tên thật thì prompt không ghi tên tệp
20/11/2026 · `md-annotate/js/core/session.js`

Phiên chỉ một file mà file ấy là chữ dán vào (chưa đặt tên, chưa mở từ đĩa) thì prompt ghi `L12`, dù ô *Folder* có chữ.
Ô *Folder* là tiền tố khi phiên có từ hai file hay file có tên thật. Phiên một văn bản cũ có path không tách được thành
tên file (`docs/`, `.`, rất dài) giữ nhãn y nguyên path cũ, để prompt cũ không đổi một byte.

## MDAN-030 · Nạp folder: file chữ xét theo đuôi
20/11/2026 · `md-annotate/js/core/text.js`

Nạp folder và mở một file nhận file chữ / code theo đuôi (md, txt, ts, js, json, yaml, csv, html, css, py, swift, dart…)
hay tên quen không đuôi (Makefile, LICENSE…), hoặc khi trình duyệt báo kiểu `text/*`. File có ký tự NUL trong 8 KB đầu
là nhị phân, bỏ và đếm vào số bỏ qua. Tên file / folder bỏ dấu cách đầu và cuối; đoạn chỉ có dấu cách thì bỏ cả file.

## MDAN-031 · Nạp folder vào phiên trống mở file nông nhất
20/11/2026 · `md-annotate/js/core/tree.js`

Folder nạp thành cả phiên thì file mở đầu là file nông nhất; cùng độ sâu thì `README.*` trước, rồi `index.*`, rồi file
đầu theo thứ tự cây.

## MDAN-032 · Nạp folder hiện cây mà không ghi lựa chọn ẩn / hiện
20/11/2026 · `md-annotate/js/ui/tree.js`, `md-annotate/js/ui/files.js`

Nạp folder xong thì cây hiện cho phiên ấy. Lựa chọn ẩn / hiện cây chỉ được ghi khi người dùng bấm nút hay Ctrl/⌘ + B;
phiên khác vẫn theo lựa chọn ấy (chưa chọn thì hiện khi phiên có từ hai mục).

## MDAN-036 · Thanh trên ở điện thoại giữ nút chính, còn lại trong menu More
20/11/2026 · `md-annotate/index.html`, `md-annotate/js/ui/bar.js`, `md-annotate/css/mobile.css`

Điện thoại (≤ 720px): trái là nút *Files* (biểu tượng sidebar) rồi tên gọn; phải là *History*, *Settings* và *More* (⋯).
*New session*, đổi theme sáng / tối và *Shortcuts* nằm trong *More*. *History* (đổi phiên) và *Settings* (cỡ chữ, khổ
chữ, Focus) là việc dùng thường khi đọc trên điện thoại; mở phiên mới, đổi theme ít dùng. Máy rộng giữ nguyên các nút.

## MDAN-037 · Cây file docked nằm sát mép trái màn hình, vùng làm việc căn giữa phần còn lại
20/11/2026 · `md-annotate/css/tree.css`, `md-annotate/css/base.css`, `md-annotate/js/ui/tree.js`, `md-annotate/js/core/panes.js`

Khi là cột (MDAN-035), cây là thanh bên kiểu trình soạn mã: sát mép trái màn hình, từ dưới thanh trên tới đáy màn hình,
cuộn riêng, chỉ có viền phải. Thanh trên vẫn trọn bề ngang. Vùng làm việc (MDAN-005: 70%, không hẹp hơn 1280px) tính
trên phần màn hình còn lại và căn giữa trong đó; nút, tên trang trên thanh trên thẳng hàng với vùng làm việc.

## MDAN-045 · Focus mode và Dim reviewed gộp bằng số mờ hơn, dòng dưới chuột luôn sáng
20/11/2026 · `md-annotate/`

Bật cả Focus mode và *Dim reviewed*: độ sáng thấy được của mỗi khối là số nhỏ hơn trong hai độ mờ (ngoài section đang
sáng: `--dim`; đã đọc: `--rv-dim`), không nhân với nhau, và như nhau ở Source, Preview, hai khung Split. Dòng / khối
dưới chuột (theo chuột lẫn dải đọc, cùng phần ghép ở khung kia) luôn sáng hẳn, đã đọc hay chưa; khối đã đọc khác trong
section đang sáng vẫn mờ theo *Dim reviewed*. Dòng trống ở Source mờ theo dòng ngay trên nó.
trên phần màn hình còn lại và căn giữa trong đó; tên trang và các nút trên thanh trên thẳng hàng với vùng làm việc, trừ nút
Files (MDAN-060).

## MDAN-060 · Thanh bên cây file: thụt đều mọi cấp, thẻ cho file mở, đổi tên ngay trên tên, nút Files ở mép trái
20/11/2026 · `md-annotate/css/tree.css`, `md-annotate/index.html`, `md-annotate/js/ui/tree.js`

Cây file trông như thanh bên của trình soạn mã. Nút Files luôn ở mép trái thanh trên (lề trang cộng vùng an toàn), dù cây
là cột, tấm trượt hay đang ẩn; tên trang vẫn thẳng hàng vùng làm việc, cửa sổ hẹp thì đứng ngay sau nút, không chồng, không
nhảy. Khi là cột, phần thanh trên phía trên cột cùng nền với cột. Đầu cây một hàng: nhãn Files nhỏ trên tên phiên, New
file, New folder và ⋯ (Import folder, Download .zip, Collapse all); tấm trượt thêm nút đóng, tách bằng một vạch. Hàng thấp
(32px theo MDAN-065, cảm ứng 44px). Mỗi cấp thụt bằng nhau, ở mọi độ sâu, không nén: tên sắp hẹp hơn ~96px thì danh sách cuộn ngang
trong thanh bên, trang không cuộn ngang, file đang mở được cuộn vào tầm nhìn. Mỗi folder đang mở có một vạch mảnh, nhạt,
dưới tâm chevron của nó, chỉ dài qua các hàng con; vạch của folder chứa hàng hiện tại đậm hơn. File đang mở là một thẻ bo
góc chỉ có nền xanh nhạt, không viền, không vòng, ôm phần biểu tượng và tên, không tô cả hàng, không vạch trái riêng; rê
chuột dùng cùng dáng thẻ. Nút ⋯ nhỏ, nằm gọn trong thẻ; cây cuộn ngang thì ⋯ mọi hàng đứng một cột ở mép phải thân. Đổi
tên ngay trên tên: không ô nhập nhìn thấy (không viền, không vòng, không nền), chữ không xê dịch, chỉ có con trỏ và màu
vùng chọn chung. Phiên chỉ một file thì có gợi ý thả file hay nạp folder. Tấm trượt rộng tối đa 320px, tránh vùng an toàn
trên, trái, dưới, góc phải bo, nổi bằng bóng.

## MDAN-050 · Chọn dòng bằng chạm: nhấn giữ số dòng
20/11/2026 · `md-annotate/js/ui/picks.js`, `md-annotate/js/ui/popup.js`, `md-annotate/data/shortcuts.json`

Trên màn cảm ứng không có bấm đúp chắc chắn, không có Shift, không có Esc. Nhấn giữ một số dòng ở Source thì vào chế độ chọn
dòng (bấm đúp vẫn được, chạm hai lần lên lề số không phóng to); chạm thêm số dòng để thêm / bỏ. Hộp có nút Done (×) để thoát;
ở màn cảm ứng Cancel cũng thoát, máy tính giữ MDAN-014 (Cancel ẩn hộp, giữ dòng). Hộp đã ẩn mà chạm một dòng đã chọn thì chỉ
mở lại hộp, không bỏ dòng ấy. Đáy trang có thêm chỗ để dòng cuối cuộn lên trên tấm. Hộp Shortcuts ở màn cảm ứng có một
dòng: "long-press a line number to pick lines".

## MDAN-051 · Thanh trên ở điện thoại tự ẩn khi cuộn xuống
20/11/2026 · `md-annotate/js/ui/bar.js`, `md-annotate/css/mobile.css`

Điện thoại dọc (≤ 720px) và nằm ngang thấp (cao ≤ 500px): thanh trên trượt lên khuất khi cuộn xuống, cuộn lên một chút thì
trượt về, như Safari hay app đọc báo. Luôn hiện ở đầu trang, khi menu More hay một hộp thoại mở. Người dùng chọn giảm
chuyển động thì hiện / ẩn ngay, không trượt. Máy rộng giữ thanh dính như cũ.

## MDAN-053 · Mở tấm nhận xét thì đoạn đang nhận xét nằm ngay trên tấm
20/11/2026 · `md-annotate/js/ui/popup.js`, `md-annotate/js/ui/selection.js`, `md-annotate/js/core/place.js`

Trên điện thoại tấm nhận xét che mất đoạn vừa chọn. Mở tấm thì trang cuộn để đoạn ấy nằm ngay trên đỉnh tấm, cách một
khoảng nhỏ; lưu vẫn không cuộn trang. Nút nổi "Comment on selection" đặt xa đoạn chọn: đoạn ở nửa dưới màn hình thì nút
lên đỉnh, ngay dưới thanh trên.

## MDAN-054 · Màn cảm ứng: Return trong ô nhận xét là xuống dòng
20/11/2026 · `md-annotate/js/ui/popup.js`

Bàn phím ảo không có Shift + Return, nên trên màn cảm ứng Return trong ô nhận xét xuống dòng, lưu bằng nút Save. Máy tính
giữ nguyên: Enter lưu, Shift + Enter xuống dòng.

## MDAN-061 · Cây file không tự ẩn khi chật; chỉ điện thoại là tấm trượt, đóng sẵn · thay cho MDAN-035
20/11/2026 · `md-annotate/js/ui/tree.js`, `md-annotate/js/ui/views.js`, `md-annotate/js/core/panes.js`, `md-annotate/css/tree.css`

Mở trang thì cây hiện sẵn thành cột ở mọi khổ màn trừ điện thoại, kể cả phiên chỉ một file, kể cả khi vùng làm việc bị
hẹp lại. Không tự chuyển sang tấm trượt hay tự ẩn khi chật: người dùng tự ẩn (nút Files, Ctrl/⌘ + B) hay kéo hẹp cây
(180–420px), lựa chọn được nhớ. Điện thoại (≤ 720px, kể cả
xoay ngang): cây là tấm trượt từ trái, đóng sẵn. *Split* theo bề rộng thật của
văn bản: cột cây chiếm chỗ thì *Split* lùi về *Preview*, ẩn cây thì về lại.

## MDAN-062 · Không có dòng mô tả dưới tên trang
20/11/2026 · `md-annotate/index.html`, `md-annotate/css/base.css`

Dưới tiêu đề Markdown Annotate không có câu giới thiệu.

## MDAN-063 · Cây file nông không cuộn ngang; ⋯ một cột cố định ở mép phải hàng
20/11/2026 · `md-annotate/css/tree.css`, `md-annotate/js/ui/tree.js`

Thanh bên cây file không có thanh cuộn ngang trong trường hợp thường: tên dài cắt bằng …, tên đầy đủ ở tooltip. Chỉ cây
sâu, khi phần thụt đẩy tên hàng sâu nhất xuống dưới ~96px, mới cuộn ngang như MDAN-060; cây không thụt thì không bao giờ,
kể cả khi kéo hẹp. Nút ⋯ mọi hàng đứng một cột cố định ở mép phải: cùng cỡ, giữa hàng, thẳng nút ⋯ của đầu cây; huy hiệu
đứng trước nó, không bị ẩn khi rê.

## MDAN-064 · Kéo từ nền hai bên văn bản là bôi đen văn bản; thanh trên và panel không bôi đen được
20/11/2026 · `md-annotate/js/ui/selection.js`, `md-annotate/css/base.css`

Bấm giữ rồi kéo ở nền bên phải văn bản (lề trang, nền panel nhận xét) bôi đen các dòng của văn bản, như đã làm được ở nền
bên trái; không còn bôi đen chữ của panel. Ở Split, kéo bắt đầu ở nền phía trước (trái) bôi đen Source, ở nền phía sau
(phải, cả panel) bôi đen Preview. Thanh trên, panel nhận xét (cả thẻ nhận xét) và cây file không bôi đen được chữ nào,
trừ ô gõ chữ. Chỉ chuột và bút; màn cảm ứng kéo vẫn là cuộn.

## MDAN-065 · Hàng cây file cao hơn: 32px
20/11/2026 · `md-annotate/css/tree.css`

Hàng của cây file (file và folder như nhau) cao 32px thay cho 28px ở máy có chuột; màn cảm ứng giữ 44px. Nút ⋯, chevron,
biểu tượng, huy hiệu, vạch thụt và thẻ rê / chọn theo cùng chiều cao, giữa hàng.

## MDAN-066 · Tô màu code theo loại file, chỉ tải khi cần
20/11/2026 · `md-annotate/js/core/langs.js`, `md-annotate/js/core/file-type.js`, `md-annotate/js/ui/highlight.js`

Mỗi loại file có bộ tô màu riêng, và bộ tô màu của một loại chỉ tải khi có file hay khối code loại ấy, không tải sẵn trong
trang. Markdown dùng bộ tách token có sẵn (file mặc định là markdown). File code (py, js, rs…) tô ở Source bằng highlight.js
theo đuôi; khối code có ghi ngôn ngữ ở Preview cũng thế. Đuôi lạ (txt, csv…) là chữ trơn. Chưa tải xong hay tải hỏng thì
hiện chữ trơn, tải xong tự lên màu.

## MDAN-067 · Preview và Split chỉ cho file markdown
20/11/2026 · `md-annotate/js/core/langs.js`, `md-annotate/js/core/file-type.js`, `md-annotate/js/ui/views.js`

Preview và Split chỉ có nghĩa với markdown: file khác (code, chữ trơn) ẩn hai tab ấy và mở ở Source. Chế độ đã chọn cho
markdown vẫn được nhớ: mở file code rồi quay lại file .md thì về đúng Preview / Split cũ, kể cả sau khi tải lại trang.
## MDAN-068 · Cây file: đệm đáy, ô lọc file theo mẫu
20/11/2026 · `md-annotate/css/tree.css`, `md-annotate/js/ui/tree.js`, `md-annotate/js/ui/tree-find.js`, `md-annotate/js/core/tree-find.js`

Cuộn cây tới cuối thì hàng cuối vẫn cách mép dưới một khoảng, cả ở tấm trượt điện thoại. Cây có từ hai file thì có ô lọc
dưới đầu cây: gõ là lọc ngay theo tên file, không phân biệt hoa thường; chữ thường tìm tên chứa nó, biểu thức chính quy
cũng được (^a.b.*\.text$ tìm axb-notes.text); biểu thức hỏng thì tìm như chữ thường và báo nhỏ dưới ô. Chỉ hiện file khớp
và folder chứa chúng, mở sẵn; không khớp thì báo. Esc xoá, cây về gập / mở như trước; phím / ở hàng của cây vào ô lọc.

## MDAN-069 · Hộp Shortcuts thành Help, thêm phần tìm file
20/11/2026 · `md-annotate/index.html`, `md-annotate/js/ui/help.js`, `md-annotate/data/shortcuts.json`, `md-annotate/data/search-help.json`

Hộp phím tắt đổi tên thành Help, ở cả nút trong Settings, menu More và tiêu đề hộp; phím ? vẫn mở nó. Trong Help có hai
phần: Shortcuts and gestures (như cũ) và Searching files: cách gõ mẫu ở ô lọc của cây, có ví dụ (chữ thường, ^, $, ., .*,
\., |, mẫu hỏng thành chữ thường) và các phím (/, ↓, Esc). Ô lọc trỏ tới Help ở tooltip.

## MDAN-070 · Code đơn giản nhất mà dễ đọc; giao diện, logic, luật tách nhau; thứ dùng chung ở một chỗ
20/11/2026 · `md-annotate/`

Viết code đơn giản nhất mà dễ đọc: hàm và module thường, tên rõ, không framework, không lớp trừu tượng "để sau". Giao diện
(DOM, CSS), logic (hàm thuần, không DOM) và luật / cấu hình (hằng, bảng phím, token, luật tìm) tách nhau, mỗi tính năng
một module trong lớp của nó, theo cách xếp thư mục sẵn có. Thứ dùng ở hai chỗ trở lên nằm một chỗ chung và mọi nơi gọi nó,
không chép thành biến thể; chỉ dùng một chỗ thì không tách ra.

## MDAN-071 · Văn bản dài: đổi bề rộng vùng chữ không đứng hình
20/11/2026 · `md-annotate/`

Với văn bản khoảng 10.000 dòng, kéo vách giữa *Split*, ẩn / hiện cây file, thu gọn / mở panel nhận xét không được làm
trang đứng hình nửa giây. Đổi bề rộng chỉ dàn lại chữ, không dựng lại hay tính lại phần khác. Văn bản dài thì khi kéo
vách (cả mép cây, mép panel) chỉ vạch đi theo chuột, thả ra mới dàn lại.

## MDAN-072 · Hộp prompt bôi đen được chữ của nó
21/11/2026 · `md-annotate/css/base.css`, `md-annotate/js/ui/selection.js`

Hộp prompt ở tab Prompt là chữ để chép ra: kéo chuột trong hộp bôi đen chữ của chính nó, không thành kéo từ nền bôi đen
văn bản; bấm vào thì hộp nhận focus (phím mũi tên cuộn, Ctrl/⌘ + A chọn hết). Phần khác của panel vẫn không bôi đen được.

## MDAN-073 · File code không có Focus mode và đánh dấu đã đọc
21/11/2026 · `md-annotate/`

Focus mode và đánh dấu đã đọc (làn, phím X / J / K, tab Review, dải tiến độ, gợi ý theo thời gian đọc) chỉ có ở file
markdown. File code và chữ trơn không chia section, không có làn; tab Review nói rằng đánh dấu chỉ dành cho markdown.
File không phải markdown không bị dựng hay tách khối như markdown (không tốn công, không sai).

## MDAN-074 · File không phải markdown: một tab Source, Edit là nút bật / tắt
21/11/2026 · `md-annotate/index.html`, `md-annotate/js/ui/views.js`, `md-annotate/css/views.css`

File code và chữ trơn chỉ có tab Source; cạnh nó là nút Edit bật / tắt, bật thì chính khung ấy thành ô sửa chữ (ô Edit
sẵn có), tắt hay bấm Source thì về Source. Phím mũi tên ở tab Source cũng bật / tắt Edit. File markdown giữ bốn tab. Chế
độ đã chọn cho markdown (Preview, Split) vẫn được nhớ qua Edit / Source ở file code, kể cả sau khi tải lại trang.

## MDAN-075 · Ô lọc file: chờ gõ xong, mẫu chỉ thử phần đầu tên
21/11/2026 · `md-annotate/js/ui/tree-find.js`, `md-annotate/js/core/tree-find.js`

Ô lọc của cây lọc khi ngừng gõ khoảng 150 ms, không sau từng phím; Enter / ↓ thì lọc ngay rồi vào hàng đầu. Mẫu biểu thức
chính quy chỉ so với 200 ký tự đầu của tên file (tìm chữ thường thì cả tên): chặn nhẹ mẫu gõ dở làm trang chậm.

## MDAN-076 · Cổng xanh thì push main ngay, smoke chạy sau
21/11/2026 · `md-annotate/`

Commit qua cổng (check.sh của md-annotate và của gốc, hook pre-commit) thì push lên main ngay, không chờ smoke. Smoke
chạy sau; đỏ thì sửa bằng commit mới rồi push tiếp, không amend hay force-push commit đã push. Chỉ push nhánh main.

## MDAN-079 · Nét đứt theo khối đang đọc: xám là khối hiện tại, xanh là gợi ý; viên thuốc Accept N · thay cho MDAN-077, MDAN-078
21/11/2026 · `md-annotate/css/review.css`, `md-annotate/js/ui/review.js`, `md-annotate/js/ui/dwell.js`, `md-annotate/index.html`, `md-annotate/data/shortcuts.json`

Không còn vạch đặc nào cạnh làn. Khối hiện tại (khối X hay viên thuốc sẽ đánh dấu) có ô dấu viền đứt quanh ✓ mờ và vạch
đứt suốt khối, màu xám; kiểu đứt đi theo chỗ đang đọc. Khối được gợi ý đã đọc (theo thời gian đọc) có cùng kiểu ấy màu
xanh, nền ô xanh nhạt; vừa hiện tại vừa gợi ý thì xanh. Khối khác, tiêu đề chưa tới, khối đã đọc (✓ đặc) giữ như cũ.
Nét đứt và ✓ mờ ≥ 3:1 ở hai theme. Màn cảm ứng có gợi ý thì viên thuốc đổi thành "Accept N": chạm là đánh dấu mọi gợi ý,
có Undo như thường. Tab Review ở màn cảm ứng nói về viên thuốc, không nói phím X / J / K hay làn.

## MDAN-080 · Cây sâu cuộn ngang, tự cuộn tới tên file đang mở
21/11/2026 · `md-annotate/js/ui/tree.js`, `md-annotate/js/core/place.js`

Sửa MDAN-063: cây sâu vẫn cuộn ngang trong thanh bên (MDAN-060). Mở file, chọn hàng (bàn phím hay bấm), hiện cây, đổi bề rộng
cây, mở / gập làm đổi độ sâu: cây tự cuộn ngang vừa đủ để thấy đầu tên hàng ấy, như VS Code. Người dùng tự cuộn ngang thì
không bị kéo lại.

## MDAN-081 · Tab Review và dòng đã đọc trong prompt chỉ ở file markdown
21/11/2026 · `md-annotate/js/ui/panel.js`, `md-annotate/js/ui/prompt.js`, `md-annotate/js/core/file-type.js`, `md-annotate/js/core/prompt.js`

Sửa MDAN-073: file không phải markdown không có tab Review, thay vì tab báo rằng đánh dấu chỉ dành cho markdown. Đang ở
Review mà mở file khác thì panel hiện Comments; quay lại file markdown thì về Review. Ô "Say which lines I reviewed" ẩn
khi prompt không có file markdown nào; lựa chọn của người dùng giữ nguyên cho lần sau.

## MDAN-082 · Prompt chỉ kể dòng đã đọc, mỗi tệp ghi tên một lần
21/11/2026 · `md-annotate/js/core/prompt.js`, `md-annotate/js/core/review.js`

Sửa MDAN-013: dòng đã đọc trong prompt chỉ kể dải đã đọc, không kể chỗ chưa đọc. Mỗi tệp ghi tên một lần rồi các dải
(`Đã đọc kỹ: a.md L1-20, L30; b.md L5.`), không có tên tệp thì chỉ `L1-20`. Câu "ổn" nói rõ chỉ trong các đoạn đã kể.
Gom mọi file thì một dòng ở đầu prompt cho mọi tệp; tệp chỉ có dấu đã đọc không thành mục `## Tệp`.
