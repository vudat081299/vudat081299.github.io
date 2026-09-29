# Quyết định — cashy/

<!-- index:start -->
- CASHY-001 · Gu giao diện: trung tính trước, không neon, không vẻ "fintech"; màu là trạng thái · `cashy/src/ui/`, `cashy/src/index.css`, `cashy/src/styles/`
- CASHY-004 · Dựng lại toàn bộ giao diện trên web-builder, trung tính chủ đạo · `cashy/src/ui/`, `cashy/src/styles/`, `cashy/src/index.css`
- CASHY-005 · Giữ React, bỏ Tailwind · `cashy/package.json`, `cashy/src/`
- CASHY-006 · Luôn dùng thành phần của web-builder; bộ không có thì ghép từ primitive của nó · `cashy/src/ui/`
- CASHY-007 · Dấu nhận diện trung tính, không cho chọn màu · `cashy/src/ui/app/Layout.tsx`, `cashy/src/ui/features/onboarding/`, `cashy/src/ui/features/settings/`
- CASHY-008 · Gói năm đổi tháng thanh toán: giữ lịch sử, dựng lại lưới kỳ từ ngày mới · `cashy/src/domain/subscription.ts`, `cashy/src/usecases/subscriptions.ts`
- CASHY-009 · Hàng giao dịch không có nút xoá; xoá nằm trong trình sửa · `cashy/src/ui/features/transactions/`
- CASHY-011 · Khung giao diện toàn tiếng Anh; dữ liệu mẫu giữ tiếng Việt · `cashy/src/ui/`, `cashy/src/domain/date.ts`, `cashy/src/domain/money.ts`, `cashy/src/data/sample.ts`, `cashy/src/data/seed.ts`
- CASHY-013 · Danh bạ (Contact) là thực thể hạng nhất · `cashy/src/domain/contact.ts`, `cashy/src/usecases/contacts.ts`, `cashy/src/ui/features/contacts/`, `cashy/src/data/migrations.ts`
- CASHY-014 · Khoản vay gắn với sổ giao dịch · `cashy/src/domain/loan.ts`, `cashy/src/domain/types.ts`, `cashy/src/usecases/loans.ts`, `cashy/src/ui/features/loans/`, `cashy/src/data/migrations.ts`
- CASHY-015 · Dashboard có bộ chọn gộp số liệu: chi tiêu / + gói định kỳ / + khoản vay · `cashy/src/ui/features/dashboard/`, `cashy/src/domain/analytics.ts`
- CASHY-016 · Kiến trúc: UI tách khỏi logic, lớp truy vấn dữ liệu sẵn cho backend, module theo tính năng · `cashy/src/`
- CASHY-017 · Tài liệu nghiệp vụ phải đủ, và mỗi tài liệu một tính năng · `cashy/docs/`
- CASHY-018 · Ký hiệu tiền là ₫ trên toàn ứng dụng · `cashy/src/domain/money.ts`, `cashy/src/ui/`
- CASHY-019 · Lọc và sắp gói định kỳ ở cả hai nơi; thanh lọc chỉ hiện khi quá 6 gói · `cashy/src/ui/features/subscriptions/`, `cashy/src/ui/features/dashboard/`, `cashy/src/domain/subscription.ts`
- CASHY-020 · Bản web có spec riêng; hai tài liệu tầm nhìn iOS để nguyên · `cashy/docs/cashy-web-spec.md`, `cashy/docs/cashy-vision.md`, `cashy/docs/cashy-v1-spec.md`
- CASHY-021 · Hai gallery dev ở lại trong bản build · `cashy/src/ui/dev/`
- CASHY-022 · Màn hình ghép từ bộ kit (lập trường B); chuyển sang kit không được đổi giao diện · `cashy/src/ui/`
- CASHY-023 · Ba tầng thành phần; bảng và thẻ nghiệp vụ ở tầng giữa, không gộp vào kit · `cashy/src/ui/`
- CASHY-024 · Không đồng bộ bản web-builder.css của Cashy với web-builder/ ở gốc · `cashy/src/styles/web-builder.css`
<!-- index:end -->

## CASHY-001 · Gu giao diện: trung tính trước, không neon, không vẻ "fintech"; màu là trạng thái
07/2026 · `cashy/src/ui/`, `cashy/src/index.css`, `cashy/src/styles/`

