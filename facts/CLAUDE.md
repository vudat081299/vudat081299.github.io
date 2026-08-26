# Trang Fact — hướng dẫn cho AI làm việc trong thư mục này

Thư viện fact tiếng Việt cho người trưởng thành. Trang tĩnh, không build, dựng bằng
[web-builder](../web-builder/) v0.6. Mọi thứ dưới đây áp dụng cho **mọi** thay đổi trong
`facts/` — kể cả khi bạn chỉ được nhờ "thêm vài fact".

Kiến trúc, cách chạy tại máy và cấu trúc file: xem [README.md](README.md). File này nói về
**quy trình** và **các quy tắc không được vi phạm**.

Nhật ký các đợt rà soát, những gì đã đo và **những gì còn nợ**: xem [HANDOFF.md](HANDOFF.md).
Đọc file đó trước khi bắt đầu một đợt rà mới — nó ghi rõ chỗ nào đã soi và chỗ nào chưa.

---

## 1. Một fact là gì

> Định nghĩa này được viết lại ngày 09/08/2026 vì thư viện đã trôi sang kể chuyện và khuyên
> bảo. Nếu bạn thấy fact cũ nào không khớp định nghĩa dưới đây thì fact đó sai, không phải
> định nghĩa sai.

**Một fact là một khẳng định về thế giới, đúng độc lập với người đọc, và neo được vào ít nhất
một thứ cứng: một con số đo được, một cơ chế gọi tên được, hoặc một mốc thời gian.**

Ba fact mẫu — mọi fact trong thư viện phải cùng dạng với ba câu này:

- *Cá heo ngủ mỗi lần một nửa não, nửa còn lại thức để nổi lên thở và canh kẻ săn mồi.*
- *Tốc độ ánh sáng trong chân không là 299.792.458 m/s với mọi người quan sát, dù người đó
  đang chuyển động nhanh cỡ nào.*
- *Việt Nam nằm dưới ách đô hộ của các triều đại Trung Hoa tổng cộng khoảng 1.000 năm, chia
  làm bốn lần Bắc thuộc.*

Chúng có chung ba thứ, và cả ba là **bắt buộc**:

| Cổng | Câu hỏi | Trượt thì sao |
|---|---|---|
| **Thế giới** | Nó nói thế giới *là* thế nào, hay nói người đọc *nên* làm gì? | Xoá chữ "bạn" khỏi câu mà câu sụp đổ → đó là lời khuyên, loại |
| **Mỏ neo** | Có con số, cơ chế, hay mốc thời gian không? | Không có → đó là cảm nhận hoặc ý kiến, loại |
| **Một câu** | Kể lại được cho người khác trong một câu, không cần dựng bối cảnh? | Phải kể chuyện mới hiểu → đó là chuyện, loại |

```json
{
  "id": "sh-001",          // duy nhất toàn thư viện, tiền tố theo chủ đề
  "cat": "so-hoc",         // phải khớp manifest.categories[].id
  "sub": "nghich-ly-xac-suat",  // phải khớp manifest.clusters[cat] — xem §3
  "viz": "birthday",       // tuỳ chọn, khoá một hàm trong viz.js — xem §5
  "q": "Cần bao nhiêu người trong một phòng để gần chắc có hai người trùng ngày sinh?",
  "t": "Chỉ cần 23 người trong phòng là xác suất có hai người trùng ngày sinh vượt 50%",
  "s": "1–3 câu. Nêu luôn con số và nêu luôn chỗ trực giác hỏng. Bắt buộc.",
  "d": "Phần giải thích. Ngăn đoạn bằng \n\n. Chỉ hiện trong modal — xem §1.7.",
  "tags": ["xac-suat", "truc-giac"],
  "src": "Tác giả, Tạp chí (năm)"   // bắt buộc — xem §4
}
```

### 1.1 Sáu loại KHÔNG phải fact — thấy là loại, không tranh luận

Đây là danh sách đóng. `factlint.py verify` bắt máy móc phần lớn chúng; phần còn lại bạn phải
tự bắt bằng mắt.

1. **Tường thuật.** Nội dung là một vụ việc, một thí nghiệm, một nhân vật được kể lại.
   Dấu hiệu: tiêu đề bắt đầu bằng *"Vụ…"*, *"Thí nghiệm…"*, *"Câu chuyện…"*, hoặc chứa tên
   riêng của một sự cố.
   ❌ *"Vụ Kitty Genovese: bài báo gốc sai gần hết chi tiết quan trọng"* — kể xong rồi sao?
   Người đọc không cầm được gì về.
   ✅ Nếu thật sự có gì để nói thì nói cái cơ chế, bỏ vụ việc đi.

2. **Lời khuyên.** Câu có mệnh lệnh, hoặc so sánh hai *cách làm* để người đọc chọn.
   Dấu hiệu: *nên*, *hãy*, *đừng*, *cách tốt nhất*, *X hiệu quả hơn Y*, *giúp bạn…*
   ❌ *"Nói 'kể tiếp đi' hiệu quả hơn đặt một câu hỏi mới"*.
   Cổng này soi cả **phần tóm tắt**, không chỉ tiêu đề — lỗ đó tồn tại tới 24/08/2026 và
   5 fact đã sống sót nhờ nó bằng cách gắn lời khuyên vào đuôi `s`: *"…hãy đi tìm con số
   thật."*, *"Nguyên tắc thực tế: đừng đăng thứ mà bạn cần đảm bảo sẽ biến mất được."*
   Chỉ nhóm mệnh lệnh (*hãy/đừng/chớ*) được soi trên `s`; *mẹo* thì không, vì trên `s` nó
   khớp 5 chỗ mà 4 chỗ đang **nói về** mẹo để bác nó (*"chứ không phải mẹo dân gian"*).

3. **Meta về nghiên cứu.** Nội dung là số phận của một bài báo, không phải thế giới.
   ❌ *"Thí nghiệm nhà tù Stanford không phải bằng chứng như nó được kể"*.
   ✅ Được phép nêu chỗ tranh cãi **bên trong** `s`/`d` của một fact có claim thật (§4 quy tắc 3).

4. **Xu hướng hành vi không mỏ neo.** *"Người ta thường…"*, *"Ta có xu hướng…"* mà không có
   con số, không có cơ chế thần kinh/sinh lý gọi tên được.
   ❌ *"Người ta ghét sự mơ hồ hơn ghét rủi ro"*.
   ✅ *"Ngáp không phải để lấy oxy — thở khí giàu CO₂ không làm tăng số lần ngáp"*: có cơ chế,
   có phép thử.

