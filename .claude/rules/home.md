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
  (REPO-003).
- Chữ lặp (section, mục, dòng môn học) ở `data/collection.json`; tiêu đề trang ở HTML (REPO-001). Rail trái
  và chân trang dựng từ chính mảng `sections`.
- Số suy ra được (số trang của một môn) thì tính từ dữ liệu, đừng ghi tay.

## Cổng

- `python3 tools/lint-collection.py` (nằm trong `tools/check.sh`): trường bắt buộc, phím trùng, href chết,
  trang mồ côi trong `pages/` và `cooking/`, hai danh sách `WITHHELD` / `UNLISTED`.
- `node tools/smoke-index.js <url>` (CI chạy): đo trong trình duyệt thật — tràn ngang, mép thẳng hàng,
  tương phản, tìm kiếm, bàn phím, mọi href. Chạy tay: `python3 -m http.server 8347`, rồi
  `node tools/smoke-index.js http://127.0.0.1:8347/index.html`.

## Viết `desc` (REPO-002)

- Mô tả nói trang dạy gì, không kể trang có bộ phận hay tính năng gì.
- Cắt: `Interactive`, `Searchable`, `filter by`, `pop-ups`, `(Anh/Việt)`, và đếm bộ phận trang
  (`16 mô hình tương tác`, `7 phần`).
- Giữ: chủ đề (`từ hạt nhân tới hoá hữu cơ`) và đếm nội dung (`~79 lối ngụy biện`). Trang công cụ: việc nó
  làm là chủ đề.
- `desc` của section nói cái gì gom nhóm ấy lại.
- Luật này cũng nằm ở trường `note` trong `collection.json`. Không có ngưỡng độ dài.

## Xếp mục

- Một section một trục: `Tools` là thứ để dùng, các section khác là chủ đề để đọc. Đừng dựng một ô chứa
  mọi thứ.
- Section lộ trình học (`Data & AI`, `Science`, `Thinking`, `Cooking`, `Master's`): cửa vào trước, kho tra
  cứu cuối.
- Section cái kệ (`Tools`, `Everyday`, `Books`): cái hay dùng nhất trước.
- Cùng một mức: cái gần việc chủ trang nhất trước.
- Thứ tự các section do chủ trang chốt (REPO-005); các môn cao học giữ thứ tự hiện có (REPO-006).
- Thứ tự không có cổng kiểm: "cửa vào" không đo được.

## Phím tắt

- `key` tuỳ chọn, vì phím `0-9a-z` có hạn. Mục không có `key` thì không vẽ chip, mở bằng chuột hoặc tìm kiếm.
- Đừng cho hai mục chung một phím, và đừng đổi phím của mục cũ: người dùng đã quen tay.

## Danh sách ẩn (`hold`)

Chủ trang gọi là "list ẩn"; trên bảng nhãn là `Reserved`.

- Khoá `hold` ở gốc `collection.json`, ngoài `sections`: `label` và `items` (đủ `icon`, `name`, `desc`, `href`;
  không có `key`). Không có số thứ tự, không vào mục lục, chân trang, ô đếm, tìm kiếm hay phím tắt (REPO-020).
- Giữ ⌃⌥⇧⌘Z (Ctrl+Option+Shift+Cmd+Z) thì một bảng nổi hiện ở đáy khung nhìn, thả ra là mất. Dò bằng `e.code`.
- macOS không bắn `keyup` của phím thường khi ⌘ còn giữ: thả Z mà chưa thả ⌘ thì bảng ở lại tới lúc thả
  một phím sửa đổi. Blur cửa sổ và đổi tab cũng đóng bảng.
- Trang trong `hold` vẫn lên web: không nằm trong `WITHHELD` / `UNLISTED`, `deploy.yml` không `--exclude`. Đó là
  cách giấu link, không phải bảo mật; URL trực tiếp vẫn mở được.
- Cổng: `lint-collection.py` kiểm `hold` như `sections`; `smoke-index.js` kiểm hiện/ẩn và không lọt vào số đếm.

## `WITHHELD` và `UNLISTED` (trong `tools/lint-collection.py`)

- `WITHHELD`: không có trên trang chủ, không lên web — `deploy.yml` phải có `--exclude` cho nó. Không ghi
  lý do (REPO-007); muốn đổi thì hỏi chủ trang.
- `UNLISTED`: không có trên trang chủ nhưng vẫn lên web — `deploy.yml` không được có `--exclude` cho nó.
- Cả hai không được quay lại `collection.json`, và một trang chỉ ở một danh sách. Cổng kiểm cả ba điều.
- Repo public: `--exclude` chỉ chặn trên site; file vẫn đọc được trên github.com và trong lịch sử git.

## Font

Chỉ xin đúng dải trọng lượng đang dùng. Đừng ghim trục `opsz` của Fraunces: tiêu đề section sẽ mảnh như
sợi tóc.
