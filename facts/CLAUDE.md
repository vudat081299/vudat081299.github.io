# facts/ — thư viện fact và truyện

Thư viện fact tiếng Việt cho người trưởng thành, kèm truyện; trang tĩnh, không build, dựng bằng web-builder.
Kiến trúc: `README.md`. Quyết định: `DECISIONS.md`. Việc dở, đọc trước một đợt rà: `HANDOFF.md`. Số đo: `HISTORY.md`.

- Việc chính: thêm truyện, thêm fact, sửa diễn giải, từ nguồn uy tín (FACTS-006).
- Một fact hỏng được chỉ ra là mẫu của một lớp lỗi (FACTS-001): tìm cơ chế, đo lớp lỗi trên cả thư viện trước khi viết
  luật, nối luật vào `tools/factlint.py`, rà sạch danh sách nó sinh ra, rồi mới báo xong. Cổng im chưa phải là xong.
- Cổng: `sh facts/tools/check.sh` (`factlint.py check` + `verify`); commit và CI chạy nó (REPO-017). Luật của `verify`
  và mức của chúng (LOẠI chặn commit, XEM phải đọc bằng mắt): các bảng `RULES_*` trong `factlint.py`.

## 1. Một fact là gì

Một khẳng định về thế giới, đúng với mọi người đọc, neo vào ít nhất một thứ cứng: con số đo được, cơ chế gọi tên
được, hoặc mốc thời gian (*"Cá heo ngủ mỗi lần một nửa não, nửa kia thức để thở"*). Trượt một cổng là loại, đừng nới:
- Thế giới: nói thế giới là thế nào, không nói người đọc nên làm gì. Xoá chữ "bạn" mà câu sụp là lời khuyên.
- Mỏ neo: có số, cơ chế hoặc mốc. Không có là cảm nhận hay ý kiến.
- Một câu: kể lại được trong một câu, không cần dựng bối cảnh. Phải kể mới hiểu thì đó là truyện (§7).

Trường: `id` duy nhất, tiền tố theo chủ đề · `cat` ∈ `manifest.categories` · `sub` ∈ `manifest.clusters[cat]` · `t` câu
khẳng định · `s` bắt buộc, 1–3 câu, nêu con số và chỗ trực giác hỏng · `q`, `d` tuỳ chọn (§1.7; `d` chỉ hiện trong modal,
ngăn đoạn bằng `\n\n`) · `viz` (§5) · `tags` không dấu, gạch nối · `src` bắt buộc (§4) · `xem_ok`, `khac_voi` (§2 bước 7).

### 1.1 Sáu loại không phải fact — danh sách đóng, `verify` bắt phần lớn

1. Tường thuật: kể lại một vụ việc, thí nghiệm, nhân vật ("Vụ…", "Thí nghiệm…"). Có cơ chế thì nói cơ chế.
2. Lời khuyên: mệnh lệnh, hoặc so hai cách làm (*nên, hãy, đừng, cách tốt nhất, X hiệu quả hơn Y, giúp bạn*). `s` cũng
   bị soi nhóm *hãy/đừng/chớ*; *mẹo* thì không, vì trong `s` nó thường đang bác một mẹo.
3. Meta về nghiên cứu: số phận một bài báo thay vì thế giới. Nêu tranh cãi trong `s`/`d` của một claim thật thì được.
4. Xu hướng hành vi không mỏ neo: "Người ta thường…" mà không có số hay cơ chế gọi tên được.
5. Định luật, mô hình đặt tên (dao cạo Sagan, nguyên lý Anna Karenina); trừ định luật vật lý, toán có công thức và số.
6. Mẹo, huyền thoại tự chế: con số không truy được nguồn gốc.

### 1.2 Ranh giới hay nhầm

- Fact tâm lý, sinh học cần cả cơ chế lẫn con số kiểm được. Fact lịch sử: giá trị ở đại lượng hay mốc, không ở diễn biến.
- Fact sửa huyền thoại nói cái đúng (FACTS-004): "Lưỡi nhận cả năm vị ở mọi vùng". `t-phat-bieu-cai-sai` loại cái sai.
- `s` diễn giải chính điều tiêu đề khẳng định. Nguồn gốc niềm tin sai chỉ làm câu phụ; chiếm cả `s` thì
  `s-khong-ve-the-gioi` loại. Phép thử: xoá `s`, người đọc mất thông tin về thế giới hay chỉ về một sai lầm?
