# Fact — thư viện fact cho người trưởng thành

Trang tĩnh, không build, không phụ thuộc. Dựng bằng [web-builder](../web-builder/) v0.6
(`../web-builder/web-builder.css`) + `facts.css` (chrome riêng, prefix `fx-*`) + `app.js`.

**1.944 fact** trên 20 chủ đề, chia thành 161 cụm nhỏ, trong đó 13 fact có minh hoạ tương tác.

> Sửa hoặc thêm fact thì đọc [CLAUDE.md](CLAUDE.md) trước — ở đó có pipeline thêm fact và
> cơ chế chống trùng. File này chỉ nói về kiến trúc.

```
facts/
  index.html        khung trang (shell + rail + filter bar + lưới card + modal chi tiết)
  app.js            nạp data, lọc/sắp xếp, render, routing bằng hash
  viz.js            minh hoạ tương tác — một hàm cho mỗi giá trị của trường "viz"
  facts.css         phần web-builder chưa có: card dạng <button>, cắt dòng, khung minh hoạ
  tools/
    factlint.py     kiểm cấu trúc + cổng định nghĩa + tìm fact gần trùng + tra fact sắp thêm
    hooks/          post-edit.sh (PostToolUse) và pre-commit — chạy cổng tự động
    install-hooks.sh  cài bộ điều phối hook git cho cả repo
  data/
    manifest.json   chủ đề + cụm (clusters) + danh sách file fact (thứ tự file = thứ tự thêm)
    <chu-de>.json   đợt fact đầu
    p2-<chu-de>.json đợt fact thứ hai
    p3-/p4-<chu-de>.json  các đợt sau
```

## Chạy tại máy

Trang đọc `data/*.json` bằng `fetch`, nên **phải chạy qua HTTP** (mở bằng `file://` sẽ báo lỗi):

```bash
python3 -m http.server 8080
```

Rồi mở <http://localhost:8080/facts/>. Trên GitHub Pages thì chạy thẳng, không cần gì thêm.

## Thêm fact hàng tuần

1. Tạo file mới `data/weekly/2026-w32.json` (một mảng các fact — xem cấu trúc bên dưới).
2. Thêm `"weekly/2026-w32.json"` vào **cuối** mảng `files` trong `data/manifest.json`.
3. Cập nhật `updated` trong `manifest.json`.

File đứng sau trong `files` = fact mới hơn, và chế độ sắp xếp mặc định (“Mới thêm trước”)
đọc đúng thứ tự đó. Cũng có thể thêm thẳng vào cuối file chủ đề sẵn có nếu chỉ bổ sung vài fact.

### Cấu trúc một fact

```json
{
  "id": "td-023",                       // duy nhất toàn thư viện, tiền tố theo chủ đề
  "cat": "tu-duy",                      // phải khớp một id trong manifest.categories
  "sub": "mo-hinh-tu-duy",              // cụm nhỏ trong chủ đề — phải khớp manifest.clusters[cat]
  "t": "Tiêu đề — một câu khẳng định",
  "s": "Tóm tắt hiện trên card, 1–3 câu. Đây là phần bắt buộc.",
  "d": "Phần dài, tuỳ chọn. Ngăn đoạn bằng \n\n. Chỉ hiện trong modal chi tiết.",
  "viz": "birthday",                    // tuỳ chọn — khoá của một hàm trong viz.js
  "tags": ["nhan-1", "nhan-2"],         // không dấu, gạch nối; card hiện tối đa 3 nhãn
  "src": "Tác giả, Tạp chí (năm)"       // bắt buộc — xem quy tắc kiểm chứng
}
```

Chạy lại bộ kiểm tra sau khi thêm:

```bash
python3 facts/tools/factlint.py check && python3 facts/tools/factlint.py verify
```