5. **Định luật/mô hình đặt tên.** *"Định luật Sayre"*, *"Dao cạo Sagan"*, *"Nguyên lý Anna
   Karenina"* — đó là cách nói ẩn dụ, không kiểm chứng được, không có mỏ neo.
   Ngoại lệ: định luật **vật lý/toán học** có công thức và có số (định luật Ohm, định luật
   Benford) thì được.

6. **Mẹo và huyền thoại tự chế.** Con số không truy được nguồn gốc (§4).

### 1.2 Ranh giới hay bị nhầm

- Fact tâm lý/sinh học **được giữ** khi nó nêu một cơ chế + một con số kiểm được:
  *"Đau xã hội và đau thể chất kích hoạt cùng vùng vỏ não đai trước"* — đạt.
  *"Người được lắng nghe kỹ trở nên ít cực đoan hơn"* — trượt cổng mỏ neo.
- Fact lịch sử **được giữ** khi giá trị nằm ở đại lượng hoặc mốc:
  *"Chiến tranh Anh–Zanzibar 1896 kéo dài 38 phút"* — đạt.
  *"Một sĩ quan Liên Xô có thể đã ngăn chiến tranh hạt nhân"* — trượt: giá trị nằm ở diễn
  biến câu chuyện, và câu có chữ "có thể".
- Fact sửa huyền thoại **được giữ** khi nó phát biểu cái **đúng**, không phát biểu cái sai:
  ✅ *"Lưỡi cảm nhận cả năm vị ở mọi vùng"*  ❌ *"Bản đồ vị giác là hiểu lầm do lỗi dịch"*.
  Cổng `t-phat-bieu-cai-sai` bắt mức `LOẠI` mọi tiêu đề dạng *"X là huyền thoại / hiểu lầm"*.
  Ngược lại của nó cũng bị chặn: **phần tóm tắt phải diễn giải chính cái tiêu đề khẳng định**,
  không được lấy trọn dung lượng để kể *lịch sử của một niềm tin sai* — ai dịch sai năm nào,
  sách giáo khoa in bao lâu. Nêu nguồn gốc huyền thoại làm câu phụ thì được (§4 quy tắc 3);
  lấy nó làm toàn bộ phần tóm tắt thì cổng `s-khong-ve-the-gioi` chặn ở mức `LOẠI`.
  Phép thử: xoá `s` đi — người đọc mất thông tin về **thế giới**, hay chỉ mất thông tin về
  *lịch sử của một sai lầm*?

Viết bằng tiếng Việt thường ngày. Không "nghiên cứu cho thấy", không "các nhà khoa học đã
chứng minh". Nêu thẳng con số và nêu thẳng ai tìm ra nó.

### 1.3 Ba cách mỏ neo giả vờ là mỏ neo thật

Một fact có chữ số trong `t`/`s` chưa chắc có mỏ neo. Ba dạng dưới đây từng lọt qua cả
`verify` lẫn mắt người và phải đi gộp lại; giờ `verify` bắt cả ba ở mức `XEM`.

| Dạng | Phép thử | Ca mẫu |
|---|---|---|
| **Số giả định** — mọi con số nằm trong câu "nếu / ví dụ / giả sử" | Bỏ con số đi mà câu vẫn nguyên nghĩa → nó không phải mỏ neo | *"Nếu phải cho 100 người uống thuốc trong 5 năm…"* — số 100 là số bịa để minh hoạ |
| **Độ lớn bằng chữ** — "đáng kể", "rất nhiều", "phần lớn" mà không có số nào | Chỗ nào viết "đáng kể" là chỗ đúng ra phải có một con số | *"Làm mát bằng bay hơi tiêu thụ lượng nước đáng kể"* — đáng kể là bao nhiêu? |
| **So với cái người đọc tưởng** — "hơn người ta nghĩ", "ít ai biết" | Đó là khẳng định về sức tưởng tượng của người đọc, không phải về thế giới | *"Trung tâm dữ liệu tiêu tốn nhiều nước hơn người ta nghĩ"* |

Dạng thứ ba có ngoại lệ thật: vài fact tâm lý có claim nằm đúng ở khoảng cách giữa cái người
ta tưởng và cái đo được (hiệu ứng đèn chiếu). Nhưng khi đó **con số của cái đo được phải có
mặt** — nếu không thì fact chỉ còn lại phần "bạn tưởng sai", mà đó không phải một mỏ neo.

### 1.4 Tiêu đề và thân bài phải nói về cùng một thứ

Lỗi nặng nhất từng gặp là dán ba fact khác nhau thành một: `cn-206` có tiêu đề của `cn-140`,
câu đầu là tiêu đề của `cn-020`, câu sau là tiêu đề của `cn-139`. Không cổng nào bắt được vì
mỗi mảnh riêng lẻ đều hợp lệ. Phép thử duy nhất là đọc: **con số trong `s` có chứng minh đúng
cái mà `t` khẳng định không?** Với `cn-206` thì không — 1–1,5% điện năng là của toàn bộ trung
tâm dữ liệu, không phải tổng của những lần tìm kiếm và tin nhắn.

Đừng thử tự động hoá chỗ này bằng cách so từ vựng giữa `t` và `s`: đã đo, và nó vô dụng —
`cn-206` được 0,129 còn `cn-020` (fact lành) chỉ 0,107. Tóm tắt tốt thì diễn giải bằng từ mới,
nên trùng ít là dấu hiệu tốt.

### 1.5 Fact phải tự chứa — không vay kiến thức người đọc chưa chắc có

> Cổng này được thêm ngày 12/08/2026 sau khi chủ trang mở trang lên và gặp `sh-207`:
> *"Ngưỡng 0,05 là một lựa chọn tuỳ tiện do Ronald Fisher đề xuất, không phải một hằng số tự
> nhiên / … kêu gọi bỏ hẳn cách phân loại nhị phân 'có ý nghĩa' và 'không có ý nghĩa'."*
> Ngưỡng của cái gì? Vượt ngưỡng thì sao? "Có ý nghĩa" với ai? Câu đó chỉ đọc được nếu bạn
> **đã biết** p-value là gì — mà người đã biết thì không cần fact, còn người chưa biết thì đọc
> xong vẫn chưa biết. Fact đó không có người đọc nào cả.

**Phép thử: một người 15 tuổi chưa học ngành đó đọc xong có nắm được không.** Fact viết cho
người trong ngành thì để trong ngành, đừng để trong thư viện này.

Ba việc phải làm, theo thứ tự ưu tiên:

