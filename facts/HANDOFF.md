# HANDOFF — nhật ký rà soát và những gì còn nợ

File này là **nhật ký**, không phải luật. Luật nằm ở [CLAUDE.md](CLAUDE.md); file này ghi
những gì đã đo, những gì đã thử và rớt, và những gì còn chưa làm — để phiên sau không lặp lại
công việc đã làm và không tưởng là mọi thứ đã xong.

---

## Đợt 25/08/2026 — truyện tách khỏi chủ đề fact, và đích mới 3.000 / 500

**Nguyên văn hai câu của chủ trang:** *"Tôi tưởng những truyện ngắn thì sẽ có 1 tab truyện
ngắn riêng ở thanh chủ đề, không phải à, hiện tại đang là như thế nào, đang lẫn vào các chủ
đề của fact à hay sao"* — và sau đó: *"fact tôi muốn khoảng 3000 fact, truyện thì 500"*.

### 1. Truyện có trục riêng `kieu` (§7.0)

Chủ trang chọn giữa ba phương án và lấy phương án tách hẳn: bỏ `cat`/`sub` của fact khỏi
truyện, dựng vốn từ riêng, phân theo **hình dạng câu chuyện** chứ không theo đề tài. Sáu
kiểu trong `manifest.kieu_chuyen`. Cổng đổi theo, và bắt cả `cat`/`sub` sót lại.

`ky-quac` được khai với 0 truyện — chủ trang hỏi riêng về "truyện hài". Chốt kèm: **nguồn
không nới cho nó**, cái buồn cười phải nằm ở sự việc có thật.

### 2. Thanh chủ đề ba nhóm, và `state.kind` biến mất

Trước đây có hai biến trạng thái mà chỉ một biến vào hash, nên chọn "Chuyện" xong reload là
mất. Giờ một biến `cat` duy nhất, mọi thứ đi qua URL. Bộ pill giữ lại vì trên điện thoại
thanh bên nằm sau nút ☰.

### 3. 22 → 38 truyện, ba đợt

| đợt | file | thêm | ký tự thân |
|---|---|---|---|
| 1 | `chuyen/dot-03.json` | 2 (`ky-quac`) | 2.281–2.772 |
| 2 | `chuyen/dot-04.json` | 7 (4 kiểu) | 1.617–2.018 |
| 3 | `chuyen/dot-05.json` | 7 (5 kiểu) | 1.397–1.870 |

Phân bố cuối: `tham-hoa` 11 · `do-tan-noi` 7 · `giai-ma` 6 · `ca-benh` 5 · `ky-quac` 5 ·
`mot-y-tuong` 4.

**Ba con số bị bỏ vì không lần tới được nguồn gốc**, ghi ra đây để phiên sau đừng nhặt lại
từ các bài kể lại: liều "1/60 grain strychnine" của Thomas Hicks (ch-023), cân nặng
"2,5 → 8 lb" của con gà Mike (ch-028), và con số tử vong "sáu người chết" của Therac-25 —
chính văn Leveson & Turner nói sáu **vụ**, không phải sáu người chết (ch-026).

### Còn nợ

- **Đích còn xa.** Fact 1.909/3.000 (+1.091). Truyện 38/500 (+462). Nhịp đo được của repo
  là ~25 fact hoặc ~14 truyện một commit, nên còn khoảng 70 đợt nữa.
- **Cụm fact mỏng vì cổng, không vì bị quên.** `kinh-doanh/ban-hang-marketing` **0** fact,
  `tu-duy/mo-hinh-tu-duy` 1, `kinh-doanh/dam-phan` 1, `kinh-doanh/do-luong` 1. Đó là chỗ
  §1.1 luật 2 (lời khuyên) và luật 5 (mô hình đặt tên) giết gần hết ứng viên. Kế hoạch
  "rải đều 6,7 fact/cụm" là kế hoạch sai — cần đo lại cụm nào thật sự nuôi được trước khi
  hứa số.
- **Sáu kiểu truyện sẽ không đủ ở mốc 500** (trung bình 83 truyện/kiểu, duyệt không nổi).
  Nên tách thêm kiểu quanh mốc 150–200 truyện, trước khi việc gán lại thành migrate lớn.
- **`install-hooks.sh` gãy trong git worktree**: nó hardcode `$ROOT/.git/hooks`, mà trong
  worktree `.git` là một *file* trỏ đi chỗ khác. Sửa bằng `git rev-parse --git-common-dir`.
  Repo này dùng worktree thường xuyên, và CLAUDE.md gốc bảo mọi phiên chạy lệnh đó đầu tiên.

---

## Đợt 24/08/2026 (d) — chủ trang chỉnh lại trọng tâm

**Nguyên văn:** *"Mục đích của tôi không phải là muốn bạn thêm giải thích vì sao, nhưng thôi
cũng được, nhưng mục đích chính là bổ sung truyện ngắn, bổ sung fact và sửa lại diễn giải các
fact đang có + tập trung lấy fact + truyện ngắn từ những nguồn uy tín, diễn giải tốt."*

