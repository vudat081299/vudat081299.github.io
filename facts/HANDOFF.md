# HANDOFF — việc dở của facts/

Chỉ việc chưa xong. Làm xong một mục thì xoá nó khỏi đây và ghi đợt ấy vào
[HISTORY.md](HISTORY.md) — nơi giữ nhật ký các đợt rà, kể cả phần *"Còn nợ"* của từng đợt lúc
viết. Luật ở [CLAUDE.md](CLAUDE.md), quyết định của chủ trang ở [DECISIONS.md](DECISIONS.md).

Số hiện tại (fact, truyện, từng cụm): `python3 facts/tools/factlint.py stats`; mức LOẠI / XEM:
`python3 facts/tools/factlint.py verify -v`.

## CHƯA LÀM

- **Đích quy mô: khoảng 3.000 fact và 500 truyện** (FACTS-008).
- **Cụm fact mỏng** (≤ 2 fact): `kinh-doanh/ban-hang-marketing` 0 · `kinh-doanh/dam-phan` 1 ·
  `kinh-doanh/do-luong` 1 · `tu-duy/mo-hinh-tu-duy` 1 · `kinh-doanh/tuyen-dung` 2 ·
  `kinh-doanh/khoi-nghiep` 2 · `tu-duy/rui-ro` 2 · `giao-tiep/huyen-thoai-giao-tiep` 2.
  Chúng mỏng vì cổng chứ không vì bị quên: phần lớn ứng viên là lời khuyên (§1.1 mục 2) hoặc
  mô hình đặt tên (mục 5). Đo xem cụm nào nuôi được claim về thế giới trước khi hứa số — kế
  hoạch "rải đều mỗi cụm vài fact" đã bị số liệu bác.
- **`xa-hoi/luat-phap`** (4 fact): fact luật phải đối chiếu đúng điều khoản của văn bản đang có
  hiệu lực. Chưa đợt nào đủ thời gian tra tới nơi; đừng viết fact luật bằng trí nhớ.
- **Tuyển tập kinh điển mới phải khai trước khi thêm truyện của nó.** `manifest.tuyen_tap` mới
  có `KHM` (Grimm) và `SH` (canon Holmes); Andersen, Aesop, Nghìn lẻ một đêm, kho tàng cổ tích
  Việt Nam chưa khai, và cổng §7.0-a chặn truyện của chúng cho tới khi khai. `manifest.atu` mới
  có 5 mã — thêm truyện dân gian kiểu khác thì khai mã trước.
- **Canon Holmes còn 48 truyện ngắn chưa dùng** (đã dùng 8). Danh sách mười hai truyện Doyle tự
  xếp năm 1927 là một bộ lọc sẵn có, tra được; mới dùng năm trong mười hai.
- **Chia thêm kiểu truyện quanh mốc 150–200 truyện.** Mười kiểu không gánh nổi 500 truyện
  (~50 truyện/kiểu, duyệt không nổi); tách trước khi việc gán lại thành một đợt migrate lớn.
  Riêng nhánh truyện dân gian thì trục `atu` đã gánh bớt.

## NỢ

- **Đối chiếu `src` với nguồn gốc** — mới kiểm ~40 fact, còn ~1.900 fact chưa ai đối chiếu. Hai
  ca cụ thể vẫn nguyên: `sv-295` ghi hoá thạch rừng Nam Cực cách cực Nam ~500 km trong khi
  Klages, Nature (2020) báo ~900 km; `vl-203` ghi tán xạ Rayleigh "gấp khoảng 16 lần" trong khi
  1/λ⁴ chỉ ra 16 khi tỉ số bước sóng đúng bằng 2 (dải khả kiến thật cho 5–9 lần).
