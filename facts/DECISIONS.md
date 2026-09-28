# Quyết định — facts/

<!-- decisions: prefix=FACTS; nhóm=nội dung, cấu trúc, quy trình -->

Những gì chủ trang đã chốt cho thư viện fact và truyện. Luật đang áp dụng (cổng, ngưỡng, khuôn
dữ liệu) nằm ở [CLAUDE.md](CLAUDE.md); file này ghi ai chốt, khi nào, vì sao, và áp tới đâu.
Nhật ký các đợt rà ở [HISTORY.md](HISTORY.md), việc dở ở [HANDOFF.md](HANDOFF.md).

Muốn đảo một mục thì hỏi chủ trang trước. Đảo xong thì giữ cả hai mục: mục cũ ghi *"đã thay
bằng …"*, mục mới ghi *"Thay cho: …"*. Tra theo file: `python3 tools/decisions.py find <đường dẫn>`.

<!-- index:start -->
**nội dung**
- FACTS-002 — Fact phải tự chứa: người 15 tuổi chưa học ngành đó đọc là hiểu · `facts/data/*.json`, `facts/tools/factlint.py`
- FACTS-003 — Fact đúng mà đọc xong không cầm được gì thì cũng loại · `facts/data/*.json`
- FACTS-004 — Fact sửa huyền thoại: tóm tắt nói cái đúng, không kể lịch sử cái sai · `facts/data/*.json`, `facts/tools/factlint.py`
- FACTS-005 — Thư viện là nguồn học tập, đọc không thấy học thuật; có thêm truyện · `facts/`
- FACTS-008 — Đích quy mô: khoảng 3.000 fact và 500 truyện · `facts/data/`
- FACTS-009 — Truyện: không tự bịa, nguồn chính thống, được nhiều người công nhận · `facts/data/chuyen/*.json`, `facts/data/manifest.json`, `facts/tools/factlint.py`
- FACTS-010 — Thêm truyện Sherlock Holmes, truyện ứng xử có thật, truyện về tâm lý học · `facts/data/chuyen/*.json`, `facts/data/manifest.json`
- FACTS-011 — Fact ưu tiên ngắn gọn: `q` và `d` tuỳ chọn, không có sàn độ dài · `facts/data/*.json`, `facts/data/manifest.json`, `facts/tools/factlint.py`

**cấu trúc**
- FACTS-007 — Truyện có trục phân loại riêng và nhóm riêng trên thanh chủ đề · `facts/data/manifest.json`, `facts/data/chuyen/*.json`, `facts/app.js`, `facts/index.html`, `facts/tools/factlint.py`

**quy trình**
- FACTS-001 — Một lỗi được chỉ ra là mẫu của cả một lớp lỗi: sửa cổng, rồi rà cả thư viện · `facts/`
- FACTS-006 — Việc chính là thêm truyện, thêm fact và sửa diễn giải, từ nguồn uy tín · `facts/`
<!-- index:end -->

### FACTS-001 — Một lỗi được chỉ ra là mẫu của cả một lớp lỗi: sửa cổng, rồi rà cả thư viện
- **Ngày:** 12/08/2026
- **Phạm vi:** facts/
- **Nhóm:** quy trình
- **Trạng thái:** đang áp dụng
- **Quyết định:** Khi chủ trang chỉ vào một fact hỏng, việc cần làm không phải là sửa riêng fact
  đó. Chẩn đoán cơ chế của lỗi, đo lớp lỗi ấy trên toàn thư viện trước khi viết luật, nối luật
  vào `factlint.py` (thường ở mức XEM), rà sạch danh sách nó sinh ra, rồi mới báo xong. Rà toàn
  bộ thư viện, không rà theo từng cụm.
- **Vì sao:** chủ trang không muốn làm người review. Sửa đúng một fact rồi báo xong là trả lại
  việc review cho chủ trang. Hai lần liên tiếp trong ngày, phản hồi sau khi agent sửa một fact
  đều là *"còn nhiều chỗ… như thế này => cần phải update gate/hook, sau đó rà soát lại toàn bộ
  fact"*.