Đợt (c) đọc sai thứ tự ưu tiên: nó dồn công vào lớp "vì sao" và migrate 563 fact. Lớp đó
không sai — chủ trang nói "thôi cũng được" — nhưng nó không phải việc chính. Đợt (d) làm ba
việc theo đúng thứ tự chủ trang nêu.

### 1. Truyện: 8 → 22

`data/chuyen/dot-02.json`, 14 truyện phủ 14 chủ đề chưa có truyện nào. Mỗi truyện tra nguồn
gốc trước khi viết, không dựa vào bài kể lại: báo cáo điều tra MCO/Tenerife, tám bản ghi nhớ
SRG của Wald, Fisher 1935, Beaumont 1833, Marshall trên *Lancet* và *MJA*, Scoville & Milner
1957, Billah & Scanlan 1991, Euler 1736, Ostrom 1990, Freeth *Nature* 2006, Soper *JAMA* 1907.

Bốn truyện nói thẳng chỗ tranh cãi vì bỏ đi thì gọn hơn và sai hơn — cảnh Wald chỉ tay vào sơ
đồ là do người đời sau kể thêm; Fisher không ghi kết quả của bà Bristol; tự thí nghiệm một
người chỉ khép được mắt xích đầu; cửa sổ 1980–2011 làm Simon thua 4/5 kim loại.

**Hai ngưỡng của cổng truyện giờ đã có mẫu để tin.** Trước đợt này cả 8 truyện do một người
viết nên 1.200–8.000 ký tự và tối thiểu 4 đoạn chưa được thử. 22 truyện hiện tại nằm trong
khoảng 1.778–2.551 ký tự, 5–6 đoạn — tức **trần 8.000 chưa bao giờ chạm tới**, và nếu sau này
có ai muốn siết trần xuống thì đó là quyết định có số liệu, không phải cảm tính.

### 2. Cổng mới `s-ke-nguoi-tim-ra`, và 98 fact viết lại

Đây là chỗ "diễn giải học thuật" thật sự nằm. Đo: **94 fact có `s` lấy một nghiên cứu làm chủ
ngữ** — *"Các nghiên cứu về mất nước cho thấy…"*. Đọc tay cả 94, ~80 lỗi thật → độ chính xác
~85%, đủ cho mức `XEM`. Luật + bốn nhóm được miễn: [CLAUDE.md §1.8](CLAUDE.md).

Viết lại 98, khai `xem_ok` 4, sửa 4 tiêu đề. Cái quan trọng không phải là bỏ cụm dẫn mà là
**cái gì lấp vào chỗ trống** — con số cụ thể, cơ chế, hoặc chỗ tranh cãi gọi được tên:

| | trước | sau |
|---|---|---|
| `ct-018` | "Các nghiên cứu về mất nước cho thấy khoảng 2%…" | "…2% khối lượng cơ thể — với người 60 kg là chừng 1,2 lít" |
| `sk-243` | "Các nghiên cứu theo dõi lớn cho thấy…" | "…người uống cà phê đều đặn khác người không uống ở nhiều thứ khác, nên nhân quả chưa chắc" |
| `sk-297` | "Các thử nghiệm lớn không tìm thấy…" | "…vì nồng độ vitamin D thấp phần lớn là dấu hiệu của ít ra ngoài, không phải nguyên nhân" |

**§4 quy tắc 3 chặt hơn chứ không lỏng đi.** Bỏ cái nhãn "các nghiên cứu cho thấy" thì buộc
phải nói ra giới hạn cụ thể mới giữ được sự trung thực — nhãn đó không cho biết bằng chứng
mạnh hay yếu, nó chỉ làm câu dài thêm.

Ba lần cổng bắt được văn của chính đợt sửa: `xh-138`/`tl-265` dính luật cũ vì bản viết mới,
và ba dòng `xem_ok` báo "đã CHẾT" vì bản viết lại đã gỡ đúng điều kiện chúng đang miễn.

### 3. 25 fact cho năm cụm mỏng nhất

Chọn cụm bằng số đo: trung vị 11 fact/cụm, năm cụm dưới đây có 2–3.
`co-the/mien-dich-vi-sinh`, `vu-tru/thang-thoi-gian`, `cong-nghe/dien-thoai-pin`,
`ngon-ngu/ngon-ngu-ky-hieu`, `lich-su/trung-dai` — mỗi cụm +5.

**Bước 3 của §2 đã trả công cho chính nó.** Quét mọi cặp mới–cũ cùng chủ đề từ 0,45:
`nn-202`↔`nn-005` được 0,72 (nn-005 đã nói y hệt "ASL gần LSF hơn BSL" ngay trong `s`),
`vt-251`↔`vt-001` được 0,62, `ls-275`↔`ls-114` được 0,54. Ba fact bị bỏ, phần chi tiết chúng
có thêm thì nhập vào fact cũ theo §3 — nn-005 giờ có mốc Clerc 1817 và con số 60%, ls-114 giờ
có "tiền công thực tăng gấp đôi" và Đạo luật Lao động 1351.

