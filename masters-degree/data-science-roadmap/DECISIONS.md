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
- DS-018 · Chữ thương hiệu trên thanh trên tạm là "DS" · `masters-degree/data-science-roadmap/data-science-roadmap.html`, `masters-degree/data-science-roadmap/tools/build-roadmap.mjs`, `masters-degree/data-science-roadmap/roadmap.html`
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

roadmap là một giáo trình ngắn chạy song song với trang DS, và phía người đọc phải tự chứa hoàn toàn: không cần mở, không cần biết tới, không trỏ sang trang DS. Phía build vẫn lấy trang DS làm nguồn để chống lệch — đó là chi tiết triển khai, không phải quan hệ lộ ra cho người đọc. Đích gồm bảy gạch: mặc định chỉ hiện các bước `core`; cổng kiểm vân tay của mọi bản tóm tắt; hero không hứa quá so với lượng chữ thật; mỗi bước core có đủ bốn vật (mental model một câu · một hình · một ví dụ chạy được hoặc có số · một self-check có đáp án); bài code có code tối thiểu chạy được, bài khái niệm có ví dụ số nhỏ; sau mạch chính người đọc tự làm được một capstone nhỏ; không còn link hay bản sao "bài đầy đủ", không dựa vào tiến độ hay ngữ cảnh của trang DS.
Vì: thiếu ví dụ và self-check thì trang chỉ tạo nhận biết — đọc xong không kiểm được mình hiểu chưa, và cách gọi trung thực khi đó là visual syllabus chứ không phải khoá học.
Đừng thêm lại link hay bản sao nội dung sang trang DS, hoặc đọc ké tiến độ của trang DS.
Chi tiết: CLAUDE.md (§4, cổng G-ROADMAP-4)
Nguồn: 2ce5148, afcb841

## DS-003 · Hình vẽ ở trang chính, roadmap chạy đúng khối đó
05/08/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html`, `masters-degree/data-science-roadmap/tools/build-roadmap.mjs`

hình tương tác được vẽ cho trang DS trước, rồi roadmap chạy đúng khối đó — bộ build trích code khối từ trang chính — chứ không vẽ một bản riêng cho roadmap.
Vì: code của mỗi khối chỉ có một bản (CLAUDE.md §2 luật 3): sửa hình ở trang chính là roadmap đổi theo ở lần build sau.
Nguồn: 1c96a6f, 52a15f9

## DS-004 · Nội dung chữ nạp từ file ngoài, HTML chỉ còn giao diện
14/08/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html`, `masters-degree/data-science-roadmap/data/`

hướng dài hạn là nội dung chữ nằm ở file ngoài dưới `data/`, còn HTML chỉ dựng design + layout. Câu hỏi trắc nghiệm đã tách (`data/quiz.json`). Nội dung bài học tách sau — chủ trang: "tách content để tương lai tính". Nội dung MỚI thì đặt ra ngoài ngay từ đầu.
Vì: cả người lẫn công cụ phải nạp toàn bộ nội dung chỉ để sửa một dòng layout, và file quá lớn thì công cụ không mở nổi.
Đừng tự khởi động việc tách nội dung bài học khỏi HTML.
Chi tiết: CLAUDE.md (§2, luật 3)
Nguồn: f993574

## DS-005 · Tên file tiếng Anh, nội dung vẫn tiếng Việt
04/08/2026 · `masters-degree/data-science-roadmap/`

mọi tên file trong thư mục này — tài liệu, file ghi chú mà trang tải về — là tiếng Anh: "tên các file phải là tiếng anh hết chứ". Nội dung trong file vẫn tiếng Việt.
Nguồn: 92abad0

## DS-006 · Luật hình thức có file riêng: docs/design.md
04/08/2026 · `masters-degree/data-science-roadmap/docs/design.md`

câu "nó trông thế nào, nằm ở đâu" có một file tài liệu riêng, `docs/design.md`, cạnh `editing.md` và `writing.md`. Chủ trang yêu cầu thêm file này giữa phiên.
Nguồn: ada32de

## DS-008 · Thứ tự chặng hiện hành do chủ trang duyệt
05/08/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html` · thay cho DS-007

thứ tự chặng đang chạy là kết quả hai lượt chủ trang duyệt. Ngày 04/08: chặng họ bài toán xuống sau chặng product, `t-stack` thành `r-stack` ở chặng tra cứu. Ngày 05/08: chủ trang gỡ hoãn DS-007 với chỉ thị "option nào khiến nội dung trở nên tốt nhất thì làm, không cần quan tâm đến effort" — framing lên chặng 0, vòng đời dữ liệu trước toán, product trước deep learning.
Đừng tự xáo lại thứ tự chặng hay đảo cả giáo trình — mọi lượt đổi cho tới nay đều do chủ trang duyệt.
Nguồn: 9b554f7, 0511df2

## DS-009 · Giữ f-store và q-analytics; không thêm nhãn cấp độ cho bài
04/08/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html`

