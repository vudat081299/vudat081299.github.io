# Trang Fact — hướng dẫn cho AI làm việc trong thư mục này

Thư viện fact tiếng Việt cho người trưởng thành. Trang tĩnh, không build, dựng bằng
[web-builder](../web-builder/) v0.6. Mọi thứ dưới đây áp dụng cho **mọi** thay đổi trong
`facts/` — kể cả khi bạn chỉ được nhờ "thêm vài fact".

Kiến trúc, cách chạy tại máy và cấu trúc file: xem [README.md](README.md). File này nói về
**quy trình** và **các quy tắc không được vi phạm**.

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
  "t": "Chỉ cần 23 người trong phòng là xác suất có hai người trùng ngày sinh vượt 50%",
  "s": "1–3 câu. Nêu luôn con số và nêu luôn chỗ trực giác hỏng. Bắt buộc.",
  "d": "Phần dài, tuỳ chọn. Ngăn đoạn bằng \n\n. Chỉ hiện trong modal.",
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

---

## 2. Pipeline thêm fact — làm đúng thứ tự này

Bước 3 là bước tuyệt đối không được bỏ. Toàn bộ cơ chế chống trùng nằm ở đó.

### Bước 1 — Tìm

Chọn **một cụm** (`cat` + `sub`) rồi tìm fact trong cụm đó, đừng tìm lan man. Làm việc theo
cụm là điều kiện để bước 3 chạy được, và nó cũng làm bạn thấy ngay chỗ nào trong cụm còn
thưa. Nguồn tốt: nghiên cứu gốc, cơ quan thống kê, sách chuyên khảo, các bài tổng hợp phản
biện lại một kết quả nổi tiếng.

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
