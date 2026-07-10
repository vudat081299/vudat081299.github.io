# Mô tả dự án: Web thống kê Lô·Tô (XSMB)

> Tài liệu này mô tả toàn bộ một trang web (1 file HTML duy nhất, tên `loto.html`) để một phiên chat/AI khác đọc là hiểu ngay: web có gì, làm thế nào, UI sinh ra để làm gì, ý nghĩa và thông điệp.

---

## TL;DR (một đoạn)

`loto.html` là một **trang web thống kê xổ số miền Bắc (XSMB / lô tô 2 số 00–99)** chạy hoàn toàn trong trình duyệt, **dark mode**, **một file độc lập (~740 KB)**, **không phụ thuộc thư viện ngoài lúc chạy**. Nó **nhúng sẵn ~20 năm kết quả XSMB thật** (≈7.470 ngày, 2005-10-01 → 2026-06-26, mỗi ngày 27 lô + 1 giải đặc biệt "đề") nên mở phát là dùng được offline; có thể bấm "Cập nhật mới nhất" để tải bản mới từ GitHub, hoặc nạp dữ liệu riêng (CSV/JSON). Trung tâm trang là một **bảng nhiệt (heatmap) 100 hàng (số 00–99) × N cột (ngày)**, tô màu theo số lần một số "về" trong ngày. Bên dưới là một loạt **biểu đồ thống kê** từ dân gian (lô gan, nóng/lạnh, đầu/đuôi, lô kép, cặp số) đến **xác suất nghiêm túc** (đường cong chuông/phân phối tần suất, kiểm định χ², entropy, kiểm tra tính độc lập, và **kỳ vọng EV / lợi thế nhà cái**). **Thông điệp cốt lõi, được dữ liệu chứng minh:** xổ số hành xử **ngẫu nhiên & công bằng** (χ² không bác bỏ tính đồng đều, hôm nay không dự đoán được hôm sau) và **kỳ vọng âm** (nhà cái luôn có lợi) — nên công cụ này phục vụ **phân tích & hiểu trò chơi**, có cân bằng các quan niệm dân gian, **không** phải công cụ dự đoán hay cổ vũ cờ bạc.

---

## 1. Mục đích & triết lý

- **Mục đích:** cho người dùng tự chọn một khoảng thời gian bất kỳ và xem kết quả XSMB dưới nhiều góc nhìn thống kê, vừa quen thuộc với dân chơi (gan, nóng/lạnh, đầu/đuôi…) vừa chặt chẽ về xác suất.
- **Quan điểm trình bày (rất quan trọng):** trung thực kiểu chuyên gia xác suất. Mọi biểu đồ "tìm số" đều kèm nhắc rằng **các kỳ quay độc lập**, nên quá khứ không làm thay đổi cơ hội kỳ tới. Đặc biệt với "gan": trình bày **cân bằng hai cách hiểu trái ngược** — có người coi số lâu chưa về là "sắp về" (nuôi cầu), người khác coi là số "khan/câm" nên tránh — và kết luận cả hai đều không có cơ sở xác suất.
- **Không** hứa thắng, **không** cổ vũ đánh bạc; định vị là công cụ **phân tích/giáo dục**.

## 2. Công nghệ & dữ liệu

- **1 file HTML duy nhất** (`loto.html`, ~740 KB), tự chứa CSS + JS thuần (vanilla), không framework, không CDN lúc chạy. Render được offline.
- **Fonts:** Space Grotesk (tiêu đề), Inter (thân), JetBrains Mono (số), nạp từ Google Fonts nhưng có fallback hệ thống.
- **Dữ liệu nhúng sẵn:** toàn bộ lịch sử nằm trong một thẻ `<script type="text/csv" id="xsmb-data">…</script>` (không thực thi, đọc bằng `textContent`). Khi load, hàm `loadEmbedded()` parse thẳng dữ liệu này làm dữ liệu mặc định; nếu lỗi mới rơi về `genSample()` (sinh dữ liệu mẫu ngẫu nhiên).
- **Nguồn dữ liệu thật:** kho mở GitHub `khiemdoan/vietnam-lottery-xsmb-analysis` (file `data/xsmb-2-digits.csv`, cập nhật hằng ngày qua GitHub Action, phục vụ qua `raw.githubusercontent.com` có CORS `*`). Nút **"Cập nhật mới nhất"** fetch trực tiếp file này (chạy được khi mở file trực tiếp; trong khung preview có thể bị chặn mạng → khi đó vẫn dùng dữ liệu nhúng).
- **Định dạng & xử lý:** mỗi ngày → `{ ymd, label "DD/MM", counts: Int16Array(100), special }`. `counts[n]` = số lần số n (00–99) về trong ngày (đếm trên 27 giải). `special` = 2 số cuối giải đặc biệt ("đề"). Parser tự nhận 3 định dạng: CSV `date,special,prize…`, CSV `date,0,1,…,99` (sparse), hoặc JSON mảng `[{date, numbers:[...], special}]`.
- **Cấu trúc XSMB:** mỗi kỳ quay có **27 lô** (giải ĐB + giải nhất + 2 nhì + 6 ba + 4 tư + 6 năm + 3 sáu + 4 bảy). Vì có số trùng, mỗi ngày thường chỉ ~20–27 **số khác nhau** xuất hiện ⇒ ~73–80 số "chưa về" mỗi ngày là chuyện bình thường.

