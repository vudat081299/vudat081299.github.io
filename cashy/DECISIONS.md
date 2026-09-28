# Quyết định — cashy/

<!-- decisions: prefix=CASHY; nhóm=giao diện, cấu trúc, dữ liệu, quy trình, xuất bản -->

Những gì chủ repo đã chốt cho Cashy. Luật đang áp dụng cho code (tầng, bất biến, quy trình) nằm
ở [CLAUDE.md](CLAUDE.md); file này ghi ai chốt, khi nào, vì sao, và áp tới đâu. Việc đang dở của
chương trình thiết kế lại khoản vay nằm ở
[docs/agentic-workflow/README.md](docs/agentic-workflow/README.md).

Nhiều mục có nguồn là memory của agent trên máy chủ repo — đã đối chiếu với code trước khi ghi.
Muốn đảo một mục thì hỏi chủ repo trước; đảo xong thì giữ cả hai mục (*"đã thay bằng …"* /
*"Thay cho: …"*). Tra theo file: `python3 tools/decisions.py find cashy/<đường dẫn>`.

<!-- index:start -->
**giao diện**
- CASHY-001 — Gu giao diện: trung tính trước, không neon, không vẻ "fintech"; màu là trạng thái · `cashy/src/ui/`, `cashy/src/index.css`, `cashy/src/styles/`
- CASHY-002 — Hướng "Bảng số": số tiền là nhân vật chính, viết bằng JetBrains Mono · `cashy/src/styles/wb-theme.css`, `cashy/index.html` _(đã thay bằng CASHY-004)_
- CASHY-003 — Khung kiểu trang launcher: thanh điều hướng tối trên cùng · `cashy/src/ui/app/Layout.tsx` _(đã thay bằng CASHY-004)_
- CASHY-004 — Dựng lại toàn bộ giao diện trên web-builder, trung tính chủ đạo · `cashy/src/ui/`, `cashy/src/styles/`, `cashy/src/index.css`
- CASHY-006 — Luôn dùng thành phần của web-builder; bộ không có thì ghép từ primitive của nó · `cashy/src/ui/`
- CASHY-007 — Dấu nhận diện trung tính, không cho chọn màu · `cashy/src/ui/app/Layout.tsx`, `cashy/src/ui/features/onboarding/`, `cashy/src/ui/features/settings/`
- CASHY-009 — Hàng giao dịch không có nút xoá; xoá nằm trong trình sửa · `cashy/src/ui/features/transactions/`
- CASHY-010 — Tạm để giao diện lẫn hai thứ tiếng · `cashy/src/ui/` _(đã thay bằng CASHY-011)_
- CASHY-011 — Khung giao diện toàn tiếng Anh; dữ liệu mẫu giữ tiếng Việt · `cashy/src/ui/`, `cashy/src/domain/date.ts`, `cashy/src/domain/money.ts`, `cashy/src/data/sample.ts`, `cashy/src/data/seed.ts`
- CASHY-018 — Ký hiệu tiền là ₫ trên toàn ứng dụng · `cashy/src/domain/money.ts`, `cashy/src/ui/`
- CASHY-019 — Lọc và sắp gói định kỳ ở cả hai nơi; thanh lọc chỉ hiện khi quá 6 gói · `cashy/src/ui/features/subscriptions/`, `cashy/src/ui/features/dashboard/`, `cashy/src/domain/subscription.ts`

**cấu trúc**
- CASHY-005 — Giữ React, bỏ Tailwind · `cashy/package.json`, `cashy/src/`
- CASHY-016 — Kiến trúc: UI tách khỏi logic, lớp truy vấn dữ liệu sẵn cho backend, module theo tính năng · `cashy/src/`
- CASHY-022 — Màn hình ghép từ bộ kit (lập trường B); chuyển sang kit không được đổi giao diện · `cashy/src/ui/`
- CASHY-023 — Ba tầng thành phần; bảng và thẻ nghiệp vụ ở tầng giữa, không gộp vào kit · `cashy/src/ui/`
- CASHY-024 — Không đồng bộ bản web-builder.css của Cashy với web-builder/ ở gốc · `cashy/src/styles/web-builder.css`