`day_du` cũng chặn đúng: `co-the` và `vu-tru` đã khoá nên 10 fact mới ở hai chủ đề đó buộc
phải có `q` + `d` đạt khuôn.

### Còn nợ sau đợt này

1. **1.336/1.909 fact chưa có lớp "vì sao"** (44/162 cụm đã khoá). Ưu tiên thấp theo lời chủ
   trang, nhưng `day_du` sẽ tự bắt mọi fact mới thêm vào cụm đã khoá.
2. **Chưa có cổng nào bắt `t` và `d` nói hai chuyện khác nhau.** §1.4 nói rõ so từ vựng là vô
   dụng (đã đo). Với `d` dài 1.000+ ký tự thì chỗ này rộng hơn trước.
3. **Cụm mỏng còn nhiều.** Sau đợt này vẫn còn `tu-duy/mo-hinh-tu-duy` (1),
   `kinh-doanh/dam-phan` (1), `kinh-doanh/do-luong` (1), `kinh-doanh/tuyen-dung` (2),
   `giao-tiep/huyen-thoai-giao-tiep` (2), `kinh-doanh/khoi-nghiep` (2), `tu-duy/rui-ro` (2),
   `xa-hoi/luat-phap` (3). Nhóm `kinh-doanh` mỏng có lý do thật: phần lớn thứ viết được về
   đàm phán và tuyển dụng là **lời khuyên**, mà §1.1 mục 2 loại thẳng. Ai làm cụm đó phải tìm
   được claim về thế giới, không phải claim về cách làm việc.
4. **`xa-hoi/luat-phap` bị bỏ qua trong đợt này** dù nằm trong danh sách mỏng: fact luật cần
   đối chiếu đúng điều khoản của văn bản đang có hiệu lực, và đợt này không đủ thời gian tra
   tới nơi. Đừng viết fact luật bằng trí nhớ.

---

## Đợt 24/08/2026 (c) — đổi khuôn, không đổi nguồn

**Câu hỏi của chủ trang:** có nguồn nào chuyên cung cấp fact không, vì fact lấy từ báo và
paper đọc ra rất học thuật; mục tiêu là một nguồn học tập kiểu *10 vạn câu hỏi vì sao*, và
có thể thêm cả truyện ngắn, miễn mỗi lần đọc là học thêm được một thứ.

**Có nguồn chuyên, và đã ghi vào [CLAUDE.md §2 bước 1](CLAUDE.md).** Nhưng đo lại thư viện
thì thấy nguồn không phải chỗ hỏng:

| | |
|---|---|
| Số fact | 1.884 |
| Độ dài trung bình `t` | 83 ký tự |
| Độ dài trung bình `s` | 217 ký tự |
| Số fact có `d` | **40 — tức 2,1%** |

98% thư viện dài khoảng 300 ký tự. Đủ để **thông báo** một sự thật, không đủ để ai **học**
được gì — và lấy fact từ đâu cũng vậy khi khuôn chỉ có ngần ấy chỗ. Giọng học thuật cũng
không đến từ nguồn mà đến từ chính luật: §1 bắt một câu khẳng định (trong khi "vì sao" là câu
hỏi), bắt mỏ neo cứng đứng trước (nên `s` tiêu hết chỗ vào con số, không còn chỗ cho cơ chế
và ví von), và §1.1 mục 1 cấm thẳng tường thuật.

### 1. Hai thứ đã dựng

**Lớp "vì sao" ([CLAUDE.md §1.7](CLAUDE.md)).** Thêm `q` (câu hỏi mở đầu, là cửa vào; `t` giữ
vai câu trả lời) và siết `d` thành ba đoạn ≥ 600 ký tự: cơ chế bằng lời thường → so sánh đời
thường → chỗ gặp nó trong đời sống. Cổng siết **dần** qua `manifest.day_du` — danh sách cụm
đã viết xong, chỉ dài thêm, nên không bao giờ đỏ vì phần chưa làm tới. Cụm mẫu
`vu-tru/he-mat-troi`, 13 fact, ~300 → ~1.350 ký tự mỗi fact.

**Truyện ([CLAUDE.md §7](CLAUDE.md)).** Loại nội dung thứ hai, dùng chung `cat`/`sub` và chung
lưới card, có bộ chuyển Tất cả / Fact / Chuyện. Cổng khác cổng fact ở đúng một chỗ — tường
thuật là hình thức — và bù lại bằng trường bắt buộc `mang_di`, chịu đúng các luật `LOẠI` của
cổng fact trừ `tuong-thuat`. Tám truyện đầu, 6 chủ đề.

### 2. Bốn thay đổi cổng, và số đo của từng cái

