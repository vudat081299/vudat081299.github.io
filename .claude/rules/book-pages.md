---
paths:
  - "pages/*.html"
  - "cooking/*.html"
---

# Trang sách — luật chung cho mọi trang trong `pages/` và `cooking/`

File này được Claude Code nạp khi đọc một trang trong `pages/` hoặc `cooking/`. Luật riêng của
từng thư mục (cổng, cách thêm trang, dữ liệu) nằm ở `pages/CLAUDE.md` và `cooking/CLAUDE.md`.

## Một trang là gì

- **Một file HTML tự chứa**: CSS và JS inline, không build step. Tên file tiếng Anh, viết thường,
  nối bằng gạch ngang. Tiêu đề tab tiếng Anh cả hai vế, dạng `Tên — phụ đề` (REPO-016).
- Văn xuôi độc nhất thì ở lại HTML, không tách sang JSON (REPO-001). Chỉ khối **lặp** (danh sách
  công thức, câu hỏi…) mới ra `data/*.json` — khi ấy trang cần HTTP để `fetch`, và phải có đường
  lỗi chỉ người dùng chạy `python3 -m http.server`.
- Mỗi trang phải có một mục trong `data/collection.json`, hoặc được khai trong `WITHHELD` /
  `UNLISTED` của `tools/lint-collection.py` — thiếu cả hai thì cổng trang chủ đỏ (trang mồ côi).

## Giọng: một quyển sách bản web, không phải blog (REPO-008)

Cắt bốn loại câu — gần như luôn là dấu vết của phiên agent đã viết trang, không phải nội dung:

1. **Credit công cụ dựng trang** — "dựng bằng skill …", đoạn "Về trang này" kể trang dùng kit gì,
   comment template trong `<head>`.
2. **Đối thoại với người đặt hàng** — "Câu hỏi của bạn, gần như nguyên văn", "Đây là nhóm bạn hỏi",
   "Đúng như bạn cảm nhận".
3. **Tự khen trang** — "bảng quan trọng nhất trang", "phần đáng nhớ nhất".
4. **Filler rỗng và caption lặp** — "nó đơn giản hơn bạn tưởng", caption nhắc lại nguyên ý chữ đã
   có trong chính hình hoặc đoạn ngay dưới.

GIỮ: lời dẫn giải thích cấu trúc sách, cách dùng phần tương tác, dấu hiệu biết mình đã xong một
bước, cảnh báo lỗi hay gặp, nguồn tham khảo. Trước khi cắt một caption, kiểm xem thông tin ấy còn
ở chỗ khác không (thường nằm ngay trong `<text>` của SVG) — cắt trùng lặp thì được, cắt mất kiến
thức thì không. Cắt sạch HTML: bỏ luôn thẻ bọc nếu nó rỗng.

## Trang giải thích một chủ đề chuyên môn (PAGES-001)

- Dễ hiểu tới mức người không chuyên cũng theo được, **nhưng đủ kiến thức**: đơn giản hoá mà làm
  phát biểu thành sai là hỏng cả hai yêu cầu.
- Cái gì visualize được thì **phải** visualize — hình và mô hình tương tác là kênh giải thích
  chính, không phải trang trí.
- Mọi con số trong mô hình tương tác phải tính thật. Lời gợi ý của mô hình hứa gì thì mô hình phải
  chạy đúng như thế — "kéo tới 0,5 thì vọt qua đáy" mà thực tế phân kỳ từ 0,33 là lỗi nội dung.
- Một cách đã dùng (chưa phải khuôn bắt buộc): mỗi mục ba ô — chuyện sờ được, không ký hiệu → đúng
  chuyện ấy bằng ký hiệu chuẩn → nó xuất hiện ở đâu trong thực tế.

## Rà một trang dạy học

- Chấm từng tab/chương theo **lời hứa của chính nó** — người đọc phải LÀM được gì — chứ không theo
  "chủ đề X có mặt không". Một mục có tiêu đề không có nghĩa là đã dạy đủ.
- Tính lại mọi demo: nốt nào, phách nào, con số nào mô hình thật sự sinh ra, rồi so với nhãn nút và
  lời văn. Đọc văn xuôi không bao giờ lộ được lỗi demo.
- Kết luận "trang thiếu X" thì ghi các từ đã tìm: tiếng Việt có dấu, không dấu, và tiếng Anh.

## Giao diện

- Mặc định: `<link rel="stylesheet" href="../web-builder/web-builder.css">`, mọi màu / bán kính /
  bóng đi qua token `--wb-*`. Viết `#fff` thẳng là một chỗ sẽ hỏng ở chế độ tối. CSS inline của
  trang chỉ lo layout riêng của trang.
- Trang được phép tự thiết kế hoàn toàn (vài trang đang như vậy), nhưng khi ấy phải mang **đủ** bộ
  token của mình cho cả sáng lẫn tối — đừng nửa bộ chung nửa bộ riêng.
- **Theme lần đầu theo hệ điều hành** — mọi trang hiện đều làm vậy. Trong `<head>`, trước first paint:
  `<meta name="color-scheme" content="light dark">` và một script nhỏ — có lựa chọn đã lưu ở
  `localStorage` khoá `hub-theme` thì theo nó, chưa có thì theo `prefers-color-scheme`. Khoá
  `hub-theme` dùng chung cả site: bấm tối ở một trang thì sang trang khác vẫn tối. Nút bật/tắt trong
  trang đọc lại đúng các quy tắc ấy. Đặt script sau `<body>` là trang nháy sáng một nhịp rồi mới tối.
- Không tràn ngang: `document.documentElement.scrollWidth - document.documentElement.clientWidth`
  phải bằng 0 ở 320 / 390 / 1280, cả sáng lẫn tối. Mở trang qua HTTP để đo, không qua `file://`.

## Cổng tĩnh chung (`lint-pages.py` / `lint-cooking.py`)

Chúng chỉ kiểm thứ đúng/sai khách quan: id trùng, anchor gãy, asset thiếu, thẻ lệch; `<svg>` không
có tên tiếp cận (trình đọc màn hình bỏ qua hẳn — mà các trang này dạy bằng hình); cây tiêu đề nhảy
quá một bậc; `aria-label` thuần tiếng Anh trên trang `lang="vi"`; `<title>` của trang (trong `<head>`)
có chữ tiếng Việt — tiêu đề tab viết bằng tiếng Anh, thân trang tiếng Việt (REPO-016). Chúng không
kiểm câu chữ.

## File dài

Đừng Read cả file — nhiều trang dài vài nghìn dòng. Chạy `python3 tools/toc.py <trang>` để có bản
đồ mục kèm dải dòng, rồi `--where <id>` để lấy đúng offset/limit của một mục.