**dữ liệu**
- CASHY-008 — Gói năm đổi tháng thanh toán: giữ lịch sử, dựng lại lưới kỳ từ ngày mới · `cashy/src/domain/subscription.ts`, `cashy/src/usecases/subscriptions.ts`
- CASHY-012 — Khoản vay là một thực thể riêng; lãi chỉ để tham khảo, trả nợ ghi tay · `cashy/src/domain/loan.ts`, `cashy/src/usecases/loans.ts`, `cashy/src/ui/features/loans/` _(đã thay bằng CASHY-014)_
- CASHY-013 — Danh bạ (Contact) là thực thể hạng nhất · `cashy/src/domain/contact.ts`, `cashy/src/usecases/contacts.ts`, `cashy/src/ui/features/contacts/`, `cashy/src/data/migrations.ts`
- CASHY-014 — Khoản vay gắn với sổ giao dịch · `cashy/src/domain/loan.ts`, `cashy/src/domain/types.ts`, `cashy/src/usecases/loans.ts`, `cashy/src/ui/features/loans/`, `cashy/src/data/migrations.ts`
- CASHY-015 — Dashboard có bộ chọn gộp số liệu: chi tiêu / + gói định kỳ / + khoản vay · `cashy/src/ui/features/dashboard/`, `cashy/src/domain/analytics.ts`

**quy trình**
- CASHY-017 — Tài liệu nghiệp vụ phải đủ, và mỗi tài liệu một tính năng · `cashy/docs/`
- CASHY-020 — Bản web có spec riêng; hai tài liệu tầm nhìn iOS để nguyên · `cashy/docs/cashy-web-spec.md`, `cashy/docs/cashy-vision.md`, `cashy/docs/cashy-v1-spec.md`

**xuất bản**
- CASHY-021 — Hai gallery dev ở lại trong bản build · `cashy/src/ui/dev/`
<!-- index:end -->

### CASHY-001 — Gu giao diện: trung tính trước, không neon, không vẻ "fintech"; màu là trạng thái
- **Ngày:** 07/2026
- **Phạm vi:** cashy/src/ui/, cashy/src/index.css, cashy/src/styles/
- **Nhóm:** giao diện
- **Trạng thái:** đang áp dụng
- **Quyết định:** Nền là trắng–đen–xám; màu chỉ mang nghĩa trạng thái (thu xanh lá, chi/nguy hiểm
  đỏ, cảnh báo hổ phách, thông tin xanh dương), không dùng để trang trí. Tránh vẻ "SaaS fintech":
  số mono sặc sỡ, nhãn in hoa giãn chữ, màu neon/cyan, thanh màu trên thẻ KPI, bóng đổ nặng. Nút
  hành động chính đơn sắc, không xanh dương.
- **Vì sao:** tham chiếu thị giác của chủ repo là Notion. Mỗi lần giao diện trôi sang vẻ dashboard
  fintech, chủ repo phản ứng mạnh — ba vòng liền (*"design xấu quá"*, *"chưa giống Notion"*) — và
  cuối cùng tự gửi trang Notion lưu sẵn làm mẫu.
- **Đừng:** đưa lại mã màu và bo góc Notion viết tay (`#37352f`, 4px) đè lên hệ `--wb-*`: gu này
  nay được thực thi bằng token của web-builder (CASHY-004).
- **Nguồn:** memory `cashy-notion-design` (máy chủ repo); CLAUDE.md §3.

### CASHY-002 — Hướng "Bảng số": số tiền là nhân vật chính, viết bằng JetBrains Mono
- **Ngày:** 10/07/2026
- **Phạm vi:** cashy/src/styles/wb-theme.css, cashy/index.html
- **Nhóm:** giao diện
- **Trạng thái:** đã thay bằng CASHY-004
- **Quyết định:** Trong hai hướng được đưa ra, chủ repo chọn hướng B "Bảng số": dashboard dày, số
  tiền là nhân vật chính viết bằng JetBrains Mono, chữ thân Plus Jakarta Sans.
- **Nguồn:** commit b9e2284; memory `cashy-vite-stack`.

Hiện trạng sau CASHY-004: số tiền dùng `.wb-num` — chữ giao diện, `tabular-nums`, không mono.
JetBrains Mono chỉ còn là `--wb-font-mono`, dùng cho phím tắt và ô nhập theo khuôn.