- **30 fact thiếu đúng một con số quyết định**, và con số ấy là thứ quyết định fact có dùng được
  hay không (lượt đọc lại của *Đợt rà 24/08/2026 (b)*): `ct-014` `kt-133` `xh-133` `tl-296`
  `sk-107` `sk-260` `sk-300` `vl-258` `dl-344` `tp-217` `cn-233` `na-351` `sk-291` `sv-148`
  `xh-106` `xh-141` `kt-121` `sh-020` `tl-007` `gt-007` `xh-136` `sk-115` `th-342` `kt-013`
  `nn-007` `sk-290` `th-330` `tp-253` `tp-293` `na-366`. Phải tra nguồn mới sửa được.
- **7 fact mức XEM, cố ý để hở** thay vì khai miễn khi chưa tra được số — một khai miễn sai làm
  cổng im vĩnh viễn, còn dòng XEM là việc nhìn thấy được. `xh-137`, `xh-141`, `gt-282`, `sk-302`
  bị gỡ khai miễn ở *Đợt rà 24/08/2026 (b)*; `td-401`, `gt-401`, `sh-403` vào từ
  `p6-fact-moi.json` và chưa ai soi. Xem bằng `python3 facts/tools/factlint.py verify -v`.
- **Ba fact cần soát riêng:** `xh-124` viết lại rồi vẫn chưa có con số (đang tranh cãi phương
  pháp); `na-354` (phông biển báo) cần số liệu thử nghiệm khoảng cách đọc; `sk-250` trích
  Wansink — tác giả bị rút 18 bài vì gian lận dữ liệu, claim đứng nhờ tổng quan Cochrane đi kèm
  nhưng cái tên trong `src` là rủi ro.
- **Cặp trùng tìm bằng mắt ở *Đợt rà 24/08/2026*** — 85 cặp, danh sách đầy đủ không nằm trong
  repo. Trong các cặp "rõ nhất" còn 7 cặp đủ cả hai fact: `gt-003`/`gt-101` ·
  `tl-103`/`tl-335` · `tl-110`/`tl-328` · `xh-007`/`xh-103` · `sk-136`/`hh-273` ·
  `vl-280`/`vl-307` · `ct-004`/`ct-111`. Mỗi cặp là một quyết định biên tập theo ba cách xử của
  §3, không suy ra được từ điểm số. `xh-019`/`xh-147` đã bị bác ở đợt (b): hai phép đo khác
  nhau, đừng gộp.
- **328 cặp dải 0,42–0,62 đã đọc và kết luận là hai claim khác nhau, nhưng chưa khai
  `khac_voi`.** Khai được, nhưng phải kèm lý do từng cặp; khai bừa là làm đúng thứ §2 cấm.
  Chúng không chặn commit, cái giá chỉ là `check` còn ồn.
- **Chưa có cổng nào bắt `t` và `d` nói hai chuyện khác nhau.** §1.4 đã đo: so từ vựng vô dụng.
- **Chưa đo các mẫu `loi-khuyen` còn lại trên `s`:** `cách … nhất`, `việc nên làm` (`mẹo` đã đo
  và rớt, 20%).
- **Lưới chống trùng bỏ lọt ~73% cặp trùng ý** (đo trên 85 cặp tìm bằng mắt). Hạ ngưỡng không
  cứu được; hai đường còn lại là nhúng ngữ nghĩa — cần thư viện ngoài, chấp nhận được vì
  `factlint.py` là công cụ dev — hoặc đọc tay theo cụm định kỳ.
- **609 phần giải thích `d` rút gọn ở *Đợt 25/08/2026 (e)* chưa duyệt tay từng cái** — mới soi
  mẫu.

## CHỜ CHỦ TRANG

- **Truyện hài có cần `mang_di`, và có cần là chuyện có thật không?** Hiện `ky-quac` là chuyện
  có thật và phải có `mang_di` là một fact (§7.0, §7.1). Câu "truyện hài vẫn phải là chuyện có
  thật" là câu trả lời cho một câu agent hỏi sai đề, trước khi lằn ranh chung đổi thành có sẵn /
  tự bịa (FACTS-009). Muốn một kiểu "hài thuần giải trí" không cần bài học thì phải nới §7 — hỏi
  chủ trang trước khi làm.