- Fact đúng mà đọc xong không cầm được gì thì loại (FACTS-003). Fact định nghĩa một thước đo phải thành một phép đo bằng
  chính thước đo ấy: `sh-125`, "1.667 người uống aspirin suốt một năm mới ngăn được 1 biến cố".

### 1.3 Mỏ neo giả — `verify` báo XEM

- Số giả định: mọi con số nằm trong câu "nếu / ví dụ / giả sử" (`mo-neo-gia-dinh`).
- Độ lớn bằng chữ: "đáng kể", "rất nhiều", "phần lớn" mà không có số nào (`do-lon-bang-chu`). Chỗ đó phải có số.
- So với cái người đọc tưởng ("hơn người ta nghĩ", "ít ai biết"; `tuong-tuong-nguoi-doc`): phải có số của cái đo được.

### 1.4 Tiêu đề và thân nói về cùng một thứ

- Phép thử: con số trong `s` có chứng minh đúng điều `t` khẳng định không? Chỉ đọc mới thấy; so từ vựng đã đo, vô dụng.
- Câu đầu của `s` không chép lại tiêu đề (`check` chặn từ 90% giống).

### 1.5 Tự chứa (FACTS-002)

Phép thử: người 15 tuổi chưa học ngành đó đọc xong có nắm được không. Làm theo thứ tự:
1. Nói ra thứ đang được nói tới: "ngưỡng 0,05" thành "mốc quyết định một kết quả được coi là có thật".
2. Thay thuật ngữ bằng lời thường, kể cả khi dài hơn: "mù đôi" thành "cả người ăn lẫn người chấm không biết ai ăn gì".
3. Buộc phải dùng thuật ngữ thì định nghĩa ngay câu đầu, rồi khai `"xem_ok": ["thuat-ngu"]` (mẫu: `kt-019`).

Số trên thang chuẩn hoá kèm nghĩa của thang: "0,62 trên thang mà 0,2 là nhỏ, 0,5 là vừa, 0,8 là lớn". `THUAT_NGU` trong
`factlint.py` chỉ chứa từ phải học ngành mới hiểu; thêm từ phổ thông (logarit) hay từ đa nghĩa (hiệu lực) là bắt oan.

### 1.6 Luật đã đo và rớt — đừng dựng lại

Định nghĩa bằng phủ định · tên riêng trong tiêu đề · đại lượng trần · tiêu đề dán bằng ", và" · dấu hiệu kể nguồn gốc
niềm tin · con số chỉ đo lịch sử một niềm tin · lọc "câu có dấu giải thích" · so từ vựng `t`/`s`. Số đo ở HISTORY.md.

### 1.7 `q` và `d` — tuỳ chọn (FACTS-011)

- Fact ưu tiên ngắn; chiều sâu là việc của truyện. `d` dài ngắn tuỳ nội dung; không đặt lại sàn độ dài hay số đoạn.
- `t` + `s` đủ hiểu thì bỏ `d`. `d` tốt chạm một trong ba: cơ chế bằng lời thường, so sánh đời thường, chỗ gặp trong đời.
- `q` hỏi về thế giới và `t` là câu trả lời; `q` kết thúc bằng "?", 15–120 ký tự (`check` kiểm). Ngôi thứ hai được.
  Câu hỏi đòi lời khuyên ("Làm sao để ngủ ngon?") bị loại (`q-doi-loi-khuyen`).
- "nên + động từ": loại ở tiêu đề, chỉ XEM trong `d` (`nen-lam-gi`), vì trong văn xuôi nó hay là "cho nên". Các mẫu lời
  khuyên khác (hãy, đừng, mẹo, cách … nhất) vẫn loại trong `d`.
- `manifest.day_du` chỉ tô cột trong `stats`; đừng biến nó thành điều kiện chặn. Số fact có `q`/`d` không phải chỉ tiêu.

### 1.8 `s` kể thế giới, không kể ai tìm ra (FACTS-005)