giữ bài `f-store` (ưu tiên skim) và `q-analytics`; không thêm nhãn Foundation / Applied / Advanced cho bài. Ngày 20/08 chủ trang giao agent tự chọn phương án cho loại nhãn đó ("cái này bạn tự chọn phương án tốt nhất cho project Data science này"), và mục ấy được xoá khỏi backlog.
Vì: nội dung thật của `f-store` là một câu trả lời cho hội đồng cộng point-in-time correctness; `q-analytics` là bài duy nhất vạch ranh giới analytics / predictive / causal. Mỗi bài đã mang năm trục nhãn, trục thứ sáu chỉ thêm nhiễu.
Nguồn: 4387df4, 7817a7c

## DS-010 · Quiz phủ đủ kiến thức mạch chính của bài
14/08/2026 · `masters-degree/data-science-roadmap/data/quiz.json`

bộ câu hỏi của mỗi bài phải phủ toàn bộ kiến thức mạch chính của bài đó — "tôi muốn nó đầy đủ". Số câu đi theo lượng nội dung của bài, không theo định mức, và không giảm số câu cho vừa cái tên "Kiểm tra nhanh".
Chi tiết: docs/editing.md (việc 7)
Nguồn: 43eb16d

## DS-011 · Quiz chỉ trả lời được khi hiểu bài
15/08/2026 · `masters-degree/data-science-roadmap/data/quiz.json`

câu hỏi, đáp án và các lựa chọn đi kèm phải "làm sao cho người đọc phải thực sự hiểu kiến thức thì mới trả lời được" — không đoán được bằng mẹo làm bài (chọn lựa chọn dài nhất, loại từ tuyệt đối, nhớ chữ trong bài).
Chi tiết: CLAUDE.md (§4, cổng G-QUIZ-GUESS)
Nguồn: aa999f7, 1b80e93

## DS-013 · Một mép phải: cột nội dung bằng khổ chữ
04/08/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html`

cột nội dung đúng bằng khổ chữ, nên chữ, code, card, alert, pager và hộp kết bài dừng ở cùng một mép — chủ trang chọn phương án này trong ba phương án kèm số đo. Về sau chủ trang cũng không chọn đề xuất tách hai bề rộng (chữ hẹp, bảng và code rộng).
Vì: cột rộng hơn chữ thì mọi đoạn văn chừa một dải trống bên phải trong khi bảng và code chạm mép, và khoảng so le đó đọc ra "layout hỏng".
Đừng đề xuất lại hai bề rộng khi không có lý do mới.
Chi tiết: CLAUDE.md (§10)
Nguồn: ada32de

## DS-014 · Cột 1060px, chữ 14–15px
04/08/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html` · thay cho DS-012

`--ds-measure` 1060px, `--ds-fs` `clamp(14px, …, 15px)`, `--ds-wide` 1260px, `line-height` của `p`/`li` 1,8. Khoảng 152 ký tự/dòng ở cửa sổ 1440px là có chủ ý: đổi lấy "cột rộng hết chỗ + chữ nhỏ". Muốn đổi `--ds-measure` hay `--ds-fs` thì hỏi chủ trang trước.
Vì: chủ trang muốn hết khoảng trống ("content bé quá nên còn nhiều vacuum"), lấy bề rộng bảng làm mốc cho cột, và muốn chữ nhỏ ("13, 14 hoặc 15 cho content là dễ đọc lắm rồi"). Khi một phiên tự hạ cột về 660px để đạt trần 90 ký tự/dòng, chủ trang bắt đảo lại ngay.
Đừng tự hẹp cột hay tự phóng chữ để "cứu" con số ký tự/dòng — ba đại lượng khoá nhau, và mỗi phiên tự chọn một cặp khác là trang bị đổi qua đổi lại.
Chi tiết: docs/design.md (§0.3)
Nguồn: 765756a, 1b52314, 8c5cbff