1. **Nói ra thứ đang được nói tới.** "Ngưỡng 0,05" → "cái mốc quyết định một kết quả nghiên
   cứu được coi là 'có thật' hay 'không có gì'". Không có ngoại lệ cho chỗ này.
2. **Thay thuật ngữ bằng lời thường**, kể cả khi dài hơn. "Phân tích tổng hợp" → "gộp kết quả
   của nhiều nghiên cứu". "Phương sai lớn" → "kết quả dao động mạnh hơn". "Mù đôi" → "cả người
   ăn lẫn người đánh giá đều không biết ai được ăn gì".
3. **Nếu buộc phải dùng thuật ngữ thì định nghĩa nó ngay trong câu đầu**, rồi khai
   `"xem_ok": ["thuat-ngu"]`. `kt-019` là ca mẫu: nó nói thẳng "đo bằng phần trăm thay đổi
   lượng mua khi giá đổi 1% — kinh tế học gọi là độ co giãn".

Con số đo theo thang chuẩn hoá thì **phải nói thang đó nghĩa là gì**: "0,62" một mình vô nghĩa,
"0,62 trên thang mà 0,2 là nhỏ, 0,5 là vừa, 0,8 là lớn" thì đọc được.

`verify` bắt bằng một danh sách thuật ngữ (`THUAT_NGU` trong `factlint.py`), mức `XEM`. Danh
sách đó **chỉ chứa từ phải học đúng ngành mới hiểu**, và đã thu gọn hai lần bằng cách đo:

| Đã bỏ khỏi danh sách | Vì sao |
|---|---|
| số nguyên tố, luỹ thừa, logarit, đồng vị, động lượng, biên độ, chiết suất, ma trận, tích phân | chương trình phổ thông — gắn cờ 150 fact mà phần lớn đọc được bình thường |
| hiệu lực, độ tin cậy | có nghĩa thường ("hiệu lực pháp lý", "mức tin tưởng") nên bắt oan |
| `tích phân` (thêm lý do) | bắt oan chuỗi con: "Phân **tích phân** tử" |

Và **đừng thêm bộ lọc "câu có dấu giải thích"** (dấu `—`, `:`, ngoặc, "tức là"): đã đo, nó chia
150 fact thành 70/80 mà cả hai nhóm đều lẫn fact lành với fact hỏng. Bậc của từ quyết định,
không phải dấu câu.

### 1.6 Sáu dạng đã đo và **rớt** — đừng dựng lại

Cả sáu nghe hợp lý và đều bị số liệu bác. Ghi ra đây để phiên sau không mất công lần nữa.

| Dạng định bắt | Số fact khớp | Vì sao rớt |
|---|---|---|
| Định nghĩa bằng phủ định ("không phải là X") | 124 | gần như toàn fact lành: *"Trí nhớ không phải bản ghi, nó là bản dựng lại"*, *"Wi-Fi không phải viết tắt của cái gì cả"*. Chúng nêu cái đúng trước rồi mới phủ định — máy không phân biệt được với `sh-207` phủ định một tính chất trừu tượng |
| Hiệu ứng/định luật mang tên riêng trong tiêu đề | 13 | cả 13 nêu luôn nội dung ngay sau tên: *"Định luật Little: giữ gấp 2 số việc làm dở cùng lúc thì mỗi việc mất gấp 2 thời gian"*. Đọc là hiểu, không cần biết Little là ai |
| Đại lượng trần ("ngưỡng/mức/chỉ số" + số) | 12 | "mức 8%/năm", "mốc 8 tỷ" đều rõ nghĩa |
| Tiêu đề dán hai nửa bằng ", và" | 357 | 18% thư viện, và gần hết là fact lành — nửa sau bổ nghĩa cho nửa trước: *"Mắt bạn có một điểm mù, và não âm thầm vá nó lại"*. Thắt lại thành ", và + chữ chỉ huyền thoại" thì còn 21 cặp mà **chỉ 1** hỏng (`ct-209`); 20 cái kia thêm một cải chính thật về thế giới: *"và đó là giới hạn dưới thật chứ không phải quy ước"* |
| `s` có dấu hiệu kể nguồn gốc niềm tin ("bắt nguồn từ", "dịch sai", "sách giáo khoa") | 22 | 20/22 là fact lành, vì chủ ngữ của chúng là một **hiện tượng thật**: *"El Niño bắt nguồn từ dao động nhiệt độ nước mặt"*, *"máy in lan nhanh…"*. Chỉ neo vào từ chỉ nguồn gốc thì precision 9% |
| Mọi con số trong fact đều đo **lịch sử một niềm tin** | 9 | precision 22%: cửa sổ ±60 ký tự quanh con số quá rộng, bắt oan Gaia, Gutenberg, Jenner. Bản dùng được là `s-khong-ve-the-gioi` — đòi **mọi câu** của `s` nhắc kênh văn bản/giảng dạy, precision 100% |


### 1.7 Khuôn "vì sao" — câu hỏi mở đầu và phần giải thích, đều **tuỳ chọn**

> Bản 24/08/2026 bắt mọi fact trong cụm `day_du` phải có `q` + một `d` dài tối thiểu 600 ký
> tự / 3 đoạn. **Ngày 25/08/2026 chủ trang bác hướng đó:** *"facts thì tôi ưu tiên ngắn gọn,
> diễn giải cũng đơn giản dễ hiểu ngắn gọn… kể cả những thứ giải thích một câu là xong bạn
> cũng cố bôi ra thành 600 ký tự cho khó hiểu và lòng vòng à"*. Đúng. Sàn 600 ký tự ép cả
> những fact tiêu đề đã tự hiểu cũng phải đẻ ra một đoạn dài — thành lòng vòng hơn cái nó
> định làm rõ. Chiều sâu dài hơi là việc của **Truyện** (§7), không phải của fact.

**Nguyên tắc: fact ưu tiên ngắn gọn.** `q` (câu hỏi mở đầu) và `d` (phần giải thích) đều
**tuỳ chọn** và độc lập nhau — thêm khi thật sự giúp người đọc, bỏ khi tiêu đề đã tự hiểu.
Khi có `d` thì viết **vừa đủ, dễ hiểu**: một câu là xong thì một câu, không có sàn độ dài.

| Trường | Vai | Bắt buộc khi |
|---|---|---|
| `q` | **câu hỏi mở đầu** — cửa vào, thứ người đọc gặp trước tiên | không bao giờ (tuỳ chọn) |
| `t` | **câu trả lời** — vẫn là câu khẳng định đủ ba cổng §1 | luôn luôn |
| `d` | **phần giải thích** — chỗ đào sâu khi tiêu đề chưa đủ | không bao giờ (tuỳ chọn) |

