# Quyết định — data-science-roadmap

<!-- index:start -->
- DS-002 · Roadmap tự đứng một mình với người đọc · `masters-degree/data-science-roadmap/roadmap.html`, `masters-degree/data-science-roadmap/tools/build-roadmap.mjs`, `masters-degree/data-science-roadmap/tools/roadmap-summaries.json`
- DS-003 · Hình vẽ ở trang chính, roadmap chạy đúng khối đó · `masters-degree/data-science-roadmap/data-science-roadmap.html`, `masters-degree/data-science-roadmap/tools/build-roadmap.mjs`
- DS-004 · Nội dung chữ nạp từ file ngoài, HTML chỉ còn giao diện · `masters-degree/data-science-roadmap/data-science-roadmap.html`, `masters-degree/data-science-roadmap/data/`
- DS-005 · Tên file tiếng Anh, nội dung vẫn tiếng Việt · `masters-degree/data-science-roadmap/`
- DS-006 · Luật hình thức có file riêng: docs/design.md · `masters-degree/data-science-roadmap/docs/design.md`
- DS-008 · Thứ tự chặng hiện hành do chủ trang duyệt · `masters-degree/data-science-roadmap/data-science-roadmap.html`
- DS-009 · Giữ f-store và q-analytics; không thêm nhãn cấp độ cho bài · `masters-degree/data-science-roadmap/data-science-roadmap.html`
- DS-010 · Quiz phủ đủ kiến thức mạch chính của bài · `masters-degree/data-science-roadmap/data/quiz.json`
- DS-011 · Quiz chỉ trả lời được khi hiểu bài · `masters-degree/data-science-roadmap/data/quiz.json`
- DS-013 · Một mép phải: cột nội dung bằng khổ chữ · `masters-degree/data-science-roadmap/data-science-roadmap.html`
- DS-014 · Cột 1060px, chữ 14–15px · `masters-degree/data-science-roadmap/data-science-roadmap.html`
- DS-016 · Thanh trên và chân trang nói tiếng Anh, lớp vỏ còn lại tiếng Việt · `masters-degree/data-science-roadmap/data-science-roadmap.html`, `masters-degree/data-science-roadmap/tools/build-roadmap.mjs`
- DS-017 · Hero của roadmap.html nói tiếng Anh · `masters-degree/data-science-roadmap/tools/build-roadmap.mjs`, `masters-degree/data-science-roadmap/roadmap.html`
- DS-018 · Chữ thương hiệu trên thanh trên là "Data Science" · `masters-degree/data-science-roadmap/data-science-roadmap.html`, `masters-degree/data-science-roadmap/tools/build-roadmap.mjs`, `masters-degree/data-science-roadmap/roadmap.html`
- DS-019 · Đường nối stepper dùng --wb-border-strong · `masters-degree/data-science-roadmap/data-science-roadmap.html`
- DS-020 · Nút sao chép code chỉ là icon · `masters-degree/data-science-roadmap/data-science-roadmap.html`
- DS-021 · Lớp vỏ điều hướng không cho bôi đen chữ, trừ ô tìm kiếm · `masters-degree/data-science-roadmap/data-science-roadmap.html`
- DS-022 · Ngăn phụ và dock Notes kéo được, trong khoảng 1/4–1/2 cửa sổ · `masters-degree/data-science-roadmap/data-science-roadmap.html`
- DS-023 · Notes là dock không phủ; ghi chú gom theo bài · `masters-degree/data-science-roadmap/data-science-roadmap.html`
- DS-024 · Đạt một bài: pháo giấy, không tự nhảy bài · `masters-degree/data-science-roadmap/data-science-roadmap.html`
- DS-026 · Roadmap dùng chung thanh cuộn và ngăn kéo được với trang chính · `masters-degree/data-science-roadmap/tools/build-roadmap.mjs`, `masters-degree/data-science-roadmap/roadmap.html`
- DS-027 · Ngăn của roadmap là tầng không phủ, danh sách tự căn giữa · `masters-degree/data-science-roadmap/tools/build-roadmap.mjs`, `masters-degree/data-science-roadmap/roadmap.html`
- DS-028 · Đầu ngăn dùng chung kit, nền bằng nền trang, không dòng phụ thì cao bằng navbar · `masters-degree/data-science-roadmap/data-science-roadmap.html`, `masters-degree/data-science-roadmap/tools/build-roadmap.mjs`, `masters-degree/data-science-roadmap/roadmap.html`
- DS-029 · Đường đi của roadmap: các bước cách xa nhau, bước đã đạt viền xanh dương · `masters-degree/data-science-roadmap/tools/build-roadmap.mjs`, `masters-degree/data-science-roadmap/roadmap.html`
- DS-030 · Quiz cuối bài: carousel, chọn không tự chuyển câu, trả lời hết mới chấm · `masters-degree/data-science-roadmap/data-science-roadmap.html`, `masters-degree/data-science-roadmap/tools/build-roadmap.mjs`, `masters-degree/data-science-roadmap/roadmap.html`
- DS-031 · Ô quiz là card của kit, chỉ khác một bậc bóng · `masters-degree/data-science-roadmap/data-science-roadmap.html`
- DS-032 · Cổng trượt thì không lên web · `masters-degree/data-science-roadmap/tools/check.sh`
- DS-033 · Tài liệu chỉ ghi trạng thái hiện tại · `masters-degree/data-science-roadmap/CLAUDE.md`, `masters-degree/data-science-roadmap/docs/*.md`
- DS-034 · Thứ gì dùng lại, token hoá hay component hoá thì phải ghi vào tài liệu · `masters-degree/data-science-roadmap/`
- DS-035 · Kiểm hình là việc của agent; hỏi "có hiểu không" chỉ khi chủ trang đã học tới bài · `masters-degree/data-science-roadmap/data-science-roadmap.html`, `masters-degree/data-science-roadmap/tools/viz-check.mjs`
<!-- index:end -->