`check` kiểm id trùng, `cat`/`sub` sai, thiếu `src`, `viz` trỏ vào hàm không tồn tại, và quét
cả thư viện tìm các cặp fact gần trùng nhau — bằng ba lưới: trong cụm, trong chủ đề, và một
lưới so **riêng tiêu đề** (hai fact cùng tiêu đề mà tóm tắt viết khác nhau thì hai lưới đầu
không thấy). `verify` là **cổng định nghĩa**: nó loại fact tường thuật, fact lời khuyên, fact
meta về nghiên cứu, xu hướng hành vi không mỏ neo, và fact chỉ người trong ngành mới đọc được
— xem [CLAUDE.md](CLAUDE.md) §1. Xem thêm `stats` (phân bố theo cụm) và `near "<văn bản>"`
(tra một fact sắp thêm).

Cả hai cổng chạy tự động: qua hook `PostToolUse` mỗi lần sửa `data/`, và qua `pre-commit`
lúc commit. Cài hook git bằng `sh facts/tools/install-hooks.sh`.

## Quy tắc kiểm chứng (bắt buộc)

Mọi fact thêm vào phải qua được cả bốn:

1. **Có nguồn gốc.** Trường `src` ghi tác giả + nơi công bố + năm, hoặc tên tổ chức
   (WHO, NASA, Ngân hàng Thế giới, Tổng cục Thống kê…). Không ghi “nghiên cứu cho thấy”.
2. **Nguồn là nguồn gốc, không phải bài báo kể lại.** Nếu chỉ tìm được bài báo phổ thông,
   hoặc bỏ fact đó, hoặc truy tới nghiên cứu gốc rồi trích nghiên cứu.
3. **Có tranh cãi thì phải nói ra.** Hiệu ứng chưa nhân bản được, con số ước lượng thô, kết
   luận đang bị phản biện — nêu thẳng trong `s` hoặc `d` kèm nguồn phản biện. Thư viện này
   thà mất một fact hay còn hơn giữ một fact sai.
4. **Con số phải tự tính lại được.** Mọi phép tính trong bài (lãi kép, xác suất, quy đổi đơn vị)
   phải kiểm tra lại bằng máy tính trước khi đăng.

Ba loại nội dung **không** nhận: giai thoại không truy được nguồn, mẹo tâm lý kiểu “93% giao tiếp
là phi ngôn ngữ”, và số liệu lấy từ mô hình ngôn ngữ mà chưa đối chiếu nguồn gốc.

## Minh hoạ tương tác

Fact nào giải thích được bằng cách cho người đọc *nghịch thử* thì nên có. Thêm khoá `viz`
vào fact, rồi thêm một hàm cùng tên vào `window.FactViz` trong `viz.js`:

```js
'ten-viz': function (root) {          // root là một div rỗng, đứng đầu thân modal
  root.appendChild(note('Câu hướng dẫn.'));
  // dựng DOM/SVG vào root — dùng token của web-builder, không hardcode màu
}
```

Quy ước: cấu trúc dùng thang xám `--wb-neutral-*`; chỉ dùng `--wb-chart-*` ở chỗ **màu chính
là dữ liệu** (chuỗi biểu đồ, ô phân loại, màu chữ trong bài Stroop). Hàm nào ném lỗi thì
`app.js` bắt lại và chỉ ẩn phần minh hoạ — không làm hỏng cả modal.

Đang có 13 minh hoạ: `blind-spot`, `checker-shadow`, `stroop`, `birthday`, `monty-hall`,
`bayes`, `coin-runs`, `benford`, `simpson`, `normal-vs-power`, `exp-fold`, `scale-solar`,
`cosmic-clock`.

## Sức chứa

Hiện tại lọc và sắp xếp toàn bộ trong bộ nhớ, render 48 card mỗi lần. Cách này chạy mượt tới
khoảng vài nghìn fact. Khi vượt ~5.000, hai việc cần làm: dựng chỉ mục tìm kiếm sẵn lúc build
thay vì quét chuỗi, và nạp file theo chủ đề đang xem thay vì nạp hết ngay từ đầu.

## Phím tắt

| Phím | Việc |
|---|---|
| `R` | mở một fact ngẫu nhiên (bấm tiếp là fact mới) |
| `/` | nhảy vào ô tìm kiếm |
| `Esc` | đóng modal / rời ô tìm kiếm |
| `←` `→` | fact trước / sau khi modal đang mở |
