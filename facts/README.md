# Fact — thư viện fact cho người trưởng thành

Thư viện fact tiếng Việt: mỗi fact là một khẳng định về thế giới, có con số hoặc cơ chế, có nguồn gốc. Bên cạnh là
truyện ngắn — chuyện có thật, hoặc truyện kinh điển như Grimm và Sherlock Holmes. Số fact, truyện và cụm hiện có:
`python3 facts/tools/factlint.py stats`.

Trang tĩnh, không build, dựng trên [web-builder](../web-builder/).

## Chạy tại máy

Trang đọc `data/*.json` bằng `fetch`, nên phải chạy qua HTTP. Từ gốc repo:

```bash
python3 -m http.server 8080
```

rồi mở <http://localhost:8080/facts/>.

## Cấu trúc

```
facts/
  index.html      khung trang: thanh bên, bộ lọc, lưới card, modal chi tiết
  app.js          nạp data, lọc, sắp xếp, render, routing bằng hash
  viz.js          minh hoạ tương tác, mỗi giá trị của trường "viz" một hàm
  facts.css       phần web-builder chưa có (prefix fx-*)
  data/
    manifest.json chủ đề, cụm, kiểu truyện, tuyển tập, danh sách file
    *.json        fact, chia theo chủ đề và theo đợt thêm
    chuyen/       truyện
  tools/
    factlint.py   kiểm cấu trúc, cổng định nghĩa, tra trùng, thống kê
    check.sh      cổng của thư mục
```

## Kiểm

`sh facts/tools/check.sh` chạy `factlint.py check` (cấu trúc, cặp gần trùng) và `factlint.py verify` (fact có đúng là
fact không). Tra một fact sắp thêm: `python3 facts/tools/factlint.py near "<tiêu đề + tóm tắt>"`. Luật viết và thêm
fact nằm ở [CLAUDE.md](CLAUDE.md).

Lọc và sắp xếp chạy trong bộ nhớ, mỗi lần hiện 48 card; ổn tới vài nghìn fact. Quá khoảng 5.000 thì cần chỉ mục tìm
kiếm dựng sẵn và nạp file theo chủ đề đang xem.

## Phím tắt

| Phím | Việc |
|---|---|
| `R` | mở một fact ngẫu nhiên |
| `/` | nhảy vào ô tìm kiếm |
| `Esc` | đóng modal, rời ô tìm kiếm |
| `←` `→` | fact trước, fact sau khi modal đang mở |