### CASHY-003 — Khung kiểu trang launcher: thanh điều hướng tối trên cùng
- **Ngày:** 14/07/2026
- **Phạm vi:** cashy/src/ui/app/Layout.tsx
- **Nhóm:** giao diện
- **Trạng thái:** đã thay bằng CASHY-004
- **Quyết định:** Cho Cashy *"vibe kiểu như index.html"* (trang launcher của repo): thanh điều hướng
  tối toàn chiều ngang, sidebar chỉ còn điều hướng, bo góc 10px — làm bằng Tailwind, không nạp
  Bootstrap.
- **Nguồn:** commit 31a4edd; memory `cashy-notion-design`.

Khung hiện tại là `wb-navbar` + `wb-sidenav` trung tính của web-builder; thanh tối không còn.

### CASHY-004 — Dựng lại toàn bộ giao diện trên web-builder, trung tính chủ đạo
- **Ngày:** 20/07/2026
- **Phạm vi:** cashy/src/ui/, cashy/src/styles/, cashy/src/index.css
- **Nhóm:** giao diện
- **Trạng thái:** đang áp dụng
- **Thay cho:** CASHY-002, CASHY-003
- **Quyết định:** *"Đập đi xây lại toàn bộ UI"* trên thư viện web-builder, màu trung tính chủ đạo
  cộng các màu trạng thái dành riêng. Bỏ hẳn lớp hành vi shadcn/Radix — chủ repo chọn *"thuần wb +
  JS tối giản"*: modal, popover, toast… là các primitive tự viết, mỏng.
- **Đừng:** đưa lại thanh điều hướng tối, hay mã màu Notion viết tay đè lên hệ `wb-*`, mà không hỏi.
- **Nguồn:** memory `cashy-vite-stack` và `cashy-notion-design` (mục cập nhật 20/07/2026); chuỗi
  commit e8af781 … 76ba97b.

### CASHY-005 — Giữ React, bỏ Tailwind
- **Ngày:** 20/07/2026
- **Phạm vi:** cashy/package.json, cashy/src/
- **Nhóm:** cấu trúc
- **Trạng thái:** đang áp dụng
- **Quyết định:** Giữ React — store phản ứng, Recharts và cây kéo thả đáng giá của nó. Bỏ Tailwind:
  web-builder là CSS thuần nên React dùng lại được trọn, chỉ khác `class` thành `className`.
- **Vì sao:** sau khi được giải thích React so với trang tĩnh, chủ repo xác nhận *"giữ React, bỏ
  Tailwind"*.
- **Đừng:** thêm lại Tailwind hay shadcn.
- **Nguồn:** commit fb35aaf, 66fe8f1; memory `cashy-vite-stack`.

### CASHY-006 — Luôn dùng thành phần của web-builder; bộ không có thì ghép từ primitive của nó
- **Ngày:** 20/07/2026
- **Phạm vi:** cashy/src/ui/
- **Nhóm:** giao diện
- **Trạng thái:** đang áp dụng
- **Quyết định:** Luôn dùng một thành phần của web-builder; bộ không có thì ghép từ primitive của nó.
  Giữ nguyên logic, chỉ làm bố cục cho hài hoà.
- **Vì sao:** luật chủ repo đặt khi giao cho agent tự trả lời sáu câu hỏi của đợt dựng lại.
- **Nguồn:** commit 153ee5e; memory `cashy-vite-stack`.

### CASHY-007 — Dấu nhận diện trung tính, không cho chọn màu
- **Ngày:** 20/07/2026
- **Phạm vi:** cashy/src/ui/app/Layout.tsx, cashy/src/ui/features/onboarding/,
  cashy/src/ui/features/settings/
- **Nhóm:** giao diện
- **Trạng thái:** đang áp dụng
- **Quyết định:** Dấu nhận diện của Cashy là ô `.wb-navbar__mark` trung tính (nền đen chữ trắng ở
  nền sáng, tự đảo ở nền tối). Không có chỗ nào cho người dùng chọn màu nhận diện.
- **Vì sao:** yêu cầu *"đưa về neutral hết"*.
- **Nguồn:** commit cd1647e.