## DS-016 · Thanh trên và chân trang nói tiếng Anh, lớp vỏ còn lại tiếng Việt
05/08/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html`, `masters-degree/data-science-roadmap/tools/build-roadmap.mjs` · thay cho DS-015

mọi chữ trên thanh trên — nhãn nút, phụ đề thương hiệu, `title=`, `aria-label`, chữ do JS sinh — là tiếng Anh; chân trang cũng tiếng Anh. Thanh bên, panel, `<title>`, nhãn ô tìm kiếm vẫn tiếng Việt. Ba bước: nhãn nút giao diện `Light`/`Dark` theo yêu cầu trực tiếp (04/08), rồi "mọi chữ trên thanh trên phải là tiếng Anh" (04/08), rồi chân trang (05/08).
Vì: thanh trên là vùng nhỏ và quen mắt nhất của trang; chân trang là dòng ký tên và điều hướng cuối. Cả hai không phải chỗ dạy.
Chi tiết: docs/design.md (§0.1)
Nguồn: 8c5cbff, 42a856b, da2a086

## DS-017 · Hero của roadmap.html nói tiếng Anh
06/08/2026 · `masters-degree/data-science-roadmap/tools/build-roadmap.mjs`, `masters-degree/data-science-roadmap/roadmap.html`

bốn ô hero của `roadmap.html` (`.rm-hero__h`, `__sub`, `__stats`, `__note`) nói tiếng Anh, số thập phân kiểu Anh (`106.5 hours`); vùng tiếng Anh của trang đó là thanh trên + hero + chân trang. Chỉ đúng bốn ô chủ trang gửi — "chỉ cái phần tôi gửi bạn thôi": `<title>`, meta, tên chặng, nhãn mục và các bản tóm tắt vẫn tiếng Việt, hero của trang chính không đổi.
Vì: hero là khung của trang, phần dạy là các bản tóm tắt ở giữa. Chủ trang đã yêu cầu hero tiếng Anh từ 05/08; một phiên soát trang dịch ngược nó về tiếng Việt theo luật cũ (luật lúc ấy chỉ kể hai vùng tiếng Anh), và chủ trang bắt trả lại.
Đừng dịch hero về tiếng Việt, hay dịch thêm vùng nào khác của roadmap sang tiếng Anh.
Chi tiết: docs/design.md (§0.1)
Nguồn: 82bd55f, 6942b6d

## DS-018 · Chữ thương hiệu trên thanh trên tạm là "DS"
18/08/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html`, `masters-degree/data-science-roadmap/tools/build-roadmap.mjs`, `masters-degree/data-science-roadmap/roadmap.html`

chữ thương hiệu "Data Science" trên thanh trên của cả hai trang rút thành "DS", tạm thời ("tạm thời thôi, 1 tuần sau tôi sẽ revert lại"). Ngày 20/08 chủ trang hoãn việc đổi lại: "revert chữ navbar DS → Data Science để sau".
Đừng tự đổi lại "Data Science" khi chủ trang chưa gọi; hỏi lại chuyện này mỗi phiên.
Nguồn: c1089ff, 60adbf2, 232d62e

## DS-019 · Đường nối stepper dùng --wb-border-strong
04/08/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html`

đường nối giữa các mốc của `wb-steps` dùng `--wb-border-strong` (bậc kế tiếp có sẵn của kit), không dùng `--wb-border`.
Vì: `--wb-border` ở chế độ sáng chỉ khoảng 1,19:1, sát ngưỡng thấy được. Đường nối là thứ duy nhất nói "các mốc này là MỘT chuỗi" — nó mang nghĩa, không chỉ ngăn cách như hairline của bảng.
Đừng kéo về `--wb-border` cho "nhất quán hairline".
Nguồn: f96980e

## DS-020 · Nút sao chép code chỉ là icon
04/08/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html`

nút sao chép trên mỗi khối code chỉ có icon, không có nhãn chữ — "chép để copy code vô nghĩa quá, để icon đi".
Chi tiết: docs/design.md (§5)
Nguồn: ada32de

## DS-021 · Lớp vỏ điều hướng không cho bôi đen chữ, trừ ô tìm kiếm
05/08/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html`

thanh trên, thanh bên và chân trang không cho bôi đen chữ; riêng ô tìm kiếm vẫn chọn được chữ.
Vì: đó là chỗ để bấm, không phải chỗ để chép; ô tìm kiếm là chỗ người dùng gõ và sửa chữ.
Nguồn: da2a086

## DS-022 · Ngăn phụ và dock Notes kéo được, trong khoảng 1/4–1/2 cửa sổ
05/08/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html`

ngăn phụ mặc định 1/3 cửa sổ và kéo được, bằng đúng cơ chế kéo của dock `Notes`; mở lớp phủ thì khoá thanh cuộn của trang chính ("thanh cuộn của main web") — 04/08. Từ 05/08, cả dock `Notes` lẫn ngăn phụ kéo trong khoảng sàn 1/4 → trần 1/2 cửa sổ; chủ trang chỉ đổi giới hạn kéo, không đổi bề rộng mặc định.
Chi tiết: docs/design.md (§0.5, §1.2)
Nguồn: f96980e, da2a086