Nền là trắng–đen–xám; màu chỉ mang nghĩa trạng thái (thu xanh lá, chi/nguy hiểm đỏ, cảnh báo hổ phách, thông tin xanh dương), không dùng để trang trí. Tránh vẻ "SaaS fintech": số mono sặc sỡ, nhãn in hoa giãn chữ, màu neon/cyan, thanh màu trên thẻ KPI, bóng đổ nặng. Nút hành động chính đơn sắc, không xanh dương.
Vì: tham chiếu thị giác của chủ repo là Notion. Mỗi lần giao diện trôi sang vẻ dashboard fintech, chủ repo phản ứng mạnh — ba vòng liền (*"design xấu quá"*, *"chưa giống Notion"*) — và cuối cùng tự gửi trang Notion lưu sẵn làm mẫu.
Đừng đưa lại mã màu và bo góc Notion viết tay (`#37352f`, 4px) đè lên hệ `--wb-*`: gu này nay được thực thi bằng token của web-builder (CASHY-004).

## CASHY-004 · Dựng lại toàn bộ giao diện trên web-builder, trung tính chủ đạo
20/07/2026 · `cashy/src/ui/`, `cashy/src/styles/`, `cashy/src/index.css` · thay cho CASHY-002, CASHY-003

*"Đập đi xây lại toàn bộ UI"* trên thư viện web-builder, màu trung tính chủ đạo cộng các màu trạng thái dành riêng. Bỏ hẳn lớp hành vi shadcn/Radix — chủ repo chọn *"thuần wb + JS tối giản"*: modal, popover, toast… là các primitive tự viết, mỏng.
Đừng đưa lại thanh điều hướng tối, hay mã màu Notion viết tay đè lên hệ `wb-*`, mà không hỏi.
Nguồn: e8af781, 76ba97b

## CASHY-005 · Giữ React, bỏ Tailwind
20/07/2026 · `cashy/package.json`, `cashy/src/`

Giữ React — store phản ứng, Recharts và cây kéo thả đáng giá của nó. Bỏ Tailwind: web-builder là CSS thuần nên React dùng lại được trọn, chỉ khác `class` thành `className`.
Vì: sau khi được giải thích React so với trang tĩnh, chủ repo xác nhận *"giữ React, bỏ Tailwind"*.
Đừng thêm lại Tailwind hay shadcn.
Nguồn: fb35aaf, 66fe8f1

## CASHY-006 · Luôn dùng thành phần của web-builder; bộ không có thì ghép từ primitive của nó
20/07/2026 · `cashy/src/ui/`

Luôn dùng một thành phần của web-builder; bộ không có thì ghép từ primitive của nó. Giữ nguyên logic, chỉ làm bố cục cho hài hoà.
Vì: luật chủ repo đặt khi giao cho agent tự trả lời sáu câu hỏi của đợt dựng lại.
Nguồn: 153ee5e

## CASHY-007 · Dấu nhận diện trung tính, không cho chọn màu
20/07/2026 · `cashy/src/ui/app/Layout.tsx`, `cashy/src/ui/features/onboarding/`, `cashy/src/ui/features/settings/`

Dấu nhận diện của Cashy là ô `.wb-navbar__mark` trung tính (nền đen chữ trắng ở nền sáng, tự đảo ở nền tối). Không có chỗ nào cho người dùng chọn màu nhận diện.
Vì: yêu cầu *"đưa về neutral hết"*.
Nguồn: cd1647e

## CASHY-008 · Gói năm đổi tháng thanh toán: giữ lịch sử, dựng lại lưới kỳ từ ngày mới
22/07/2026 · `cashy/src/domain/subscription.ts`, `cashy/src/usecases/subscriptions.ts`

Phương án A: giữ lịch sử thanh toán và dựng lại lưới kỳ từ ngày mới; kỳ bù đầu tiên tính đủ tiền dù ngắn hơn một kỳ thường. Không chặn việc sửa khi đã có lịch sử (phương án B).
Nguồn: 2b5b999

## CASHY-009 · Hàng giao dịch không có nút xoá; xoá nằm trong trình sửa
22/07/2026 · `cashy/src/ui/features/transactions/`

Bảng giao dịch không có nút xoá trên từng hàng; nút Sửa luôn hiện; xoá nằm trong trình sửa.
Nguồn: f689fef

## CASHY-011 · Khung giao diện toàn tiếng Anh; dữ liệu mẫu giữ tiếng Việt
23/07/2026 · `cashy/src/ui/`, `cashy/src/domain/date.ts`, `cashy/src/domain/money.ts`, `cashy/src/data/sample.ts`, `cashy/src/data/seed.ts` · thay cho CASHY-010

Toàn bộ khung giao diện bằng tiếng Anh, kể cả nhãn ngày của biểu đồ trên cả app. Dữ liệu mẫu (bên giao dịch, ghi chú, tên danh mục) và hai gallery dev giữ tiếng Việt. Tiền rút gọn dùng chữ cái `k` / `m` / `b` với dấu thập phân kiểu Việt (`3,4m`).
Vì: câu hỏi mở "dịch tới đâu" — (a) cả app kể cả ngày, hay (b) dừng ở Overview — được chốt theo (a).
Nguồn: e3f8658, 018a392