### CASHY-008 — Gói năm đổi tháng thanh toán: giữ lịch sử, dựng lại lưới kỳ từ ngày mới
- **Ngày:** 22/07/2026
- **Phạm vi:** cashy/src/domain/subscription.ts, cashy/src/usecases/subscriptions.ts
- **Nhóm:** dữ liệu
- **Trạng thái:** đang áp dụng
- **Quyết định:** Phương án A: giữ lịch sử thanh toán và dựng lại lưới kỳ từ ngày mới; kỳ bù đầu
  tiên tính đủ tiền dù ngắn hơn một kỳ thường. Không chặn việc sửa khi đã có lịch sử (phương án B).
- **Nguồn:** commit 2b5b999 (*"Option A, as chosen"*); cashy/README.md, bảng *Resolved* mục 2.

### CASHY-009 — Hàng giao dịch không có nút xoá; xoá nằm trong trình sửa
- **Ngày:** 22/07/2026
- **Phạm vi:** cashy/src/ui/features/transactions/
- **Nhóm:** giao diện
- **Trạng thái:** đang áp dụng
- **Quyết định:** Bảng giao dịch không có nút xoá trên từng hàng; nút Sửa luôn hiện; xoá nằm trong
  trình sửa.
- **Nguồn:** commit f689fef; cashy/README.md, bảng *Resolved* mục 1 (*"Confirmed as built"*).

### CASHY-010 — Tạm để giao diện lẫn hai thứ tiếng
- **Ngày:** 22/07/2026
- **Phạm vi:** cashy/src/ui/
- **Nhóm:** giao diện
- **Trạng thái:** đã thay bằng CASHY-011
- **Quyết định:** Để nguyên giao diện nửa Anh nửa Việt; chủ repo sẽ tự lo phần dịch sau.
- **Nguồn:** commit f689fef; cashy/README.md, bảng *Resolved* mục 5.

### CASHY-011 — Khung giao diện toàn tiếng Anh; dữ liệu mẫu giữ tiếng Việt
- **Ngày:** 23/07/2026
- **Phạm vi:** cashy/src/ui/, cashy/src/domain/date.ts, cashy/src/domain/money.ts,
  cashy/src/data/sample.ts, cashy/src/data/seed.ts
- **Nhóm:** giao diện
- **Trạng thái:** đang áp dụng
- **Thay cho:** CASHY-010
- **Quyết định:** Toàn bộ khung giao diện bằng tiếng Anh, kể cả nhãn ngày của biểu đồ trên cả app.
  Dữ liệu mẫu (bên giao dịch, ghi chú, tên danh mục) và hai gallery dev giữ tiếng Việt. Tiền rút
  gọn dùng chữ cái `k` / `m` / `b` với dấu thập phân kiểu Việt (`3,4m`).
- **Vì sao:** câu hỏi mở "dịch tới đâu" — (a) cả app kể cả ngày, hay (b) dừng ở Overview — được
  chốt theo (a).
- **Nguồn:** commit e3f8658 (câu hỏi), 018a392 (chốt); cashy/README.md, bảng *Resolved* mục 8.

### CASHY-012 — Khoản vay là một thực thể riêng; lãi chỉ để tham khảo, trả nợ ghi tay
- **Ngày:** 23/07/2026
- **Phạm vi:** cashy/src/domain/loan.ts, cashy/src/usecases/loans.ts, cashy/src/ui/features/loans/
- **Nhóm:** dữ liệu
- **Trạng thái:** đã thay bằng CASHY-014
- **Quyết định:** `Loan` là thực thể hạng nhất có màn hình riêng, không phải một "ví nợ"; có cả hai
  chiều vay và cho vay. Lãi suất và hạn trả chỉ để hiển thị và nhắc; người dùng tự ghi từng lần
  trả; không tự cộng lãi, không lịch trả góp.
- **Nguồn:** cashy/docs/loans-plan.md §1 (*"decided with the owner, 2026-07-23"*).
- **Chi tiết:** docs/loans-plan.md

Code hiện tại vẫn chạy theo mô hình này cho tới khi slice B của CASHY-014 xong — xem CLAUDE.md §8,
bất biến 9.

### CASHY-013 — Danh bạ (Contact) là thực thể hạng nhất
- **Ngày:** 23/07/2026
- **Phạm vi:** cashy/src/domain/contact.ts, cashy/src/usecases/contacts.ts,
  cashy/src/ui/features/contacts/, cashy/src/data/migrations.ts
