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
- MDAN-020 · Vòng focus chỉ hiện sau phím Tab · `md-annotate/css/**`, `md-annotate/js/main.js`, `md-annotate/js/ui/tree.js`
- MDAN-021 · Độ sáng của khối đã đọc chỉnh ở Settings · `md-annotate/`
- MDAN-022 · Một phiên là một cây folder + file, lưu trong trình duyệt · `md-annotate/`
- MDAN-023 · Cây file hiện mặc định khi phiên có từ hai mục · `md-annotate/js/ui/tree.js`, `md-annotate/js/ui/files.js`
- MDAN-024 · Mở file từ đĩa thêm vào cây cạnh file đang mở · `md-annotate/`
- MDAN-025 · Prompt cho mọi file là một tuỳ chọn, mặc định chỉ file đang mở · `md-annotate/`
- MDAN-027 · Tên phiên tự đặt không đổi theo file đang mở · `md-annotate/js/core/session.js`
- MDAN-028 · Undo của xoá / chuyển chỉ trả lại đúng mục ấy · `md-annotate/js/core/session.js`, `md-annotate/js/ui/files.js`
- MDAN-029 · Một file chưa có tên thật thì prompt không ghi tên tệp · `md-annotate/js/core/session.js`
- MDAN-030 · Nạp folder: file chữ xét theo đuôi · `md-annotate/js/core/text.js`
- MDAN-031 · Nạp folder vào phiên trống mở file nông nhất · `md-annotate/js/core/tree.js`
- MDAN-032 · Nạp folder hiện cây mà không ghi lựa chọn ẩn / hiện · `md-annotate/js/ui/tree.js`, `md-annotate/js/ui/files.js`
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
Cancel đóng hộp nhưng giữ các dòng. Ngoài chế độ, bấm số dòng và bôi đen chữ giữ như cũ. Hộp nhận xét của chế độ này
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
Save (lưu, thoát) và Cancel (ẩn hộp, giữ các dòng) đóng nó. Sau Cancel, bấm một số dòng thì hộp hiện lại với các dòng
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
đủ lâu (khoảng 40% số từ ở 230 từ/phút, 4–60 giây) rồi người đọc tự cuộn qua thì được gợi ý (✓ viền đứt, nút "Accept N
suggested"); gợi ý không bao giờ tự thành dấu. Mặc định bật, tắt được ở tab Review; gợi ý không lưu, chỉ trong phiên đang
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
20/11/2026 · `md-annotate/css/**`, `md-annotate/js/main.js`, `md-annotate/js/ui/tree.js`

Điều khiển bằng Tab / Space giữ nguyên, nhưng vòng focus (viền đậm quanh nút) chỉ hiện từ lần bấm Tab đầu. Mở hộp
thoại, đóng hộp, chạm hay bấm chuột thì không có vòng; bấm chuột / chạm tắt nó tới lần Tab sau. Áp cả máy tính và
điện thoại. Mũi tên, Home, End trong cây file và menu của nó cũng là dùng bàn phím: bật vòng như Tab.

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

## MDAN-023 · Cây file hiện mặc định khi phiên có từ hai mục
20/11/2026 · `md-annotate/js/ui/tree.js`, `md-annotate/js/ui/files.js`

Chưa chọn thì cây chỉ hiện khi phiên có từ hai mục, để người dùng một file vẫn có *Split* ở 1280px. Ctrl/⌘ + B hay nút
trên thanh trên ẩn / hiện cây, lựa chọn được nhớ. Nạp folder xong thì cây hiện. Xoá không hỏi, có Undo.

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