## DS-002 · Roadmap tự đứng một mình với người đọc
07/08/2026 · `masters-degree/data-science-roadmap/roadmap.html`, `masters-degree/data-science-roadmap/tools/build-roadmap.mjs`, `masters-degree/data-science-roadmap/tools/roadmap-summaries.json` · thay cho DS-001

`roadmap.html` là giáo trình ngắn tự chứa với người đọc: không link hay bản sao sang trang chính, không
đọc tiến độ của nó; phía build vẫn lấy trang chính làm nguồn. Mặc định chỉ hiện bước core; mỗi bước core
có mental model một câu, một hình, một ví dụ chạy được hoặc có số và một self-check có đáp án
(`G-ROADMAP-4`), mọi bản tóm tắt có vân tay nội dung (`G-ROADMAP-SUM`). Hero không hứa quá lượng chữ
thật, và hết mạch chính người đọc tự làm được một capstone nhỏ.

## DS-003 · Hình vẽ ở trang chính, roadmap chạy đúng khối đó
05/08/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html`, `masters-degree/data-science-roadmap/tools/build-roadmap.mjs`

Hình tương tác vẽ cho trang chính trước; `roadmap.html` chạy đúng khối đó vì bộ build trích code từ
trang chính, không vẽ bản riêng.

## DS-004 · Nội dung chữ nạp từ file ngoài, HTML chỉ còn giao diện
14/08/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html`, `masters-degree/data-science-roadmap/data/`

Hướng dài hạn: nội dung chữ nằm ở file dưới `data/`, HTML chỉ dựng design và layout; câu hỏi đã tách ra
`data/quiz.json`. Nội dung mới đặt ra ngoài ngay từ đầu, nhưng đừng tự khởi động việc tách nội dung bài
học ("tách content để tương lai tính").

## DS-005 · Tên file tiếng Anh, nội dung vẫn tiếng Việt
04/08/2026 · `masters-degree/data-science-roadmap/`

Mọi tên file trong thư mục này, kể cả file ghi chú trang tải về, là tiếng Anh; nội dung vẫn tiếng Việt.