```json
{
  "q": "Vì sao không khí ẩm lại nhẹ hơn không khí khô?",
  "t": "Không khí lạnh nặng hơn không khí ấm, nhưng không khí ẩm lại nhẹ hơn không khí khô",
  "s": "...",
  "d": "Đoạn 1 — cơ chế.\n\nĐoạn 2 — so sánh đời thường.\n\nĐoạn 3 — chỗ gặp nó trong đời sống."
}
```

**Viết `q` thế nào.** Một câu hỏi về **thế giới**, kết thúc bằng dấu hỏi, 15–120 ký tự.
Ngôi thứ hai được phép và thường là đúng giọng: *"Vì sao bạn không cảm thấy Trái Đất quay?"*
là câu hỏi về thế giới, không phải lời khuyên. Cái bị chặn ở mức `LOẠI` là câu hỏi **đòi một
lời khuyên** — trả lời xong người đọc cầm về một việc phải làm chứ không phải một điều có
thật: *"Làm sao để ngủ ngon?"*, *"Có nên uống cà phê buổi tối không?"*.

**Viết `d` thế nào — dài ngắn tuỳ nội dung, không có sàn.** Một `d` tốt thường chạm được
một trong ba việc dưới đây; chạm được cả ba thì hay, nhưng **đừng bôi cho đủ cả ba** nếu nội
dung không cần — thà một câu đúng chỗ còn hơn ba đoạn lấp chỗ trống:

1. **Cơ chế bằng lời thường.** Vì sao nó xảy ra, nói như nói với người 15 tuổi (§1.5).
2. **Một phép so sánh đời thường.** Quy về thứ người đọc đã cầm nắm được.
3. **Chỗ gặp nó trong đời sống.** Nó hiện ra ở đâu, khi nào người đọc từng thấy mà không biết.

Phép thử trước khi thêm `d`: **tiêu đề + `s` đã đủ hiểu chưa?** Đủ rồi thì bỏ `d` — thêm vào
chỉ làm loãng. Chưa đủ (một cơ chế phản trực giác, một con số cần diễn giải) thì `d` mới có
việc để làm. `check` không còn ép độ dài hay số đoạn; nó chỉ bắt `q` sai định dạng và field rỗng.

**Một luật cũ đã phải nới khi `d` thành phần chính.** `loi-khuyen` bắt `nên` + động từ ở mức
`LOẠI`. Trên **tiêu đề** nó vẫn sạch (0 khớp trên 1.884 tiêu đề) nên giữ nguyên. Nhưng quét cả
`t`+`s`+`d` thì được 17 chỗ, và đọc tay cả 17 thì **7 chỗ (41%) là liên từ "cho nên"**:
*"Chim không có thụ thể phản ứng với capsaicin **nên ăn** ớt bình thường"*. Độ chính xác 59%
là quá thấp cho một luật chặn commit — chính thư viện này đã bác những luật 22% và 11% vì lý
do đó. Trong `d` nó hạ xuống mức `XEM`, rule id `nen-lam-gi`. Các mẫu còn lại của
`loi-khuyen` (*hãy*, *đừng*, *mẹo*, *cách … nhất*) vẫn `LOẠI` trong `d`.

**`manifest.day_du` giờ chỉ là dấu thông tin, không còn ép gì.** Trước nó khoá cụm vào việc
"mọi fact phải có q+d"; từ 25/08 cổng không đọc nó để chặn nữa. Để nguyên danh sách cũng
không sao — nó chỉ còn tô cột `✓ vì sao` trong `stats`. Không cần thêm tên cụm mới vào đó.

`factlint stats` in tiến độ: cột `✓ vì sao` cho cụm có tên trong `day_du`, `n/k vì sao` cho
số fact đã có `q`. Cả hai chỉ để tham khảo — `q`/`d` không phải chỉ tiêu phải lấp đầy.

### 1.8 Phần tóm tắt kể **thế giới**, không kể **ai tìm ra**

> Cổng này được thêm ngày 24/08/2026 sau khi chủ trang nói rằng fact trong thư viện "mang
> tính học thuật rất khó đọc". Đo thử: **94 fact có `s` lấy một nghiên cứu làm chủ ngữ** — *"Các nghiên cứu về mất nước cho thấy…"*, *"Tổng hợp hơn 200 nghiên cứu cho
> thấy…"*, *"Thí nghiệm hành vi cho thấy…"*. Cụm đó ăn mất phần đầu câu — chỗ đắt nhất
> trong 217 ký tự — mà không thêm một chữ nào về thế giới.

`src` đã là chỗ ghi xuất xứ, và nó nằm ngay dưới mỗi fact. Nhắc lại xuất xứ trong `s` vừa
thừa vừa đẩy cái claim xuống nửa sau câu.

| Trượt | Đạt |
|---|---|
| *"Các nghiên cứu về mất nước **cho thấy** mức thiếu hụt khoảng 2% khối lượng cơ thể làm giảm sức bền"* | *"Mất khoảng 2% khối lượng cơ thể bằng nước đã đủ làm sức bền giảm rõ"* |
| *"**Tổng hợp hơn 200 nghiên cứu cho thấy** tỉ lệ đoán đúng chỉ nhỉnh hơn tung đồng xu"* | *"Tỉ lệ đoán đúng trung bình là 54%, tức chỉ nhỉnh hơn tung đồng xu"* |