## DS-023 · Notes là dock không phủ; ghi chú gom theo bài
05/08/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html`

panel ghi chú là dock chứ không phải lớp phủ — "khi đang note thì vẫn phải cho thao tác + đọc được content chính": mở ra thì trang vẫn cuộn, bấm, chọn chữ được (04/08). Danh sách ghi chú gom nhóm theo bài, tiêu đề nhóm là tên bài, vẫn hiện hết chứ không lọc theo bài đang mở (05/08).
Vì: một phiên trước đó đã cố ý không gom theo bài để giữ thứ tự thời gian; chủ trang yêu cầu gom.
Đừng quay về danh sách phẳng, hay lọc theo bài đang mở.
Chi tiết: docs/design.md (§0.5)
Nguồn: 765756a, da2a086

## DS-024 · Đạt một bài: pháo giấy, không tự nhảy bài
06/08/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html`

khi một bài lần đầu chạm mức cao nhất thì bắn pháo giấy, và trang ở lại bài đó chứ không tự nhảy sang bài sau (05/08). Pháo giấy rơi chậm — vận tốc giảm 75% so với bản đầu (05/08); mảnh đầu hiện ngay, không phải chờ (06/08); hiệu ứng kéo dài hơn và thưa hơn 50% (06/08).
Đừng tăng `vy`/`g` để sửa độ trễ hay thời lượng — rơi chậm là một yêu cầu riêng; đổi dáng hiệu ứng (bắn từ dưới lên, từ hai bên) khi chưa hỏi — các yêu cầu chỉ nói về độ trễ, độ dài và mật độ.
Chi tiết: docs/design.md (§9)
Nguồn: da2a086, 9d4b433, 6e19f14, d63b33a

## DS-026 · Roadmap dùng chung thanh cuộn và ngăn kéo được với trang chính
05/08/2026 · `masters-degree/data-science-roadmap/tools/build-roadmap.mjs`, `masters-degree/data-science-roadmap/roadmap.html` · thay cho DS-025

`roadmap.html` dùng cùng component thanh cuộn với trang chính; ngăn phải mặc định 1/3 cửa sổ và kéo chỉnh được, bằng đúng hàm kéo của trang chính (trích lúc build, không chép).
Nguồn: 3d3f95c

Chưa khớp với code: phiên 2026-08-17 (z) nới bề rộng mặc định của ngăn lên 47% cửa sổ để không
khối code nào trong ngăn phải cuộn ngang (commit afcb841). Chủ trang chưa xác nhận con số đó —
đang chờ ở HANDOFF.md, mục CHỜ CHỦ TRANG.

## DS-027 · Ngăn của roadmap là tầng không phủ, danh sách tự căn giữa
06/08/2026 · `masters-degree/data-science-roadmap/tools/build-roadmap.mjs`, `masters-degree/data-science-roadmap/roadmap.html`

ở `roadmap.html`, mở ngăn thì danh sách bài căn giữa trong phần còn thấy, và bỏ lớp phủ bấm-để-đóng ("bỏ dismissable layer đi"): ngăn đóng bằng ✕ hoặc Esc, trang phía sau vẫn cuộn được.
Đừng bỏ lớp phủ của ngăn phụ ở trang chính theo — yêu cầu chỉ nói "ở màn road map".
Chi tiết: docs/design.md (§1.2)
Nguồn: 0b9f0d4

## DS-028 · Đầu ngăn dùng chung kit, nền bằng nền trang, không dòng phụ thì cao bằng navbar
06/08/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html`, `masters-degree/data-science-roadmap/tools/build-roadmap.mjs`, `masters-degree/data-science-roadmap/roadmap.html`

ngăn của roadmap dùng lại đúng đầu ngăn (nav, nút ✕) của trang DS; nền ngăn là màu nền chính của trang, không phải trắng tinh; đầu ngăn nào không có dòng phụ thì cao bằng navbar, còn dòng phụ đang có ở đâu thì giữ nguyên ở đó.
Đừng xoá dòng phụ để đạt chiều cao navbar; áp luật chiều cao này cho popup toán — yêu cầu nói "nav trong drawer".
Chi tiết: docs/design.md (§1.2)
Nguồn: 227838e, 4b95a33, 3f66aaf

## DS-029 · Đường đi của roadmap: các bước cách xa nhau, bước đã đạt viền xanh dương
05/08/2026 · `masters-degree/data-science-roadmap/tools/build-roadmap.mjs`, `masters-degree/data-science-roadmap/roadmap.html`

các bước trên đường đi giãn cách xa hơn hẳn bản đầu (chủ trang yêu cầu nới hai lượt); mốc của bước đã đạt là viền xanh dương trên nền trắng, không phải chip xanh lá đặc — chủ trang chọn xanh dương làm màu ưu tiên.
Nguồn: 82bd55f

## DS-030 · Quiz cuối bài: carousel, chọn không tự chuyển câu, trả lời hết mới chấm
14/08/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html`, `masters-degree/data-science-roadmap/tools/build-roadmap.mjs`, `masters-degree/data-science-roadmap/roadmap.html`

