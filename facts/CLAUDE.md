# Trang Fact — hướng dẫn cho AI làm việc trong thư mục này

Thư viện fact tiếng Việt cho người trưởng thành. Trang tĩnh, không build, dựng bằng
[web-builder](../web-builder/) v0.6. Mọi thứ dưới đây áp dụng cho **mọi** thay đổi trong
`facts/` — kể cả khi bạn chỉ được nhờ "thêm vài fact".

Kiến trúc, cách chạy tại máy và cấu trúc file: xem [README.md](README.md). File này nói về
**quy trình** và **các quy tắc không được vi phạm**.

---

## 1. Một fact là gì

Một fact = **một điều khẳng định duy nhất, kiểm chứng được, làm người đọc đổi cách nghĩ hoặc
cách làm**. Không phải một chủ đề, không phải một đoạn giới thiệu.

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

Ưu tiên nội dung, theo đúng thứ tự này:

1. **Sửa một hiểu lầm thường ngày.** Thứ nhiều người tin và tin sai.
2. **Đổi một hành vi hằng ngày.** Cách nói, cách tiêu tiền, cách ngủ, cách chọn.
3. **Hiệu chỉnh trực giác về thang bậc.** Thời gian, khoảng cách, xác suất, tiền.
4. Thứ chỉ thú vị chứ không dùng được: nhận, nhưng ít.

Viết bằng tiếng Việt thường ngày. Không "nghiên cứu cho thấy", không "các nhà khoa học đã
chứng minh". Nêu thẳng con số và nêu thẳng ai tìm ra nó.

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

Rồi kiểm ba câu hỏi:

- Người đọc đổi được gì sau khi biết? Không đổi được gì → bỏ.
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
lọt lưới (`ct-014`/`ct-101` từng lọt ở mức 0,57). Nên sau khi chạy `near`, vẫn phải:

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
python3 facts/tools/factlint.py check
```

Phải sạch lỗi. Cặp nào ≥ 0,62 mà bạn cố ý giữ thì phải giải thích được vì sao chúng là hai
claim khác nhau — nếu không giải thích được thì nó là trùng, đi gộp lại.

---

## 3. Chống trùng bằng cách phân cụm

Vấn đề: so một fact mới với `n−1` fact còn lại là bất khả thi khi `n` lớn. Cách giải:

**Mỗi fact có `sub`** — một cụm nhỏ trong chủ đề, khai báo ở `manifest.clusters`. Fact trùng
nhau gần như luôn cùng chủ đề *và* cùng cụm, nên chỉ cần so trong cụm. Với 3.000 fact và
~118 cụm thì mỗi cụm khoảng 25 fact — đọc hết được bằng mắt.

**Lưới an toàn cho trường hợp đặt sai cụm:** `factlint check` còn dựng một chỉ mục nghịch đảo
trên các token *hiếm* (kể cả con số), và chỉ so hai fact khi chúng dùng chung một token hiếm.
Chi phí gần như tuyến tính, nên nó vẫn chạy được ở quy mô rất lớn. Nhờ vậy một fact bị xếp
lệch cụm vẫn có cơ hội bị bắt.

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
python3 facts/tools/factlint.py stats     # phân bố theo cụm, cảnh báo cụm to
```

Nếu có sửa UI hoặc thêm minh hoạ, chạy tiếp bốn cổng cơ học của
[page-review](../web-builder/) : không class `wb-*` tự chế, không nền màu trong `<main>`,
không tràn ngang ở 1280/900/700/390, navbar đúng 56px. Mở trang qua HTTP
(`python3 -m http.server`), không mở bằng `file://` — trang đọc data bằng `fetch`.

Cập nhật khi con số đổi: `updated` trong `manifest.json`, và số fact trong `README.md`.