- **Nhóm:** dữ liệu
- **Trạng thái:** đang áp dụng
- **Quyết định:** Người mình cho vay hay vay của là một thực thể riêng `{id, name, username?, …}`
  (chủ repo gọi nó là "User"); khoản vay trỏ tới bằng `id` và hiện tên. Đây là slice A của chương
  trình thiết kế lại khoản vay (CASHY-014) — đã làm xong, migration v9.
- **Nguồn:** phiên discovery 23/07/2026; cashy/docs/agentic-workflow/README.md; memory
  `cashy-loan-redesign`.
- **Chi tiết:** docs/agentic-workflow/specs/2026-07-23-contact.md

### CASHY-014 — Khoản vay gắn với sổ giao dịch
- **Ngày:** 23/07/2026
- **Phạm vi:** cashy/src/domain/loan.ts, cashy/src/domain/types.ts, cashy/src/usecases/loans.ts,
  cashy/src/ui/features/loans/, cashy/src/data/migrations.ts
- **Nhóm:** dữ liệu
- **Trạng thái:** đang áp dụng
- **Thay cho:** CASHY-012
- **Quyết định:** Mỗi lần giải ngân (cho vay, vay thêm) và mỗi lần trả là một `Transaction` thật mang
  `loanId`, kiểu chuyển khoản: không tính vào thu/chi, chỉ đổi số dư ví; một khoản vay có nhiều lần
  giải ngân và nhiều lần trả. `outstanding`, `paid` và tiến độ suy ra từ sổ giao dịch, không lưu —
  bỏ `loan.payments[]` và `principal` lưu cứng; không có số âm. Lãi kép theo tháng trên dư nợ giảm
  dần, một mức lãi; `owed` là hàm thuần suy ra khi đọc — không bao giờ ghi một giao dịch tiền lãi,
  không lưu trường `owed`. Tự tất toán là một trạng thái suy ra, đã đạt thì giữ: không ghi gì, và
  ngừng tính lãi khi số đã nhận ≥ số nợ tại một mốc kỳ. Khoản vay trỏ tới Contact bằng `id`.
  Migration v10: khoản vay hiện có là dữ liệu mẫu — xoá và gieo lại theo mô hình mới.
- **Vì sao:** thống nhất với chủ repo qua một vòng discovery. Chủ repo ban đầu muốn lưu `owed` và
  ghi lại mỗi lần mở; hai bên chốt suy ra khi đọc — cùng trải nghiệm, không có gì để lệch.
- **Đừng:** làm một nửa — thêm `loanId` hay `Loan.contactId` lẻ ngoài một slice đầy đủ (CLAUDE.md
  §8, bất biến 10). Năm câu còn mở phải chốt ở đầu spec của slice B, không tự chọn: quy tắc làm
  tròn VND và thứ tự tính (ví dụ của chủ repo: 100 → trả 20 → còn 80 → ×1,10 = 88); mốc tính lãi
  khi có nhiều lần giải ngân; xử lý trả dư; mẫu số của phần trăm tiến độ khi đã có lãi; có ngừng
  tính lãi khi lưu trữ khoản vay không.
- **Nguồn:** phiên discovery 23/07/2026; cashy/docs/agentic-workflow/README.md, mục *Slice B*;
  memory `cashy-loan-redesign`.
- **Chi tiết:** docs/agentic-workflow/README.md

Chưa làm — slice B chưa bắt đầu. Tới lúc ấy code, CLAUDE.md §8 bất biến 9 và
`docs/features/loans.md` vẫn mô tả mô hình của CASHY-012.

### CASHY-015 — Dashboard có bộ chọn gộp số liệu: chi tiêu / + gói định kỳ / + khoản vay
- **Ngày:** 23/07/2026
- **Phạm vi:** cashy/src/ui/features/dashboard/, cashy/src/domain/analytics.ts
- **Nhóm:** dữ liệu
- **Trạng thái:** đang áp dụng
- **Quyết định:** Dashboard có bộ lọc chọn nhiều cho số liệu tổng hợp: chi tiêu thuần, cộng gói định
  kỳ, cộng khoản vay. Mặc định là chi tiêu + gói định kỳ; khoản vay tắt. Đây là slice C, chưa làm.