mỗi bài có câu hỏi trắc nghiệm ở dưới, dạng carousel (một câu mỗi lần, tua trái / phải); chọn đáp án KHÔNG tự chuyển câu; trả lời hết mới chấm điểm. Ở `roadmap.html` câu hỏi không nằm dưới bài mà mở bằng popup, theo khuôn modal của `facts/index.html`.
Đừng cho tự nhảy câu, hay chấm ngay từng câu.
Chi tiết: docs/design.md (§10)
Nguồn: 8964145

## DS-031 · Ô quiz là card của kit, chỉ khác một bậc bóng
14/08/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html`

ô "Kiểm tra nhanh" giữ đúng ngôn ngữ card của kit, và chỉ nổi hơn các khối khác bằng một bậc bóng mạnh và rộng hơn — "giờ chỉ cần shadow mạnh hơn rộng hơn cho card này". Không viền đen 2px, không neumorphism: cả hai đã được thử và chủ trang bỏ trong cùng phiên. Chỉ áp cho trang DS; popup ở `roadmap.html` để nguyên.
Chi tiết: docs/design.md (§10)
Nguồn: f3c0df2, 7bbfe18, 51ed4f6, de79bf0

## DS-032 · Cổng trượt thì không lên web
04/08/2026 · `masters-degree/data-science-roadmap/tools/check.sh`

Chủ trang: "chặn push nếu cổng trượt". Nay `tools/check.sh` chạy lúc commit và ở CI, và deploy chờ CI
xanh (REPO-014, REPO-017); không còn hook pre-push riêng.

## DS-033 · Tài liệu chỉ ghi trạng thái hiện tại
04/08/2026 · `masters-degree/data-science-roadmap/CLAUDE.md`, `masters-degree/data-science-roadmap/docs/*.md`

`CLAUDE.md` và các file trong `docs/` chỉ ghi tài liệu — luật và con số đang dùng; cái gì đổi theo thời gian (ai chốt gì ngày nào, bản trước sai ra sao) thì vào changelog. Lời chủ trang: "docs chỉ để ghi tài liệu, cái gì đổi theo thời gian thì vào changelog".
Nguồn: 70b4d84

Changelog của thư mục này nay chia hai: nhật ký phiên ở HISTORY.md, quyết định của chủ trang ở
file này.

## DS-034 · Thứ gì dùng lại, token hoá hay component hoá thì phải ghi vào tài liệu
05/08/2026 · `masters-degree/data-science-roadmap/`

nguyên tắc chủ trang xác nhận: "cái gì reuse/tokenize/componentize đều phải document" — token, component hay hàm dùng chung nào được tạo ra hoặc dùng lại thì phải có mặt trong `docs/design.md` hoặc `CLAUDE.md`.
Nguồn: da2a086

## DS-035 · Kiểm hình là việc của agent; hỏi "có hiểu không" chỉ khi chủ trang đã học tới bài
20/08/2026 · `masters-degree/data-science-roadmap/data-science-roadmap.html`, `masters-degree/data-science-roadmap/tools/viz-check.mjs`

hình có đọc được không — nhãn đè, bị cắt, chú giải lệch với hình — là việc agent tự vẽ và tự kiểm, không giao chủ trang "kiểm tra UI của diagram". Hình có dạy được không thì chỉ có bằng chứng khi chủ trang học tới bài đó; không hỏi trước.
Vì: lời chủ trang: "cái này tôi tưởng khi nào học tới thì mới trả lời được chứ, giờ bạn hỏi thì tôi chịu"; "tôi không hiểu vì sao bạn muốn tôi review mấy cái này, cái này như kiểu kiểm tra UI của diagram vậy"; "vì sao bạn không tự vẽ và tự kiểm tra được à". Phần kiểm được bằng máy đã thành `tools/viz-check.mjs`.
Chi tiết: CLAUDE.md (§3 viz-check, §13 sổ học)
Nguồn: 6ac593b, f259745