## CASHY-013 · Danh bạ (Contact) là thực thể hạng nhất
23/07/2026 · `cashy/src/domain/contact.ts`, `cashy/src/usecases/contacts.ts`, `cashy/src/ui/features/contacts/`, `cashy/src/data/migrations.ts`

Người mình cho vay hay vay của là một thực thể riêng `{id, name, username?, …}` (chủ repo gọi nó là "User"); khoản vay trỏ tới bằng `id` và hiện tên. Đây là slice A của chương trình thiết kế lại khoản vay (CASHY-014) — đã làm xong, migration v9.
Chi tiết: docs/agentic-workflow/specs/2026-07-23-contact.md

## CASHY-014 · Khoản vay gắn với sổ giao dịch
23/07/2026 · `cashy/src/domain/loan.ts`, `cashy/src/domain/types.ts`, `cashy/src/usecases/loans.ts`, `cashy/src/ui/features/loans/`, `cashy/src/data/migrations.ts` · thay cho CASHY-012

Mỗi lần giải ngân (cho vay, vay thêm) và mỗi lần trả là một `Transaction` thật mang `loanId`, kiểu chuyển khoản: không tính vào thu/chi, chỉ đổi số dư ví; một khoản vay có nhiều lần giải ngân và nhiều lần trả. `outstanding`, `paid` và tiến độ suy ra từ sổ giao dịch, không lưu — bỏ `loan.payments[]` và `principal` lưu cứng; không có số âm. Lãi kép theo tháng trên dư nợ giảm dần, một mức lãi; `owed` là hàm thuần suy ra khi đọc — không bao giờ ghi một giao dịch tiền lãi, không lưu trường `owed`. Tự tất toán là một trạng thái suy ra, đã đạt thì giữ: không ghi gì, và ngừng tính lãi khi số đã nhận ≥ số nợ tại một mốc kỳ. Khoản vay trỏ tới Contact bằng `id`. Migration v10: khoản vay hiện có là dữ liệu mẫu — xoá và gieo lại theo mô hình mới.
Vì: thống nhất với chủ repo qua một vòng discovery. Chủ repo ban đầu muốn lưu `owed` và ghi lại mỗi lần mở; hai bên chốt suy ra khi đọc — cùng trải nghiệm, không có gì để lệch.
Đừng làm một nửa — thêm `loanId` hay `Loan.contactId` lẻ ngoài một slice đầy đủ (CLAUDE.md §8, bất biến 10). Năm câu còn mở phải chốt ở đầu spec của slice B, không tự chọn: quy tắc làm tròn VND và thứ tự tính (ví dụ của chủ repo: 100 → trả 20 → còn 80 → ×1,10 = 88); mốc tính lãi khi có nhiều lần giải ngân; xử lý trả dư; mẫu số của phần trăm tiến độ khi đã có lãi; có ngừng tính lãi khi lưu trữ khoản vay không.
Chi tiết: docs/agentic-workflow/README.md

Chưa làm — slice B chưa bắt đầu. Tới lúc ấy code, CLAUDE.md §8 bất biến 9 và
`docs/features/loans.md` vẫn mô tả mô hình của CASHY-012.

## CASHY-015 · Dashboard có bộ chọn gộp số liệu: chi tiêu / + gói định kỳ / + khoản vay
23/07/2026 · `cashy/src/ui/features/dashboard/`, `cashy/src/domain/analytics.ts`

Dashboard có bộ lọc chọn nhiều cho số liệu tổng hợp: chi tiêu thuần, cộng gói định kỳ, cộng khoản vay. Mặc định là chi tiêu + gói định kỳ; khoản vay tắt. Đây là slice C, chưa làm.

## CASHY-016 · Kiến trúc: UI tách khỏi logic, lớp truy vấn dữ liệu sẵn cho backend, module theo tính năng
23/07/2026 · `cashy/src/`

Tách chặt giao diện khỏi logic; một lớp truy vấn dữ liệu che đi chuyện dữ liệu nằm ở máy hay ở backend; chia module con theo tính năng (gói định kỳ, khoản vay, giao dịch…). Lớp truy vấn thiết kế sẵn cho backend nhưng không nối backend nào — Cashy vẫn 100% `localStorage`.
Vì: chỉ đạo kiến trúc của chủ repo khi mở chương trình thiết kế lại khoản vay; phần lớn khớp với tầng `ui → usecases → domain (+ data)` sẵn có.

## CASHY-017 · Tài liệu nghiệp vụ phải đủ, và mỗi tài liệu một tính năng
23/07/2026 · `cashy/docs/`

