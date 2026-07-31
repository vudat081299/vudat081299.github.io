# Bộ tiêu chí verify đề tài — bản riêng cho `thesis-topic-selector`

Bộ này chấm các đề tài trong `thesis-topic-selector.html`. Nó **không phải** rubric thạc sĩ dùng chung — nó dùng đúng các trường dữ liệu và đúng các thang đo mà page đó đã có, để kết quả chấm cắm được trở lại vào page thay vì nằm rời trong một file điểm.

Nó trả lời bốn câu, theo đúng thứ tự này:

1. **Có phải vấn đề thật không** — blocker `B7`, trục `V1`
2. **Làm được trong 6 tháng không** — tầng blocker `B1`–`B6`, sáu trục ràng buộc `R1`–`R6`
3. **Có đóng góp không** — blocker `B8`, trục `V2`
4. **Có đủ tầm một luận văn không** — phép thử sàn ở mục 5d, verdict `QUA_NHO`

Tài liệu này chỉ định nghĩa tiêu chí. Nó không chứa kết quả chấm đề tài nào.

> **Số liệu trong tài liệu này được sinh bằng script, không chép tay.** Chạy `node calibrate.js` trong cùng thư mục để tính lại mục 1b và 1c. Bản đầu của rubric chép tay các con số của bản 7 (90 đề tài, 16 lĩnh vực); page đi tiếp lên bản 9 rồi bản 10 và mọi con số đó sai — trong khi rubric lại dùng chính chúng làm mốc tự-kiểm. Đó là lý do có script.

---

## 0. Vì sao không dùng rubric thang-100 chung

Bản chung phổ biến chấm 7 trục 0–5, nhân trọng số thập phân, cộng thành thang 100, rồi cắt verdict ở 80 / 65 / 50. Bốn vấn đề khiến nó không dùng được cho page này:

**a. Độ chính xác giả.** Chấm chủ quan 6 bậc rồi nhân `1.6` và `1.4` rồi cắt ngưỡng ở 64/65 — chênh một điểm không ai đo được nhưng lại đổi verdict. Hai người chấm cùng một đề tài lệch ±10 điểm là bình thường, tức lệch trọn một bậc verdict.

**b. Cộng dồn sai bản chất.** Luận văn chết theo kiểu **hội tụ**, không phải cộng dồn: không xin được dữ liệu thì đóng góp hay, phương pháp chặt, tác động cao đều vô nghĩa. Ràng buộc bó nhất quyết định kết quả. Rule chữa cháy kiểu "trục A hoặc C ≤ 1 thì trần verdict là MAJOR_REVISION" là miếng dán trên một mô hình sai, không phải mô hình đúng.

**c. Trục trùng nhau nên bị đếm hai lần.** "Dữ liệu" và "khả thi" chồng nhau nặng (không có dữ liệu thì đương nhiên không khả thi). "Phương pháp" và "đóng góp" cũng vậy. Cộng dồn hai trục tương quan là khuếch đại một yếu tố.

**d. Thiếu đúng trục mà page này coi là quyết định.** Page ghi ở mục "Trước khi cam kết": *có thầy hướng dẫn hiểu lĩnh vực đó là yếu tố quyết định lớn nhất, lớn hơn cả độ hay của đề tài.* Rubric chung không có trục này. Page cũng có trường `know` (gánh nặng kiến thức ngành, thấp/tb/cao) với khoảng cách thực tế 2 tuần so với 8 tuần — rubric chung gộp nó vào "learning curve" chung với compute.

Bộ dưới đây thay cộng dồn bằng **ràng buộc bó nhất**, thay điểm số bằng **mức + hiện vật**, và dùng đúng thang của page.

---

## 1. Trường dữ liệu của page (schema đầu vào)

Mỗi đề tài trong page là một object trong `TOPICS`. Chấm được hay không phụ thuộc các trường này có nội dung thật hay không.