| Cổng | Việc | Đo được |
|---|---|---|
| `nen-lam-gi` | tách `nên`+động từ khỏi `loi-khuyen` trong `d`, LOẠI → XEM | 17 chỗ khớp trên t+s+d, **7 (41%) là liên từ "cho nên"** → 59% quá thấp cho một luật chặn commit |
| `menh-lenh` | `hãy\|đừng\|chớ` soi cả `s`, không chỉ `t` | 5 fact khớp, **5/5 là lời khuyên thật** (100%). Đã viết lại cả 5 |
| `re.I` cho `loi-khuyen` | chữ hoa đầu câu vốn lọt sạch | 27 chỗ khớp trước, 27 sau — **thêm 0**, tức không đổi gì hôm nay, chỉ bịt lỗ cho `d`/`body` |
| `rule_still_hits` soi `q`+`d` | khai miễn `xem_ok` sinh ra từ `d` bị gọi nhầm là đã chết | lỗi có sẵn, chưa nổ vì `d` mới có 40 |

Hai cổng mới (`q`, truyện) được **tự thử bằng ca dựng sẵn** trước khi tin: 6 ca cấu trúc `q`,
4 ca `q` đòi lời khuyên, 3 ca `q` hợp lệ, 8 ca verify truyện, 5 ca cấu trúc truyện.

### 3. Một chỗ trong cổng của chính mình viết sai, và cách phát hiện

Luật `nen-lam-gi` cho truyện soi thẳng `body` thay vì bản đã bỏ ngoặc kép, nên câu hỏi được
trích trong `ch-001` (*"nên đặt nhà máy ở đâu"*) bị tính là lời khuyên. Không phát hiện được
bằng đọc code — phát hiện được vì chạy cổng trên nội dung thật ngay sau khi viết cổng.

### 4. Còn nợ

1. **161/162 cụm chưa có lớp "vì sao".** Đây là phần việc lớn nhất còn lại: 1.871 fact cần
   `q` + `d`. Làm theo cụm, và **thêm tên cụm vào `manifest.day_du` trong cùng commit** —
   đó là cái chốt duy nhất giữ cụm không tụt lại. Giọng văn mẫu: 13 fact của
   `vu-tru/he-mat-troi`.
2. **Truyện mới có 8, và 14 chủ đề chưa có truyện nào.** Chưa đủ để biết cổng `day-doi` và
   ngưỡng độ dài 1.200–8.000 có đúng không — cả hai hiện đo trên 8 mẫu do cùng một người viết.
3. **Chưa có cổng nào bắt được "tiêu đề và thân bài nói hai chuyện khác nhau" cho `d`.** §1.4
   đã ghi rằng so từ vựng `t`/`s` là vô dụng; `d` dài hơn nên có thể khác, nhưng chưa đo.
4. `s` mới chỉ được soi bởi nhóm mệnh lệnh. Các mẫu còn lại của `loi-khuyen` trên `s` chưa
   đo: `mẹo` đã đo và **rớt** (20%), `cách…nhất` và `việc nên làm` thì chưa.

---

## Đợt rà 24/08/2026 (b) — cổng "đọc xong cầm được gì", và 9 lần agent gộp quá tay

> Đợt này chạy **song song** với đợt (a) ở dưới, hai phiên khác nhau, có điều phối qua tin
> nhắn. Đợt (a) đọc toàn văn tìm lỗi số liệu; đợt này đọc toàn văn tìm lỗi **diễn giải**.

**Nguyên nhân:** chủ trang mở trang lên, gặp `ct-209` và nổi giận:

> *t:* "Lưỡi cảm nhận cả năm vị ở mọi vùng, và 'bản đồ vị giác' trong sách giáo khoa là hiểu
> lầm từ một lỗi dịch" — *s:* "Bản đồ đó đến từ việc dịch sai một luận án tiếng Đức năm 1901
> vốn chỉ nói mức nhạy chênh nhau rất nhỏ. Nó tồn tại trong sách giáo khoa gần một thế kỷ."
>
> *"Tôi cần biết lỗi dịch sách giáo khoa để làm gì? Nếu như thế này thì bạn chỉ cần diễn giải
> là 'Lưỡi cảm nhận cả năm vị ở mọi vùng' tức là mọi vùng của lưỡi đều có thể cảm nhận cả 5 vị."*

CLAUDE.md §1.2 đã cấm dạng này từ 09/08 và lấy **đúng ca này** làm ví dụ ❌. Luật có, cổng
không có, nên 6 fact sống sót tới khi chủ trang tự đọc thấy.