- **Nguồn:** phiên discovery 23/07/2026; cashy/docs/agentic-workflow/README.md, mục *Slice C*;
  memory `cashy-loan-redesign`.

### CASHY-016 — Kiến trúc: UI tách khỏi logic, lớp truy vấn dữ liệu sẵn cho backend, module theo tính năng
- **Ngày:** 23/07/2026
- **Phạm vi:** cashy/src/
- **Nhóm:** cấu trúc
- **Trạng thái:** đang áp dụng
- **Quyết định:** Tách chặt giao diện khỏi logic; một lớp truy vấn dữ liệu che đi chuyện dữ liệu nằm
  ở máy hay ở backend; chia module con theo tính năng (gói định kỳ, khoản vay, giao dịch…). Lớp
  truy vấn thiết kế sẵn cho backend nhưng không nối backend nào — Cashy vẫn 100% `localStorage`.
- **Vì sao:** chỉ đạo kiến trúc của chủ repo khi mở chương trình thiết kế lại khoản vay; phần lớn
  khớp với tầng `ui → usecases → domain (+ data)` sẵn có.
- **Nguồn:** memory `cashy-loan-redesign`; cashy/docs/agentic-workflow/README.md
  (*"Carry the architecture directive…"*).

### CASHY-017 — Tài liệu nghiệp vụ phải đủ, và mỗi tài liệu một tính năng
- **Ngày:** 23/07/2026
- **Phạm vi:** cashy/docs/
- **Nhóm:** quy trình
- **Trạng thái:** đang áp dụng
- **Quyết định:** Tài liệu nghiệp vụ phải đầy đủ. Mỗi spec một tính năng; không gộp những tính năng
  nằm ở màn hình khác nhau; tính năng liên quan mật thiết thì được chung. Việc nhiều tính năng thì
  chia thành các lát dọc, mỗi lát một vòng spec. Tài liệu co lại bằng cách viết mỏng hơn, không
  bằng cách bỏ business rule.
- **Vì sao:** nguyên văn *"tài liệu business phải đầy đủ"*, *"nếu liên quan mật thiết thì được"*;
  tách theo tính năng khớp với cách code tách module.
- **Nguồn:** memory `spec-per-feature-separation`; cách chia slice A/B/C ở
  cashy/docs/agentic-workflow/README.md.

### CASHY-018 — Ký hiệu tiền là ₫ trên toàn ứng dụng
- **Ngày:** 24/07/2026
- **Phạm vi:** cashy/src/domain/money.ts, cashy/src/ui/
- **Nhóm:** giao diện
- **Trạng thái:** đang áp dụng
- **Quyết định:** Dùng ký hiệu đồng `₫` (U+20AB) trên toàn web app thay cho chữ `đ`, và chỉ qua
  `domain/money` (`formatMoney` / `formatMoneyShort` / `formatMoneyAxis`).
- **Nguồn:** cashy/docs/PLAN.md §0 (*"Owner confirmed all decisions in §0"*); commit 76e20ea.
- **Chi tiết:** docs/PLAN.md

### CASHY-019 — Lọc và sắp gói định kỳ ở cả hai nơi; thanh lọc chỉ hiện khi quá 6 gói
- **Ngày:** 24/07/2026
- **Phạm vi:** cashy/src/ui/features/subscriptions/, cashy/src/ui/features/dashboard/,
  cashy/src/domain/subscription.ts
- **Nhóm:** giao diện
- **Trạng thái:** đang áp dụng
- **Quyết định:** Bộ lọc, sắp xếp theo trạng thái và thanh tiến độ dùng thử có ở cả màn
  `#/subscriptions` lẫn dải gói định kỳ ở Overview, qua các bộ phận dùng chung. Thanh lọc chỉ hiện
  khi có hơn 6 gói.
- **Nguồn:** cashy/docs/PLAN.md §0 và mục 1 (*"owner's rule"*); commit 76e20ea.
- **Chi tiết:** docs/PLAN.md