**Cái này khác hẳn với việc nói ra chỗ tranh cãi.** §4 quy tắc 3 vẫn bắt buộc — nhưng nói
ra chỗ tranh cãi nghĩa là gọi tên **giới hạn cụ thể** (*"đây là dữ liệu quan sát nên nhân
quả chưa chắc"*, *"cỡ mẫu 22 người"*, *"chưa lặp lại được ở nhóm khác"*), chứ không phải
dán một cái nhãn *"các nghiên cứu cho thấy"* lên đầu câu. Nhãn đó không cho người đọc biết
bằng chứng mạnh hay yếu; nó chỉ làm câu dài thêm.

Cổng `s-ke-nguoi-tim-ra` soi **cả tiêu đề lẫn tóm tắt** và báo mức `XEM`, độ chính xác
đo được **khoảng 85%** (94 khớp trên `s`, ~80 lỗi thật; quét cả `t` thì thành 102). Bốn nhóm báo oan, và cả bốn đều có lý do giống nhau — chủ ngữ **đúng ra**
phải là một nghiên cứu, vì fact nói về chính chuyện nghiên cứu:

| Nhóm | Ca mẫu |
|---|---|
| fact nói về cách nghiên cứu hỏng | `sh-115` *"một nghiên cứu quét 100 biến sẽ tìm ra khoảng 5 phát hiện giả"* |
| fact nói về cách người ta đánh giá nghiên cứu | `tl-206` *"cùng một nghiên cứu được đánh giá chặt hay yếu tuỳ kết luận"* |
| định lý toán có người chứng minh | `th-311` *"kết quả này được Fedorov chứng minh năm 1891"* |
| câu cải chính tự hạ mức chắc chắn | `na-236` *"kết quả này không chứng minh hoạ sĩ nhìn thấy dòng rối"* |

Bốn nhóm đó khai `"xem_ok": ["s-ke-nguoi-tim-ra"]`.

---

## 2. Pipeline thêm fact — làm đúng thứ tự này

Bước 3 là bước tuyệt đối không được bỏ. Toàn bộ cơ chế chống trùng nằm ở đó.

### Bước 1 — Tìm

Chọn **một cụm** (`cat` + `sub`) rồi tìm fact trong cụm đó, đừng tìm lan man. Làm việc theo
cụm là điều kiện để bước 3 chạy được, và nó cũng làm bạn thấy ngay chỗ nào trong cụm còn
thưa. Nguồn tốt: nghiên cứu gốc, cơ quan thống kê, sách chuyên khảo, các bài tổng hợp phản
biện lại một kết quả nổi tiếng.

**Nguồn chuyên làm fact — dùng làm ĐẦU MỐI, không dùng làm nguồn.** Chúng cho ý tưởng nhanh
hơn nhiều so với đọc paper từ đầu, nhưng §4 quy tắc 2 không nới: lấy được cái ý rồi thì phải
truy về nguồn gốc, rồi viết mới bằng tiếng Việt. Không dịch lại văn của họ.

| Nguồn | Cho cái gì | Cảnh báo |
|---|---|---|
| Wikipedia **Did you know?** (kho `Wikipedia:Recent_additions`) | vài chục nghìn hook một dòng, mỗi hook có citation tại chỗ — đúng khuôn trường `t` | nhiễu nặng: rất nhiều hook là bài về một nhà thờ làng. CC BY-SA nên dịch được, nhưng phải ghi công |
| Wikipedia **List of common misconceptions** | vài trăm mục có nguồn, đúng dạng "sửa huyền thoại" §1.2 | đã bị khai thác nhiều — tra trùng trước |
| Wikipedia **Unusual articles** | ~1.500 mục kỳ lạ đã phân loại sẵn | là gợi ý, không phải bài viết |
| **Now I Know**, **Damn Interesting**, **Futility Closet**, **Atlas Obscura** | đầu mối dạng truyện, đúng cỡ cho §7 | có bản quyền — chỉ lấy ý, tự truy nguồn, tự viết |
| **QI** / *The Book of General Ignorance* | chuẩn giọng "bất ngờ vì bạn tưởng sai" | tỉ lệ sai đã được ghi nhận; kiểm lại từng cái |
| *Mười vạn câu hỏi vì sao* (bản dịch Kim Đồng) | chuẩn giọng cho §1.7 | có bản quyền; nhiều mục viết cho trẻ em và một số đã lỗi thời |

### Bước 2 — Tinh gọn thành một claim

Ép nó về **một** câu khẳng định. Nếu phải dùng chữ "và" để nối hai ý không phụ thuộc nhau
thì bạn đang có hai fact — tách ra, hoặc bỏ ý yếu hơn.

Rồi cho nó qua **ba cổng ở §1** (thế giới / mỏ neo / một câu) và soi lại **sáu loại loại bỏ ở
§1.1**. Trượt bất kỳ cổng nào → bỏ, đừng tìm cách viết vòng cho lọt.

Thêm hai câu hỏi:

- Con số nào là con số chính? Không có → thường là ý kiến, không phải fact.
- Chỗ nào trong đó đang bị tranh cãi? Có → phải nói ra (§4, quy tắc 3).

### Bước 3 — Tra trùng, bắt buộc

```bash
python3 facts/tools/factlint.py near "tiêu đề + tóm tắt bạn vừa viết" --cat so-hoc --sub nghich-ly-xac-suat
```

Đọc kết quả theo đúng ba mức:

| Điểm | Nghĩa | Phải làm gì |
|---|---|---|
| ≥ 0,62 | gần chắc đã có | **GỘP** vào fact cũ, đừng thêm fact mới |
| 0,42 – 0,62 | có thể trùng ý | mở 2–3 fact đầu ra đọc rồi tự quyết |
| < 0,42 | chưa có | thêm được |

**Điểm số chỉ so chữ, nó không hiểu nghĩa.** Hai fact cùng một ý mà diễn đạt khác nhau sẽ
lọt lưới (`ct-014`/`ct-101` từng lọt ở mức 0,57).

Vì vậy khi thêm một **đợt** fact, đừng chỉ xem ngưỡng 0,62 — hãy rà mọi cặp **fact mới với
fact cũ trong cùng chủ đề từ 0,45 trở lên** rồi đọc bằng mắt. Số liệu thực tế từ hai đợt đầu:
ở ngưỡng 0,62 lọt 8 fact trùng trong đợt giao tiếp và 12 trong đợt sức khoẻ; hạ xuống 0,45 thì
bắt được hết. Đoạn kiểm nhanh:

```bash
python3 -c "
import sys; sys.path.insert(0,'facts/tools')
import factlint as F
man,facts=F.load(); v,_,_=F.build_index(facts)
CAT,MOC='suc-khoe',201   # đổi chủ đề và mốc id của đợt mới
g=[k for k,f in enumerate(facts) if f['cat']==CAT]
new=[k for k in g if int(facts[k]['id'][3:])>=MOC]; old=[k for k in g if int(facts[k]['id'][3:])<MOC]
for s,a,b in sorted(((F.cosine(v[x],v[y]),facts[x]['id'],facts[y]['id']) for x in new for y in old),reverse=True):
  if s>=0.45: print('%.2f %s %s'%(s,a,b))
"
```

Ngoài ra vẫn phải:

```bash
python3 facts/tools/factlint.py stats     # xem cụm đó đang có bao nhiêu fact
```

rồi **đọc hết tiêu đề trong cụm** trước khi thêm. Một cụm chỉ khoảng 20–60 fact nên việc này
rẻ — và đó chính là lý do thư viện được chia cụm.

### Bước 4 — Verify nguồn

Áp cả bốn quy tắc ở §4. Không truy được nguồn gốc → **bỏ fact đó**. Thà mất một fact hay còn
hơn giữ một fact sai; thư viện này bán sự đáng tin, không bán số lượng.

### Bước 5 — Thêm vào data

Thêm vào file của chủ đề, hoặc file đợt mới (xem README §"Thêm fact hàng tuần"). Điền đủ
`id` / `cat` / `sub` / `t` / `s` / `tags` / `src`.

### Bước 6 — Minh hoạ, nếu demo được

Xem §5. **Fact nào demo được bằng visualization thì làm luôn**, đừng để dịp sau.

### Bước 7 — Chạy lại bộ kiểm

```bash
python3 facts/tools/factlint.py check && python3 facts/tools/factlint.py verify
```

Cả hai phải sạch lỗi.

- `check` — cấu trúc + cặp gần trùng. Cặp nào ≥ 0,62 mà bạn cố ý giữ thì phải giải thích được
  vì sao chúng là hai claim khác nhau; không giải thích được thì nó là trùng, đi gộp lại.
  Cặp cùng chủ đề nhưng **khác cụm** chỉ được báo từ 0,62 trở lên, không báo từ 0,42 — xem §3.
- `verify` — cổng định nghĩa §1. Nó phân ba mức: `LOẠI` là vi phạm chắc chắn và **phải xoá
  hoặc viết lại**; `XEM` là nghi ngờ, phải đọc bằng mắt rồi tự quyết; còn lại là đạt.

**Đã soi rồi thì ghi lại — bằng `xem_ok`.** Một luật mức `XEM` báo oan là chuyện bình thường
(mỏ neo của fact là cơ chế chứ không phải con số, hoặc từ chỉ độ lớn chỉ là văn nói). Khi đã
đọc và kết luận nó oan, thêm vào fact:

```json
"xem_ok": ["do-lon-bang-chu"]
```

Không có field này thì danh sách `XEM` **không bao giờ hội tụ**: phiên sau mở ra thấy 142 fact
và không phân biệt được cái nào đã có người soi, cái nào chưa. `verify` đếm riêng số fact được
miễn, `check` báo lỗi nếu rule id không tồn tại.

Hai điều kiện khi dùng:

1. **Chỉ thêm sau khi thật sự đọc fact đó.** Nó là ghi chép "người thật đã soi cái này", không
   phải công tắc làm cổng im lặng. Thêm bừa thì lần sau không ai tin được field này nữa.
2. **Không miễn được mức `LOẠI`.** Nếu một fact thật sự cần vượt `LOẠI` thì luật sai — đi sửa
   luật, đừng miễn cho một fact.

**Cặp gần trùng cũng vậy — dùng `khac_voi`.** Khi đã đọc hai fact và kết luận chúng là hai
claim khác nhau, khai ở một trong hai:

```json
"khac_voi": ["sk-205"]
```

`check` sẽ không báo cặp đó nữa. Cùng lý do với `xem_ok`: không có nó thì danh sách cặp không
hội tụ. Nhưng đọc §3 trước khi dùng — ba dạng trùng ở đó (trùng thẳng, fact hệ quả, fact demo)
đều phải gộp chứ không phải khai `khac_voi`.
  Đây là cổng chặn commit, không phải gợi ý.

---

## 3. Chống trùng bằng cách phân cụm

Vấn đề: so một fact mới với `n−1` fact còn lại là bất khả thi khi `n` lớn. Cách giải:

**Mỗi fact có `sub`** — một cụm nhỏ trong chủ đề, khai báo ở `manifest.clusters`. Fact trùng
nhau gần như luôn cùng chủ đề *và* cùng cụm, nên chỉ cần so trong cụm. Với 3.000 fact và
~118 cụm thì mỗi cụm khoảng 25 fact — đọc hết được bằng mắt.

**Lưới an toàn thứ nhất cho trường hợp đặt sai cụm:** `factlint check` còn dựng một chỉ mục
nghịch đảo trên các token *hiếm* (kể cả con số), và chỉ so hai fact khi chúng dùng chung một
token hiếm. Chi phí gần như tuyến tính, nên nó vẫn chạy được ở quy mô rất lớn.

**Lưới thứ hai, vì lưới thứ nhất có lỗ:** hai fact trùng ý nhưng chỉ dùng chung các từ *phổ
thông* thì không cặp nào bắt được — `cn-140` và `cn-206` đạt 0,71 mà lọt, vì mọi từ chung của
chúng ("năng lượng", "tìm kiếm") đều có `df > 40`. Nên `check` còn so **hết mọi cặp trong cùng
`cat`**, kể cả khác cụm. Đo ở quy mô 2.000 fact: +115% số cặp nhưng chỉ +0,1 giây, rẻ hơn
nhiều so với để một fact trùng lọt ra trang.

Lưới này báo từ **0,62** trở lên, không phải 0,42 như trong cụm: hai fact khác cụm trong cùng
chủ đề dùng chung nhiều từ vựng là chuyện thường, và hạ xuống 0,42 thì thêm 99 cặp gần như
toàn nhiễu. Cổng ồn là cổng không ai đọc.

**Lưới thứ ba, vì hai lưới trên vẫn có lỗ — so RIÊNG tiêu đề.** Điểm toàn văn là bình quân
của tiêu đề (trọng số 2) và tóm tắt, nên hai fact **cùng một tiêu đề từng chữ** mà tóm tắt viết
bằng từ khác nhau sẽ bị phần tóm tắt kéo xuống dưới mọi ngưỡng. `sh-113` và `sh-210` trùng tiêu
đề tuyệt đối mà chỉ đạt **0,545** toàn văn — chúng đã lọt qua nguyên một đợt rà.

Luật: tiêu đề giống ≥ **0,70** và chung ≥ **4 token** thì báo, bất kể điểm toàn văn, và
**chặn commit** như mức 0,62. Đo ở 1.989 fact: 26 cặp vượt, 22 cặp là trùng thật, trong đó 6
cặp trùng tiêu đề tuyệt đối — độ chính xác 85%. Điều kiện 4 token là để lọc nhiễu tiêu đề
ngắn: hai tiêu đề 6 chữ chung 3 chữ phổ thông cho điểm rất cao mà chẳng liên quan.

Lưới này còn bắt được trùng **vắt qua chủ đề** mà hai lưới trên bỏ qua: Y2K nằm ở cả
`cong-nghe` và `lich-su`, bê tông La Mã ở `lich-su` và `hoa-hoc`, định luật Benford ở `so-hoc`
và `toan-hoc`.

**Cụm phình quá to thì tách.** `factlint stats` cảnh báo khi một cụm vượt 90 fact. Lúc đó
thêm cụm mới vào `manifest.clusters` và chia lại — vì cụm to thì mất đúng cái lợi đang khai
thác.

Danh sách cụm hiện tại nằm trong `data/manifest.json` → `clusters`. Đừng bịa `sub` mới mà
không khai báo ở đó: `factlint check` sẽ báo lỗi.

### Ba dạng trùng và cách xử

| Dạng | Ví dụ đã gặp | Xử |
|---|---|---|
| **Trùng thẳng** — hai fact cùng claim | `ls-002` / `ls-102` (Oxford già hơn Aztec) | giữ một, bỏ một |
| **Fact hệ quả** — B là suy ra từ A, hoặc là một chi tiết của A | `gt-010` (6 thành phần lời xin lỗi) / `gt-128` (2 thành phần nặng nhất) | nhập B vào `s` hoặc `d` của A |
| **Fact demo** — B tồn tại chỉ để treo minh hoạ cho A | `ct-014` (điểm mù) / `ct-101` (tự tìm điểm mù) | gắn `viz` vào A, bỏ B — xem §5 |

Dạng thứ ba là lỗi hay gặp nhất và khó thấy nhất. Nếu bạn định viết một fact mà tiêu đề nghe
như *"thử ngay"*, *"kéo thanh trượt"*, *"tự kiểm tra trong 20 giây"* — dừng lại: bạn đang định
tách một fact thành hai.

Ngược lại, hai fact được phép cùng cụm và nghe giống nhau khi chúng là **hai claim khác
nhau** (`ct-113` "ngáp không phải để lấy oxy" và `ct-114` "ngáp lây" — một nói về cơ chế, một
nói về hiện tượng xã hội). Khi giữ cả hai, hãy sửa tiêu đề cho khác nhau rõ ràng để người đọc
không tưởng là trùng.

---

## 4. Quy tắc kiểm chứng — cả bốn đều bắt buộc

1. **Có nguồn gốc.** `src` ghi tác giả + nơi công bố + năm, hoặc tên tổ chức (WHO, NASA, Ngân
   hàng Thế giới, Tổng cục Thống kê…).
2. **Nguồn là nguồn gốc, không phải bài báo kể lại.** Chỉ tìm được bài phổ thông → hoặc truy
   tới nghiên cứu gốc, hoặc bỏ fact.
3. **Có tranh cãi thì phải nói ra.** Hiệu ứng chưa nhân bản được, con số ước lượng thô, kết
   luận đang bị phản biện — nêu thẳng trong `s` hoặc `d`, kèm nguồn phản biện.
4. **Con số phải tự tính lại được.** Mọi phép tính (lãi kép, xác suất, quy đổi đơn vị) phải
   kiểm bằng máy trước khi đăng. Con số trong `t`/`s` phải khớp với con số mà minh hoạ tính ra.

Ba loại **không nhận**: giai thoại không truy được nguồn; mẹo tâm lý kiểu "93% giao tiếp là
phi ngôn ngữ"; số liệu do mô hình ngôn ngữ sinh ra mà chưa đối chiếu nguồn gốc.

---

## 5. Minh hoạ tương tác

**Quy tắc: fact nào demo được bằng visualization thì làm luôn; không demo được thì thôi.**
Không có mục "để sau". Fact tĩnh cứng nhắc hơn fact nghịch được rất nhiều, nên chỗ nào dựng
được thì phải dựng ngay lúc thêm fact.

**`viz` gắn vào chính fact mà nó minh hoạ. Không bao giờ tạo một fact riêng để chứa minh hoạ.**
Đây là lỗi đã xảy ra 7 lần và phải đi gộp lại — đừng lặp lại.

Demo được khi fact có một trong các dạng sau:

- **có tham số kéo được** → thanh trượt (nghịch lý ngày sinh, xét nghiệm dương tính, hệ Mặt Trời theo tỉ lệ)
- **có xác suất kiểm được bằng mô phỏng** → nút chạy nhiều lượt (Monty Hall, chuỗi tung đồng xu)
- **là ảo giác hoặc giới hạn của cảm giác** → dựng đúng kích thích đó (điểm mù, ảo giác bàn cờ, Stroop)
- **là so sánh hai phân bố / hai thang bậc** → hai biểu đồ cạnh nhau (chiều cao vs tài sản, lịch vũ trụ)

Không demo được: fact lịch sử, fact về một con số đơn lẻ, fact về một cơ chế sinh học không
quan sát được tại chỗ. Đừng nhồi biểu đồ trang trí vào những fact đó.

Cách thêm:

```js
// facts/viz.js — thêm vào registry window.FactViz ở cuối file
'ten-viz': function (root) {          // root là div rỗng, đứng đầu thân modal
  root.appendChild(note('Câu hướng dẫn cho người đọc.'));
  // dựng DOM/SVG vào root
}
```

Rồi thêm `"viz": "ten-viz"` vào fact. `factlint check` sẽ báo lỗi nếu `viz` trỏ vào hàm không
tồn tại.

Quy ước màu: cấu trúc dùng thang xám `--wb-neutral-*`; chỉ dùng `--wb-chart-*` ở chỗ **màu
chính là dữ liệu** (chuỗi biểu đồ, ô phân loại, màu chữ trong bài Stroop). Không hardcode màu,
không bịa class `wb-*` mới. Hàm nào ném lỗi thì `app.js` bắt lại và chỉ ẩn phần minh hoạ.

Bảng nào rộng phải bọc trong `<div class="wb-scroll-x">` — nếu không nó làm tràn ngang modal
trên điện thoại.

---

## 7. Truyện — loại nội dung thứ hai

> Thêm ngày 24/08/2026, theo yêu cầu của chủ trang: thư viện là **nguồn học tập** kiểu
> *10 vạn câu hỏi vì sao*, và không phải điều gì đáng biết cũng nén được vào một câu khẳng
> định. Có những thứ chỉ mở ra khi được kể.

Fact nói thẳng thế giới là thế nào. **Truyện đi đường vòng: nó kể một chuyện có thật, rồi để
lại một điều về thế giới.** Hai loại dùng chung `cat`/`sub`, chung ô tìm kiếm, chung lưới
card; trang có bộ chuyển **Tất cả / Fact / Chuyện**.

```json
{
  "id": "ch-001",                    // tiền tố ch-, không được đụng id của fact nào
  "cat": "lich-su",
  "sub": "phat-minh",                // dùng lại đúng cụm của fact — xem §3
  "t": "Chiếc hộp sắt của một tài xế xe tải",
  "s": "1–2 câu dẫn, hiện trên card.",
  "body": "Thân truyện. Ngăn đoạn bằng \n\n. 1.200–8.000 ký tự, tối thiểu 4 đoạn.",
  "mang_di": "Điều người đọc cầm về được — xem dưới. Tối thiểu 60 ký tự.",
  "tags": ["van-tai", "tieu-chuan"],
  "src": "Marc Levinson, The Box (Princeton University Press, 2006)"
}
```

### 7.1 `mang_di` — cổng chống "kể xong rồi sao?"

§1.1 mục 1 loại fact tường thuật vì *"kể xong rồi sao? Người đọc không cầm được gì về"*.
Truyện được phép tường thuật, nên nó phải trả lời đúng câu hỏi đó bằng một trường riêng.

**`mang_di` là một câu về THẾ GIỚI mà người đọc vẫn cầm được kể cả khi quên sạch mọi chi tiết
của câu chuyện.** Phép thử: xoá hết phần thân đi, câu đó còn đứng vững một mình không?

| Đạt | Trượt |
|---|---|
| *"Chọn lọc tự nhiên đo được trong một mùa: sau hạn hán 1977, mỏ chim sẻ trên Daphne Major dày thêm rõ rệt chỉ sau một thế hệ."* | *"Câu chuyện cho thấy thiên nhiên rất kỳ diệu."* — không nói gì về thế giới |
| *"Một chất trơ về hoá học không có nghĩa là vô hại: chính vì CFC không phản ứng với gì mà nó sống đủ lâu để trôi lên tầng bình lưu."* | *"Nên cẩn thận với công nghệ mới."* — lời khuyên |

`mang_di` chịu **đúng các luật mức `LOẠI` của cổng fact** (§1.1), trừ luật `tuong-thuat`. Nói
cách khác: phần thân là truyện, còn `mang_di` phải là một fact.

### 7.2 Không lên giọng dạy đời

Người đọc tự rút ra được, và `mang_di` đã là chỗ chứa phần kết luận. Cổng `day-doi` chặn ở
mức `LOẠI` những cụm mở đầu một bài giảng trong phần thân: *"bài học ở đây là…"*, *"điều này
dạy chúng ta…"*, *"chúng ta học được rằng…"*, *"suy cho cùng thì…"*.

Lời khuyên cũng bị chặn như với fact — nhưng **lời thoại trong ngoặc kép được miễn**, vì câu
nhân vật nói là dữ liệu của truyện chứ không phải giọng người kể.

### 7.3 Những thứ giữ nguyên như fact

- **Nguồn (§4) không nới một ly.** `src` bắt buộc, phải là nguồn gốc chứ không phải bài kể
  lại, và con số nào cũng phải tính lại được. Truyện hay mà không truy được nguồn thì bỏ.
- **Nói ra chỗ tranh cãi.** `ch-005` nêu thẳng rằng số ca tả đã giảm từ trước khi tay cầm
  cái vòi bị tháo — chính Snow ghi điều đó trong báo cáo. Bỏ chi tiết ấy đi thì câu chuyện
  gọn hơn và sai hơn.
- **Chống trùng.** Truyện quét gần trùng **với truyện**, không quét chéo với fact: một truyện
  kể sâu về cùng chủ đề với một fact là đúng thiết kế, không phải trùng.
- **Tự chứa (§1.5).** Người 15 tuổi chưa học ngành đó đọc xong phải nắm được.

### 7.4 Thêm một truyện

Cùng pipeline §2, khác ở bước 2 và bước 5:

1. Tìm — nguồn dạng truyện tốt: hồ sơ điều tra tai nạn, hồi ký kỹ thuật, sách sử chuyên khảo,
   báo cáo nguyên thuỷ của chính người trong cuộc.
2. **Viết `mang_di` TRƯỚC.** Không nghĩ ra được câu đó thì đừng viết truyện — nghĩa là chưa
   có gì để mang về.
3. Tra trùng bằng `factlint near` trong cùng cụm.
4. Verify nguồn theo §4.
5. Thêm vào `data/chuyen/<đợt>.json`, khai tên file vào `manifest.files_chuyen`.
6. `factlint check && factlint verify` — cả hai lệnh soi cả fact lẫn truyện, không cần cờ gì thêm.

---

## 6. Trước khi commit

```bash
python3 facts/tools/factlint.py check     # cấu trúc + cặp gần trùng
python3 facts/tools/factlint.py verify    # cổng định nghĩa §1 — phải 0 fact LOẠI
python3 facts/tools/factlint.py stats     # phân bố theo cụm, cảnh báo cụm to
```

Hai cổng này còn chạy **tự động** ở hai lớp, và cả hai đều đi theo repo:

| Lớp | Khi nào | Khai báo ở | Chặn không |
|---|---|---|---|
| `tools/hooks/post-edit.sh` | mỗi lần Edit/Write vào `facts/data/*.json` | `.claude/settings.json` (được git theo dõi) | có — trả lỗi cho model tự sửa |
| `tools/hooks/pre-commit` | lúc `git commit` có chạm `facts/` | `.git/hooks/pre-commit` | có — chặn commit |

Lớp thứ nhất chỉ bắt được sửa bằng Edit/Write; thay đổi viết bằng script (`python3 - <<EOF`,
`sed`…) lọt qua nó và bị lớp thứ hai bắt. Vì vậy **phải có cả hai**.

Lớp thứ hai nằm trong `.git/`, mà `.git/` không clone theo được — nên đầu mỗi phiên phải chạy
một lần:

```bash
sh facts/tools/install-hooks.sh
```

Chi tiết cơ chế ba lớp cổng của cả repo: [CLAUDE.md ở gốc repo](../CLAUDE.md).

Nếu có sửa UI hoặc thêm minh hoạ, chạy tiếp bốn cổng cơ học của
[page-review](../web-builder/) : không class `wb-*` tự chế, không nền màu trong `<main>`,
không tràn ngang ở 1280/900/700/390, navbar đúng 56px. Mở trang qua HTTP
(`python3 -m http.server`), không mở bằng `file://` — trang đọc data bằng `fetch`.

Cập nhật khi con số đổi: `updated` trong `manifest.json`, và số fact trong `README.md`.
