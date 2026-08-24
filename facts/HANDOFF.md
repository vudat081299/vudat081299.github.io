# HANDOFF — nhật ký rà soát và những gì còn nợ

File này là **nhật ký**, không phải luật. Luật nằm ở [CLAUDE.md](CLAUDE.md); file này ghi
những gì đã đo, những gì đã thử và rớt, và những gì còn chưa làm — để phiên sau không lặp lại
công việc đã làm và không tưởng là mọi thứ đã xong.

---

## Đợt rà 24/08/2026 — đọc toàn văn cả 1.944 fact · 5 lỗi số liệu · và con số dứt điểm cho lưới chống trùng

**Nguyên nhân:** chủ trang giao "làm nốt toàn bộ" mục `Việc nên làm tiếp`. Mục 1 của danh
sách đó — *đọc toàn văn theo cụm* — nay **đã xong: 20/20 chủ đề, 161 cụm, cả 1.944 fact,
đọc `t` + `s` + `d` chứ không chỉ tiêu đề.**

### 1. Năm lỗi số liệu, và không cái nào cổng bắt được

Vì mỗi con số riêng lẻ đều hợp lệ; cái sai nằm ở chỗ chúng **không khớp NHAU**. Hai trong
năm ca bị chính thân bài của mình bác bỏ. Chi tiết ở commit `0225057`; tóm tắt:

| fact | sai gì | tính lại ra |
|---|---|---|
| `th-232` | tiêu đề: AES-256 có tổ hợp **lớn hơn** số nguyên tử vũ trụ. Thân bài: 10^77 vs 10^80 | 2^256 = 1,158×10^77 — **nhỏ hơn** 10^80 một nghìn lần |
| `th-242` | "hơn **60 tỉ tỉ** lộ trình" cho 20 thành phố | 19!/2 = 6,08×10^16 ⇒ phải là "60 **triệu** tỉ", lệch 1.000 lần |
| `vl-218` | tiêu đề "tốt nhất chỉ ~45%", thân bài "chu trình hỗn hợp 60–64%" | mâu thuẫn trong cùng một fact |
| `vl-309` | "tủ lạnh 100 W chạy cả ngày hết ~1 kWh" | 100 W × 24 h = **2,4 kWh** |
| `hh-342` | "1 g vàng → 1 m², dày 0,1 µm" | 1 g = 0,0518 cm³ ⇒ trải 1 m² chỉ dày **0,052 µm**, lệch 2 lần |

Đối chứng quan trọng cho `th-242`: `th-273` dùng "18 tỉ tỉ" cho 2^64−1 = 1,84×10^19 và
**đúng**, nên thư viện dùng đơn vị nhất quán — đây là lệch thật, không phải quy ước khác.

### 2. Con số dứt điểm cho câu hỏi treo từ 12/08: lưới chống trùng bỏ lọt bao nhiêu

Đợt 12/08 kết luận *"cosine trên từ vựng không phát hiện được trùng ý"* nhưng chỉ có 9 ca làm
bằng chứng. Đọc toàn văn cho mẫu lớn hơn hẳn: **86 cặp trùng hoặc chồng lấn tìm bằng MẮT**.
Chấm lại cả 86 bằng đúng `build_index` + `cosine` của `factlint`:

```
 1 cặp  đã có người đọc và khai `khac_voi` (dl-237/dl-320, 0,69) — không tính
23 cặp  cổng CÓ báo, nằm trong 356 cặp dải 0,42–0,62 mà CHƯA AI ĐỌC
62 cặp  cổng KHÔNG THỂ thấy — dưới mọi ngưỡng
─────
        ⇒ trong 85 cặp chưa ai xử, lưới bỏ lọt 62 = 73%
```

**Ca cực đoan: `gt-003` / `gt-101` chỉ đạt 0,027.** Cùng cụm `quan-he`, cùng nguồn Gottman &
Levenson (1992), và `d` của `gt-003` nói nguyên văn claim mà `gt-101` lấy làm tiêu đề. Điểm
gần bằng KHÔNG.