**Đã làm:** 14 subagent. Tám agent đọc toàn văn cả 1.945 fact theo sáu lớp lỗi; bốn agent
đọc **lại lần hai** cùng 1.945 fact với lăng kính khác (chỉ một câu hỏi: "người 15 tuổi chưa
học ngành đó đọc xong có nói lại được thế giới thế nào không"); một agent đọc 348 cặp dải
0,42–0,62; một agent soát 142 dòng `xem_ok` + cả 41 trường `d`.

**1.945 → 1.883 fact.** 583 finding, 529 còn hiệu lực sau khi trừ phần trùng với đợt (a).

### 1. Bốn cổng mới, và hai luật cũ bắt oan

| Cổng | Mức | Đo được |
|---|---|---|
| `t-phat-bieu-cai-sai` | LOẠI | 6 fact (ct-003 · tl-104 · td-110 · ct-106 · ls-128 · ct-209), precision 100% |
| `s-khong-ve-the-gioi` | LOẠI | 1 fact (ct-209). 13 fact nhắc kênh văn bản, luật chỉ bắt 1 |
| `loi-khuyen`/`ngoi-thu-hai`/`huong-dan-doc` soi cả trường `d` | LOẠI + XEM | **0/40 bắt oan** trên bản mới, **8/26** trên bản cũ |
| `bị rút lại` thắt lại (đòi từ chỉ nghiên cứu đứng gần) | LOẠI | cụm trần khớp 1 fact, và đó là ca oan (`tl-223`, quyền chọn bị rút lại) |
| `loi-khuyen` bỏ qua phần trong ngoặc kép | LOẠI | 1 fact có mệnh lệnh chỉ trong ngoặc, 0 fact có nó ngoài ngoặc |

Hai con số của cổng trường `d` phải đọc cùng nhau: **0 bắt oan** nghĩa là cổng dùng được,
**8/26** nghĩa là cổng KHÔNG phủ hết lớp lỗi. 18 ca kia chỉ đọc mới thấy. Đừng tưởng `d` đã
sạch vì cổng im.

### 2. Ba dạng đã đo và RỚT ở đợt này

Đã ghi vào [CLAUDE.md §1.6](CLAUDE.md) — giờ §1.6 có sáu dạng thay vì ba.

| Dạng định bắt | Khớp | Vì sao rớt |
|---|---|---|
| Tiêu đề dán hai nửa bằng ", và" | 357 | 18% thư viện, gần hết là fact lành. Thắt thành ", và + chữ chỉ huyền thoại" còn 21 cặp mà chỉ 1 hỏng |
| `s` có dấu hiệu kể nguồn gốc niềm tin | 22 | 20/22 lành, vì chủ ngữ là một **hiện tượng thật** ("El Niño bắt nguồn từ dao động nhiệt độ"). Precision 9% |
| Mọi con số trong fact đều đo lịch sử một niềm tin | 9 | Precision 22%; cửa sổ ±60 ký tự quanh con số quá rộng, bắt oan Gaia, Gutenberg, Jenner |

### 3. Số liệu đóng lại hướng "chỉnh ngưỡng" cho lưới chống trùng

348 cặp dải 0,42–0,62 đã **đọc hết toàn văn**: 8 cặp `trung-thang`, 12 cặp `he-qua`, 0 cặp
`demo`, 328 cặp khác nhau thật. Và:

- cặp trùng thật rải từ **0,421 đến 0,606**, còn cặp **0,619** — cao nhất dải — lại là hai
  claim khác nhau thật. ⇒ **thứ tự điểm trong dải này không mang thông tin gì.**
- cộng với ca `gt-003`/`gt-101` = **0,027** của đợt (a): hạ hay nâng ngưỡng đều không cứu
  được. Đây là **hướng chết**, không phải hướng chưa tối ưu.
- 6/20 phát hiện của agent khớp danh sách đợt (a) tìm độc lập bằng mắt — xác nhận chéo.

**328 dòng `khac_voi` KHÔNG được khai.** Prompt cho agent chỉ yêu cầu liệt kê id cho nhóm
`khac`, không yêu cầu lý do — nên khai cả 328 dòng là làm đúng thứ CLAUDE.md §2 cấm ("thêm
bừa thì lần sau không ai tin được field này nữa"). Dải này không chặn commit, nên cái giá của
việc không khai chỉ là `check` còn ồn.

### 4. Lớp lỗi mới, chỉ đọc mới thấy: **agent gộp quá tay**

Trong khoảng 40 cặp mà agent đề nghị gộp, **9 cặp bị bác sau khi đọc bản gốc**. Cả 9 có cùng
một hình dạng: hai fact chung CHỦ ĐỀ nhưng mỗi fact có một **mỏ neo riêng, một phép đo riêng**.

| Cặp bị bác | Vì sao là hai fact |
|---|---|
| `sk-140` / `sk-015` | Harvard 80 năm (quan hệ ở tuổi 50 dự báo sức khoẻ tuổi 80) vs 148 nghiên cứu / 300 nghìn người / +50% |
| `gt-133` / `gt-006` | Newton 1990 gõ nhịp (ước 50%, thực 2,5%) vs Kruger 2005 email (tin 90%, thực 50%) |
| `na-321` / `na-224` | Màu tím tổng hợp đầu tiên (Perkin 1856) vs màu tím La Mã từ ốc biển (10.000 con/gam) |
| `vl-222` / `vl-313` | Trọng lực ở ISS vẫn 90% mặt đất vs 7,7 km/s ở độ cao 400 km |
| `vl-215` / `vl-306` | Nước gấp 5 lần cát khô → khí hậu ven biển vs gấp gần 10 lần sắt → chảo gang |
| `xh-008` / `xh-104` | 20 năm để già (Pháp hơn 100 năm) vs tỉ suất sinh dưới 2,1 |
| `cn-107` / `cn-108` | 4 điểm vị trí nhận ra 95% vs mã bưu chính + ngày sinh + giới tính |
| `dl-270` / `dl-319` | Mất 300–500 ha/năm vs sông Hồng còn lấn biển trong khi Cà Mau đã xói |
| `th-260` / `th-323` | Giới hạn Shannon (định lượng) vs phép đếm chuồng bồ câu (bất khả thi) |
| `xh-019` / `xh-147` | Tuổi thọ tăng gấp đôi vs trung bình thấp trong quá khứ do trẻ chết sớm |

**Phép thử dùng được cho phiên sau: hai fact chỉ là một khi bỏ một cái đi thì KHÔNG mất phép
đo nào.** Chung chủ đề, chung nguồn, chung cụm đều không đủ.

### 5. Bốn mâu thuẫn giữa hai fact, gỡ được bằng cách nói ra điều kiện

Không cổng nào bắt được lớp này — mỗi fact riêng lẻ đều hợp lệ.

| Cặp | Mâu thuẫn | Gỡ bằng |
|---|---|---|
| `sk-002` / `sk-210` | "khả năng đưa đường vào tế bào KHÔNG phục hồi" vs "hiệu ứng HỒI PHỤC sau khi ngủ bù đủ" | hồi lại được, nhưng tụt trở lại khi quay về lịch thiếu ngủ |
| `sk-008` / `sk-141` | "vận động 60–75 phút/ngày thì mức tăng gần như biến mất" vs "có hại độc lập với việc bạn có tập hay không" | giữ sk-008, nhập can thiệp ngắt quãng của sk-141 |
| `kd-108` / `kd-109` | hai "nguyên nhân số một" khiến startup chết, hai đáp án | Startup Genome phân loại mẫu vận hành, CB Insights đếm lý do tự nêu |
| `xh-010` / `xh-143` | án lệ "từ 2015" vs "từ 2016", cùng trích Nghị quyết 03/2015 | cơ chế lập 2015, án lệ đầu công bố 2016 |
| `tl-318` / `tl-319` | "trách nhiệm bị pha loãng khi đông người" vs "càng đông càng có người can thiệp" | xác suất một người CỤ THỂ ra tay giảm, xác suất có ÍT NHẤT một người tăng |
| `th-295` / `th-243` | th-295 khẳng định "kiểm nhanh hơn tìm rất nhiều bậc" — đó chính là P≠NP, chưa ai chứng minh | th-295 nói phần đo được, và nói thẳng chỗ chưa chứng minh |

### 6. Cổng tự bắt lỗi của chính bản viết lại — 21 lần

Đáng ghi vì nó là bằng chứng cổng có giá trị thật: trong lúc áp 529 finding, cổng chặn **21
lỗi do chính các bản viết lại tạo ra** — 9 khai miễn `xem_ok` chết, 5 cặp mới vượt 0,62 vì
bản mới dùng chung từ vựng (`dl-247`/`dl-345`, `ct-013`/`sv-238`, `gt-145`/`tl-290`,
`sk-002`/`sk-201`, `sk-201`/`sk-205`, `nn-101`/`nn-112`, `na-202`/`na-301`), 3 `khac_voi` trỏ
vào id vừa xoá, và 4 fact mất mỏ neo hoặc dùng từ chỉ độ lớn không kèm số.

### 7. Còn nợ sau đợt này

1. **31 finding của lượt đọc-lại cần tra nguồn mới sửa được** — danh sách id: `ct-014`
   `kt-133` `xh-133` `tl-296` `sk-107` `sk-215`(đã gộp) `sk-260` `sk-300` `vl-258` `dl-344`
   `tp-217` `cn-233` `na-351` `sk-291` `sv-148` `xh-106` `xh-141` `kt-121` `sh-020` `tl-007`
   `gt-007` `xh-136` `sk-115` `th-342` `kt-013` `nn-007` `sk-290` `th-330` `tp-253` `tp-293`
   `na-366`. Mỗi ca thiếu đúng một con số, và con số đó là thứ quyết định fact có dùng được
   hay không.
2. **4 fact đang ở mức `XEM`** vì tôi gỡ khai miễn mà không tra được số: `xh-137` (tỉ lệ bắt
   giữ người nhập cư so với người bản xứ), `xh-141` (dải tỉ lệ tin người giữa các nước),
   `gt-282` (tương quan ấn tượng mấy giây đầu với điểm cuối buổi phỏng vấn), `sk-302` (độ lớn
   hiệu quả trị liệu so với thuốc). Thư viện đi từ 0 XEM lên 4 XEM **có chủ ý**: một khai
   miễn sai làm cổng im vĩnh viễn, còn 4 dòng XEM là danh sách việc nhìn thấy được.
3. **`xh-124`** viết lại rồi nhưng vẫn không có con số (mức dính địa vị theo họ hiếm của
   Gregory Clark so với mức đo từ thu nhập cha–con). Đang tranh cãi phương pháp nên chưa chốt.
4. **`na-354`** (phông biển báo): claim suy được từ chính định nghĩa của nó, cần số liệu thử
   nghiệm khoảng cách đọc mới viết lại được. Chưa sửa.
5. **`sk-250`** trích Wansink — tác giả bị rút 18 bài vì gian lận dữ liệu. Claim vẫn đứng nhờ
   tổng quan Cochrane 2015 đi kèm, nhưng cái tên trong `src` là rủi ro đáng tin cần soát.
6. **328 cặp `khac` chưa khai `khac_voi`** (mục 3) — làm được nhưng phải có lý do từng cặp.
7. Danh sách 84 cặp trùng còn lại của đợt (a) vẫn nguyên.

### 8. Một lỗi của chính đợt này, và cách nó bị bắt

Script áp báo cáo xây danh sách xoá từ đề xuất R6 của agent. Đợt g3 đề nghị "giữ `ct-209`,
bỏ `ct-106`" — nhưng `ct-209` đã bị xoá ở commit đầu tiên (`79b5327`, giữ `ct-106` thay vì
`ct-209`). Script không kiểm điều kiện đó, nên nó bỏ luôn cái còn lại: **cả hai fact về bản
đồ vị giác biến mất, tức đúng fact chủ trang phàn nàn đã mất khỏi thư viện.**

Không cổng nào bắt được: xoá một fact hợp lệ không vi phạm luật nào. Nó bị bắt ở bước **mở
trang qua HTTP** rồi tìm lại chính `ct-106` — bước mà CLAUDE.md §6 đã yêu cầu từ trước và
lần này chứng minh được vì sao nó không phải thủ tục.

Rà lại cả 77 cặp từng được đề xuất gộp: **0 cặp nào khác mất cả hai fact.** 47 fact bị xoá
trong đợt, trong đó 41 qua gộp có fact hút nội dung và 6 xoá thẳng có chủ ý (`nn-106`
`th-315` `th-343` `tl-326` `vl-216` `vl-333`).

**Việc cho phiên sau:** thêm một phép kiểm vào bất kỳ script gộp nào — với mỗi cặp, xác nhận
fact "được giữ" CÒN TỒN TẠI trước khi xoá fact kia.

### Số đo cuối đợt

```
check : 1884 fact · 46 file · 20 chủ đề · 0 cặp >= 0,62 · 0 cặp trùng tiêu đề · exit 0
verify: 0 LOẠI · 4 XEM · 130 xem_ok (từ 151)
đã đọc: 1.945 fact × 2 lượt toàn văn · 348 cặp · 142 khai miễn · 41 trường `d`
```

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

### 4b. Ba cổng cài thêm SAU khi mục 5 dưới đây được viết

Mục 5 nói "chưa cài cổng vì một phiên khác đang sửa `factlint.py`". Phiên đó đã nhả file,
nên ba việc sau đã làm nốt — giữ nguyên mục 5 để thấy quyết định đã đổi vì lý do gì.

**a) Lỗ nghiêm trọng nhất cả đợt: hook nuốt mã thoát của `check`** (commit `c7266cf`).
CLAUDE.md §3 nói cặp ≥ 0,62 và cặp trùng tiêu đề "**chặn commit**". Hook thì không:

```sh
CHECK=$(python3 tools/factlint.py check 2>&1) || true      # <- vứt mã thoát
case "$CHECK" in *'— LỖI ('*) ... FAIL=1 ;; esac           # <- chỉ dò lỗi CẤU TRÚC
```

Cặp ≥ 0,62 làm `cmd_check` trả 1 nhưng in dòng `!!`/`TT`, **không** in `— LỖI (`. Nên nó
lọt. Đây không phải lý thuyết: ngày 24/08 hai commit đã đi qua trong lúc thư viện đang có
một cặp 0,66. Chứng minh hai chiều trên CÙNG một trạng thái (hai fact trùng tiêu đề từng
chữ, `check` in `TT 1.00` và trả 1): **hook cũ → exit 0 "cổng facts qua" · hook mới →
exit 1**. Luật này từ 12/08 tới nay chưa từng được thi hành.

**b) Cổng "câu đầu của `s` chép lại tiêu đề", ngưỡng 0,90** (commit `4143b1b`) — theo đúng
số đo ở mục 3. Đã sửa cả 5 ca; tiêm lại bản cũ để bắt buộc cổng đỏ (1,000 · 0,978 · 0,959
· 0,957 · 0,929 đều bắt), 5 bản mới qua hết, 43 fact dải 0,60–0,90 không bị chạm.