## DS-006 · Luật hình thức có file riêng: docs/design.md
04/08/2026 · `masters-degree/data-science-roadmap/docs/design.md`

Câu "nó trông thế nào, nằm ở đâu" có file riêng `docs/design.md`, cạnh `editing.md` và `writing.md`.

## DS-008 · Thứ tự chặng hiện hành do chủ trang duyệt
05/08/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html` · thay cho DS-007

Thứ tự chặng đang chạy là kết quả hai lượt chủ trang duyệt: framing lên chặng 0, vòng đời dữ liệu trước
toán, product trước deep learning, họ bài toán sau product, `t-stack` thành `r-stack` ở chặng tra cứu.
Đừng tự xáo lại thứ tự chặng hay đảo cả giáo trình.

## DS-009 · Giữ f-store và q-analytics; không thêm nhãn cấp độ cho bài
04/08/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html`

Giữ bài `f-store` (ưu tiên skim) và `q-analytics`; không thêm nhãn Foundation / Applied / Advanced cho
bài. `f-store` là câu trả lời cho hội đồng về point-in-time correctness, `q-analytics` là bài duy nhất
vạch ranh giới analytics / predictive / causal, và mỗi bài đã có năm trục nhãn.

## DS-010 · Quiz phủ đủ kiến thức mạch chính của bài
14/08/2026 · `masters-degree/data-science-roadmap/data/quiz.json`

Bộ câu hỏi của mỗi bài phủ toàn bộ kiến thức mạch chính của bài ("tôi muốn nó đầy đủ"). Số câu theo
lượng nội dung, không theo định mức; đừng giảm câu cho vừa cái tên "Kiểm tra nhanh".

## DS-011 · Quiz chỉ trả lời được khi hiểu bài
15/08/2026 · `masters-degree/data-science-roadmap/data/quiz.json`

Câu hỏi và các lựa chọn phải buộc người đọc thật sự hiểu mới trả lời được, không đoán được bằng mẹo làm
bài: chọn lựa chọn dài nhất, loại từ tuyệt đối, nhớ chữ trong bài (`G-QUIZ-GUESS`).

## DS-013 · Một mép phải: cột nội dung bằng khổ chữ
04/08/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html`

Cột nội dung đúng bằng khổ chữ, nên chữ, code, card, alert, pager và hộp kết bài dừng ở cùng một mép;
chỉ bảng được tràn. Chủ trang chọn phương án này trong ba phương án kèm số đo, và không chọn hai bề rộng
(chữ hẹp, bảng và code rộng); đừng đề xuất lại khi không có lý do mới.

## DS-014 · Cột 1060px, chữ 14–15px
04/08/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html` · thay cho DS-012

`--ds-measure` 1060px, `--ds-fs` `clamp(14px, …, 15px)`, `--ds-wide` 1260px, `line-height` của `p`/`li`
1,8; khoảng 152 ký tự/dòng ở cửa sổ 1440px là cái giá đã chấp nhận để cột rộng hết chỗ và chữ nhỏ
(design.md §0.3). Đừng tự hẹp cột hay phóng chữ để cứu con số ký tự/dòng; muốn đổi `--ds-measure` hay
`--ds-fs` thì hỏi chủ trang.

## DS-016 · Thanh trên và chân trang nói tiếng Anh, lớp vỏ còn lại tiếng Việt
05/08/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html`, `masters-degree/data-science-roadmap/tools/build-roadmap.mjs` · thay cho DS-015

Mọi chữ trên thanh trên (nhãn nút, phụ đề thương hiệu, `title=`, `aria-label`, chữ do JS sinh) và ở chân
trang là tiếng Anh. Thanh bên, panel, `<title>`, nhãn ô tìm kiếm vẫn tiếng Việt (design.md §0.1).

## DS-017 · Hero của roadmap.html nói tiếng Anh
06/08/2026 · `masters-degree/data-science-roadmap/tools/build-roadmap.mjs`, `masters-degree/data-science-roadmap/roadmap.html`

Bốn ô hero của `roadmap.html` (`.rm-hero__h`, `__sub`, `__stats`, `__note`) nói tiếng Anh, số thập phân
kiểu Anh; vùng tiếng Anh của trang đó là thanh trên, hero và chân trang. Chỉ đúng bốn ô ấy: `<title>`,
meta, tên chặng, nhãn mục, các bản tóm tắt và hero của trang chính vẫn tiếng Việt.

## DS-018 · Chữ thương hiệu trên thanh trên là "Data Science"
29/09/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html`, `masters-degree/data-science-roadmap/tools/build-roadmap.mjs`, `masters-degree/data-science-roadmap/roadmap.html`