- **Đừng:** viết luật trước khi đo — sáu luật nghe hợp lý đã bị số liệu bác (CLAUDE.md §1.6).
  Đừng coi cổng im là xong: sau khi cổng sạch vẫn phải đọc tay các cụm dễ nhiễm.
- **Nguồn:** phiên *Đợt rà 12/08/2026* (commit ef5badf, 173e9a5); memory
  `facts-fix-the-gate-not-the-instance` (máy chủ repo).

### FACTS-002 — Fact phải tự chứa: người 15 tuổi chưa học ngành đó đọc là hiểu
- **Ngày:** 12/08/2026
- **Phạm vi:** facts/data/*.json, facts/tools/factlint.py
- **Nhóm:** nội dung
- **Trạng thái:** đang áp dụng
- **Quyết định:** Fact chỉ đọc được khi người đọc đã biết thuật ngữ của ngành thì không có người
  đọc nào — viết lại bằng lời thường hoặc bỏ. Phép thử: một người 15 tuổi chưa học ngành đó đọc
  xong có nắm được không.
- **Vì sao:** chủ trang gặp `sh-207` (*"Ngưỡng 0,05 là một lựa chọn tuỳ tiện do Ronald Fisher đề
  xuất…"*) và chỉ ra rằng câu đó chỉ đọc được nếu đã biết p-value là gì — mà người đã biết thì
  không cần fact.
- **Nguồn:** phiên *Đợt rà 12/08/2026* (commit ef5badf). Luật và cổng `thuat-ngu`: CLAUDE.md §1.5.

### FACTS-003 — Fact đúng mà đọc xong không cầm được gì thì cũng loại
- **Ngày:** 12/08/2026
- **Phạm vi:** facts/data/*.json
- **Nhóm:** nội dung
- **Trạng thái:** đang áp dụng
- **Quyết định:** Qua được ba cổng thế giới / mỏ neo / một câu chưa đủ: người đọc phải cầm về
  được một điều về thế giới. Fact định nghĩa một đại lượng hay một thước đo (*"số cần điều trị
  là gì"*) phải viết lại thành một phép đo cụ thể bằng chính thước đo ấy.
- **Vì sao:** chủ trang chỉ vào `sh-202`: *"đây đúng là fact thật, tôi công nhận, nhưng fact này
  có giúp ích gì được cho tôi đâu... chẳng ai cần biết cái này"*. Ba cổng ở §1 lọc tính đúng,
  không lọc tính dùng được.
- **Nguồn:** phiên 12/08/2026, commit f4b7fec (`sh-202` gộp vào `sh-125`, viết lại thành NNT đo
  được của aspirin phòng ngừa); memory `facts-utility-gate` (máy chủ repo). Luật: CLAUDE.md §1.2.

### FACTS-004 — Fact sửa huyền thoại: tóm tắt nói cái đúng, không kể lịch sử cái sai
- **Ngày:** 24/08/2026
- **Phạm vi:** facts/data/*.json, facts/tools/factlint.py
- **Nhóm:** nội dung
- **Trạng thái:** đang áp dụng
- **Quyết định:** Fact sửa một huyền thoại phát biểu điều đúng, và phần tóm tắt diễn giải chính
  điều đó. Nguồn gốc của niềm tin sai — ai dịch sai, sách nào in bao lâu — chỉ được làm câu
  phụ, không được chiếm trọn phần tóm tắt.
- **Vì sao:** chủ trang gặp `ct-209` (bản đồ vị giác) và hỏi: *"Tôi cần biết lỗi dịch sách giáo
  khoa để làm gì? Nếu như thế này thì bạn chỉ cần diễn giải là 'Lưỡi cảm nhận cả năm vị ở mọi
  vùng' tức là mọi vùng của lưỡi đều có thể cảm nhận cả 5 vị."*
- **Nguồn:** phiên *Đợt rà 24/08/2026 (b)* (commit 79b5327, de9eff2). Luật và hai cổng
  `t-phat-bieu-cai-sai`, `s-khong-ve-the-gioi`: CLAUDE.md §1.2.

### FACTS-005 — Thư viện là nguồn học tập, đọc không thấy học thuật; có thêm truyện
- **Ngày:** 24/08/2026
- **Phạm vi:** facts/
- **Nhóm:** nội dung
- **Trạng thái:** đang áp dụng
- **Quyết định:** Mục tiêu của thư viện là một nguồn học tập kiểu *Mười vạn câu hỏi vì sao*:
  mỗi lần đọc là học thêm được một thứ, và đọc không thấy học thuật. Truyện ngắn được nhận làm
  loại nội dung thứ hai, bên cạnh fact.
- **Vì sao:** chủ trang thấy fact lấy từ báo và paper *"đọc ra rất học thuật"*, *"rất khó đọc"*.
- **Nguồn:** phiên *Đợt 24/08/2026 (c)* (commit 40892f9, 9174a7c, 6f8d0eb). Luật: CLAUDE.md §1.8
  (tóm tắt kể thế giới, không kể ai tìm ra) và §7 (Truyện).

### FACTS-006 — Việc chính là thêm truyện, thêm fact và sửa diễn giải, từ nguồn uy tín
- **Ngày:** 24/08/2026
- **Phạm vi:** facts/
- **Nhóm:** quy trình
- **Trạng thái:** đang áp dụng
- **Quyết định:** Thứ tự ưu tiên: bổ sung truyện ngắn, bổ sung fact, sửa lại diễn giải các fact
  đang có — lấy từ nguồn uy tín và diễn giải tốt. Lớp giải thích "vì sao" chỉ là việc phụ.
- **Vì sao:** nguyên văn *"Mục đích của tôi không phải là muốn bạn thêm giải thích vì sao, nhưng
  thôi cũng được, nhưng mục đích chính là bổ sung truyện ngắn, bổ sung fact và sửa lại diễn giải
  các fact đang có + tập trung lấy fact + truyện ngắn từ những nguồn uy tín, diễn giải tốt."*
  Đợt ngay trước đó đã dồn công vào lớp "vì sao".
- **Nguồn:** phiên *Đợt 24/08/2026 (d)* (commit b84dcd6).

### FACTS-007 — Truyện có trục phân loại riêng và nhóm riêng trên thanh chủ đề
- **Ngày:** 25/08/2026
- **Phạm vi:** facts/data/manifest.json, facts/data/chuyen/*.json, facts/app.js, facts/index.html,
  facts/tools/factlint.py
- **Nhóm:** cấu trúc
- **Trạng thái:** đang áp dụng
- **Quyết định:** Truyện không mượn `cat`/`sub` của fact. Nó có trục riêng `kieu`, khai ở
  `manifest.kieu_chuyen`, phân theo hình dạng câu chuyện chứ không theo đề tài, và có nhóm riêng
  trên thanh chủ đề.
- **Vì sao:** chủ trang hỏi *"Tôi tưởng những truyện ngắn thì sẽ có 1 tab truyện ngắn riêng ở
  thanh chủ đề, không phải à, hiện tại đang là như thế nào, đang lẫn vào các chủ đề của fact à
  hay sao"*, rồi chọn phương án tách hẳn trong ba phương án được đưa ra.
- **Đừng:** gắn lại `cat`/`sub` cho truyện — cổng coi đó là lỗi.
- **Nguồn:** phiên *Đợt 25/08/2026* (commit 06d3899, 8625931). Luật: CLAUDE.md §7.0.

### FACTS-008 — Đích quy mô: khoảng 3.000 fact và 500 truyện
- **Ngày:** 25/08/2026
- **Phạm vi:** facts/data/
- **Nhóm:** nội dung
- **Trạng thái:** đang áp dụng
- **Quyết định:** Thư viện hướng tới khoảng 3.000 fact và khoảng 500 truyện.
- **Vì sao:** nguyên văn *"fact tôi muốn khoảng 3000 fact, truyện thì 500"*.
- **Đừng:** nới cổng nào để kịp số. Đích là số lượng, còn §2 bước 4 vẫn nguyên: không truy được
  nguồn gốc thì bỏ fact.
- **Nguồn:** phiên *Đợt 25/08/2026* (commit 54eed3f).

### FACTS-009 — Truyện: không tự bịa, nguồn chính thống, được nhiều người công nhận
- **Ngày:** 25/08/2026
- **Phạm vi:** facts/data/chuyen/*.json, facts/data/manifest.json, facts/tools/factlint.py
- **Nhóm:** nội dung
- **Trạng thái:** đang áp dụng
- **Quyết định:** Truyện gì cũng được, miễn không phải do agent tự nghĩ ra, có nguồn chính thống,
  và đã được nhiều người đánh giá là hay. Lằn ranh là có sẵn / tự bịa, không phải thật / hư cấu:
  truyện cổ Grimm hay canon Sherlock Holmes đều nhận được.
- **Vì sao:** nguyên văn *"cái này thì hẹp quá… truyện thì truyện gì cũng được, nhưng không được
  bịa, phải có nguồn chính thống, và nhiều người đánh giá nó hay chứ không phải tự AI bịa"*.
  Định nghĩa agent viết trước đó ("kể một chuyện có thật, rồi để lại một điều về thế giới") loại
  nhầm cả Grimm.
- **Đừng:** để điều kiện "nhiều người công nhận" thành cảm nhận của người viết — nó được buộc vào
  `manifest.tuyen_tap`, nên muốn thêm một tuyển tập thì khai tuyển tập trước.
- **Nguồn:** phiên *Đợt 25/08/2026*, mục 4 (commit d702fbb). Luật: CLAUDE.md §7.0-a, §7.0-b.

### FACTS-010 — Thêm truyện Sherlock Holmes, truyện ứng xử có thật, truyện về tâm lý học
- **Ngày:** 25/08/2026
- **Phạm vi:** facts/data/chuyen/*.json, facts/data/manifest.json
- **Nhóm:** nội dung
- **Trạng thái:** đang áp dụng
- **Quyết định:** Thư viện nhận truyện ngắn Sherlock Holmes, truyện có thật về cách ứng xử EQ cao
  và đối nhân xử thế, và truyện giúp hiểu tâm lý học.
- **Vì sao:** nguyên văn *"Tôi muốn thêm những mẩu truyện ngắn của sherlock holmes, những câu
  truyện về cách ứng xử EQ cao có thật, những câu truyện giúp tôi hiểu thêm hơn về đối nhân xử
  thế, tâm lý học"*.
- **Đừng:** biến yêu cầu theo đề tài thành kiểu truyện chia theo đề tài — trục `kieu` chia theo
  hình dạng (FACTS-007). Ba kiểu `trinh-tham-holmes`, `doi-nhan-xu-the`, `thi-nghiem-nguoi` là
  ba hình dạng có cổng đi kèm (CLAUDE.md §7.0).
- **Nguồn:** phiên *Đợt 25/08/2026 (b)* (commit c2b6e4f).

### FACTS-011 — Fact ưu tiên ngắn gọn: `q` và `d` tuỳ chọn, không có sàn độ dài
- **Ngày:** 25/08/2026
- **Phạm vi:** facts/data/*.json, facts/data/manifest.json, facts/tools/factlint.py
- **Nhóm:** nội dung
- **Trạng thái:** đang áp dụng
- **Quyết định:** Fact ưu tiên ngắn gọn, diễn giải đơn giản, dễ hiểu. Câu hỏi mở đầu `q` và phần
  giải thích `d` đều tuỳ chọn; có `d` thì viết vừa đủ — một câu là xong thì một câu. Chiều sâu
  dài hơi là việc của truyện.
- **Vì sao:** nguyên văn *"facts thì tôi ưu tiên ngắn gọn, diễn giải cũng đơn giản dễ hiểu ngắn
  gọn, mà bạn lại giới hạn min 600, thế thì kể cả những thứ giải thích một câu là xong bạn cũng
  cố bôi ra thành 600 ký tự cho khó hiểu và lòng vòng à… hỏng hết trang web của tôi rồi."* Sàn
  600 ký tự / 3 đoạn do agent đặt đã đẩy phần lớn `d` dồn cục ở 900–1.300 ký tự.
- **Đừng:** đặt lại sàn độ dài hay số đoạn cho `d`; dùng `manifest.day_du` làm điều kiện chặn.
- **Nguồn:** phiên *Đợt 25/08/2026 (e)* (commit d539047, 278b521). Luật: CLAUDE.md §1.7.