- Viết tiếng Việt thường ngày; xuất xứ thuộc `src`. Trượt: "Các nghiên cứu cho thấy mất 2% nước làm giảm sức bền".
  Đạt: "Mất khoảng 2% khối lượng cơ thể bằng nước đã đủ làm sức bền giảm rõ".
- Tranh cãi (§4) thì gọi tên giới hạn cụ thể ("cỡ mẫu 22 người"), không dán nhãn "các nhà khoa học đã chứng minh".
- `s-ke-nguoi-tim-ra` (XEM) soi `t` và `s`. Khai `xem_ok` khi chủ ngữ đúng ra là một nghiên cứu: fact về cách nghiên cứu
  hỏng hay được đánh giá, định lý có người chứng minh, câu tự hạ mức chắc chắn.

## 2. Thêm fact — đúng thứ tự

1. Tìm trong một cụm (`cat` + `sub`). Nguồn tốt: nghiên cứu gốc, cơ quan thống kê, sách chuyên khảo, bài tổng hợp phản
   biện. Trang chuyên làm fact (Wikipedia *Did you know?*, QI, Atlas Obscura, *Mười vạn câu hỏi vì sao*…) chỉ là đầu mối:
   có bản quyền hoặc có sai, nên lấy ý, truy về nguồn gốc, viết mới. Dịch từ Wikipedia (CC BY-SA) thì ghi công.
2. Ép về một câu khẳng định; "và" nối hai ý độc lập là hai fact. Qua ba cổng §1 và sáu loại §1.1; trượt thì bỏ, đừng viết
   vòng cho lọt. Tìm con số chính (không có thì thường là ý kiến) và chỗ đang tranh cãi (có thì nói ra).
3. Tra trùng, không được bỏ: `python3 facts/tools/factlint.py near "<t + s>" --cat <cat> --sub <sub>`. Từ 0,62: gộp vào
   fact cũ. 0,42–0,62: đọc 2–3 fact đầu rồi quyết. Dưới 0,42: thêm được. Điểm chỉ so chữ, nên đọc hết tiêu đề trong cụm.
   Thêm cả đợt: đọc mọi cặp fact mới–fact cũ cùng chủ đề từ 0,45 (lệnh dưới).
4. Kiểm nguồn theo §4. Không truy được nguồn gốc thì bỏ fact.
5. Thêm vào cuối file chủ đề, hoặc file đợt mới khai ở cuối `manifest.files` (sau là mới hơn). Đổi `manifest.updated`.
6. Demo được thì làm minh hoạ luôn (§5).
7. `sh facts/tools/check.sh` phải sạch. LOẠI: xoá hoặc viết lại. XEM: đọc rồi quyết. Cặp từ 0,62: gộp, trừ khi khác claim.
   - Đọc rồi thấy luật XEM báo oan: khai `"xem_ok": ["<rule-id>"]`. Chỉ khai sau khi thật sự đọc. Không miễn được LOẠI:
     fact cần vượt LOẠI thì sửa luật. `check` báo lỗi khi rule id lạ hoặc khi khai miễn đã chết.
   - Đọc hai fact rồi thấy là hai claim: khai `"khac_voi": ["<id>"]` ở một trong hai. Ba dạng trùng ở §3 thì gộp.

```bash
python3 -c "
import sys; sys.dont_write_bytecode = True; sys.path.insert(0, 'facts/tools'); import factlint as F
man, facts = F.load(); v, _, _ = F.build_index(facts); CAT, MOC = 'suc-khoe', 201  # chủ đề, id đầu của đợt mới
g = [k for k, f in enumerate(facts) if f['cat'] == CAT]; n = lambda k: int(facts[k]['id'][3:])
for s, a, b in sorted(((F.cosine(v[x], v[y]), facts[x]['id'], facts[y]['id']) for x in g if n(x) >= MOC
                       for y in g if n(y) < MOC), reverse=True):
    if s >= 0.45: print('%.2f %s %s' % (s, a, b))
"
```

## 3. Chống trùng

- Mỗi fact có `sub`, cụm khai ở `manifest.clusters`; trùng thật gần như luôn cùng cụm. Cụm quá 90 fact thì tách (`stats`).
- `check` quét mọi cặp bằng ba lưới: trong cụm, trong chủ đề, riêng tiêu đề (ngưỡng ở đầu `factlint.py`). Chặn commit từ
  0,62 và khi trùng tiêu đề. Lưới vẫn lọt phần lớn cặp trùng ý (HANDOFF), nên vẫn đọc tay theo cụm.