Thanh trên của cả hai trang ghi "Data Science". Chủ trang yêu cầu đổi lại từ "DS", bản rút gọn tạm từ 18/08.

## DS-019 · Đường nối stepper dùng --wb-border-strong
04/08/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html`

Đường nối giữa các mốc của `wb-steps` dùng `--wb-border-strong`, không dùng `--wb-border`: ở chế độ sáng
`--wb-border` chỉ khoảng 1,19:1, mà đường nối mang nghĩa "các mốc này là một chuỗi".

## DS-020 · Nút sao chép code chỉ là icon
04/08/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html`

Nút sao chép trên mỗi khối code chỉ có icon, không có nhãn chữ (design.md §5).

## DS-021 · Lớp vỏ điều hướng không cho bôi đen chữ, trừ ô tìm kiếm
05/08/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html`

Thanh trên, thanh bên và chân trang không cho bôi đen chữ; ô tìm kiếm vẫn chọn được chữ.

## DS-022 · Ngăn phụ và dock Notes kéo được, trong khoảng 1/4–1/2 cửa sổ
05/08/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html`

Ngăn phụ mặc định 1/3 cửa sổ, dock `Notes` mặc định 1/4; cả hai kéo được bằng cùng một cơ chế, trong
khoảng 1/4 → 1/2 cửa sổ. Mở lớp phủ thì khoá thanh cuộn của trang chính (design.md §0.5, §1.2).

## DS-023 · Notes là dock không phủ; ghi chú gom theo bài
05/08/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html`

Panel ghi chú là dock, không phải lớp phủ: mở ra thì trang vẫn cuộn, bấm, chọn chữ được. Danh sách ghi
chú gom nhóm theo bài, tiêu đề nhóm là tên bài, và vẫn hiện hết chứ không lọc theo bài đang mở
(design.md §0.5).

## DS-024 · Đạt một bài: pháo giấy, không tự nhảy bài
06/08/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html`

Bài lần đầu chạm mức cao nhất thì bắn pháo giấy, và trang ở lại bài đó. Pháo giấy rơi chậm, mảnh đầu
hiện ngay, hiệu ứng dài và thưa; đừng tăng `vy`/`g` để sửa độ trễ hay thời lượng, và đừng đổi dáng hiệu
ứng khi chưa hỏi (design.md §9).

## DS-026 · Roadmap dùng chung thanh cuộn và ngăn kéo được với trang chính
05/08/2026 · `masters-degree/data-science-roadmap/tools/build-roadmap.mjs`, `masters-degree/data-science-roadmap/roadmap.html` · thay cho DS-025

`roadmap.html` dùng cùng component thanh cuộn với trang chính; ngăn phải mặc định 1/3 cửa sổ và kéo
được, bằng đúng hàm kéo của trang chính (trích lúc build). Code đang để 47% (`--rm-drawer-w`) mà chủ
trang chưa xác nhận: chờ ở HANDOFF.

## DS-027 · Ngăn của roadmap là tầng không phủ, danh sách tự căn giữa
06/08/2026 · `masters-degree/data-science-roadmap/tools/build-roadmap.mjs`, `masters-degree/data-science-roadmap/roadmap.html`

Ở `roadmap.html`, mở ngăn thì danh sách bài căn giữa trong phần còn thấy và không có lớp phủ
bấm-để-đóng: ngăn đóng bằng ✕ hoặc Esc, trang phía sau vẫn cuộn được. Chỉ áp cho roadmap; ngăn phụ của
trang chính giữ lớp phủ (design.md §1.2).

