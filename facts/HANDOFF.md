# HANDOFF — nhật ký rà soát và những gì còn nợ

File này là **nhật ký**, không phải luật. Luật nằm ở [CLAUDE.md](CLAUDE.md); file này ghi
những gì đã đo, những gì đã thử và rớt, và những gì còn chưa làm — để phiên sau không lặp lại
công việc đã làm và không tưởng là mọi thứ đã xong.

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
| Toàn văn (`t` + `s` + `src`) | **chỉ đọc ~230 fact** — những fact bị cổng gắn cờ hoặc bị tiêu đề làm nghi ngờ |
| `src` truy tới nguồn gốc | chỉ kiểm ~40 fact ở đợt trước; **1.900 fact còn lại chưa ai đối chiếu** |
| 358 cặp gần trùng trong dải 0,42–0,62 | chưa đọc; CLAUDE.md chỉ bắt buộc từ 0,62 |

**Hệ quả thực tế:** một fact có tiêu đề đọc được nhưng thân bài sai số liệu thì đợt này
**không bắt được**. Muốn chắc thì phải đọc toàn văn, và đó là việc chưa làm.

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

### Việc nên làm tiếp, theo thứ tự

1. **Đọc toàn văn theo cụm** (161 cụm, mỗi cụm 20–60 fact). Đây là việc duy nhất bắt được lỗi
   số liệu trong thân bài, và cũng là cách rẻ nhất để tìm thêm cặp trùng ý.
2. **Đối chiếu `src`** cho các fact có con số cụ thể — 1.900 fact chưa ai kiểm.
3. **Nâng ba luật mới từ `XEM` lên `LOẠI`.** Thư viện đang sạch nên nâng được ngay, và nâng
   rồi thì lỗi cùng loại không tái phát. Đây là quyết định của chủ trang, không phải của agent.
4. Thử hướng nhúng ngữ nghĩa cho lưới chống trùng (mục 1 ở trên).