Tài liệu nghiệp vụ phải đầy đủ. Mỗi spec một tính năng; không gộp những tính năng nằm ở màn hình khác nhau; tính năng liên quan mật thiết thì được chung. Việc nhiều tính năng thì chia thành các lát dọc, mỗi lát một vòng spec. Tài liệu co lại bằng cách viết mỏng hơn, không bằng cách bỏ business rule.
Vì: nguyên văn *"tài liệu business phải đầy đủ"*, *"nếu liên quan mật thiết thì được"*; tách theo tính năng khớp với cách code tách module.

## CASHY-018 · Ký hiệu tiền là ₫ trên toàn ứng dụng
24/07/2026 · `cashy/src/domain/money.ts`, `cashy/src/ui/`

Dùng ký hiệu đồng `₫` (U+20AB) trên toàn web app thay cho chữ `đ`, và chỉ qua `domain/money` (`formatMoney` / `formatMoneyShort` / `formatMoneyAxis`).
Chi tiết: docs/PLAN.md
Nguồn: 76e20ea

## CASHY-019 · Lọc và sắp gói định kỳ ở cả hai nơi; thanh lọc chỉ hiện khi quá 6 gói
24/07/2026 · `cashy/src/ui/features/subscriptions/`, `cashy/src/ui/features/dashboard/`, `cashy/src/domain/subscription.ts`

Bộ lọc, sắp xếp theo trạng thái và thanh tiến độ dùng thử có ở cả màn `#/subscriptions` lẫn dải gói định kỳ ở Overview, qua các bộ phận dùng chung. Thanh lọc chỉ hiện khi có hơn 6 gói.
Chi tiết: docs/PLAN.md
Nguồn: 76e20ea

## CASHY-020 · Bản web có spec riêng; hai tài liệu tầm nhìn iOS để nguyên
24/07/2026 · `cashy/docs/cashy-web-spec.md`, `cashy/docs/cashy-vision.md`, `cashy/docs/cashy-v1-spec.md`

Bản web React có tài liệu riêng `docs/cashy-web-spec.md`. Hai tài liệu tầm nhìn viết cho bản iOS (`cashy-vision.md`, `cashy-v1-spec.md`) để nguyên.
Đừng sửa hai tài liệu tầm nhìn cho khớp bản web — khác biệt ghi vào `cashy-web-spec.md`.
Chi tiết: docs/PLAN.md
Nguồn: 376bd16

## CASHY-021 · Hai gallery dev ở lại trong bản build
24/07/2026 · `cashy/src/ui/dev/`

Hai gallery `#/cashy` và `#/wb` vẫn nằm trong `dist/` như hiện tại — tách chunk, có chặn DEV, khoảng 5 KB gzip mỗi cái. Không làm gì thêm.
Chi tiết: docs/PLAN.md

## CASHY-022 · Màn hình ghép từ bộ kit (lập trường B); chuyển sang kit không được đổi giao diện
24/07/2026 · `cashy/src/ui/`

`ui/kit/` là hệ thành phần thật: màn hình ghép từ `<Button>`, `<Card>`, `<Capsule>`, `<Input>`… thay vì viết tay markup `wb-*`. Mọi lượt chuyển sang kit phải cho ra đúng DOM và class như trước — không đổi giao diện.
Vì: đợt rà ngày ấy thấy màn hình viết tay các class `wb-*` còn phần lớn kit chỉ sống trong gallery. Chủ repo chọn lập trường B, và nhấn mạnh ràng buộc không đổi giao diện.
Đừng gộp một thay đổi giao diện vào một lượt chuyển sang kit.
Nguồn: f402457, a09f242

## CASHY-023 · Ba tầng thành phần; bảng và thẻ nghiệp vụ ở tầng giữa, không gộp vào kit
24/07/2026 · `cashy/src/ui/`

Ba tầng, mỗi tầng một việc: primitive của kit (từ vựng chung) → thành phần riêng của tính năng (ghép primitive, gói phần hiển thị nghiệp vụ) → file vào của tính năng (chỉ lắp ráp và nối dây). `TransactionTable` và `BalanceCard` ở tầng giữa, không tổng quát hoá thành `kit/Table` hay `kit/Stat`.
Vì: triết lý ba tầng của chủ repo, dùng để gỡ xung đột Table/Stat trong đợt chuyển sang kit.

## CASHY-024 · Không đồng bộ bản web-builder.css của Cashy với web-builder/ ở gốc
24/07/2026 · `cashy/src/styles/web-builder.css`

`cashy/src/styles/web-builder.css` là bản riêng của Cashy, đã rẽ khỏi `web-builder/` ở gốc repo. Không đồng bộ lại.
Đừng chép đè từ `web-builder/web-builder.css`, dù comment trong `wb-theme.css` và `index.css` còn nói "re-sync upstream". Tinh chỉnh của Cashy vẫn đặt ở `wb-theme.css` (token) và `index.css` (class `cashy-*`), không sửa thẳng file vendored.