### CASHY-020 — Bản web có spec riêng; hai tài liệu tầm nhìn iOS để nguyên
- **Ngày:** 24/07/2026
- **Phạm vi:** cashy/docs/cashy-web-spec.md, cashy/docs/cashy-vision.md, cashy/docs/cashy-v1-spec.md
- **Nhóm:** quy trình
- **Trạng thái:** đang áp dụng
- **Quyết định:** Bản web React có tài liệu riêng `docs/cashy-web-spec.md`. Hai tài liệu tầm nhìn viết
  cho bản iOS (`cashy-vision.md`, `cashy-v1-spec.md`) để nguyên.
- **Đừng:** sửa hai tài liệu tầm nhìn cho khớp bản web — khác biệt ghi vào `cashy-web-spec.md`.
- **Nguồn:** cashy/docs/PLAN.md §0; commit 376bd16.
- **Chi tiết:** docs/PLAN.md

### CASHY-021 — Hai gallery dev ở lại trong bản build
- **Ngày:** 24/07/2026
- **Phạm vi:** cashy/src/ui/dev/
- **Nhóm:** xuất bản
- **Trạng thái:** đang áp dụng
- **Quyết định:** Hai gallery `#/cashy` và `#/wb` vẫn nằm trong `dist/` như hiện tại — tách chunk, có
  chặn DEV, khoảng 5 KB gzip mỗi cái. Không làm gì thêm.
- **Nguồn:** cashy/docs/PLAN.md §0.
- **Chi tiết:** docs/PLAN.md

### CASHY-022 — Màn hình ghép từ bộ kit (lập trường B); chuyển sang kit không được đổi giao diện
- **Ngày:** 24/07/2026
- **Phạm vi:** cashy/src/ui/
- **Nhóm:** cấu trúc
- **Trạng thái:** đang áp dụng
- **Quyết định:** `ui/kit/` là hệ thành phần thật: màn hình ghép từ `<Button>`, `<Card>`, `<Capsule>`,
  `<Input>`… thay vì viết tay markup `wb-*`. Mọi lượt chuyển sang kit phải cho ra đúng DOM và class
  như trước — không đổi giao diện.
- **Vì sao:** đợt rà ngày ấy thấy màn hình viết tay các class `wb-*` còn phần lớn kit chỉ sống trong
  gallery. Chủ repo chọn lập trường B, và nhấn mạnh ràng buộc không đổi giao diện.
- **Đừng:** gộp một thay đổi giao diện vào một lượt chuyển sang kit.
- **Nguồn:** memory `cashy-kit-adoption-refactor`, `cashy-ui-reuse-reality`; commit f402457 … a09f242.

### CASHY-023 — Ba tầng thành phần; bảng và thẻ nghiệp vụ ở tầng giữa, không gộp vào kit
- **Ngày:** 24/07/2026
- **Phạm vi:** cashy/src/ui/
- **Nhóm:** cấu trúc
- **Trạng thái:** đang áp dụng
- **Quyết định:** Ba tầng, mỗi tầng một việc: primitive của kit (từ vựng chung) → thành phần riêng
  của tính năng (ghép primitive, gói phần hiển thị nghiệp vụ) → file vào của tính năng (chỉ lắp ráp
  và nối dây). `TransactionTable` và `BalanceCard` ở tầng giữa, không tổng quát hoá thành
  `kit/Table` hay `kit/Stat`.
- **Vì sao:** triết lý ba tầng của chủ repo, dùng để gỡ xung đột Table/Stat trong đợt chuyển sang kit.
- **Nguồn:** memory `cashy-kit-adoption-refactor`; CLAUDE.md §7 (*Composition rule*).

### CASHY-024 — Không đồng bộ bản web-builder.css của Cashy với web-builder/ ở gốc
- **Ngày:** 24/07/2026
- **Phạm vi:** cashy/src/styles/web-builder.css
- **Nhóm:** cấu trúc
- **Trạng thái:** đang áp dụng
- **Quyết định:** `cashy/src/styles/web-builder.css` là bản riêng của Cashy, đã rẽ khỏi `web-builder/`
  ở gốc repo. Không đồng bộ lại.
- **Đừng:** chép đè từ `web-builder/web-builder.css`, dù comment trong `wb-theme.css` và `index.css`
  còn nói "re-sync upstream". Tinh chỉnh của Cashy vẫn đặt ở `wb-theme.css` (token) và `index.css`
  (class `cashy-*`), không sửa thẳng file vendored.
- **Nguồn:** memory `cashy-ui-reuse-reality` (máy chủ repo).