## 3. Bố cục UI (từ trên xuống)

1. **Header:** logo + tên "Lô·Tô"; chấm trạng thái + nhãn nguồn ("XSMB nhúng sẵn · N ngày" hoặc "Dữ liệu của bạn"); nút **⟳ Cập nhật mới nhất**; nút **⟳ Mẫu mới** (sinh dữ liệu ngẫu nhiên để xem giao diện).
   - **Thanh chuyển tab** (ngay dưới header): **📊 Thống kê** (toàn bộ nội dung mô tả dưới đây) và **🧪 Thí nghiệm** (backtest chiến lược chọn số — mô hình & phương pháp luận ở [`loto-experiment.md`](./loto-experiment.md)).
2. **Thanh điều khiển (toolbar):** ô **Từ ngày / Đến ngày** (chọn khoảng bất kỳ trong ~20 năm); nút **khoảng nhanh 7N/30N/60N/100N**; và 4 ô **KPI** (Ngày, Lượt lô, Gan nhất, Nóng nhất). Mặc định hiển thị 60 ngày gần nhất.
3. **Chú thích màu (legend):** xanh lá = về 1 lần, xanh dương = 2 lần, vàng = 3 lần, cam = ≥4 lần, đỏ = số đề, chấm mờ = chưa về.
4. **Dải "Đề gần đây":** các số đề của những ngày gần nhất (chip đỏ).
5. **Điều khiển chế độ xem:** công tắc **Chế độ gọn** (on/off); khi bật hiện thêm bộ chọn **nhãn cột số: "Mốc 0/5" hoặc "Đầy đủ"**; nút **🎨 Thử màu ô** mở bảng chỉnh màu cho chế độ gọn (5 ô màu 1/2/3/≥4 lần + đề, 8 bảng màu mẫu bấm-để-áp-dụng, nút ngẫu nhiên/mặc định; xem trực tiếp trên bảng nhiệt, lưu vào `localStorage`). Mở bảng này tự bật chế độ gọn để xem hiệu ứng.
6. **Bảng nhiệt (heatmap)** — phần trung tâm (xem mục 4).
7. **Lưới các thẻ thống kê** (xem mục 5).
8. **"Cách đọc các biểu đồ"** — mục hướng dẫn (mở sẵn) giải thích từng biểu đồ.
9. **"Nguồn dữ liệu"** — mục thu gọn: (1) cập nhật từ XSMB, (2) nạp từ URL/API riêng, (3) dán JSON.
10. **Footer:** nhắc xổ số là may rủi, công cụ chỉ để tham khảo.

## 4. Bảng nhiệt (heatmap) — thành phần chính