**c) `TITLE_SUBSET_MIN = 3` — vá lỗ lưới tiêu đề, và số liệu bác hai mức lỏng hơn**
(commit `3aee443`). Chỉ tính cặp mà token tiêu đề này là TẬP CON của tiêu đề kia:

```
>= 1 token chung → 9 cặp mới, 1 thật  ( 11%)   nhiễu kiểu "men răng" ghép "rượu vang lên MEN"
>= 2 token chung → 3 cặp mới, 1 thật  ( 33%)
>= 3 token chung → 1 cặp mới, 1 thật  (100%)   <- chọn
>= 4 token chung → 0 cặp mới                   (trùng luật cũ)
```

Cổng đỏ ngay bằng **ca thật** `vt-145`/`vl-254` (TT 0,77), không cần tiêm. Đã gộp theo §3
"trùng thẳng": giữ `vl-254`, mang sang câu hay nhất của `vt-145`, gộp `src`, xoá `vt-145`.
Trung thực về mức bằng chứng: "100%" đo trên đúng **một** ca dương tính — luật hẹp có cơ
sở, không phải luật đã kiểm rộng. Cái chắc chắn là hai mức lỏng hơn đã bị số liệu bác.

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

1. **Gộp 84 cặp trùng** còn lại theo danh sách đã đo (`vt-145`/`vl-254` đã gộp ở `3aee443`;
   `dl-259`/`dl-325`, `dl-232`/`dl-317`, `tp-231`/`tp-318`, `tp-226`/`tp-311`,
   `sv-101`/`sv-104` do phiên song song gộp — gạch khi xác nhận). 23 cặp nằm trong 356
   cặp cổng đã báo; 62 cặp cổng không thấy, nên phải đi từ danh sách này chứ không từ
   đầu ra của `check`.
   Rõ nhất, nên làm trước: `gt-003`/`gt-101` · `tl-141`/`tl-298` · `dl-259`/`dl-325` ·
   `dl-232`/`dl-317` · `hh-296`/`hh-313` · `tl-103`/`tl-335` · `tl-110`/`tl-328` ·
   `xh-007`/`xh-103` · `xh-019`/`xh-147` · `th-228`/`th-314` · `th-216`/`th-287` ·
   `sk-136`/`hh-273` · `vl-280`/`vl-307` · `ct-002`/`ct-144` · `ct-004`/`ct-111`.