## DS-028 · Đầu ngăn dùng chung kit, nền bằng nền trang, không dòng phụ thì cao bằng navbar
06/08/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html`, `masters-degree/data-science-roadmap/tools/build-roadmap.mjs`, `masters-degree/data-science-roadmap/roadmap.html`

Ngăn của roadmap dùng đúng đầu ngăn (nav, nút ✕) của trang chính; nền ngăn là màu nền trang, không phải
trắng tinh. Đầu ngăn không có dòng phụ thì cao bằng navbar; dòng phụ đang có ở đâu thì giữ, và luật
chiều cao không áp cho popup toán (design.md §1.2).

## DS-029 · Đường đi của roadmap: các bước cách xa nhau, bước đã đạt viền xanh dương
05/08/2026 · `masters-degree/data-science-roadmap/tools/build-roadmap.mjs`, `masters-degree/data-science-roadmap/roadmap.html`

Các bước trên đường đi của roadmap giãn cách xa; mốc của bước đã đạt là viền xanh dương trên nền trắng,
không phải chip xanh lá đặc (xanh dương là màu ưu tiên của chủ trang).

## DS-030 · Quiz cuối bài: carousel, chọn không tự chuyển câu, trả lời hết mới chấm
14/08/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html`, `masters-degree/data-science-roadmap/tools/build-roadmap.mjs`, `masters-degree/data-science-roadmap/roadmap.html`

Mỗi bài có quiz ở dưới, dạng carousel một câu mỗi lần, tua trái phải; chọn đáp án không tự chuyển câu,
trả lời hết mới chấm. Ở `roadmap.html` quiz mở bằng popup theo khuôn modal của `facts/index.html`
(design.md §10).

## DS-031 · Ô quiz là card của kit, chỉ khác một bậc bóng
14/08/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html`

Ô "Kiểm tra nhanh" giữ ngôn ngữ card của kit và chỉ nổi hơn các khối khác bằng một bậc bóng mạnh và rộng
hơn; không viền đen 2px, không neumorphism. Chỉ áp cho trang chính; popup ở `roadmap.html` để nguyên
(design.md §10).

## DS-032 · Cổng trượt thì không lên web
04/08/2026 · `masters-degree/data-science-roadmap/tools/check.sh`

Chủ trang: "chặn push nếu cổng trượt". Nay `tools/check.sh` chạy lúc commit và ở CI, và deploy chờ CI
xanh (REPO-014, REPO-017); không còn hook pre-push riêng.

## DS-033 · Tài liệu chỉ ghi trạng thái hiện tại
04/08/2026 · `masters-degree/data-science-roadmap/CLAUDE.md`, `masters-degree/data-science-roadmap/docs/*.md`

`CLAUDE.md` và `docs/` chỉ ghi luật và con số đang dùng; cái đổi theo thời gian vào `HISTORY.md` hoặc sổ
quyết định này ("docs chỉ để ghi tài liệu, cái gì đổi theo thời gian thì vào changelog").

## DS-034 · Thứ gì dùng lại, token hoá hay component hoá thì phải ghi vào tài liệu
05/08/2026 · `masters-degree/data-science-roadmap/`

Token, component hay hàm dùng chung nào được tạo ra hoặc dùng lại thì phải có mặt trong `docs/design.md`
hoặc `CLAUDE.md` ("cái gì reuse/tokenize/componentize đều phải document").

## DS-035 · Kiểm hình là việc của agent; hỏi "có hiểu không" chỉ khi chủ trang đã học tới bài
20/08/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html`, `masters-degree/data-science-roadmap/tools/viz-check.mjs`

Hình có đọc được không (nhãn đè, bị cắt, chú giải lệch) là việc agent tự vẽ và tự kiểm bằng
`tools/viz-check.mjs`; đừng giao chủ trang kiểm UI của hình. Hình có dạy được không chỉ có bằng chứng
khi chủ trang học tới bài đó; đừng hỏi trước.
