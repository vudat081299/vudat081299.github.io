# Handoff — data-science-roadmap.html

Phiên làm ngày 2026-08-03. File là một single-page app (~11.8k dòng, tự chứa) dựng trên
web-builder CSS. Nội dung bài nằm trong các `<template data-node="…">`, router hash dựng ra.

## Đã làm xong trong phiên này (đã verify trên trình duyệt, light + dark + mobile)

Toàn bộ là sửa **bố cục / trình bày**, không đụng kiến thức bài học:

1. **Sidebar / cây lộ trình** — bỏ đường kẻ guide dọc (`wb-tree--lines`) và cột chấm rỗng của lá;
   thụt lề mềm hơn; hàng chặng thành tiêu đề nhóm. Bài đang mở = hàng nav được chọn (nền + vạch trái).
2. **Lỗi 2 thanh xám vô nghĩa dưới progress** — `.ds-undo{display:flex}` đè `[hidden]`; đã thêm
   `.ds-undo[hidden]{display:none}`.
3. **Chọn chặng theo bài đang mở** — trước đây chỉ sáng chặng khi mở bài ĐẦU chặng. Nay chặng tự
   đậm khi *bất kỳ* bài con nào đang mở (CSS `:has([aria-current])`), và `is-selected` chỉ áp cho hàng lá.
4. **Search TOC** — bỏ gạch chân kết quả (`.ds-leaf` là `<a>`), canh lại hàng 2 dòng, dọn khoảng cách.
5. **Bề rộng nội dung** — `.ds-prose` không còn ép mọi thứ vào 78ch: CHỮ giữ ~74ch cho dễ đọc,
   còn bảng / khối code / hình / thẻ được tràn rộng hết cột (~1040px). Sửa đúng chỗ bảng nhiều chữ bị bóp.
6. **Ma trận năng lực** — bảng render ngoài `.ds-prose` nên trước đó không có padding/viền → xô lệch.
   Đã thêm border-collapse, viền, padding, `<colgroup>` cho 4 cột mức bằng nhau.
7. **Logo + theme** — thêm logo SVG (node-graph, theme-aware qua class, KHÔNG dùng `var()` trong
   thuộc tính fill), bấm logo = ẩn/hiện sidebar (desktop collapse, mobile drawer). Theme toggle đổi
   sang mẫu hai `<span>` `wb-theme-toggle__to-*` đúng docs kit (không còn thay innerHTML).
8. **Trang chủ viết lại thành lời giới thiệu giáo trình** (cho người học DS nói chung, bỏ giọng cá nhân):
   - Bỏ 3 mục cũ: "Ba thứ bạn nói bạn chưa biết", "Hai lộ trình chọn theo thời gian", "Còn roadmap.sh thì sao".
   - Thêm: "Giáo trình này là gì" + 6 năng lực (`wb-steps`), "Giáo trình dạy theo cách nào" (4 nguyên tắc),
     "Cần chuẩn bị gì" (prerequisites), "Vì sao dựng quanh bài toán gian lận".
   - "Bản đồ toàn bộ lộ trình" → đổi thành **"Đi qua giáo trình: mỗi chặng cho bạn gì"**, mỗi chặng có
     một dòng *học xong chặng này làm được gì* (map `PHASE_OUTCOME` trong JS, khớp tên chặng trong `TREE`).
   - Section 0 ("Bắt đầu từ đây": s-how, s-pipeline, …) giữ vai trò **bổ sung cho home**; section 1+ là bài học.

`auditPlan()` vẫn trả `[]` (dữ liệu lịch/số nhất quán). Không có lỗi console.

## Còn lại (chưa làm — nên tách phiên riêng, cần đọc kỹ từng bài)

**Rà soát trình bày từng bài bằng /explain-clearly + đẩy nhánh phụ vào popup.**
Yêu cầu của chủ: mạch chính giữ tối giản; kiến thức ngoài lề / bổ sung KHÔNG hiện ngay mà nằm sau
chip bấm được (`.ds-math` → modal toán, `.ds-aside` → drawer bên phải). Hạ tầng đã có sẵn và home đã
theo đúng tinh thần này, nhưng **83 bài chưa được rà toàn bộ**:

- Đi từng `<template data-node>`, tìm đoạn giải thích lan man / so sánh công cụ / đào sâu đang nằm trên
  mạch chính → cân nhắc chuyển vào `data-aside`/`data-math` (xem các entry `ASIDES` / `MATH` sẵn có làm mẫu).
- Dùng /explain-clearly để kiểm mỗi bài: bố cục có khớp nội dung muốn truyền đạt không, chỗ nào gây khó hiểu.
- Bài `r-roadmapsh` ("roadmap.sh dịch ra: giữ gì, bỏ gì"): tiêu đề đã là "dịch/ánh xạ" nhưng cần đọc lại
  nội dung để chắc chắn nó là **bản dịch thứ tự bài học**, không phải bài "so sánh hơn thua" với roadmap.sh
  (chủ đã nói rõ: tham khảo roadmap.sh để có thứ tự đủ bài, không phải để so sánh).

## Chạy preview (sandbox chặn preview_start đọc thẳng file repo — phải mirror)

- Mirror sang scratchpad rồi serve: cấu hình `ds-preview` trong `.claude/launch.json`
  (serve `…/scratchpad/preview`, cổng 8793). Sau mỗi lần sửa: `cp` file repo → mirror rồi reload.
- Trình duyệt pane cache mạnh: reload kèm `?v=N` để chắc chắn lấy bản mới.
- Trang rất dài (~9000px): screenshot khi cuộn sâu hay ra khung đen (giới hạn compositor của pane) —
  verify bằng DOM/JS hoặc đặt viewport cao, đừng tin mỗi ảnh đen là lỗi thật.