2. **`xh-010` / `xh-143` mâu thuẫn NGÀY với nhau**, không chỉ trùng: một fact ghi Việt Nam
   công nhận án lệ **từ 2015**, fact kia ghi **từ 2016**, cả hai trích cùng Nghị quyết
   03/2015. Phải chốt một mốc.
3. ~~Sửa 5 ca chép tiêu đề + cổng >= 0,90~~ → **XONG**, commit `4143b1b` (mục 4b-b).
4. ~~`TITLE_MIN_SHARE`~~ → **XONG**, commit `3aee443` (mục 4b-c). Đã đo: nới xuống 1 token
   chỉ đạt 11% chính xác nên bị bác; chốt ở `TITLE_SUBSET_MIN = 3`.
5. **Đối chiếu `src`** — vẫn chưa ai làm. Đọc toàn văn để lại **hai ca cần truy nguồn**:
   `sv-295` ghi hoá thạch rừng Nam Cực cách cực Nam ~500 km trong khi Klages, Nature (2020)
   báo ~900 km; `vl-203` ghi tán xạ Rayleigh "gấp khoảng 16 lần" trong khi 1/λ⁴ cho 16 chỉ
   khi tỉ số bước sóng đúng bằng 2 (dải khả kiến thật cho 5–9 lần).
6. **Nhúng ngữ nghĩa cho lưới chống trùng** — mục 2 giờ đã có con số 73% để biện minh cho
   chi phí của hướng này.

### Số đo cuối đợt

```
đã đọc : 20/20 chủ đề · 161/161 cụm · 1.944/1.944 fact (t + s + d)
cổng   : 3 cổng mới trong đợt này — xem_ok chết (378b3e6) · chép tiêu đề (4143b1b) ·
         chuỗi con tiêu đề (3aee443) — cộng một lỗ hook đã bịt (c7266cf)
```

**Lưu ý về con số fact:** đợt này chạy song song với một phiên khác cũng đang rà `facts/`,
nên tổng fact giảm liên tục trong lúc làm (1.945 → 1.930 và còn giảm khi gộp trùng). Mọi
con số "trên 1.944 fact" trong entry này là ảnh chụp lúc ĐỌC, không phải trạng thái cuối.
Tỉ lệ thì vẫn đúng; số tuyệt đối phải chạy lại `check` để lấy.

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