- **Cấu trúc:** mỗi **hàng** là một số 00→99 (100 hàng); mỗi **cột** là một ngày, **mới nhất ở bên trái**. Header cột ghi ngày (DD trên, MM dưới); cột mới nhất tô vàng; có vạch ngăn khi đổi tháng.
- **Mã màu ô** (theo `counts[n]` của ngày đó): xanh lá #37e0ac = 1 lần, xanh dương #6fb0ff = 2 lần, vàng #ffd23a = 3 lần, cam #ff9636 = ≥4 lần, đỏ #ff5560 = **số đề** (ô đề ở chế độ đầy đủ ghi chữ "Đ", không đếm). Ô không về chỉ là chấm mờ. Ở chế độ đầy đủ ô hiện luôn con số đếm.
- **Hàng tô vạch vàng bên trái** = các số đang **gan nhất** (top lâu chưa về), để dò nhanh vị trí trên lưới (liên kết với thẻ "Lô gan").
- **Tooltip:** rê vào ô hiện "**Số NN · DD/MM · trạng thái**" (chưa về / về k lần / ⬩ Đề). Dữ liệu gắn trực tiếp trên từng ô nên luôn khớp đúng ô dưới con trỏ.
- **Trỏ vào một hàng (số):** hàng đang trỏ **giữ nguyên màu**, còn **mọi hàng khác mờ đi như "chưa về"** (nền trong suốt + chấm mờ) — để soi nhanh lịch sử "về" của đúng một số qua các ngày. Thuần CSS, áp dụng cho cả chế độ đầy đủ lẫn gọn.
- **Chế độ gọn:** hàng mỏng lại (~6px) và ô **chỉ còn màu, bỏ số**, để xem được nhiều ngày; **các hàng mốc 00,10,20,…,90 giữ dày (~18px)** làm "thước" định vị; bảng **bỏ giới hạn chiều cao để hiện đủ cả 100 số** (không cuộn dọc trong khung). Ô dùng **màu đặc, tươi sáng** (biến CSS `--k1..--k4,--kde`, mặc định xanh lá/xanh dương/vàng/cam/đỏ-hồng rực) để dễ nhìn — **chỉnh được** qua bộ "🎨 Thử màu ô"; còn **chế độ đầy đủ giữ nguyên** màu tinted nhạt cũ (`--c1..--c4`).
- **Hiệu năng:** khoảng cực dài (vài năm) thì bảng nhiệt chỉ vẽ tối đa **750 cột gần nhất** cho mượt, nhưng **mọi bảng thống kê vẫn tính trên toàn bộ khoảng đã chọn**.

## 5. Các biểu đồ / phương pháp thống kê (mỗi mục: là gì + đọc thế nào + ý nghĩa)

**A. Phân phối tần suất — đường cong chuông** (biểu đồ SVG, quan trọng nhất về mặt thống kê)
- Trục ngang = số lần về (k); trục dọc = có bao nhiêu trong 100 số về đúng k lần. Cột = thực tế; đường vàng = **kỳ vọng nếu quay hoàn toàn ngẫu nhiên** (Poisson/chuẩn, trung bình λ = số_ngày × 0.27); nét đứt = trung bình.
- Đọc: cột bám sát đường vàng ⇒ đang chạy đúng ngẫu nhiên; chỉ số **xa hẳn hai đuôi** (|z| > 2) mới thật sự bất thường, còn "nóng/lạnh" quanh giữa chỉ là dao động.
- Ý nghĩa: cho thấy phần lớn biến động là nhiễu, không phải "quy luật".

**B. Kiểm định ngẫu nhiên & tính độc lập** (3 ô)
- **χ² (goodness-of-fit)**: đo độ lệch so với "100 số đều như nhau"; quan trọng là **p-value** (tính qua xấp xỉ Wilson–Hilferty). p ≥ 0.05 ⇒ "Phù hợp ngẫu nhiên". (Trên dữ liệu thật p thường ~0.15–0.79.)
- **Entropy**: % so với mức ngẫu nhiên tối đa (log2 100). Gần 100% ⇒ rất đồng đều (~99% thực tế).
- **Hôm nay → hôm sau**: so 3 tỉ lệ — về ở mức nền, về khi hôm qua đã về, về khi hôm qua không về. Thực tế cả ba ≈ 23.8% (gần như y hệt) ⇒ **độc lập**, quá khứ không dự đoán tương lai.

**C. Kỳ vọng & lợi thế nhà cái (EV)** — góc nhìn "tiền bạc", có ô nhập sửa được
- **Đề:** p = 1/100; EV = (1/100)×(tiền ăn) − 1. Mặc định "1 ăn 70" ⇒ EV ≈ **−30%** (công bằng khi tiền ăn = 100).
- **Lô bạch thủ:** E[nháy] ≈ 0.27/kỳ; EV = (0.27 × thưởng/nháy − giá điểm) / giá điểm. Mặc định giá 23, ăn 80 ⇒ EV ≈ **−6%**.
- Ghi chú: vì EV âm, Martingale/gấp thếp đều thua về dài; cỡ cược tối ưu theo **Kelly = 0**. Đây là bản chất "lợi thế nhà cái".

**D. Lô gan — lâu chưa về**: xếp theo số kỳ liên tiếp chưa về (gan hiện tại), kèm "max" (gan cực đại từng có) để biết mức hiện tại có bất thường không.

**E. Nóng & Lạnh**: tổng số lần về trong kỳ — nhóm "nóng" (nhiều nhất) và "lạnh" (ít nhất), có mốc kỳ vọng để so sánh.

**F. Phân bố Đầu & Đuôi**: tổng lượt về theo chữ số hàng chục (đầu 0–9) và hàng đơn vị (đuôi 0–9); cột cao nhất tô vàng.