- Hai fact là một khi bỏ một cái đi mà không mất phép đo nào; chung chủ đề, nguồn hay cụm chưa đủ. Hai claim khác nhau
  thì giữ cả hai và sửa tiêu đề cho khác hẳn (`ct-113` ngáp không để lấy oxy, `ct-114` ngáp lây).
- Trùng thẳng, cùng một claim: giữ một, bỏ một.
- Fact hệ quả, B suy ra từ A hoặc là chi tiết của A: nhập B vào `s` hoặc `d` của A, bỏ B.
- Fact demo, B chỉ để treo minh hoạ cho A: gắn `viz` vào A, bỏ B. Tiêu đề kiểu "thử ngay", "kéo thanh trượt" là dấu hiệu.
- Gộp bằng script: xác nhận fact được giữ còn tồn tại rồi mới xoá fact kia. Không cổng nào bắt được việc xoá cả hai.

## 4. Kiểm nguồn — cả bốn bắt buộc

1. `src` ghi tác giả, nơi công bố, năm; hoặc tên tổ chức (WHO, NASA, Tổng cục Thống kê…).
2. Nguồn là nguồn gốc, không phải bài kể lại. Chỉ có bài phổ thông thì truy tới nghiên cứu gốc, hoặc bỏ.
3. Có tranh cãi thì nói ra trong `s` hoặc `d`, kèm nguồn phản biện.
4. Mọi phép tính (lãi kép, xác suất, đổi đơn vị) kiểm bằng máy trước khi đăng. Số trong `t`/`s` khớp số minh hoạ tính ra.

Không nhận: giai thoại không truy được nguồn; mẹo tâm lý kiểu "93% giao tiếp là phi ngôn ngữ"; số do mô hình ngôn ngữ sinh
ra mà chưa đối chiếu nguồn gốc. Thà mất một fact hay còn hơn giữ một fact sai.

## 5. Minh hoạ tương tác

- Demo được thì làm ngay lúc thêm fact, không để sau; không demo được thì thôi. `viz` gắn vào chính fact nó minh hoạ.
- Demo được: tham số kéo được, xác suất mô phỏng được, ảo giác hay giới hạn giác quan, so hai phân bố hay hai thang.
  Không demo: fact lịch sử, một con số đơn lẻ, cơ chế không quan sát được tại chỗ. Không biểu đồ trang trí.
- Thêm hàm `'ten-viz': function (root) { … }` vào `window.FactViz` ở cuối `viz.js`, rồi `"viz": "ten-viz"` trong fact.
  `check` kiểm tên hàm; hàm ném lỗi thì `app.js` chỉ ẩn phần minh hoạ.
- Cấu trúc dùng `--wb-neutral-*`; `--wb-chart-*` chỉ ở chỗ màu là dữ liệu. Không hardcode màu, không bịa class `wb-*`.
  Bảng rộng bọc trong `<div class="wb-scroll-x">`, không thì tràn ngang modal trên điện thoại.

## 6. Sửa giao diện

Soát bốn cổng cơ học của page-review (web-builder): không class `wb-*` tự chế, không nền màu trong `<main>`, không tràn
ngang ở 1280/900/700/390, navbar đúng 56px.

## 7. Truyện — loại nội dung thứ hai (FACTS-005)

### 7.0-a Nhận truyện nào (FACTS-009)

- Truyện gì cũng được, miễn không tự bịa, có nguồn chính thống, được nhiều người công nhận. Lằn ranh là có sẵn hay tự
  bịa, không phải thật hay hư cấu. Truyện do agent tự nghĩ ra bị cấm tuyệt đối.
- Không tự bịa: `src` trỏ tới một bản công bố cụ thể. Chính thống: bản gốc, không phải bản kể lại (§4). Được công nhận:
  nằm trong một tuyển tập khai ở `manifest.tuyen_tap`, kèm số hiệu. Tuyển tập mới thì khai trước rồi mới thêm truyện.
- Truyện hết hạn bảo hộ: kể lại bằng tiếng Việt của mình, bám cốt bản gốc, không thêm nhân vật, không đổi kết. Không
  chép bản dịch tiếng Việt đang lưu hành.

