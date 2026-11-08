---
paths:
  - "index.html"
  - "data/**"
  - "tools/lint-collection.py"
  - "tools/smoke-index.js"
---

# Trang chủ — `index.html` + `data/collection.json`

Trang chủ không có thư mục riêng (GitHub Pages cần `index.html` ở gốc), nên luật của nó ở đây. Quyết định
ở `DECISIONS.md` gốc, việc dở ở `HANDOFF.md` gốc.

## Cấu trúc

- `index.html` tự chứa: `<style>` riêng, prefix `ix-`, không link `web-builder.css`, không mặt chữ icon
  (REPO-003). SVG inline nhỏ thì được.
- `collection.json`: `zones` → `sections` → mục. Khu có `id`, `label`, `desc`, `sections`. Không có
  `sections` ở gốc.
- Chữ lặp (khu, section, mục, dòng môn học) ở `data/collection.json`; tiêu đề trang ở HTML (REPO-001).
  Mục lục, thanh chip và chân trang dựng từ chính danh sách `zones`.
- Khu đầu là việc đang học; trang tự tô nổi khu đầu, data không có cờ nào cho việc ấy.
- Số suy ra được (số mục của section, số thứ tự 01–08) thì tính từ dữ liệu, đừng ghi tay.

## Giao diện

- Đen, trắng, một xanh lá (REPO-023). Màu chỉ khai ở token `:root` / `html.dark`, đừng rải vào từng luật.
- Theme: khoá `localStorage['hub-theme']`, đặt trước lần vẽ đầu; chưa chọn thì theo hệ điều hành.
- Máy tính: lưới ba cột, section môn học rộng hai cột. Điện thoại (≤ 720px): một cột, thanh trên không dính,
  thanh chip section dính trên cùng và tự cuộn ngang.
- Vùng chạm ở điện thoại ≥ 44×44px. Có `prefers-reduced-motion`.

## Cổng

- `python3 tools/lint-collection.py` (nằm trong `tools/check.sh`): cấu trúc khu, trường bắt buộc, id và phím
  trùng, href chết, trang mồ côi trong `pages/` và `cooking/`, hai danh sách `WITHHELD` / `UNLISTED`.
- `node tools/smoke-index.js <url>` (CI chạy): đo trong trình duyệt thật — tràn ngang, mép thẳng hàng,
  tương phản trên nền thật, tìm kiếm, bàn phím, mọi href, danh sách ẩn, bottom sheet, vùng chạm, thanh chip.
  Chạy tay: `python3 -m http.server 8347`, rồi `node tools/smoke-index.js http://127.0.0.1:8347/index.html`.

## Viết `desc` (REPO-002)

- Mô tả nói trang dạy gì, không kể trang có bộ phận hay tính năng gì.
- Cắt: `Interactive`, `Searchable`, `filter by`, `pop-ups`, `(Anh/Việt)`, và đếm bộ phận trang
  (`16 mô hình tương tác`, `7 phần`).
- Giữ: chủ đề (`từ hạt nhân tới hoá hữu cơ`) và đếm nội dung (`~79 lối ngụy biện`). Trang công cụ: việc nó
  làm là chủ đề.
- Tiếng Việt, một dòng ngắn đọc lướt được. `name`, `label` và tên môn giữ tiếng Anh.
- `desc` của section và của khu nói cái gì gom nhóm ấy lại.
- Luật này cũng nằm ở trường `note` trong `collection.json`.
- `tags` (tuỳ chọn, không hiện): từ khoá cho ô tìm kiếm — tên kỹ thuật mà `desc` ngắn đã cắt (`Bayes`, `CUPED`).
  Tìm kiếm không phân biệt hoa thường và dấu.

## Xếp mục

- Khu và thứ tự section do chủ trang chốt (REPO-022); các môn cao học giữ thứ tự hiện có (REPO-006).
- Một section một trục: `Tools` là thứ để dùng, các section khác là chủ đề để đọc. Đừng dựng một ô chứa
  mọi thứ.
- Section lộ trình học (`Data & AI`, `Science`, `Thinking`, `Cooking`, `Master's`): cửa vào trước, kho tra
  cứu cuối.
- Section cái kệ (`Tools`, `Everyday`, `Books`): cái hay dùng nhất trước.
- Cùng một mức: cái gần việc chủ trang nhất trước.
- Thứ tự không có cổng kiểm: "cửa vào" không đo được.

## Phím tắt

- `key` tuỳ chọn, vì phím `0-9a-z` có hạn. Mục không có `key` thì không vẽ chip, mở bằng chuột hoặc tìm kiếm.
- Đừng cho hai mục chung một phím, và đừng đổi phím của mục cũ: người dùng đã quen tay.

## Danh sách ẩn (`hold`)

Chủ trang gọi là "list ẩn"; trên bảng nhãn là `Reserved`.

- Khoá `hold` ở gốc `collection.json`, ngoài `zones`: `label` và `groups`; mỗi nhóm có `label` và `items` (đủ
  `icon`, `name`, `desc`, `href`; không có `key`). Không có số thứ tự, không vào mục lục, chân trang, ô đếm, tìm
  kiếm hay phím tắt (REPO-021).
- Máy tính: ⇧? (Shift + `Slash`, dò bằng `e.code`) bật bảng nổi ở đáy khung nhìn, nhóm xếp thành cột; thả phím
  vẫn hiện.
- ⇧? lần nữa, bấm lớp phủ, nút đóng, hoặc Esc thì ẩn. Blur cửa sổ và đổi tab không đóng bảng.
- Điện thoại: gõ đúng `?` vào ô tìm kiếm thì ô được xoá, bàn phím ảo đóng, bảng hiện. Chữ có `?` ở giữa thì vẫn
  là tìm kiếm.
- Máy hẹp (≤ 720px): bảng là bottom sheet sát đáy, cao tối đa 66vh, có nút đóng, cuộn bên trong.
- Bảng mở thì trang phía sau không cuộn.
- `/` không Shift vẫn nhảy vào ô tìm kiếm.
- Trang trong `hold` vẫn lên web: không nằm trong `WITHHELD` / `UNLISTED`, `deploy.yml` không `--exclude`. Đó là
  cách giấu link, không phải bảo mật; URL trực tiếp vẫn mở được.

## `WITHHELD` và `UNLISTED` (trong `tools/lint-collection.py`)

- `WITHHELD`: không có trên trang chủ, không lên web — `deploy.yml` phải có `--exclude` cho nó. Không ghi
  lý do (REPO-007); muốn đổi thì hỏi chủ trang.
- `UNLISTED`: không có trên trang chủ nhưng vẫn lên web — `deploy.yml` không được có `--exclude` cho nó.
- Cả hai không được quay lại `collection.json`, và một trang chỉ ở một danh sách. Cổng kiểm cả ba điều.
- Repo public: `--exclude` chỉ chặn trên site; file vẫn đọc được trên github.com và trong lịch sử git.

## Font

- Space Grotesk 600 (tiêu đề), Be Vietnam Pro 400/600 (chữ), JetBrains Mono 500 (chip phím, nhãn).
- Font mới phải có subset `vietnamese` (CSS của Google Fonts có `unicode-range` chứa U+1EA0-1EF9).
- Chỉ xin đúng nét đang dùng.