**G. Lô kép & tính chất Đề**: tần suất 10 số kép (00,11,…,99); và đặc điểm số đề trong kỳ — **Chẵn/Lẻ**, **Tài (50–99)/Xỉu (00–49)**, đầu/đuôi hay rơi vào đề (thanh hai màu thể hiện tỉ lệ %).

**H. Cặp số hay về cùng ngày**: top 10 cặp 2 số xuất hiện chung trong cùng ngày nhiều nhất (góc "cặp lô" dân gian; nhắc rằng phần lớn là trùng hợp).

**I. Góc nhìn tổng hợp**: đặt cạnh nhau kết quả của 3 phương pháp — **lâu chưa về** (gan), **về nhiều nhất** (nóng), **lệch chuẩn mạnh** (bất thường theo z) — cho thấy chúng chỉ ra các số khác nhau (không có "đáp án"); kèm ghi chú cân bằng hai cách hiểu về "gan" và việc các kỳ độc lập.

## 6. Tính tương tác

- Chọn khoảng ngày tự do (Từ/Đến) hoặc nút nhanh 7/30/60/100 ngày; mọi thống kê và bảng nhiệt tính lại theo khoảng.
- Công tắc **Chế độ gọn** + chọn kiểu nhãn cột số (Mốc 0/5 / Đầy đủ).
- Ô nhập tỉ lệ trả thưởng ở thẻ EV → tính lại kỳ vọng tức thì.
- Cập nhật dữ liệu thật, hoặc nạp dữ liệu riêng (URL CSV/JSON, hoặc dán JSON).

## 7. Thông điệp tổng thể (web này "biểu đạt" điều gì)

Ba kết quả định lượng trong trang **hội tụ về một kết luận**: (1) kiểm định χ² **không** phát hiện bộ số bị lệch, (2) kết quả các kỳ **độc lập** (hôm nay không báo trước hôm sau), (3) kỳ vọng **âm** (lợi thế thuộc nhà cái). Vì vậy **không có mẫu hình để khai thác**, và về dài người chơi lỗ. Các bảng "gan/nóng/cặp…" hấp dẫn để **quan sát quá khứ và hiểu trò chơi**, nhưng xét về xác suất chúng không nâng cơ hội ở kỳ tới. Trang web do đó được thiết kế như một **công cụ phân tích trung thực** — đẹp, dark mode, nhiều góc nhìn — nhằm giúp người xem *hiểu* xổ số đúng bản chất, chứ không phải để *thắng* nó.

## 8. Tab Thí nghiệm (backtest chiến lược)

Tab **🧪 Thí nghiệm** (UI switch trong cùng `loto.html`) kiểm định định lượng: *có chiến lược chọn số nào thắng được nhà cái không?* Với mỗi ngày *t* trong khoảng kiểm thử, mô hình **chỉ dùng dữ liệu trước *t*** (30/60/100 ngày gần nhất; kết quả cùng ngày-tháng các năm trước; hoặc trộn) để chấm điểm 100 số, "đánh" *n* số điểm cao nhất, đối chiếu kết quả thật của *t*, lặp trên toàn khoảng và tổng hợp **ROI / tỉ lệ lỗ / tỉ lệ trúng / tỉ lệ ngày có lãi**, so với một **đường đối chứng ngẫu nhiên**. Input hoàn toàn là `DATA` & thống kê của tab Thống kê.

- **Hai biểu đồ:** (1) chỉ số theo *n* để chọn *n* tối ưu (kèm đường tham chiếu "lợi thế nhà cái"); (2) lãi/lỗ tích luỹ giữa các ngày tại *n* cố định + bảng tổng hợp.
- **Kết quả kỳ vọng:** mọi chiến lược ROI âm ≈ lợi thế nhà cái, không vượt ngẫu nhiên; "tối ưu *n*" chỉ đổi *hình dạng rủi ro*, không đổi kết cục; mọi "ô thắng" lẻ là tạo tác *data snooping*. Củng cố thông điệp χ²/độc lập/EV của trang.
- **Tài liệu kiểu paper đầy đủ** (câu hỏi nghiên cứu, dữ liệu, phương pháp, độ đo, kết quả, hạn chế, công thức, mã giả, tái lập): [`loto-experiment.md`](./loto-experiment.md).

## 9. Gợi ý mở rộng (nếu cần phát triển tiếp)

- Tự chủ nguồn cập nhật: dựng backend nhỏ (vd Vapor/Node) crawl KQXSMB, serve JSON có CORS, rồi trỏ URL vào mục "Nguồn dữ liệu → 2".
- Có thể thêm các phương pháp khác (chu kỳ/gap theo phân phối hình học, theo thứ trong tuần…) nhưng các phương pháp dân gian thuần (bóng số, dàn đề, cầu chạm…) không có giá trị thống kê.