### 7.0 Kiểu truyện (FACTS-007, FACTS-010)

- Truyện không có `cat`/`sub`, mà có `kieu`: một giá trị của `manifest.kieu_chuyen` (nhãn và mô tả ở đó), chia theo hình
  dạng câu chuyện chứ không theo đề tài. Không kiểu nào vừa thì khai kiểu mới. Truyện có nhóm riêng ở thanh bên.
- `doi-nhan-xu-the`: có một khoảnh khắc chọn và một hiện vật chứng minh (thư, bản ghi, hồi ký); không có là giai thoại.
- `thi-nghiem-nguoi`: thí nghiệm cộng phần về sau (ai lục lại, chỗ không lặp lại được); chỉ nửa đầu là fact `tam-ly`.
- `ky-quac`: vẫn là chuyện có thật; cái buồn cười nằm ở sự việc (giải Ig Nobel, sự cố có hồ sơ), không ở cách kể.
- Trường: `id` (`ch-` truyện có thật, `tc-` truyện cổ, `hl-` Holmes) · `kieu` · `t` · `s` (1–2 câu dẫn) · `body`
  (1.200–8.000 ký tự, ít nhất 4 đoạn) · `mang_di` hoặc bộ trường kinh điển (§7.0-b) · `tags` · `src`. `check` kiểm hết.

### 7.0-b Truyện kinh điển

- Kiểu có cờ `kinh_dien` (Grimm, Holmes): bắt buộc `xuat_xu` và `lai_lich` (ít nhất 120 ký tự), không có `mang_di`.
  `xuat_xu` mở đầu bằng mã một tuyển tập đã khai: `KHM 21`, `SH REDH` (mã bốn chữ của Jay Finley Christ).
- `atu`: mã kiểu truyện dân gian Aarne–Thompson–Uther, khai ở `manifest.atu`, độc lập với `kieu` (Lọ Lem của Grimm và
  Tấm Cám cùng là 510A). Bắt buộc khi kiểu có `atu_bat_buoc`, bị cấm khi không.
- `lai_lich` là một fact về đường đi của chính câu chuyện: bao nhiêu tuổi, có mặt ở đâu, bản nào khác bản nào; không phải
  bài học. Đạt: "Bản 1812 để mẹ ruột hành hạ con; từ bản 1819 Grimm đổi thành mẹ kế." Trượt: "Ở hiền gặp lành."

### 7.1 `mang_di` — phần cầm về của truyện có thật

- `mang_di` (truyện có thật, ít nhất 60 ký tự): một câu về thế giới, còn đứng vững khi người đọc quên hết chi tiết. Phép
  thử: xoá thân truyện, câu đó còn nghĩa không? Trượt: "Câu chuyện cho thấy thiên nhiên rất kỳ diệu." Đạt: "Chọn lọc tự
  nhiên đo được trong một mùa: sau hạn hán 1977, mỏ chim sẻ trên Daphne Major dày thêm rõ rệt chỉ sau một thế hệ."
- `mang_di` và `lai_lich` chịu các luật LOẠI của cổng fact, trừ `tuong-thuat`.

### 7.2 Không dạy đời

`day-doi` loại câu giảng trong thân truyện: "bài học ở đây là…", "điều này dạy chúng ta…", "suy cho cùng thì…". Lời
khuyên bị chặn như với fact; lời thoại trong ngoặc kép được miễn.

### 7.3 Thêm một truyện — luật của fact vẫn giữ

- Như §2, nhưng viết `mang_di` trước; không nghĩ ra thì đừng viết truyện. Nguồn tốt: hồ sơ điều tra tai nạn, hồi ký kỹ
  thuật, sách sử, báo cáo của người trong cuộc. File: `data/chuyen/<đợt>.json`, khai ở `manifest.files_chuyen`.
- Nguồn (§4) và tự chứa (§1.5) không nới. Có tranh cãi thì nói: `ch-005` ghi số ca tả đã giảm trước khi tháo vòi bơm.
- Tra trùng trong bể truyện, không chéo với fact: `factlint.py near "<t + s>" --chuyen`, thêm `--kieu K` để khoanh kiểu.