| Trường | Thang / dạng | Vai trò khi chấm |
|---|---|---|
| `id` | chuỗi (`a01`…`z02`) | Khoá thật của đề tài — tiền tố theo lĩnh vực, **không** phải `t` + số thứ tự |
| `n` | số, **có lỗ** | Số hiển thị `#N`. Mọi ghi chú trong page tham chiếu theo số này, nên nó **không được đánh lại** sau khi loại đề tài — 14 số đã biến mất (#26 #28 #51 #53 #57 #63 #69 #74 #77 #78 #84 #86 #89 #98) và đó là chủ ý |
| `src` | chuỗi có tiền tố | **Xuất xứ đề tài** — bắt buộc. Xem 1d |
| `dom` | id lĩnh vực | Một trong các `DOMAINS`. Cần cho lượt tổng ở mục 10 |
| `t` | chuỗi | Tên đề tài |
| `q` | chuỗi | **Câu hỏi nghiên cứu** — phải là câu hỏi có thể trả lời sai |
| `data` | chuỗi | Nguồn dữ liệu cụ thể (tên bộ, cách truy cập, license) |
| `contrib` | chuỗi | Đóng góp — thứ bàn giao lại cho người sau |
| `d.method` | chuỗi | Phương pháp, baseline, metric, cách chia tập |
| `d.why` | chuỗi | Vì sao không tầm thường |
| `d.risk` | chuỗi | Rủi ro chính và cách thu hẹp |
| `d.learn` | chuỗi | Nền phải học + số tuần |
| `d.spike` | chuỗi | **Spike 5 ngày** — phép thử giết đề tài sớm |
| `diff` | 1–5 | Độ khó |
| `risk` | `thap` / `tb` / `cao` | Rủi ro **dữ liệu** |
| `compute` | `thap` / `tb` / `cao` | Nhu cầu tính toán |
| `know` | `thap` / `tb` / `cao` | Gánh nặng kiến thức ngành |
| `mobile` | bool | Có tận dụng nền mobile không |
| `vn` | bool | Có góc Việt Nam không |
| `impact.s` | 1–5 | Điểm tác động |
| `impact.who` | chuỗi | Ai được lợi |
| `impact.pay` | chuỗi | Ai trả tiền (đường ra tiền) |
| `impact.out` | chuỗi | Bàn giao được cái gì |

**Neo nghĩa của `impact.s`** (lấy từ `IMP_WORD` trong page, không tự định nghĩa lại):
`5` = ra sản phẩm · `4` = ứng dụng rõ · `3` = học thuật · `2`–`1` = hẹp.

### 1a. `impact.*` KHÔNG nằm trong object đề tài — đọc trước khi xuất diff

Bốn trường `impact.*` sống trong một map riêng, `IMPACT`, khoá theo `id`, và chỉ được gắn vào đề tài lúc render:

```js
t.impact = IMPACT[t.id] || { s:3, who:"—", pay:"—", out:"—" };
```

Hai hệ quả bắt buộc nhớ:

1. **Sửa `impact.*` là sửa `IMPACT[id]`**, không phải sửa object trong `TOPICS`. Diff nhắm sai chỗ thì không áp được — xem `sua_truong.IMPACT` ở mục 8.
2. Khi thêm đề tài mới, thêm entry `IMPACT` cùng lúc. Nếu thiếu, đề tài lặng lẽ thành "3 điểm, `who`/`pay`/`out` = —" chứ không báo lỗi. `node calibrate.js` bắt ca này; đừng chấm bằng mắt.

**Quy tắc thiếu trường:**

| Điều kiện | Verdict |
|---|---|
| `q`, `data`, hoặc `d.spike` rỗng, hoặc chỉ là chủ đề chung không có phép thử | `THIEU_THONG_TIN` |
| `src` thiếu, rỗng, hoặc không tra được về một model / một nguồn cụ thể (xem 1d) | `THIEU_THONG_TIN` |
| `IMPACT[id]` không tồn tại, hoặc `who`/`pay`/`out` là `—` | `THIEU_THONG_TIN` |
| `data` **không nêu được nguồn cụ thể nào** — chỉ nói loại dữ liệu, hoặc "sẽ thu thập" mà không nói từ đâu | `THIEU_THONG_TIN` |
| `data` có nguồn tra được nhưng **chưa dẫn đường truy cập hoặc chưa nêu license** | **KHÔNG phải `THIEU_THONG_TIN`.** Đây là `B2 = CHUA_THU`, đi vào `viec_cua_spike` ngày 1 |
| Thiếu `d.why` | chấm được, ghi là thiếu, `V2` không được xếp `TOT` |

Hàng thứ năm là chỗ bản trước sai, và sai nặng. Nó từng ghi *"nêu tên nguồn nhưng không có đường truy cập hoặc không nói license → `THIEU_THONG_TIN`"*, và tự gọi đó là "ca hay bật nhất". Đo thật: chỉ khoảng một phần mười `data` của page có link/registry, và cách viết phổ biến là `"M5 với đầy đủ 12 cấp phân cấp. Mở hoàn toàn."` — có nguồn tra được, không có link, "mở hoàn toàn" không phải tên license. Đọc theo bản cũ thì gần **cả danh sách** ra `THIEU_THONG_TIN`, tức rubric từ chối chấm chính thứ nó sinh ra để chấm. Nó cũng mâu thuẫn thẳng với mục 3a, nơi `B2` mặc định là `CHUA_THU` trong lượt chấm hồ sơ. Cùng một dữ kiện không được cho hai verdict trái ngược.

Trong mọi ca `THIEU_THONG_TIN`: liệt kê đúng trường thiếu, **không tự bổ sung giả định để chấm cho đủ**.

### 1b. Thang khai báo vs thang thực dùng — đọc trước khi tin vào con số

Khối dưới đây **sinh bằng `node calibrate.js`**. Nếu số đề tài trong page lệch quá **10%** so với `calibrated_topics`, chạy lại script và thay khối này **trước khi chấm** — bảng cũ không còn là mốc. `node calibrate.js --check` trả về mã thoát `2` khi vượt ngưỡng.

<!-- sinh bởi `node calibrate.js` ngày 2026-07-31 — ĐỪNG sửa tay -->

```yaml
calibrated_as_of: 2026-07-31
calibrated_topics: 193
calibrated_domains: 27
n_range: 1–207   # 14 lỗ: 26 28 51 53 57 63 69 74 77 78 84 86 89 98
```

| Trường | Khai báo | Giá trị thực xuất hiện | Hệ quả |
|---|---|---|---|
| `diff` | 1–5 | `3` 84 · `4` 108 · `5` 1 | Thực chất là thang **2 bậc**: `diff: 3` là mức thấp nhất tồn tại, không phải "trung bình" |
| `impact.s` | 1–5 | `2` 1 · `3` 32 · `4` 107 · `5` 53 | Thực chất **4 bậc**, bậc 5 chiếm 27% |
| `risk` | 3 bậc | `thap` 125 · `tb` 67 · `cao` 1 | Bậc `cao` gần như đã bị các lượt loại lấy hết |
| `compute` | 3 bậc | `thap` 55 · `tb` 131 · `cao` 7 | Các ca `cao` còn lại đều có đường thu hẹp ghi trong `d.risk` |
| `know` | 3 bậc | `thap` 40 · `tb` 124 · `cao` 29 | `cao` chiếm 15% — **đã tăng gấp ba** so với bản 7 (7/90). Đây là trục sinh `CHẶN` nhiều nhất |
| `mobile` | bool | `true` 19 | 10% — dùng để xếp hạng (`V3`), không dùng để sàng |
| `vn` | bool | `true` 72 | 37% — hơn một phần ba danh sách, nên một mình nó không phân biệt được gì |
| `src` | chuỗi | `ai:` 103 · `ext:` 88 · `mix:` 2 · chưa rõ 0 | **Đã điền ở bản 11** (trước đó 105 đề tài ở `?`). Xuất xứ truy bằng commit đầu tiên chứa từng đề tài rồi đọc trailer `Co-Authored-By` — cả 105 đều do `claude-opus-5` sinh. `F33` giờ không còn ca nào; đổi lại, luật „`src: ai:*` → mọi phát biểu trong `d.why` mặc định `CHƯA KIỂM`” (mục 1d, 2 quy tắc 4) **giờ áp cho 105 đề tài**, và `F37` là cờ cần soi nhiều nhất |

Ba điều phải rút ra:

1. **Đừng đọc `diff: 3` là "dễ".** Trong thang thực dùng nó là sàn. Muốn so độ khó giữa hai đề tài thì `diff` một mình không phân giải được — phải đọc kèm `know` và `compute`.
2. **Bậc `impact.s: 5` vẫn bị dồn.** Khi chấm `V1`, xu hướng đúng là **hạ**, không phải giữ: yêu cầu `pay` chịu được phép thử cuộc gọi 30 phút (`B7`), và hạ xuống 4 nếu không.
3. **`know: cao` đang là nguồn `CHẶN` chính** và tỉ lệ của nó đang tăng theo từng bản mở rộng. Nếu bản sau tiếp tục tăng, cân nhắc siết ở khâu thêm đề tài chứ không phải ở khâu chấm.

Đây chính là lý do bộ tiêu chí này không cộng dồn các trường của page thành một điểm: **các thang gốc chưa được hiệu chuẩn**, nên cộng chúng lại chỉ nhân thêm sai số.

**Điều thứ tư, quan trọng cho verdict `THIEU_THONG_TIN`:** mọi đề tài trong page đều có `t`, `q`, `data`, `contrib`, `d.method`, `d.why`, `d.risk`, `d.learn`, `d.spike` **không rỗng**, và `d.learn` nào cũng có số tuần. Nếu chỉ kiểm "trường rỗng" thì `THIEU_THONG_TIN` là nhánh chết. Nó chỉ có ích ở ba ca thật: **`src` chưa truy được**, **`data` không nêu được nguồn cụ thể nào**, và **`IMPACT[id]` rơi vào fallback**. `node calibrate.js` liệt kê cả ba.

### 1c. Hình dạng phân bố phải trông thế nào — mốc để biết mình chấm lệch

Chấm máy móc ba trục `R1` (từ `risk`), `R2` (từ `know`), `R3` (từ `compute`). Lưu ý ánh xạ của `R3`: mục 4 xếp **cả `thap` lẫn `tb`** vào `ĐI ĐƯỢC` và chỉ `cao` mới là `CHẶN`, nên `R3` **không bao giờ sinh ra `CĂNG`** trong lượt máy móc.

<!-- sinh bởi `node calibrate.js` ngày 2026-07-31 — ĐỪNG sửa tay -->

| Kết quả | Số đề tài |
|---|---|
| Không trục nào `CĂNG` | 28 |
| Đúng một trục `CĂNG` | 87 |
| **Hai trục `CĂNG`** | **43** |
| Có ít nhất một trục `CHẶN` | 35 |

Bản trước của bảng này có **ba** hàng, và hàng giữa dán nhãn "đúng một trục `CĂNG`" cho một con số thực ra là "có `CĂNG` nhưng không có `CHẶN`" — gộp mất nhóm hai-`CĂNG`. Nhóm đó chính là nhóm làm nổ ngân sách ở mục 6, nên nó phải hiện ra thành hàng riêng.

Dùng bốn con số này làm mốc kiểm chính mình. Nếu lượt chấm của bạn cho ra 170 đề tài `CHAN`, bạn đang đọc "chưa kiểm" thành "đã fail" — xem mục 3. Nếu cho ra 170 đề tài `DI_DUOC`, bạn đang bỏ qua `R5`/`R6`.

Ba mươi lăm ca `CHẶN` **không phải sót**: phần lớn là `know: cao` hoặc `compute: cao` đơn lẻ, có đường thu hẹp ghi rõ, nên theo quy tắc chấm-bằng-văn-xuôi ở mục 4 phần lớn hạ về `CĂNG`. Ánh xạ máy móc cố tình khắt khe hơn để bạn thấy chúng.

Và biết trước một điều: **`R4` chưa biết với mọi đề tài chưa có `src: ext:`** (page không có trường nào cho nó). Cho tới khi bạn trả lời được câu hỏi thầy hướng dẫn, ô `DI_DUOC` rỗng **bằng thiết kế** — đó không phải rubric hỏng, đó là rubric đang nói bạn đi hỏi bộ môn. Nhưng xem mục 6: một `R4` chưa xác minh **không được tiêu ngân sách `CĂNG`**.

### 1d. `src` — xuất xứ đề tài

Mọi đề tài phải khai xuất xứ. Ba dạng, phân biệt bằng tiền tố:

| Dạng | Cú pháp | Yêu cầu |
|---|---|---|
| AI sinh | `ai:<model-id>` | Phải là **model id thật**: `ai:claude-opus-5`, `ai:claude-sonnet-5`. Không được ghi `ai:claude`, `ai:AI`, `ai:LLM` — thiếu tên model thì không tái lập được và không biết nó cũ tới đâu |
| Nguồn ngoài | `ext:<đơn vị> · <loại danh mục> · <năm>` | Phải tra được: `ext:TUM DAML · đề tài đang mở · 2026`, `ext:UIT · danh mục luận văn đã bảo vệ · 2013–2023`. Ghi `ext:internet`, `ext:tham khảo` là không hợp lệ |
| Hỗn hợp | `mix:<model-id> ← <nguồn>` | AI viết ra hồ sơ nhưng ý tưởng đến từ một nguồn cụ thể. Ghi cả hai |
| Chưa truy được | `?` hoặc `CHUA_XAC_DINH` | Hợp lệ như một **trạng thái tạm**, nhưng bật `F33` và verdict `THIEU_THONG_TIN` cho tới khi điền |

**Vì sao trường này không phải thủ tục hành chính.** Nó đổi cách đọc mọi trường còn lại:

1. **Nó đặt mặc định bằng chứng.** Với `src: ai:*`, mọi tên bộ dữ liệu, mọi con số hiệu năng, mọi trích dẫn trong `d.why` mặc định là `CHƯA KIỂM` theo mục 2 — kiểu hỏng đặc trưng của đề tài do model sinh là một cái tên dataset nghe rất đúng mà không tồn tại, hoặc một con số không có bài nào chứa. Với `src: ext:*` lấy từ danh mục của một trường, ít nhất đề tài đó đã qua mắt một người.
2. **Nó là bằng chứng gián tiếp cho `R4`.** Một đề tài nằm trong danh mục luận văn đã bảo vệ ở **đúng đơn vị của bạn** là bằng chứng mạnh rằng có người đỡ được — xem mục 4, `R4`. Cùng đề tài đó ở một trường khác thì chỉ chứng minh nó đỡ được **ở đâu đó**, yếu hơn hẳn. Nên `src` phải ghi rõ đơn vị, không phải chỉ ghi "có nguồn".
3. **Nó là bằng chứng gián tiếp cho `V2`.** Một đề tài đang mở ở một lab nghĩa là ít nhất một nhóm nghiên cứu coi nó chưa được giải. Điều đó **không** thay `B8`, nhưng nó nói cho bạn biết nên tra ở đâu.
4. **Nó bắt được thiên lệch một-nguồn.** Page tự thú ở changelog bản 9: các bản đầu do một nguồn duy nhất sinh ra, và hệ quả là phần lớn đề tài chung một khuôn tư duy. Không có trường `src` thì không ai đo được điều đó; có rồi thì lượt tổng ở mục 10 đếm được ngay.

**Quy tắc đi kèm:** khi hạ verdict, `src: ai:*` **không** là điểm trừ và `src: ext:*` **không** là điểm cộng. Nó chỉ đổi *mặc định bằng chứng* và *chỗ cần đi tra*. Một đề tài AI sinh đã qua `B8` mạnh hơn một đề tài lấy từ danh mục trường mà chưa ai tra.

---

## 2. Chuẩn bằng chứng — gắn vào MỌI phát biểu

Đây là phần quan trọng nhất và là phần rubric chung không có. Mỗi nhận định trong kết quả chấm phải mang một trong ba nhãn:

| Nhãn | Nghĩa | Ví dụ |
|---|---|---|
| `ĐÃ CHẠY` | Tự chạy, tự thấy, có số của mình | "Đã tải, đếm được 13.979.592 dòng" |
| `CÓ NGUỒN` | Có nguồn cụ thể tra được, chưa tự chạy | "Trang tải về ghi license CC-BY, kèm URL" |
| `CHƯA KIỂM` | Nghe hợp lý, chưa xác minh | "Bộ này *có lẽ* còn tải được" |

**Mặc định của mọi phát biểu là `CHƯA KIỂM`.** Muốn nâng lên phải có hiện vật.

Bốn quy tắc đi kèm:

1. **Không bịa tên bộ dữ liệu, tên bài báo, hay con số SOTA.** Không chắc thì ghi `CHƯA KIỂM` kèm câu hỏi cần tra, không viết ra một cái tên nghe đúng.
2. **Không trích con số quy mô ngành** (tỉ lệ hàng huỷ, tỉ lệ thất thoát, tỉ lệ thất bại thử nghiệm) mà không có nguồn. Nếu số đó cần cho phần `impact.pay` thì đổi thành hướng dẫn *tự đi lấy số*.
3. **Verdict phải có ngày hiệu lực.** Tính khả dụng dữ liệu hết hạn: bộ bị gỡ, license đổi, hạn mức nền tảng thay đổi. Một verdict không có ngày là một verdict không biết mình đã cũ. Ghi kèm điều kiện tái kiểm ("kiểm lại nếu quá 6 tháng, hoặc khi nguồn chính đổi điều khoản").
4. **Với `src: ai:*`, hạ toàn bộ `d.why` xuống `CHƯA KIỂM` mặc định** — kể cả những câu nghe như trích dẫn. Nâng từng câu một khi tra được, đừng nâng cả khối.

---

## 3. Tầng BLOCKER — mỗi cái là một phép thử bị chặn thời gian

Không phải "gate" trừu tượng. Mỗi blocker có **một phép thử, một trần thời gian, một hiện vật quan sát được**. Không có hiện vật thì blocker chưa được vượt — dù nghe có lý đến đâu.

### 3a. Ba trạng thái, không phải hai — đọc trước khi chấm bất cứ thứ gì

Bản đầu của bộ này chỉ có `vượt` / `fail`, và "không có hiện vật thì chưa vượt". Ghép với luật "fail bất kỳ blocker → `CHAN`", nó biến **cả danh sách thành `CHAN`** khi chấm trên giấy — vì page không chứa hiện vật nào của `B1`, `B2`, `B4`, `B6`, `B7` (không ai tải dữ liệu, không ai đọc license, không ai chạy baseline, không ai có tên thầy hướng dẫn hay tên người trong nghề trong một object JSON). Như vậy rubric mất đúng chức năng nó tự nhận ở mục 11: **bộ lọc trước spike**.

Vì vậy mỗi blocker có **ba** trạng thái:

| Trạng thái | Nghĩa | Ảnh hưởng verdict |
|---|---|---|
| `VUOT` | Đã thử, có hiện vật | Không chặn |
| `CHUA_THU` | Chưa thử, và **không có bằng chứng nào cho thấy nó sẽ fail** | **Không** đẩy về `CHAN`. Đây là trạng thái *bình thường* của lượt chấm hồ sơ. Nó biến thành checklist ngày 1–5 của spike |
| `THAT_BAI` | Đã thử và fail, **hoặc** hồ sơ chứa bằng chứng dương rằng nó sẽ fail (không có đường hợp pháp; dữ liệu đã bị gỡ; nhãn cần chuyên gia mà không ai cam kết; câu hỏi không viết được thành một câu) | → `CHAN` |

Phân biệt hai cái sau là toàn bộ giá trị của mục này. `CHUA_THU` nghĩa là "đi thử đi". `THAT_BAI` nghĩa là "đừng tốn 5 ngày". Gộp chúng lại là tự bỏ cả danh sách.

Với lượt chấm hồ sơ (không chạy spike), trạng thái mặc định là:

- **`B3`, `B5`** — chấm được ngay từ `q` / `d.spike` / `contrib`. Không có lý do để để `CHUA_THU`.
- **`B1`, `B2`, `B4`, `B6`, `B7`** — mặc định `CHUA_THU`, và chỉ nâng lên `THAT_BAI` khi **chính hồ sơ** nói ra điều đó (ví dụ `data` mô tả một nền tảng tư nhân cấm thu thập tự động, hay `d.risk` ghi "cần người đọc được Hán-Nôm" mà không có ai).
- **`B8`** — mặc định `CHUA_THU`, nhưng là cái **rẻ nhất** để chuyển sang `VUOT`: một ngày tra cứu. Nếu lượt chấm của bạn có quyền tra web thì hãy chạy nó cho shortlist, vì nó là thứ duy nhất mở khoá `V2 = TOT`.

| ID | Blocker | Phép thử | Trần | Hiện vật phải có |
|---|---|---|---|---|
| **B1** | Dữ liệu nằm trên ổ cứng | Tải thật, đếm | 2 ngày | Số dòng / số mẫu / số file **thật**, không phải "tìm thấy link". Nếu là dữ liệu phải xin: tên người đã liên hệ và ngày liên hệ. |
| **B2** | Có đường hợp pháp | Đọc license và điều khoản của **từng** nguồn | 1 ngày | Kết luận thành văn cho từng nguồn: được dùng nghiên cứu / được công bố kết quả / được thu thập tự động hay không. Với dữ liệu người: cơ chế đồng ý, cơ chế ẩn danh, và **ai duyệt** (hội đồng đạo đức, phòng đào tạo, bệnh viện) kèm thời gian chờ ước lượng — thời gian chờ đó phải vào lịch của `R3`, không được coi là chi phí bằng không. |
| **B3** | Câu hỏi trả lời sai được | Viết được câu: *"Đo X trên Y, theo metric Z, so với baseline W"* | 1 giờ | Một câu duy nhất. Nếu phải dùng chữ "và" nối ba bài toán thì blocker này ở `THAT_BAI` — không phải "chưa vượt", vì `B3` chấm được ngay và không có lý do để `CHUA_THU`. |
| **B4** | Baseline tồn tại và chạy được | Chạy baseline ngu nhất, ghi số | 1 ngày | Một con số cụ thể trên tập test. Đây là thanh đo — không có nó thì "tốt hơn" không có nghĩa. |
| **B5** | Kết quả âm vẫn ra luận văn | Viết 3 câu: *nếu giả thuyết sai thì luận văn báo cáo gì* | 1 giờ | Ba câu đó. Nếu không viết được, đề tài là một cú cá cược, không phải một nghiên cứu. |
| **B6** | Có người đỡ được phần nền | Tìm một người trả lời được câu hỏi ngành khi bí | 1 tuần | Tên một người thật (thầy hướng dẫn, đồng nghiệp, người trong ngành đã nhận trao đổi). Với `know: cao`, blocker này **bắt buộc**; với `know: thap`, có thể miễn. |
| **B7** | **Vấn đề có thật** | Nói chuyện 30 phút với một người đang sống với vấn đề đó — không phải người quan tâm về mặt học thuật, mà người sẽ dùng kết quả | 1 tuần | Tên người, ngày, và **một câu họ nói mà bạn không tự nghĩ ra được**. Nếu cả 30 phút không có câu nào như vậy thì bạn đang giải một vấn đề tự tưởng tượng. Miễn khi `impact.s ≤ 3`, thay bằng: nêu tên **một** công trình cụ thể mà kết quả của bạn sẽ đổi cách đọc nó. |
| **B8** | **Chưa có ai làm đúng cái này** | Tra công trình gần nhất — xem thủ tục ở 5b | 1 ngày | Hai công trình gần nhất, trích dẫn đủ để tra lại, cộng **một câu** nói bạn khác chúng ở đâu. "Chưa tìm thấy ai làm" không phải hiện vật; "đã tra 3 truy vấn này, đọc 10 abstract, gần nhất là hai bài này" mới là. |

**Blocker nào ở `THAT_BAI` → `CHAN`.** `CHUA_THU` thì không. Trong cả hai ca vẫn phải xuất phần đề xuất sửa: blocker nào chặn hoặc chưa thử, cần gì để mở, và có phiên bản thu hẹp nào không cần mở nó.

Lưu ý về `B1` và `B2`: với các đề tài `risk: cao`, spike ngày 1 thường **không phải viết code** mà là đọc điều khoản hoặc xác nhận đường dữ liệu. Đó là thiết kế đúng, không phải thiếu sót.

`B7` và `B8` là hai blocker mới so với bản đầu, và chúng lấp đúng hai câu hỏi mà bản đầu không có trục nào trả lời: *đây có phải vấn đề thật không* và *có đóng góp không*. Bản đầu chỉ đo được *làm được không*.

---

## 4. Tầng RÀNG BUỘC — 6 trục, lấy mức xấu nhất

Sáu trục, mỗi trục cho ra **một trong ba mức**. Verdict tầng này = **mức xấu nhất**, không cộng, không bình quân, không bù trừ.

Ba mức: `ĐI ĐƯỢC` · `CĂNG` · `CHẶN`

**Quy tắc chống vòng tròn — áp cho `R1`, `R2`, `R3`.** Ba trục này có trường khai báo tương ứng (`risk`, `know`, `diff`+`compute`). Đọc thẳng trường rồi trả lại nó thành mức là **chấm lại lời tự khai của người viết page** — mà mục 1b vừa nói chính các thang đó chưa được hiệu chuẩn. Thứ tự đúng là ngược lại:

1. **Chấm bằng văn xuôi trước** — `data` có nêu đường truy cập và license không; `d.learn` có nói học *cái gì* không; `d.risk` có đường xoay cụ thể không.
2. **Rồi mới đọc trường khai báo, như một claim cần kiểm.** Khớp thì ghi `bang_chung` là `CO_NGUON`. Lệch thì đó là `F27` (mâu thuẫn nội bộ) và phải xuất `sua_truong` cho trường đó.

Nói cách khác: trường khai báo là **giả thuyết của tác giả về độ khó**, không phải kết quả chấm.

### R1 — Dữ liệu (chấm `data` + `d.risk`; trường `risk` là claim cần kiểm)

| Mức | Điều kiện | Claim `risk` tương ứng |
|---|---|---|
| `ĐI ĐƯỢC` | Bộ mở, license rõ, có nhãn, tải là dùng; hoặc dữ liệu đã nắm trong tay | `thap` |
| `CĂNG` | Có nhưng cần công: gộp nguồn, làm sạch nặng, tự gán nhãn một phần, hoặc phải xin nhưng đã có kênh và **có phương án B** | `tb` |
| `CHẶN` | Chỉ có phương án mơ hồ; nhãn phải tự tạo khối lượng lớn mà chưa có ai xác nhận; phụ thuộc hoàn toàn một bên chưa cam kết; hoặc không có đường hợp pháp | `cao` |

Câu hỏi kiểm: *Ai đang giữ? Bao nhiêu mẫu mỗi lớp? Nhãn từ đâu và ai xác nhận? Được công bố kết quả không? Nguồn chính hỏng thì lấy gì thay?*

**Quy tắc riêng:** nếu `d.risk` ghi cảnh báo pháp lý mà `risk` vẫn là `thap` hoặc `tb` → đó là **mâu thuẫn nội bộ**, phải sửa trường `risk` lên `cao`.

**Quy tắc riêng cho dữ liệu người:** nếu dữ liệu là dữ liệu người (bệnh án, hồ sơ sinh viên, dữ liệu vị trí, giọng nói) thì thời gian chờ duyệt là **chi phí lịch trình thật**, không phải rủi ro trừu tượng. Không nêu được ai duyệt và chờ bao lâu → trục này không được xếp trên `CĂNG`.

### R2 — Nền phải học (chấm `d.learn`; trường `know` là claim cần kiểm)

| Mức | Điều kiện |
|---|---|
| `ĐI ĐƯỢC` | `know: thap` — nền học được trong ~1/8 thời lượng (≈2–3 tuần cho luận văn 6 tháng), và `d.learn` ghi rõ học gì |
| `CĂNG` | `know: tb` — ~4–5 tuần, một lĩnh vực mới nhưng có tài liệu vào cửa rõ ràng |
| `CHẶN` | `know: cao` **và** `B6` ở `THAT_BAI` — 6–8 tuần nền chuyên ngành mà đã xác định là không có ai để hỏi, hoặc phần việc đòi một người rất khó tìm (ví dụ người đọc được Hán-Nôm để gán nhãn). Hoặc đề tài đòi **hai** nền nặng cùng lúc (ví dụ vừa nhân quả nâng cao vừa RL). **`know: cao` cộng `B6` `CHUA_THU` chỉ là `CĂNG`** — chưa đi hỏi bộ môn không phải là đã bị từ chối |

**Quy tắc riêng:** `d.learn` chỉ ghi số tuần mà không ghi *học cái gì* thì trục này không được xếp trên `CĂNG` — con số tuần không có nội dung là con số không kiểm được.

### R3 — Thời gian và tính toán (chấm `d.method` + `d.risk`; `diff`/`compute` là claim cần kiểm)

| Mức | Điều kiện |
|---|---|
| `ĐI ĐƯỢC` | Chia được thành mốc theo tuần khớp deadline, còn ≥20% đệm để viết; `compute` ở mức `thap`/`tb` và chạy được trên laptop hoặc free tier |
| `CĂNG` | Một trong hai chỗ chật nhưng có đường xoay đã ghi rõ trong `d.risk` (giảm dữ liệu, mô hình nhỏ hơn, checkpoint có sẵn); hoặc lịch có một khoản chờ duyệt dữ liệu chưa biết dài bao lâu |
| `CHẶN` | `compute: cao` mà không có GPU; hoặc ước lượng vượt ~2× thời lượng; hoặc cần nhiều người |

**Lưu ý về `diff`:** bản trước có mệnh đề `CHẶN` là "`diff: 5` cộng `know: cao` cộng `compute: cao`". Trên dữ liệu thật chỉ còn **một** đề tài `diff: 5`, nên mệnh đề đó gần như là code chết — đừng dựa vào nó. `diff` giờ chỉ dùng làm claim đối chiếu, không tự sinh mức.

**Quy tắc riêng cho phương sai:** nếu phương pháp thuộc họ có phương sai lớn giữa các seed (RL, mô hình sinh, few-shot LLM) thì ngân sách phải đủ **≥5 seed mỗi cấu hình**. Không đủ → `CHẶN`, vì kết luận sẽ không đứng được bất kể mô hình tốt đến đâu.

### R4 — Người đỡ (không có trường trực tiếp trong page — phải hỏi thêm; `src` là bằng chứng gián tiếp)

| Mức | Điều kiện |
|---|---|
| `ĐI ĐƯỢC` | Có thầy hướng dẫn đã làm mảng gần đó, hoặc đã có luận văn cùng mảng bảo vệ ở **đơn vị của bạn** trong 2–3 năm gần đây. `src: ext:<đơn vị của bạn> · danh mục luận văn đã bảo vệ` là bằng chứng trực tiếp cho ô này |
| `CĂNG` | Không có ai trong mảng nhưng có người đỡ được phần phương pháp, và phần domain thì `know` ở mức `thap`. Cũng là ô của `src: ext:<trường khác>` — đề tài đỡ được ở đâu đó, chưa chắc đỡ được ở đây |
| `CHẶN` | `know: cao` mà không ai đỡ được domain; hoặc chưa từng có ai ở đơn vị làm mảng đó và bạn coi điều đó là "cơ hội trống" |

Page nói thẳng chỗ này: chưa từng có ai làm mảng đó ở đơn vị **không phải** khoảng trống nghiên cứu — đó là dấu hiệu không có ai đỡ.

**`R4` là trục duy nhất mà lượt chấm hồ sơ không tự trả lời được.** Xem mục 6: khi nó ở `CĂNG` chỉ vì chưa hỏi ai, nó **không tiêu ngân sách `CĂNG`** — nó đi vào `viec_cua_spike`.

### R5 — Thiết kế đo lường (đọc `d.method`)

Trục này chấm *cách đo*, không chấm *mô hình dùng gì*. Đề tài chọn model theo mốt mà đo tử tế vẫn tốt hơn đề tài chọn model đúng mà đo sai.

| Mức | Điều kiện |
|---|---|
| `ĐI ĐƯỢC` | Đủ **năm** thành phần: (1) baseline tầm thường được nêu tên và được tune ngang tay với mô hình đề xuất; (2) metric khớp bản chất bài toán; (3) cách chia tập chống rò rỉ **được nêu rõ và giải thích lý do**; (4) nhiều seed / khoảng tin cậy; (5) ablation hoặc phân rã nguồn cải thiện |
| `CĂNG` | Thiếu một thành phần, và thiếu chỗ đó không làm kết luận vô nghĩa |
| `CHẶN` | Không có baseline; hoặc metric sai bản chất (accuracy cho dữ liệu lệch lớp nặng, R² làm metric duy nhất, point-adjust F1 không kèm thước đo thô); hoặc chia random trên dữ liệu có nhóm/thời gian; hoặc kết luận từ một lần chia dữ liệu |

**Danh sách rò rỉ phải soi từng cái** (page này có nhiều đề tài dựng riêng quanh chúng, nên đây là trục nghiêm nhất):
- đặc trưng tương lai lọt vào tập train
- chuẩn hoá / chọn đặc trưng làm **trước** khi chia tập
- cùng thực thể nằm hai bên (cùng bệnh nhân, cùng người nói, cùng máy, cùng ngôi sao, cùng vùng hoạt động, cùng trận lũ, cùng cửa sổ trượt)
- homolog / scaffold / dòng vi khuẩn tương đồng giữa train và test
- tập test đã nằm trong corpus tiền huấn luyện của mô hình nền
- nhãn suy ra từ chính thứ đang dự đoán
- **nhãn thiếu bị coi là nhãn âm**
- đặc trưng chỉ định danh môi trường thu thập (thiết bị ghi âm, địa chỉ IP, nguồn phát tin, nền ảnh)

### R6 — Kết quả âm vẫn ra luận văn (đọc `d.spike` + `contrib`)

| Mức | Điều kiện |
|---|---|
| `ĐI ĐƯỢC` | Cả hai nhánh kết quả đều là luận văn tốt, và `contrib` không phụ thuộc việc mô hình phải thắng |
| `CĂNG` | Nhánh âm vẫn viết được nhưng mỏng hơn rõ rệt; hoặc `d.spike` chưa viết thành một phép thử giết được đề tài |
| `CHẶN` | Nếu mô hình không thắng baseline thì không còn gì để viết |

**Quy tắc riêng:** `d.spike` phải mô tả một phép thử **giết được đề tài trong 5 ngày**. Spike kiểu "cài thư viện, load dữ liệu, chạy thử" không giết được gì → trục này không được xếp trên `CĂNG`. Spike tốt luôn có dạng: *"nếu con số này ra thế kia thì đổi đề tài ngay"*.

**Nhưng:** phần lớn `d.spike` trong page hiện viết theo lối kế hoạch ngày 1–5 chứ không có câu giết đề tài thành văn. Đó là **lỗi diễn đạt của hồ sơ, không phải khuyết tật của đề tài** — và nó sửa được bằng một câu. Vì vậy `R6 = CĂNG` *chỉ vì `d.spike` chưa viết đúng dạng* **không tiêu ngân sách `CĂNG`** ở mục 6; nó ra `sua_truong.d.spike` kèm bản viết lại. Nếu không có ngoại lệ này thì `R6 = CĂNG` gần như phổ quát và nó nuốt trọn ngân sách của mọi đề tài.

---

## 5. Tầng GIÁ TRỊ — chỉ đọc sau khi tầng ràng buộc đã xanh

Hai trục đầu **không được bù cho tầng 4**. Đề tài tác động 5 mà `R1 = CHẶN` vẫn là `CHAN`. Thứ tự đọc là bắt buộc: ràng buộc trước, giá trị sau.

Nhưng khác bản đầu: **`V1` và `V2` giờ có hệ quả verdict.** Ở bản đầu, chỉ verdict `DI_DUOC` nhắc tới chúng, bằng cụm không định nghĩa "V1 và V2 khớp nội dung"; bốn verdict còn lại thuần blocker + ràng buộc. Hệ quả là một đề tài `V2 = YẾU` — tái hiện tutorial, đổi dataset của bài đã có — vẫn ra `DI_DUOC_CO_DIEU_KIEN` bình thường. Trục trả lời câu "có đóng góp không" vừa không được vận hành, vừa không ảnh hưởng kết quả. Mục 6 sửa cả hai.

### V1 — Tác động (ánh xạ `impact.s` + `who`/`pay`/`out`)

Xác nhận `impact.s` có đúng như ba dòng mô tả không, thay vì tự chấm lại từ đầu:

| `impact.s` | Phải đứng được điều gì |
|---|---|
| `5` (ra sản phẩm) | `who` chỉ ra người cụ thể, không phải "xã hội"; `pay` chịu được `B7` — một cuộc gọi 30 phút với người làm nghề đó; `out` là hiện vật cắm được vào chỗ nào đó |
| `4` (ứng dụng rõ) | Có người dùng kết quả nhưng đường ra tiền gián tiếp hoặc chậm |
| `3` (học thuật) | Giá trị là khoảng trống học thuật cụ thể; **`pay` được phép ghi "không có đường ra tiền rõ"** và đó là câu trả lời đúng, không phải thiếu sót. `B7` chuyển sang dạng miễn: nêu tên một công trình mà kết quả của bạn đổi cách đọc nó |
| `2`–`1` (hẹp) | Chỉ một nhóm nhỏ quan tâm — hợp lệ, nhưng phải viết thẳng, không tô |

**Ba lỗi phải bắt ở trục này:**
- `impact.s: 5` mà `pay` chỉ nói chung chung về "tiềm năng thị trường" → hạ xuống 4 hoặc 3.
- `impact.s` cao được dùng để che một trục ràng buộc đỏ → không hợp lệ, tầng 5 không bù tầng 4.
- Điểm tác động bị nâng vì đề tài *nghe* thời sự (LLM, AI, vũ trụ) chứ không vì `who`/`pay`/`out` đứng được → hạ.

Và ngược lại: **điểm tác động thấp không phải điểm xấu.** Một đề tài 3 điểm có thể là luận văn tốt hơn một đề tài 5 điểm; nó chỉ khó gây hứng thú cho doanh nghiệp ngồi dự bảo vệ hơn.

### V2 — Đóng góp (đọc `contrib` + `d.why`, cần `B8`)

Ở bậc thạc sĩ, đóng góp **không cần là thuật toán mới**. Các dạng hợp lệ, xếp theo mức thường gặp trong page này:

1. **Đo lại một kết quả đã công bố dưới điều kiện đánh giá chặt hơn** (kiểm soát rò rỉ, chia tập đúng, baseline tune ngang tay) — dạng bền nhất, khó ra kết quả rỗng nhất
2. **Đổi thước đo sang thước đo quyết định** và chỉ ra chỗ thứ hạng đảo
3. **Đường cong đánh đổi** (bao nhiêu nhãn / bao nhiêu dữ liệu / bao nhiêu tiền thì đáng dùng phương pháp nào)
4. **Phân rã nguồn cải thiện** bằng ablation kiểu factorial
5. **Dữ liệu hoặc ngữ cảnh mới** (tiếng Việt, thị trường Việt Nam, vùng địa lý chưa ai đo)
6. **Ràng buộc thực tế mới** (chạy on-device, ít nhãn, chi phí thấp, không có dữ liệu gốc)
7. **Hạ tầng đánh giá tái dùng được** (bộ dữ liệu có nhãn, giao thức chia tập, chỉ số ô nhiễm)

| Mức | Điều kiện |
|---|---|
| `TOT` | `B8 = VUOT` · `contrib` thuộc rõ một dạng trên · và câu delta nói được **khác gì hai công trình gần nhất** |
| `DUOC` | Có nét mới nhưng `B8 = CHUA_THU`, hoặc đã tra mà chưa nói rõ khác biệt |
| `YEU` | `B8 = THAT_BAI` (đã có người làm đúng cái này) · hoặc về cơ bản lặp lại · hoặc chỉ đổi dataset của một bài đã có mà không đổi câu hỏi |

**`V2 = YEU` có hệ quả:** trần verdict là `PHAI_SIET_LAI` — xem mục 6. Đây là chỗ bản đầu để trống.

### 5b. Thủ tục tra công trình gần nhất (`B8`) — có trần thời gian, không phải "đi đọc literature"

Bản đầu nói `V2` không kiểm được nếu không tra cứu, rồi dừng ở đó. Kết quả là trục đóng góp không bao giờ được chấm. Thủ tục dưới đây bó nó vào **một ngày**:

1. **Ba truy vấn, không hơn.** Một theo *phương pháp* ("conformal prediction retrieval augmented generation"), một theo *hiện tượng* ("point-adjust protocol anomaly detection inflation"), một theo *dữ liệu/miền* ("M5 newsvendor inventory cost forecasting"). Chạy trên Google Scholar hoặc Semantic Scholar hoặc arXiv — ghi lại đúng chuỗi truy vấn đã dùng.
2. **Đọc 10 abstract.** Không đọc full text ở bước này.
3. **Chọn hai bài gần nhất** và ghi trích dẫn đủ để người khác tra lại (tác giả, năm, nơi công bố, id nếu có). Nếu là arXiv, ghi số arXiv.
4. **Viết một câu delta.** Dạng: *"Bài X đo A trên B; đề tài này đo A trên B′ với thiết kế chống rò rỉ Y mà X không có."* Nếu không viết được câu đó, `V2` chưa lên `TOT` được — dù bạn đã tra.
5. **Dừng.** Một ngày là trần. Tra thêm là việc của giai đoạn viết đề cương, không phải giai đoạn chọn đề tài.

**Ba kết cục:**
- Tìm được hai bài gần và viết được delta → `B8 = VUOT`, `V2` mở tới `TOT`.
- Tìm được một bài làm **đúng** câu hỏi, **đúng** dữ liệu, **đúng** thước đo → `B8 = THAT_BAI`, `V2 = YEU`. Không phải `CHAN` — lõi thường vẫn dùng được sau khi đổi góc, nên verdict là `PHAI_SIET_LAI`.
- Không tìm thấy gì gần → ghi rõ **đã tra gì**, và cảnh giác: với `src: ai:*` thì "không ai làm" thường có nghĩa là truy vấn của bạn sai từ khoá, không phải mảng trống.

**Bẫy riêng của page này:** page dùng lặp lại vài khuôn mẫu (hoàng đế cởi trần · đổi thước đo · baseline tàn nhẫn · đo bằng chi phí quyết định) trên nhiều lĩnh vực. Khuôn mẫu lặp là **hợp lệ và rẻ** — nhưng phải kiểm hai chuyện: (a) khuôn đó đã có người áp vào **đúng** lĩnh vực này chưa (đó là `B8`); (b) trong danh sách có bao nhiêu đề tài khác dùng đúng khuôn đó — nếu nhiều, chọn một, và nói rõ vì sao chọn cái đó.

### V3 — Đòn bẩy nền sẵn có (đọc `mobile` + `vn`, đối chiếu "Nền học viên")

Page có hai trường `mobile` và `vn` mà **không trục nào ở trên tiêu thụ**, và mục 9 có slot "Nền học viên" cũng cần được dùng vào đâu đó. Một đề tài khai thác đúng nền kỹ sư mobile/backend của học viên đi nhanh hơn hẳn một đề tài buộc học viên bắt đầu từ số không, dù hai cái cùng mức `know`.

| Mức | Điều kiện |
|---|---|
| `Cao` | `mobile: true` **và** phần việc mobile/backend là phần lõi (on-device, đo điện/độ trễ, ETL nặng, dựng hạ tầng đo) — nền sẵn có cắt được vài tuần thật |
| `Vừa` | `vn: true` và góc Việt Nam đòi việc thu thập / xử lý dữ liệu tiếng Việt mà học viên làm được mà không cần ai đỡ |
| `Thấp` | Không dùng gì từ nền sẵn có; toàn bộ giá trị nằm ở phần domain phải học mới |

Ba quy tắc dùng `V3`:

1. **`V3` chỉ để xếp hạng, không để sàng.** `V3 = Thấp` không bao giờ là lý do loại — rất nhiều luận văn tốt không dùng lại gì từ nghề cũ.
2. **`vn: true` một mình không phải đòn bẩy.** Gần nửa danh sách có nó; nó chỉ thành đòn bẩy khi *việc* tiếng Việt là việc học viên tự làm được.
3. **Đừng để `V3` nâng `V1`.** "Tôi làm mobile nên tôi thấy nó có ích" không phải `impact.pay`.

### 5d. Sàn tầm cỡ — phép thử "đủ một luận văn chưa"

Bản đầu có trần ở khắp nơi (khó quá → `CHẶN`) nhưng **không có sàn**. Một đề tài quá nhỏ sẽ xanh mọi trục: dữ liệu mở, không cần học gì, chạy trên laptop, đo tử tế, có nhánh kết quả âm. Rubric càng chấm càng khen.

Lượt chấm ngày 28/07 vấp đúng chỗ này với **#89** (*"tiếng Việt tốn thêm bao nhiêu token"*): chính `d.risk` của nó ghi *"rủi ro thật là đề tài quá nhỏ"* và `d.spike` nói kết quả chính ra trong một buổi sáng. Lượt đó phải xử lý ad-hoc vì rubric không có nhãn nào cho "đúng nhưng không đủ tầm". Giờ có.

**Phép thử — bật `QUA_NHO` khi có ít nhất hai trong bốn dấu hiệu:**

1. **Kết quả chính ra trong ≤1 tuần**, theo chính mô tả trong `d.spike`. Spike mà *là* luận văn thì đó không phải spike.
2. **Chỉ có một trục thực nghiệm.** Không có trục thứ hai đứng riêng được — không quét tham số nào, không ablation nào, không đường cong đánh đổi nào, không tập dữ liệu thứ hai nào. Một bảng số là một chương, không phải một luận văn.
3. **`contrib` là một quan sát, không phải một hiện vật.** "Chỉ ra rằng X lớn hơn Y" mà không kèm giao thức, bộ dữ liệu, hay công cụ nào dùng lại được.
4. **Chính hồ sơ nói nó là một phần của đề tài khác** — `d.risk` hoặc `d.why` tự gọi nó là một chương, hoặc trỏ sang một `#N` khác như bản đầy đủ.

**Xử lý `QUA_NHO`:** không loại khỏi page. Ghi `gop_vao: "#N"` — nó là một chương của đề tài nào — và đưa ra khỏi bảng chọn. Nếu không tìm được đề tài mẹ, xuất phiên bản mở rộng: trục thực nghiệm thứ hai nào biến nó thành luận văn.

**Cẩn thận với chiều ngược lại.** `QUA_NHO` không phải chỗ để đòi đề tài phải hoành tráng. Một đề tài đo lại một kết quả đã công bố dưới điều kiện chặt hơn (dạng 1 ở `V2`) *nghe* nhỏ nhưng thường là luận văn tốt nhất trong danh sách — nó vượt phép thử trên ở dấu hiệu 2 và 3. Đọc bốn dấu hiệu, đừng đọc cảm giác.

---

## 6. Verdict — 6 nhãn, không có điểm số

Không có tổng điểm. Verdict suy ra bằng luật, đọc được ngược lại thành hành động.

### 6a. Ngân sách `CĂNG` — đọc trước bảng verdict

Bản đầu đặt ngưỡng `DI_DUOC_CO_DIEU_KIEN` ở "nhiều nhất hai trục `CĂNG`" và đồng thời nói `R4` là `CĂNG` với mọi đề tài. Cộng thêm `R6 = CĂNG` gần như phổ quát vì `d.spike` viết theo lối kế hoạch, ngân sách hai slot bị tiêu hết **trước khi ai đọc một chữ nào về dữ liệu hay phương pháp**. Đo trên dữ liệu hiện tại: 43 đề tài đã có hai `CĂNG` chỉ từ `R1`/`R2`, cộng `R4` là ba → `PHAI_SIET_LAI`, và mục 10 loại `PHAI_SIET_LAI` khỏi bảng chọn. Kết quả: phần lớn danh sách rơi ra bằng số học khai báo. Đó là đúng failure mode mà mục 3a đã chữa, chỉ dịch xuống một nấc.

**Quy tắc:** ngân sách `CĂNG` chỉ đếm các trục **`CĂNG` có căn cứ** — tức trục mà bạn đã đọc văn xuôi và kết luận là chật thật.

Trục ở `CĂNG` chỉ vì **chưa xác minh được** thì **không tiêu ngân sách**. Nó đi vào `viec_cua_spike` và `cau_hoi_can_hoi_lai`. Hai ca điển hình, và chúng phải được ghi rõ trong output:

- **`R4` chưa hỏi bộ môn** → `bang_chung: CHUA_KIEM`, không tiêu ngân sách.
- **`R6` `CĂNG` chỉ vì `d.spike` chưa viết thành phép thử giết đề tài** → không tiêu ngân sách, nhưng **bắt buộc** xuất `sua_truong.d.spike` kèm bản viết lại.

Logic giống hệt `CHUA_THU` ≠ `THAT_BAI` ở mục 3a: chưa biết không phải là đã xấu.

### 6b. Bảng verdict

| Verdict | Điều kiện | Hành động |
|---|---|---|
| `DI_DUOC` | Không blocker nào `THAT_BAI` · sáu trục ràng buộc đều `ĐI ĐƯỢC` · `B7` và `B8` đều `VUOT` · `V2` ≥ `DUOC` | Vào shortlist, chạy spike 5 ngày |
| `DI_DUOC_CO_DIEU_KIEN` | Không blocker nào `THAT_BAI` · nhiều nhất **hai** trục `CĂNG` **có căn cứ** (xem 6a), mỗi trục có đường xoay ghi rõ · `V2` ≥ `DUOC` | Vào shortlist nhưng sửa các trường đã nêu trước khi chạy spike |
| `PHAI_SIET_LAI` | Không blocker nào `THAT_BAI` · và một trong: từ **ba** trục `CĂNG` có căn cứ trở lên · `R5 = CHẶN` (đo sai nhưng lõi câu hỏi còn dùng được) · `V2 = YEU` · trường yêu cầu đóng góp mới mà `V2` chỉ ở `DUOC` | Có lõi. Viết lại `q`, `d.method`, đổi góc để tránh công trình đã có, hoặc thu hẹp phạm vi, rồi chấm lại |
| `QUA_NHO` | Đạt phép thử sàn ở mục 5d (≥2 trong 4 dấu hiệu) — kể cả khi mọi trục khác đều xanh | Không phải đề tài. Ghi `gop_vao: "#N"`, hoặc xuất trục thực nghiệm thứ hai để nâng nó lên |
| `CHAN` | Ít nhất một blocker ở `THAT_BAI` · hoặc một trục trong `R1`/`R2`/`R3`/`R4`/`R6` ở `CHẶN` | Không chạy spike. Ghi rõ chặn ở đâu và cần gì để mở |
| `THIEU_THONG_TIN` | Theo bảng ở mục 1a — `src` chưa truy được, `data` không nêu được nguồn nào, hoặc `IMPACT[id]` là fallback | Hỏi lại đúng những trường đó. **Không tự điền giả định để chấm** |

Sáu quy tắc bắt buộc:

- **`CHUA_THU` không phải `CHAN`.** Blocker chưa thử là việc của spike, không phải bản án — xem 3a. Đây là quy tắc hay bị vi phạm nhất, và vi phạm nó thì cả danh sách ra `CHAN`.
- **`CĂNG` chưa xác minh không tiêu ngân sách.** Xem 6a. Đây là quy tắc hay bị vi phạm thứ hai, và vi phạm nó thì cả danh sách ra `PHAI_SIET_LAI`.
- **`R5 = CHẶN` không tự động là `CHAN`.** Đo sai thường sửa được bằng cách viết lại `d.method`; dữ liệu không tồn tại thì không sửa được. Phân biệt hai loại này là điểm khác biệt chính so với rubric chung.
- **`V2 = YEU` chặn shortlist.** Một đề tài khả thi mà không có đóng góp là một bài tập lớn, không phải luận văn. Đây là chỗ bản đầu để trống hoàn toàn.
- **Yêu cầu của trường được tiêu thụ, không chỉ được hỏi.** Nếu trường bắt buộc "có đóng góp mới" thì `V2 = DUOC` chưa đủ và trần là `PHAI_SIET_LAI`. Nếu trường cho phép applied thesis thì `V2` dạng 5/6/7 (dữ liệu mới, ràng buộc thực tế mới, hạ tầng đánh giá) là đủ. Bỏ trống ô này trong prompt thì phải ghi trong output là **chưa áp được**, không được im lặng bỏ qua.
- **Không có "verdict biên".** Nếu bạn thấy đề tài nằm giữa hai nhãn, xuất nhãn xấu hơn kèm câu *"nằm giữa X và Y, nghiêng về X vì [trục nào]"*. Đừng làm mịn bằng cách bịa thêm bậc.

Trong lượt chấm hồ sơ, `DI_DUOC` vẫn thường rỗng vì `B7`/`B8` chưa chạy — nhưng khác bản đầu, giờ **`DI_DUOC_CO_DIEU_KIEN` là ô đông**, không phải ô hiếm. Đó là hình dạng đúng của một bộ lọc trước spike.

---

## 7. Red flag — gọi tên, đối chiếu từng cái

Nhóm theo trường của page để soi có hệ thống.

**Cách dùng danh sách này.** Red flag **không tự sinh verdict**. Mỗi cái hoặc (a) ánh xạ vào một trục / blocker — cột "→" chỉ chỗ, và verdict đến từ trục đó; hoặc (b) là **chẩn đoán**, ghi vào `red_flags[]` để người đọc biết soi chỗ nào, không đổi kết quả. Bản đầu để cả 32 cờ trôi nổi không nối vào đâu, khiến một nửa số cờ không có hệ quả nào.

**Ở `t` và `q` (phạm vi)**

| | Cờ | → |
|---|---|---|
| `F1` | Là chủ đề, không phải câu hỏi ("Ứng dụng AI trong y tế") | `B3` |
| `F2` | Gộp ≥3 bài toán độc lập bằng chữ "và" | `B3` |
| `F3` | Là một sản phẩm, không phải một câu hỏi ("Xây dựng hệ thống X") | `B3` |
| `F4` | Hứa cả nghiên cứu mô hình + hệ thống end-to-end + triển khai | `R3` |

**Ở `data`**

| | Cờ | → |
|---|---|---|
| `F5` | "Sẽ thu thập / sẽ xin được" mà chưa có mẫu thử nào | `R1` |
| `F6` | Phụ thuộc một API có thể đóng hoặc chuyển sang trả phí | `R1` (chẩn đoán nếu có phương án B) |
| `F7` | Nhãn cần chuyên gia gán (bác sĩ, luật sư, người đọc được Hán-Nôm) mà chưa ai cam kết | `R1` + `B6` |
| `F8` | Dữ liệu quá nhỏ so với mô hình mà không nói tới transfer learning hoặc augmentation | chẩn đoán |
| `F9` | Nêu tên bộ dữ liệu mà **không kiểm license** — riêng với dữ liệu người và dữ liệu nền tảng, đây là red flag nặng | `B2` |
| `F10` | Bộ dữ liệu **đã chết hoặc đã đổi điều khoản** từ lúc đề tài được viết | `B1`/`B2` |
| `F35` | Dữ liệu người mà không nói **ai duyệt** và **chờ bao lâu** | `R1` + `R3` |

**Ở `d.method`**

| | Cờ | → |
|---|---|---|
| `F11` | Không có baseline | `R5 = CHẶN` |
| `F12` | Metric sai bản chất: accuracy cho dữ liệu lệch lớp nặng, R² làm metric duy nhất, point-adjust F1 không kèm thước đo thô, RMSE cho bài toán mà quyết định chỉ cần một phân vị | `R5 = CHẶN` |
| `F13` | Chia random trên dữ liệu chuỗi thời gian hoặc dữ liệu có nhóm | `R5 = CHẶN` |
| `F14` | So sánh không công bằng: mô hình đề xuất tune kỹ, baseline để mặc định | `R5` |
| `F15` | Kết luận từ chênh lệch nhỏ mà không có nhiều seed hoặc khoảng tin cậy | `R5` |
| `F16` | Tuyên bố nhân quả từ dữ liệu quan sát mà không có thiết kế nhân quả | `R5` |
| `F17` | Chọn kiến trúc phức tạp mà không có giả thuyết vì sao nó phù hợp | chẩn đoán |
| `F18` | **Nhãn thiếu bị dùng như nhãn âm** | `R5 = CHẶN` |
| `F19` | Nhãn yếu (danh sách đã bị xử lý, sản phẩm giám sát toàn cầu, nhãn tự khai) được dùng như chân lý | `R5` |

**Ở `contrib` và `d.why`**

| | Cờ | → |
|---|---|---|
| `F20` | Là bản tái hiện một tutorial phổ biến | `V2 = YEU` |
| `F21` | "So sánh các thuật toán trên dataset UCI" mà không có góc nhìn nào ngoài bảng số | `V2 = YEU` + mục 5d dấu hiệu 2 |
| `F22` | Chỉ đổi dataset của một bài đã có, không đổi câu hỏi | `V2 = YEU` |
| `F23` | **Trùng khuôn mẫu với đề tài khác trong cùng danh sách** mà không nói rõ khác gì | chẩn đoán — xử ở mục 10.2, không loại lẻ |

**Ở `d.risk` và `d.spike`**

| | Cờ | → |
|---|---|---|
| `F24` | Không có nhánh kết quả âm — mô hình không thắng thì không còn gì để viết | `R6 = CHẶN` |
| `F25` | Spike không giết được đề tài (chỉ là "cài thư viện, load dữ liệu") | `R6 = CĂNG` **không tiêu ngân sách** — xem 6a |
| `F26` | Phụ thuộc một người hoặc một tổ chức duy nhất, không có phương án B | `R1` |
| `F27` | `d.risk` mâu thuẫn với trường `risk`/`compute`/`know` | `sua_truong` bắt buộc |
| `F28` | Đòi tài nguyên vượt khả năng đã khai trong `compute` | `R3` + `sua_truong` |

**Ở `impact.*`**

| | Cờ | → |
|---|---|---|
| `F29` | `impact.s: 5` mà `pay` chỉ là "tiềm năng thị trường" | `V1` hạ điểm |
| `F30` | `who` là "xã hội" hoặc "mọi người" thay vì một nhóm cụ thể | `V1` hạ điểm |
| `F31` | `out` là "một báo cáo" chứ không phải một hiện vật ai đó dùng được | `V1` hạ điểm |
| `F32` | Con số quy mô trong `pay` không có nguồn | mục 2 quy tắc 2 |

**Ở `src`**

| | Cờ | → |
|---|---|---|
| `F33` | `src` thiếu, rỗng, hoặc là `?` / `CHUA_XAC_DINH` | `THIEU_THONG_TIN` |
| `F34` | `src: ai:` mà không có model id thật ("ai:claude", "ai:LLM") — không tái lập được, không biết cũ tới đâu | `THIEU_THONG_TIN` |
| `F36` | `src: ext:` mà nguồn không tra được ("ext:internet", "ext:tham khảo") | `THIEU_THONG_TIN` |
| `F37` | `src: ai:*` mà `d.why` chứa trích dẫn cụ thể (tên bài, số arXiv, con số hiệu năng) **chưa được tra** | chẩn đoán nặng — mục 2 quy tắc 4; đây là chỗ dễ có tên bài không tồn tại nhất |

---

## 8. Đầu ra chuẩn — sửa thẳng vào trường của page

Không xuất JSON generic. Xuất **diff áp được vào page** cộng một bảng đọc được.

`sua_truong` chia hai nhánh vì page có **hai chỗ sửa thật**: object trong `TOPICS`, và entry trong `IMPACT` khoá theo `id` (mục 1a). Diff nhắm sai nhánh thì không áp được.

```json
{
  "id": "a07",
  "n": 7,
  "src": "ai:claude-opus-5",
  "as_of": "YYYY-MM-DD",
  "verdict": "DI_DUOC | DI_DUOC_CO_DIEU_KIEN | PHAI_SIET_LAI | QUA_NHO | CHAN | THIEU_THONG_TIN",
  "rang_buoc_bo_nhat": "R1 | R2 | R3 | R4 | R5 | R6",
  "ngan_sach_cang": { "co_can_cu": 2, "chua_xac_minh": ["R4", "R6"] },

  "blockers": [
    { "id": "B1", "trang_thai": "VUOT",     "hien_vat": "…", "bang_chung": "DA_CHAY" },
    { "id": "B2", "trang_thai": "CHUA_THU", "hien_vat": "chưa đọc license của nguồn thứ 2 — việc của ngày 1 spike", "bang_chung": "CHUA_KIEM" },
    { "id": "B6", "trang_thai": "THAT_BAI", "hien_vat": "hồ sơ ghi cần người đọc được Hán-Nôm, chưa ai cam kết", "bang_chung": "CO_NGUON" },
    { "id": "B7", "trang_thai": "CHUA_THU", "hien_vat": "chưa nói chuyện với ai làm nghề — 1 tuần", "bang_chung": "CHUA_KIEM" },
    { "id": "B8", "trang_thai": "VUOT",
      "hien_vat": "3 truy vấn: „…”, „…”, „…”; đọc 10 abstract; hai bài gần nhất: …, …",
      "cau_delta": "Bài X đo A trên B; đề tài này đo A trên B′ với thiết kế chống rò rỉ Y mà X không có",
      "bang_chung": "CO_NGUON" }
  ],

  "rang_buoc": {
    "R1_du_lieu":   { "muc": "DI_DUOC", "ly_do": "…", "bang_chung": "CO_NGUON",  "tinh_ngan_sach": false },
    "R2_nen_hoc":   { "muc": "CANG",    "ly_do": "…", "bang_chung": "CO_NGUON",  "tinh_ngan_sach": true  },
    "R3_thoi_gian": { "muc": "DI_DUOC", "ly_do": "…", "bang_chung": "CO_NGUON",  "tinh_ngan_sach": false },
    "R4_nguoi_do":  { "muc": "CANG",    "ly_do": "chưa hỏi bộ môn", "bang_chung": "CHUA_KIEM", "tinh_ngan_sach": false },
    "R5_do_luong":  { "muc": "DI_DUOC", "ly_do": "…", "bang_chung": "CO_NGUON",  "tinh_ngan_sach": false },
    "R6_ket_qua_am":{ "muc": "CANG",    "ly_do": "d.spike chưa giết được đề tài", "bang_chung": "CO_NGUON", "tinh_ngan_sach": false }
  },

  "gia_tri": {
    "V1_tac_dong": { "impact_s_hien_tai": 4, "impact_s_de_xuat": 4, "ly_do": "…" },
    "V2_dong_gop": { "muc": "TOT | DUOC | YEU", "dang": "do-lai-chat-hon", "khac_gi_gan_nhat": "…" },
    "V3_don_bay":  { "muc": "CAO | VUA | THAP", "ly_do": "mobile:true, phần lõi là đo độ trễ on-device" }
  },

  "san_tam_co": { "qua_nho": false, "dau_hieu_dat": [], "gop_vao": null },

  "yeu_cau_truong": { "da_ap": true, "doi_hoi": "bắt buộc đóng góp mới", "ket_luan": "V2 = DUOC chưa đủ → PHAI_SIET_LAI" },

  "red_flags": ["F13", "F27"],

  "sua_truong": {
    "TOPICS": {
      "src":      { "tu": "?", "sang": "ai:claude-opus-5", "vi_sao": "F33 — chưa khai xuất xứ" },
      "risk":     { "tu": "thap", "sang": "tb",  "vi_sao": "d.risk mô tả phải xin quyền — mâu thuẫn nội bộ" },
      "know":     null,
      "q":        "phiên bản câu hỏi đã siết lại, nếu nên siết",
      "d.method": "thêm baseline …; đổi sang chia tập theo …; báo cáo … thay cho …",
      "d.spike":  "phiên bản spike giết được đề tài trong 5 ngày, nếu bản hiện tại không giết được"
    },
    "IMPACT": {
      "s":   { "tu": 5, "sang": 4, "vi_sao": "pay chỉ nói tiềm năng thị trường, không chịu được cuộc gọi 30 phút" },
      "who": null,
      "pay": null,
      "out": null
    }
  },

  "thieu_thong_tin": ["Chưa nêu license của nguồn thứ 2"],
  "viec_cua_spike": ["B1: tải và đếm", "B2: đọc license nguồn thứ 2", "B4: chạy baseline seasonal naive", "B7: gọi một người làm nghề"],
  "cau_hoi_can_hoi_lai": ["…"],

  "rui_ro_hang_dau": [
    { "rui_ro": "…", "kha_nang": "cao|tb|thap", "hau_qua": "cao|tb|thap", "cach_giam": "…" }
  ],

  "neu_gia_thuyet_sai": "Luận văn vẫn báo cáo được gì — 1–2 câu, cụ thể",
  "trung_voi_de_tai_khac": ["#67", "#96"],
  "dieu_kien_tai_kiem": "Kiểm lại nếu quá 6 tháng, hoặc khi nguồn chính đổi điều khoản"
}
```

Sau JSON, thêm **3–5 câu tiếng Việt** cho người đọc, và câu đầu tiên phải nói **ràng buộc bó nhất là gì** — đó là thứ quyết định, phần còn lại là chi tiết.

---

## 9. Prompt để chạy

```text
Bạn là hội đồng phản biện luận văn thạc sĩ Data Science. Đánh giá đề tài dưới đây theo
BỘ TIÊU CHÍ được cung cấp. Không chấm theo cảm tính, không chấm theo mức nghe-có-vẻ-hay.

QUY TẮC BẮT BUỘC

1. Chạy tầng BLOCKER (mục 3) TRƯỚC, và gán một trong BA trạng thái: VUOT / CHUA_THU /
   THAT_BAI (mục 3a). Chỉ THAT_BAI → verdict CHAN. CHUA_THU là trạng thái bình thường của
   lượt chấm hồ sơ và đi vào viec_cua_spike — KHÔNG được biến nó thành CHAN. Nếu bạn thấy
   gần như mọi đề tài ra CHAN, bạn đang vi phạm đúng quy tắc này.

2. Ngân sách CĂNG chỉ đếm trục CĂNG CÓ CĂN CỨ (mục 6a). Trục CĂNG chỉ vì chưa xác minh —
   điển hình R4 (chưa hỏi bộ môn) và R6 (d.spike chưa viết thành phép thử giết đề tài) —
   KHÔNG tiêu ngân sách; nó đi vào viec_cua_spike. Nếu bạn thấy gần như mọi đề tài ra
   PHAI_SIET_LAI, bạn đang vi phạm đúng quy tắc này. Xuất ngan_sach_cang cho từng đề tài.

3. Kiểm thiếu trường theo bảng ở mục 1a. Ba ca thật là: `src` chưa truy được, `data` không
   nêu được nguồn cụ thể nào, và IMPACT[id] rơi vào fallback. Ca `data` CÓ nguồn tra được
   nhưng chưa dẫn link / chưa nêu license KHÔNG phải THIEU_THONG_TIN — đó là B2 = CHUA_THU.
   KHÔNG tự bổ sung giả định để chấm cho đủ.

4. Kiểm `src` (mục 1d). AI sinh phải ghi `ai:<model-id>` với model id thật; nguồn ngoài phải
   ghi `ext:<đơn vị> · <loại danh mục> · <năm>` tra được. Thiếu hoặc chung chung → F33/F34/F36
   và THIEU_THONG_TIN. Với src: ai:*, hạ toàn bộ d.why xuống CHƯA KIỂM mặc định và soi F37.

5. Tầng ràng buộc (mục 4) lấy MỨC XẤU NHẤT, không cộng dồn, không bình quân. Nêu rõ
   rang_buoc_bo_nhat. Với R1/R2/R3: chấm bằng VĂN XUÔI trước, rồi mới đối chiếu trường khai
   báo (`risk`/`know`/`diff`/`compute`) như một claim cần kiểm — lệch là F27. Trục giá trị
   (mục 5) KHÔNG được bù cho tầng ràng buộc.

6. Mọi phát biểu phải mang nhãn bằng chứng: DA_CHAY / CO_NGUON / CHUA_KIEM. Mặc định là
   CHUA_KIEM. KHÔNG bịa tên dataset, tên bài báo, hay con số SOTA — không chắc thì ghi
   CHUA_KIEM kèm câu cần tra. KHÔNG trích con số quy mô ngành không nguồn.

7. Chạy B8 (mục 5b) cho mọi đề tài bạn định đưa vào shortlist: ba truy vấn, mười abstract,
   hai bài gần nhất, một câu delta — trần một ngày. V2 = TOT chỉ mở khi B8 = VUOT.
   V2 = YEU thì trần verdict là PHAI_SIET_LAI (mục 6b).

8. Chạy phép thử sàn (mục 5d) cho MỌI đề tài, kể cả đề tài xanh mọi trục. Hai trong bốn dấu
   hiệu → QUA_NHO, kèm gop_vao. Rubric có trần ở khắp nơi nhưng sàn chỉ ở đúng chỗ này.

9. Kiểm tính khả dụng dữ liệu theo hiện tại, không theo lúc đề tài được viết. Bộ dữ liệu
   bị gỡ, license đổi, hạn mức nền tảng thay đổi — đều là F10. Ghi as_of và
   dieu_kien_tai_kiem.

10. Soi mâu thuẫn nội bộ giữa các trường: d.risk mô tả rủi ro nặng mà trường risk thấp;
    d.learn ghi 8 tuần mà know là thap; d.method nói cần GPU mà compute là thap. Mỗi mâu
    thuẫn là F27 và phải xuất sửa trường tương ứng.

11. Nghiêm nhất ở R1 (dữ liệu) và R5 (thiết kế đo lường). Phần lớn luận văn thất bại vì
    hai chỗ này, không vì thiếu ý tưởng hay. Với R5, soi từng mục trong danh sách rò rỉ.

12. Áp "Yêu cầu của trường" bên dưới vào verdict, đừng chỉ đọc nó (mục 6b). Nếu ô đó bỏ
    trống thì ghi trong yeu_cau_truong.da_ap = false, KHÔNG im lặng bỏ qua.

13. Luôn xuất phiên bản đã siết lại của các trường nếu đề tài có lõi dùng được. Verdict
    PHAI_SIET_LAI mà không kèm bản siết lại là output không hoàn chỉnh.

14. Chấm V3 (mục 5) bằng `mobile`/`vn` đối chiếu "Nền học viên" bên dưới. V3 chỉ để xếp
    hạng, KHÔNG để sàng, và KHÔNG được nâng V1.

15. Trả về đúng JSON theo mục 8, với sua_truong chia hai nhánh TOPICS / IMPACT. Sau JSON,
    thêm 3–5 câu tiếng Việt, câu đầu nói ràng buộc bó nhất.

RÀNG BUỘC CỦA CHƯƠNG TRÌNH
- Thời lượng và nhân lực: {vd. 6 tháng, 1 người}
- Tài nguyên: {vd. laptop + Colab free, không GPU riêng}
- Nền học viên: {vd. mạnh probability/statistics, lập trình tốt, 7 năm kỹ sư mobile/backend,
  chưa quen deep learning}
- Yêu cầu của trường: {vd. cho phép applied thesis / bắt buộc có đóng góp mới — BẮT BUỘC cho
  quy tắc 12. Bỏ trống thì ghi da_ap = false}
- Người đỡ domain: {liệt kê mảng nào có thầy hướng dẫn, mảng nào không — BẮT BUỘC cho R4.
  Bỏ trống thì R4 = CĂNG với mọi đề tài NHƯNG không tiêu ngân sách, và trần verdict là
  DI_DUOC_CO_DIEU_KIEN}

BỘ TIÊU CHÍ
{dán mục 1–8 của tài liệu này}

ĐỀ TÀI CẦN ĐÁNH GIÁ
{dán object đề tài trong TOPICS, đủ các trường: id, n, src, dom, t, q, data, contrib, d.*,
 diff, risk, compute, know, mobile, vn — CỘNG entry IMPACT[id] tương ứng (s, who, pay, out).
 Nếu không có entry IMPACT[id], nói rõ là không có; đừng suy ra s = 3.
 Nếu không có src, verdict là THIEU_THONG_TIN — đừng đoán xuất xứ}

CHỈ MỤC CẢ DANH SÁCH (bắt buộc — không có nó thì không chấm được trùng lặp)
{dán bảng gọn của TẤT CẢ đề tài: n · dom · src · t · contrib rút một dòng.
 Cần cho F23, cho V2 "bao nhiêu đề tài khác dùng đúng khuôn này", cho trường
 trung_voi_de_tai_khac ở mục 8, và cho lượt đếm thiên lệch một-nguồn ở mục 10.8.
 Nếu prompt chỉ có MỘT object, những chỗ đó phải ghi "không chấm được — thiếu chỉ mục",
 KHÔNG được đoán}
```

---

## 10. Lượt tổng trên cả danh sách

Chấm lẻ xong vẫn chưa chọn được, vì đề tài "tốt nhất" chưa chắc là đề tài nên làm.

1. **Chỉ giữ `DI_DUOC` và `DI_DUOC_CO_DIEU_KIEN`.** `PHAI_SIET_LAI` đi vào một danh sách chờ riêng, `QUA_NHO` đi vào danh sách "chương của đề tài khác". Không trộn vào bảng chọn — trộn vào là tự lừa mình.

2. **Gộp cặp trùng khuôn mẫu.** Với danh sách dùng lặp vài khuôn mẫu, nhiều đề tài chỉ khác lĩnh vực. Gộp và chọn một, dựa trên: lĩnh vực nào có người đỡ (`R4`), lĩnh vực nào có `know` thấp hơn, và đề tài nào có `src: ext:` (đã qua mắt một người thật).

3. **Sàng theo ràng buộc, xếp theo giá trị — đúng thứ tự đó.** Bảng chọn cuối chỉ gồm đề tài đã xanh tầng ràng buộc, rồi trong đó mới xếp theo `impact.s` và `V2`. Không bao giờ xếp trước rồi sàng sau.

4. **Ma trận 2 chiều — nhân, không cộng.**
   - trục X = tính đi được = **min(`R1`, `R2`, `R3`, `R5`, `R6`)** quy về 3 bậc
   - trục Y = giá trị = `impact.s` kết hợp `V2`
   - **`R4` KHÔNG vào trục X trong lượt chấm hồ sơ.** Nó là `CĂNG` với mọi đề tài chưa hỏi bộ môn, nên đưa vào thì X thành hằng số và ma trận thoái hoá thành xếp hạng một chiều theo Y. Ghi `R4` thành một **cột riêng**: "đã hỏi bộ môn chưa — có / chưa / không có ai". Khi đã hỏi xong thì đưa `R4` trở lại trục X.
   - **`V3` chỉ dùng để phá thế ngang bằng** giữa hai đề tài cùng ô — không phải chiều thứ ba

   Ô cần là **X cao và Y cao**. Đừng cộng X với Y thành một điểm — cộng là quay lại đúng lỗi của rubric chung.

5. **Ghép cặp dự phòng.** Mỗi đề tài trong shortlist cần một đề tài **cùng phương pháp, `risk` thấp hơn** làm phương án rơi. Với page này việc đó dễ vì các khuôn mẫu lặp lại — đó là lợi thế của một danh sách rộng.

6. **Kiểm đa dạng loại bài toán**, không phải đa dạng lĩnh vực. Ba đề tài ở ba lĩnh vực khác nhau mà cùng là bài "chứng minh benchmark bị rò rỉ" thì shortlist của bạn chỉ có **một** đề tài với ba lớp sơn.

7. **Xếp thang rủi ro.** Chia shortlist thành `an toàn` / `vừa` / `tham vọng` và chọn theo mức chấp nhận rủi ro của chính bạn — không theo điểm cao nhất.

8. **Đếm thiên lệch một-nguồn.** Nhóm shortlist theo `src`. Nếu 4/5 đề tài cùng một `src: ai:<model>`, bạn đang chọn trong không gian ý tưởng của một model, không phải của ngành — và điểm mù của model đó là điểm mù của bạn. Page đã tự thú chuyện này ở changelog bản 9. Cách chữa không phải bỏ đề tài AI sinh, mà là **kéo ít nhất một `src: ext:` vào shortlist** để có một đề tài đã qua mắt một người thật.

---

## 11. Giới hạn của bộ tiêu chí này

Ghi ra để không ai dùng nó quá tay:

- **Nó chấm hồ sơ, không chấm thực tế.** Một đề tài đạt `DI_DUOC` trên giấy vẫn có thể chết ở ngày 3 của spike. Spike là trọng tài, rubric chỉ là bộ lọc trước spike.
- **Năm blocker không thể vượt bằng cách đọc page.** `B1` (tải và đếm), `B2` (đọc license), `B4` (chạy baseline), `B6` (tên một người thật), `B7` (một cuộc gọi 30 phút) đòi hiện vật mà một object JSON không chứa. Lượt chấm hồ sơ chỉ trả lời được: *có bằng chứng dương nào cho thấy nó sẽ fail không*. Không có → `CHUA_THU`, và đó là kết quả đúng, không phải kết quả thiếu.
- **`B8` là ngoại lệ, và nên chạy.** Nó là blocker duy nhất trong năm cái "chưa thử" mà một lượt chấm có quyền tra web làm được ngay, và nó là thứ duy nhất mở khoá `V2 = TOT`. Bỏ qua nó là bỏ trục đóng góp — đúng lỗi của bản đầu.
- **Trục `R4` (người đỡ) không có trong dữ liệu page** — bắt buộc hỏi thêm; `src: ext:` chỉ là bằng chứng gián tiếp. Bỏ trống `R4` rồi chấm là bỏ mất đúng trục mà page gọi là quyết định nhất.
- **Phép thử sàn (5d) là phép thử yếu nhất trong bộ này.** Bốn dấu hiệu đều đọc từ văn xuôi và đều chủ quan. Nó bắt được ca rõ ràng (kết quả ra trong một buổi sáng) và bỏ sót ca biên. Nếu bạn lưỡng lự thì đề tài đó không quá nhỏ — `QUA_NHO` chỉ dành cho ca hiển nhiên.
- **Ba mức mỗi trục là có chủ ý.** Chia mịn hơn (5 hay 7 bậc) sẽ tạo cảm giác chính xác mà hai người chấm không tái lập được. Nếu bạn thấy cần bậc thứ tư, cái bạn cần là thêm hiện vật, không phải thêm bậc.
- **Các con số hiệu chuẩn ở 1b/1c là ảnh chụp, không phải hằng số.** Chúng sinh bằng `node calibrate.js` và hết hạn khi page đổi. Bản đầu chép tay chúng và sai trong vòng ba ngày. Đừng chép tay lại.
- **Bộ này chưa được thử trên đủ số đề tài để biết nó sai chỗ nào.** Chấm 5 đề tài mà bạn đã hiểu rõ trước, so kết quả rubric với trực giác của bạn, và sửa chỗ lệch — sửa rubric, không sửa trực giác cho khớp rubric.
