---
paths:
  - "pages/*.html"
  - "cooking/*.html"
---

# Trang sách — luật chung cho `pages/` và `cooking/`

Luật riêng của từng thư mục ở `pages/CLAUDE.md` và `cooking/CLAUDE.md`.

## Một trang

- Một file HTML tự chứa: CSS và JS inline, không build. Tên file tiếng Anh, chữ thường, nối bằng `-`.
- Tiêu đề tab tiếng Anh, dạng `Tên — phụ đề`; chữ trên thanh trên cùng cũng tiếng Anh; thân trang tiếng
  Việt (REPO-016).
- Chỉ khối lặp mới ra `data/*.json` (REPO-001); khi ấy trang phải báo rõ khi mở bằng `file://`.
- Mỗi trang có một mục trong `data/collection.json`, hoặc nằm trong `UNLISTED` / `WITHHELD` của
  `tools/lint-collection.py`.

## Giọng: sách, không phải blog (REPO-008)

- Cắt: credit công cụ dựng trang; câu nói với người đặt trang ("câu hỏi của bạn…"); câu tự khen trang
  ("bảng quan trọng nhất"); câu độn; caption nhắc lại chữ ngay bên cạnh.
- Giữ: lời dẫn cấu trúc, cách dùng phần tương tác, dấu hiệu đã xong một bước, lỗi hay gặp, nguồn.
- Trước khi cắt một caption, kiểm thông tin ấy còn ở chỗ khác không (thường trong `<text>` của SVG).

## Trang giải thích (PAGES-001)

- Dễ hiểu cho người không chuyên, nhưng đủ và đúng kiến thức.
- Cái gì visualize được thì phải visualize.
- Mọi con số trong mô hình tương tác phải tính thật, và mô hình phải làm đúng điều lời văn hứa.

## Rà một trang dạy học

- Chấm theo điều người đọc phải làm được sau mỗi mục, không theo "chủ đề có mặt không".
- Tính lại mọi demo (nốt, phách, con số nó thật sự sinh ra) rồi so với nhãn nút và lời văn.
- Kết luận "trang thiếu X" thì ghi các từ đã tìm (có dấu, không dấu, tiếng Anh).

## Giao diện

- Mặc định dùng `../web-builder/web-builder.css`; màu, bán kính, bóng đi qua token `--wb-*`.
- Trang tự thiết kế thì phải có đủ bộ token riêng cho cả sáng lẫn tối.
- Theme lần đầu theo hệ điều hành: trong `<head>`, trước first paint, có
  `<meta name="color-scheme" content="light dark">` và script đọc `localStorage['hub-theme']` (khoá chung
  cả site); chưa có thì theo `prefers-color-scheme`.
- Không tràn ngang: `scrollWidth - clientWidth` bằng 0 ở 320 / 390 / 1280, sáng và tối (mở qua HTTP).

## Cổng tĩnh (`lint-pages.py`, `lint-cooking.py`)

Kiểm: id trùng, anchor gãy, asset thiếu, thẻ lệch, `<svg>` không có tên tiếp cận, cây tiêu đề nhảy quá
một bậc, `aria-label` thuần tiếng Anh trên trang `lang="vi"`, `<title>` có chữ tiếng Việt. Không kiểm câu
chữ. Code chung ở `tools/htmlcheck.py`.

File dài: `grep -n '<h2\|<section id' <trang>` rồi đọc từng đoạn.
