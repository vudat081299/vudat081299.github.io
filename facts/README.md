# Fact — thư viện fact cho người trưởng thành

Trang tĩnh, không build, không phụ thuộc. Dựng bằng [web-builder](../web-builder/) v0.6
(`../web-builder/web-builder.css`) + `facts.css` (chrome riêng, prefix `fx-*`) + `app.js`.

```
facts/
  index.html        khung trang (shell + rail + filter bar + lưới card + drawer)
  app.js            nạp data, lọc/sắp xếp, render, routing bằng hash
  facts.css         phần web-builder chưa có: card dạng <button>, cắt dòng, prose trong drawer
  data/
    manifest.json   danh sách chủ đề + danh sách file fact
    <chu-de>.json   fact theo chủ đề
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
  "t": "Tiêu đề — một câu khẳng định",
  "s": "Tóm tắt hiện trên card, 1–3 câu. Đây là phần bắt buộc.",
  "d": "Phần dài, tuỳ chọn. Ngăn đoạn bằng \n\n. Chỉ hiện trong drawer chi tiết.",
  "tags": ["nhan-1", "nhan-2"],         // không dấu, gạch nối; card hiện tối đa 3 nhãn
  "src": "Tác giả, Tạp chí (năm)"       // bắt buộc — xem quy tắc kiểm chứng
}
```

Chạy lại bộ kiểm tra sau khi thêm:

```bash
python3 -c "import json,os;m=json.load(open('facts/data/manifest.json'));c={x['id'] for x in m['categories']};i=set();n=0
for f in m['files']:
 d=json.load(open('facts/data/'+f))
 for it in d:
  n+=1; assert it['cat'] in c, it['id']; assert it['id'] not in i, it['id']; assert it['src']; i.add(it['id'])
print('OK', n, 'fact')"
```

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

## Sức chứa

Hiện tại lọc và sắp xếp toàn bộ trong bộ nhớ, render 48 card mỗi lần. Cách này chạy mượt tới
khoảng vài nghìn fact. Khi vượt ~5.000, hai việc cần làm: dựng chỉ mục tìm kiếm sẵn lúc build
thay vì quét chuỗi, và nạp file theo chủ đề đang xem thay vì nạp hết ngay từ đầu.

## Phím tắt

| Phím | Việc |
|---|---|
| `/` | nhảy vào ô tìm kiếm |
| `Esc` | đóng drawer / rời ô tìm kiếm |
| `←` `→` | fact trước / sau khi drawer đang mở |