**Hệ quả cho hướng đi:** hạ ngưỡng không cứu được — 0,027 thì hạ tới đâu cũng không tới, mà
xuống 0,42 đã có 356 cặp gần như toàn nhiễu (đối chứng: `ls-125` "máy tính đầu tiên là phụ
nữ" ghép với `gt-274` "nụ cười thật vs xã giao" cũng ở 0,42). Chỉ còn hai đường thật: nhúng
ngữ nghĩa, hoặc đọc tay theo cụm. **Đợt này là bằng chứng cho đường thứ hai.**

Một lỗ CỤ THỂ, đo được, của lưới thứ ba (so riêng tiêu đề): `vl-254` / `vt-145`. Tiêu đề
`vt-145` là **chuỗi con nguyên văn** của `vl-254`, cùng nguồn Einstein (1905). Điểm tiêu đề
**0,775 — VƯỢT ngưỡng 0,70** nhưng chỉ chung **3 token < `TITLE_MIN_SHARE` = 4** nên bị loại.
Tức chính bộ lọc chống nhiễu đang miễn trừ nhóm **tiêu đề ngắn**, nơi trùng lặp dễ xảy ra
nhất. CLAUDE.md §3 có ghi lý do đặt ngưỡng 4 nhưng chưa ai đo cái giá của nó.

### 3. Một lớp lỗi nữa, đã đo: câu đầu của `s` chép lại tiêu đề

`s` chỉ có 1–3 câu, nên chép lại tiêu đề là vứt đi một phần ba chỗ trống. Đo cả thư viện
bằng tỉ lệ giống giữa `t` và câu đầu tiên của `s`:

```
>= 0,90 (gần như chép nguyên)  5 fact  ct-111 (1,00 — chép TỪNG CHỮ) · tl-338 · kt-145 · tl-315 · cn-136
0,75–0,90                     20 fact
0,60–0,75                     26 fact  <- phần lớn hợp lệ: nhắc lại rồi thêm dữ kiện
──────
tổng >= 0,60                  51/1.944 = 2,6%
```

Dải 0,60–0,75 KHÔNG nên bắt. Ngưỡng đáng đặt cổng là **>= 0,90**, nơi chỉ có 5 ca và cả 5
đều là chép thuần. **Chưa sửa 5 ca này và chưa cài cổng** — xem mục 5.

### 4. Ba dạng lỗi mà đợt 12/08 nêu — kiểm lại kết quả

| dạng | trạng thái sau đợt này |
|---|---|
| sai một chữ làm câu vô nghĩa | **không còn ca nào** trong 1.944 fact |
| trộn hai đơn vị trong một câu | còn, và đó chính là `vl-309` + `hh-342` ở mục 1 |
| dịch sai thuật ngữ | không còn ca rõ ràng; ca gần nhất là thuật ngữ **KHÔNG nhất quán** giữa hai fact: `tl-157` gọi hot–cold empathy gap là "khoảng trống đồng cảm nóng–lạnh" còn `tl-244` gọi "khe trống đồng cảm nội tại" (cùng nguồn Loewenstein 1996); `na-203` gọi cent là "phần trăm cung" còn `na-366` gọi "xu" |
| 9 cặp trùng dưới ngưỡng của đợt 12/08 | **cả 9 đã xử**, đã kiểm từng cặp |

Thêm một dạng chưa từng được nêu: **dấu vết dán ghép còn sót trong `s`**. `sk-018` có câu
cuối lặp lại ý câu đầu của chính nó và mở bằng "Ví dụ rõ nhất là…" — giọng của một fact TỔNG
QUÁT về chẩn đoán quá mức, không phải của fact này. `tl-118` có hai câu liền nhau nói cùng
một điều ("chính đồng tác giả sau đó công khai không còn tin"). Không cổng nào bắt được.

### 5. Cố ý KHÔNG làm, và vì sao

- **Không gộp 85 cặp trùng.** §3 cho ba cách xử khác nhau (bỏ một · nhập vào `s`/`d` · gắn
  `viz` rồi bỏ) và chọn cách nào là **quyết định biên tập cho từng cặp**, không suy ra được
  từ điểm số. Gộp 85 cặp trong một lượt là 85 lần viết lại nội dung mà không ai soát. Danh
  sách đầy đủ nằm ở mục 6; nó là **worklist đã đo**, không phải một ý kiến.
- **Không sửa 5 ca chép tiêu đề và không cài cổng >= 0,90.** Cùng lúc tôi đọc, một phiên
  khác đang sửa chính `factlint.py` (commit `de9eff2`). Thêm cổng vào file đang có người sửa
  là cách nhanh nhất tạo xung đột. Số đo đã sẵn ở mục 3, việc để nguyên.
- **Không đối chiếu `src`** (mục 2 của danh sách cũ) — xem mục 6.

### 6. Còn nợ sau đợt này

1. **Gộp 85 cặp trùng** theo danh sách đã đo. 23 cặp nằm trong 356 cặp cổng đã báo; 62 cặp
   cổng không thấy nên phải đi từ danh sách này chứ không từ đầu ra của `check`.
   Rõ nhất, nên làm trước: `gt-003`/`gt-101` · `tl-141`/`tl-298` · `dl-259`/`dl-325` ·
   `dl-232`/`dl-317` · `hh-296`/`hh-313` · `tl-103`/`tl-335` · `tl-110`/`tl-328` ·
   `xh-007`/`xh-103` · `xh-019`/`xh-147` · `th-228`/`th-314` · `th-216`/`th-287` ·
   `sk-136`/`hh-273` · `vl-280`/`vl-307` · `ct-002`/`ct-144` · `ct-004`/`ct-111`.
2. **`xh-010` / `xh-143` mâu thuẫn NGÀY với nhau**, không chỉ trùng: một fact ghi Việt Nam
   công nhận án lệ **từ 2015**, fact kia ghi **từ 2016**, cả hai trích cùng Nghị quyết
   03/2015. Phải chốt một mốc.
3. **Sửa 5 ca chép tiêu đề + cân nhắc cổng >= 0,90** (mục 3 — đã có số, chỉ chờ
   `factlint.py` rảnh tay).
4. **`TITLE_MIN_SHARE`**: cân nhắc miễn điều kiện >= 4 token khi một tiêu đề là chuỗi con
   của tiêu đề kia. Phải ĐO trước — chưa biết luật đó nổ vào bao nhiêu ca đúng.
5. **Đối chiếu `src`** — vẫn chưa ai làm. Đọc toàn văn để lại **hai ca cần truy nguồn**:
   `sv-295` ghi hoá thạch rừng Nam Cực cách cực Nam ~500 km trong khi Klages, Nature (2020)
   báo ~900 km; `vl-203` ghi tán xạ Rayleigh "gấp khoảng 16 lần" trong khi 1/λ⁴ cho 16 chỉ
   khi tỉ số bước sóng đúng bằng 2 (dải khả kiến thật cho 5–9 lần).
6. **Nhúng ngữ nghĩa cho lưới chống trùng** — mục 2 giờ đã có con số 73% để biện minh cho
   chi phí của hướng này.

### Số đo cuối đợt

```
check : 1944 fact · 46 file · 20 chủ đề · 0 cặp >= 0,62 · 0 cặp trùng tiêu đề
verify: 0 LOẠI · 0 XEM · 140 xem_ok
đã đọc: 20/20 chủ đề · 161/161 cụm · 1.944/1.944 fact (t + s + d)
```

---

## Đợt rà 12/08/2026 — cổng "tự chứa" và đọc tay toàn bộ thư viện

**Nguyên nhân:** chủ trang mở trang lên, gặp `sh-207` (*"Ngưỡng 0,05 là một lựa chọn tuỳ tiện
do Ronald Fisher đề xuất…"*) và chỉ ra rằng fact đó chỉ đọc được nếu người đọc **đã biết**
p-value là gì. Yêu cầu: sửa cổng, rồi rà lại toàn bộ, không rà theo từng cụm.

**Đã làm:** 2.000 → **1.945 fact**. Hai cổng mới (§1.5 thuật ngữ, §3 lưới tiêu đề), đọc tay
tiêu đề của **cả 1.945 fact** trong 20 chủ đề, sửa ~150 fact, xoá 55 fact.

### Còn nợ — đọc chưa đủ sâu

| Việc | Trạng thái |
|---|---|
| Tiêu đề của cả 20 chủ đề | **đã đọc hết** |
| Toàn văn (`t` + `s` + `d`) | ~~chỉ đọc ~230 fact~~ → **đọc HẾT 1.944 fact ở đợt 24/08** |
| `src` truy tới nguồn gốc | chỉ kiểm ~40 fact ở đợt trước; **vẫn còn ~1.900 fact chưa ai đối chiếu** |
| 358 cặp gần trùng trong dải 0,42–0,62 | vẫn chưa đọc hết; đợt 24/08 đã đọc 23 cặp trong số đó |

**Hệ quả thực tế (viết 12/08):** một fact có tiêu đề đọc được nhưng thân bài sai số liệu thì
đợt đó **không bắt được**. → Đợt 24/08 đã đọc toàn văn và tìm ra đúng 5 ca như vậy.

### Lưới chống trùng có lỗ đã đo được

Đợt này tìm ra **9 cặp trùng thật nằm dưới mọi ngưỡng** — chúng cùng một claim nhưng diễn đạt
bằng từ vựng khác hẳn nhau, nên điểm cosine thấp:

| Cặp | Điểm | Nội dung |
|---|---|---|
| `sk-116` / `sk-223` | 0,477 | lợi ích vận động dốc nhất ở đoạn đầu |
| `sv-116` / `sv-227` | 0,484 | chó hiểu chỉ tay, tinh tinh không |
| `vt-017` / `vt-208` | 0,495 | Sao Thổ nổi được trên nước |
| `na-245` / `na-371` | 0,496 | ma trận Bayer, mắt nhạy màu lục |
| `tp-232` / `tp-317` | 0,462 | muối và đường bảo quản bằng hút nước |
| `cn-011` / `cn-114` | 0,399 | mô hình ngôn ngữ dự đoán chữ, không tra cứu |
| `vt-022` / `vt-112` | 0,386 | ngày trên Trái Đất đang dài ra |
| `vt-113` / `vt-217` | 0,331 | không có "mặt tối" của Mặt Trăng |
| `ls-127` / `dl-252` | 0,71 | Mercator phóng to Greenland (lưới tiêu đề bắt được) |

**Kết luận: cosine trên từ vựng không phát hiện được trùng ý.** Hạ ngưỡng không giải quyết
được — ở 0,42 đã có 358 cặp mà phần lớn là nhiễu, hạ tiếp thì cổng chết vì ồn. Ba hướng chưa
thử, ghi ra để phiên sau cân nhắc:

1. **So bằng nhúng ngữ nghĩa** (embedding) thay vì cosine từ vựng. Cần thư viện ngoài — trái
   với nguyên tắc "trang tĩnh, không phụ thuộc" của repo, nhưng `factlint.py` là công cụ dev
   nên có thể chấp nhận. Đây là hướng khả thi nhất.
2. **Chỉ mục theo cặp (chủ thể, con số)**: trích mọi con số kèm đơn vị rồi so trùng. Bắt được
   `vt-017`/`vt-208` (cùng 0,687 g/cm³) nhưng không bắt được cặp không có số chung.
3. **Đọc tay theo cụm định kỳ.** Rẻ, chắc, và là cách 9 cặp trên bị phát hiện.

### Ba dạng lỗi chỉ đọc mới thấy

Không luật máy nào bắt được, ghi lại để biết phải soi bằng mắt cái gì:

1. **Sai một chữ làm câu vô nghĩa.** `ct-201` viết "vùng trung tâm rất hẹp của **thị trường**"
   thay vì "thị giác". `hh-301` viết "seaborgi" thiếu chữ. `ct-118` "tổ tiên **có mang**" đọc
   ra nghĩa "mang thai" thay vì "thở bằng mang".
2. **Trộn hai đơn vị trong một câu.** `xh-105`: *"Cứ 10 người từng sống trên Trái Đất thì
   khoảng 7% đang sống hôm nay"* — "cứ 10 người" và "7%" không nối được với nhau.
3. **Dịch sai thuật ngữ.** `td-017` gọi *planning fallacy* là "nguỵ biện **chi phí quy hoạch**";
   cụm đó không có nghĩa gì trong tiếng Việt.

### Ba dạng đã đo và RỚT ở đợt này

Đã ghi vào [CLAUDE.md §1.6](CLAUDE.md). Đừng dựng lại: định nghĩa bằng phủ định (124 fact,
gần như toàn fact lành), tên riêng trong tiêu đề (13 fact, cả 13 nêu luôn nội dung), đại lượng
trần (12 fact, đều rõ nghĩa). Cộng thêm hai thứ đã thử và bỏ trong lúc làm: bộ lọc "câu có dấu
giải thích" (chia 150 fact thành 70/80 mà cả hai nhóm đều lẫn lành với hỏng) và so cosine giữa
`t` và `s` (fact hỏng cho điểm *thấp hơn* fact lành).

### Danh sách thuật ngữ đã thu ba lần

`THUAT_NGU` trong `factlint.py` chỉ chứa từ phải học đúng ngành mới hiểu. Đã bỏ khỏi danh sách,
mỗi lần đều vì đo thấy bắt oan:

- **chương trình phổ thông:** số nguyên tố, luỹ thừa, logarit, đồng vị, động lượng, biên độ,
  chiết suất, ma trận, tích phân → bản đầu gắn cờ 150 fact mà phần lớn đọc được bình thường.
- **có nghĩa thường:** hiệu lực ("hiệu lực pháp lý"), độ tin cậy ("mức tin tưởng"), độ nhạy
  ("độ nhạy của micro", "độ nhạy mũi chó").
- **bắt oan chuỗi con:** `tích phân` khớp vào "Phân **tích phân** tử".

### Cổng tự bắt lỗi của chính bản viết lại

Đáng ghi lại vì nó chứng minh cổng có giá trị thật, không chỉ là thủ tục. Trong lúc viết lại,
cổng chặn **6 lỗi do chính tôi tạo ra**:

- `tl-151`, `tl-347` — viết lại xong thì không còn con số nào, vướng mức `LOẠI`.
- `ct-111`, `sh-019`, `ls-127` — bản viết lại trùng một fact khác trên 0,62.
- `cn-138` — bản viết lại có "có thể" ở tiêu đề, vướng luật `do-du`.
- `sv-145` — viết "một tỉ" bằng chữ nên luật `do-lon-bang-chu` không thấy con số nào.

### Số đo cuối đợt

```
check : 1945 fact · 46 file · 20 chủ đề · 0 cặp ≥ 0,62 · 0 cặp trùng tiêu đề
verify: 0 LOẠI · 0 XEM · 151 xem_ok
HTTP  : 1945 fact nạp được, 0 id trùng
```

### Việc nên làm tiếp, theo thứ tự — ĐÃ LẠC HẬU, xem mục 6 của đợt 24/08

Giữ nguyên để đối chiếu; trạng thái thật của từng món:

1. ~~**Đọc toàn văn theo cụm**~~ → **XONG** ở đợt 24/08: 161/161 cụm, 1.944/1.944 fact.
2. **Đối chiếu `src`** — vẫn chưa làm. Đợt 24/08 để lại hai ca cụ thể cần truy: `sv-295`,
   `vl-203`.
3. ~~**Nâng ba luật mới từ `XEM` lên `LOẠI`**~~ → **đã xử ở commit `9fb9c43`, nhưng KHÁC
   cách viết ở đây.** Đo lại thì lý do "thư viện đang sạch nên nâng được ngay" **sai**: nâng
   thẳng chặn 28 fact và đọc tay cả 28 thì không cái nào sai. Cái hỏng nằm ở phép thử mỏ neo
   chứ không ở mức nghiêm — nay LOẠI khi mọi con số đều nằm trong câu giả định.
4. **Nhúng ngữ nghĩa cho lưới chống trùng** — đợt 24/08 đo được lưới bỏ lọt **73%**, đủ số
   để biện minh cho chi phí.
