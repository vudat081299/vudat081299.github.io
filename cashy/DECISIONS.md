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

Nền trắng–đen–xám; màu chỉ mang nghĩa trạng thái: thu xanh lá, chi và nguy hiểm đỏ, cảnh báo hổ phách, thông tin
xanh dương. Tránh vẻ SaaS fintech: số mono sặc sỡ, nhãn in hoa giãn chữ, màu neon, thanh màu trên thẻ KPI, bóng đổ nặng;
nút hành động chính đơn sắc. Tham chiếu thị giác là Notion, nhưng gu này thực thi bằng token của web-builder (CASHY-004),
không bằng mã màu Notion viết tay.

## CASHY-004 · Dựng lại toàn bộ giao diện trên web-builder, trung tính chủ đạo
20/07/2026 · `cashy/src/ui/`, `cashy/src/styles/`, `cashy/src/index.css` · thay cho CASHY-002, CASHY-003

Dựng lại toàn bộ UI trên web-builder: trung tính chủ đạo, cộng các màu trạng thái. Bỏ hẳn shadcn/Radix; modal,
popover, toast là primitive tự viết, mỏng. Đừng đưa lại thanh điều hướng tối hay mã màu Notion viết tay mà không hỏi.

## CASHY-005 · Giữ React, bỏ Tailwind
20/07/2026 · `cashy/package.json`, `cashy/src/`

Giữ React vì store phản ứng, Recharts và cây kéo thả; bỏ Tailwind vì web-builder là CSS thuần. Đừng thêm lại
Tailwind hay shadcn.

## CASHY-006 · Luôn dùng thành phần của web-builder; bộ không có thì ghép từ primitive của nó
20/07/2026 · `cashy/src/ui/`

Luôn dùng một thành phần của web-builder; bộ không có thì ghép từ primitive của nó. Giữ nguyên logic, chỉ làm bố cục
cho hài hoà.

## CASHY-007 · Dấu nhận diện trung tính, không cho chọn màu
20/07/2026 · `cashy/src/ui/app/Layout.tsx`, `cashy/src/ui/features/onboarding/`, `cashy/src/ui/features/settings/`

Dấu nhận diện là ô `.wb-navbar__mark` trung tính: nền đen chữ trắng ở nền sáng, tự đảo ở nền tối. Không có chỗ
nào cho người dùng chọn màu nhận diện.

## CASHY-008 · Gói năm đổi tháng thanh toán: giữ lịch sử, dựng lại lưới kỳ từ ngày mới
22/07/2026 · `cashy/src/domain/subscription.ts`, `cashy/src/usecases/subscriptions.ts`

Giữ lịch sử thanh toán và dựng lại lưới kỳ từ ngày mới; kỳ bù đầu tiên tính đủ tiền dù ngắn hơn một kỳ thường.
Không chặn việc sửa khi đã có lịch sử.

## CASHY-009 · Hàng giao dịch không có nút xoá; xoá nằm trong trình sửa
22/07/2026 · `cashy/src/ui/features/transactions/`

Bảng giao dịch không có nút xoá trên từng hàng; nút Sửa luôn hiện; xoá nằm trong trình sửa.

## CASHY-011 · Khung giao diện toàn tiếng Anh; dữ liệu mẫu giữ tiếng Việt
23/07/2026 · `cashy/src/ui/`, `cashy/src/domain/date.ts`, `cashy/src/domain/money.ts`, `cashy/src/data/sample.ts`, `cashy/src/data/seed.ts` · thay cho CASHY-010

Toàn bộ khung giao diện bằng tiếng Anh, kể cả nhãn ngày của biểu đồ. Dữ liệu mẫu (bên giao dịch, ghi chú, tên
danh mục) và hai gallery dev giữ tiếng Việt. Tiền rút gọn dùng `k` / `m` / `b` với dấu thập phân kiểu Việt (`3,4m`).

## CASHY-013 · Danh bạ (Contact) là thực thể hạng nhất
23/07/2026 · `cashy/src/domain/contact.ts`, `cashy/src/usecases/contacts.ts`, `cashy/src/ui/features/contacts/`, `cashy/src/data/migrations.ts`

Người mình cho vay hay vay của là một thực thể riêng `{id, name, username?, …}`; khoản vay trỏ tới bằng `id` và
hiện tên. Đây là slice A của CASHY-014, đã xong với migration v9. Chi tiết: `docs/agentic-workflow/specs/2026-07-23-contact.md`.

## CASHY-014 · Khoản vay gắn với sổ giao dịch
23/07/2026 · `cashy/src/domain/loan.ts`, `cashy/src/domain/types.ts`, `cashy/src/usecases/loans.ts`, `cashy/src/ui/features/loans/`, `cashy/src/data/migrations.ts` · thay cho CASHY-012

Mỗi lần giải ngân (cho vay, vay thêm) và mỗi lần trả là một `Transaction` thật mang `loanId`, kiểu chuyển khoản:
không tính vào thu/chi, chỉ đổi số dư ví; dư nợ, số đã trả và tiến độ suy ra từ sổ, bỏ `loan.payments[]` và `principal`
lưu cứng, không có số âm. Lãi kép theo tháng trên dư nợ giảm dần, một mức lãi; `owed` suy ra khi đọc, không ghi giao
dịch lãi; tự tất toán khi số đã nhận ≥ số nợ tại một mốc kỳ, đã đạt thì giữ; khoản vay trỏ tới Contact bằng `id`;
migration v10 xoá khoản vay mẫu rồi gieo lại. Chưa làm; năm câu còn mở chốt ở đầu spec slice B, không tự chọn: làm tròn
VND và thứ tự tính (100 → trả 20 → 80 → ×1,10 = 88), mốc lãi khi nhiều lần giải ngân, trả dư, mẫu số của tiến độ khi có
lãi, có ngừng lãi khi lưu trữ không.

## CASHY-015 · Dashboard có bộ chọn gộp số liệu: chi tiêu / + gói định kỳ / + khoản vay
23/07/2026 · `cashy/src/ui/features/dashboard/`, `cashy/src/domain/analytics.ts`

Dashboard có bộ lọc chọn nhiều cho số liệu tổng hợp: chi tiêu thuần, cộng gói định kỳ, cộng khoản vay; mặc định
là chi tiêu cộng gói định kỳ. Đây là slice C, chưa làm.

## CASHY-016 · Kiến trúc: UI tách khỏi logic, lớp truy vấn dữ liệu sẵn cho backend, module theo tính năng
23/07/2026 · `cashy/src/`

Tách chặt giao diện khỏi logic; một lớp truy vấn dữ liệu che chuyện dữ liệu nằm ở máy hay ở backend; module con
theo tính năng. Lớp ấy sẵn cho backend nhưng không nối backend nào: Cashy vẫn 100% `localStorage`.

## CASHY-017 · Tài liệu nghiệp vụ phải đủ, và mỗi tài liệu một tính năng
23/07/2026 · `cashy/docs/`

Tài liệu nghiệp vụ phải đầy đủ. Mỗi spec một tính năng; tính năng ở màn khác nhau không gộp, tính năng liên quan
mật thiết thì được chung; việc nhiều tính năng chia thành lát dọc, mỗi lát một vòng spec. Tài liệu co lại bằng cách viết
mỏng hơn, không bằng cách bỏ business rule.

## CASHY-018 · Ký hiệu tiền là ₫ trên toàn ứng dụng
24/07/2026 · `cashy/src/domain/money.ts`, `cashy/src/ui/`

Dùng `₫` (U+20AB) thay cho chữ `đ` trên toàn web app, chỉ qua `domain/money` (`formatMoney`, `formatMoneyShort`,
`formatMoneyAxis`). Chi tiết: `docs/PLAN.md`.

## CASHY-019 · Lọc và sắp gói định kỳ ở cả hai nơi; thanh lọc chỉ hiện khi quá 6 gói
24/07/2026 · `cashy/src/ui/features/subscriptions/`, `cashy/src/ui/features/dashboard/`, `cashy/src/domain/subscription.ts`

Bộ lọc, sắp xếp theo trạng thái và thanh tiến độ dùng thử có ở cả `#/subscriptions` lẫn dải gói định kỳ ở
Overview, qua bộ phận dùng chung. Thanh lọc chỉ hiện khi có hơn 6 gói. Chi tiết: `docs/PLAN.md`.

## CASHY-020 · Bản web có spec riêng; hai tài liệu tầm nhìn iOS để nguyên
24/07/2026 · `cashy/docs/cashy-web-spec.md`, `cashy/docs/cashy-vision.md`, `cashy/docs/cashy-v1-spec.md`

Bản web React có tài liệu riêng `docs/cashy-web-spec.md`. Hai tài liệu tầm nhìn viết cho iOS (`cashy-vision.md`,
`cashy-v1-spec.md`) để nguyên; khác biệt ghi vào `cashy-web-spec.md`.

## CASHY-021 · Hai gallery dev ở lại trong bản build
24/07/2026 · `cashy/src/ui/dev/`

Hai gallery `#/cashy` và `#/wb` vẫn nằm trong `dist/`: tách chunk, có chặn DEV, khoảng 5 KB gzip mỗi cái.
Không làm gì thêm.

## CASHY-022 · Màn hình ghép từ bộ kit (lập trường B); chuyển sang kit không được đổi giao diện
24/07/2026 · `cashy/src/ui/`

`ui/kit/` là hệ thành phần thật: màn hình ghép từ `<Button>`, `<Card>`, `<Capsule>`, `<Input>`… thay vì viết tay
markup `wb-*`. Mọi lượt chuyển sang kit cho ra đúng DOM và class như trước; đừng gộp một thay đổi giao diện vào đó.

## CASHY-023 · Ba tầng thành phần; bảng và thẻ nghiệp vụ ở tầng giữa, không gộp vào kit
24/07/2026 · `cashy/src/ui/`

Ba tầng, mỗi tầng một việc: primitive của kit, thành phần riêng của tính năng (ghép primitive, gói phần hiển thị
nghiệp vụ), file vào của tính năng (chỉ lắp ráp và nối dây). `TransactionTable` và `BalanceCard` ở tầng giữa, không tổng
quát hoá thành `kit/Table` hay `kit/Stat`.

## CASHY-024 · Không đồng bộ bản web-builder.css của Cashy với web-builder/ ở gốc
24/07/2026 · `cashy/src/styles/web-builder.css`

`cashy/src/styles/web-builder.css` là bản riêng đã rẽ khỏi `web-builder/` ở gốc; không chép đè, dù comment trong
`wb-theme.css` và `index.css` còn nói "re-sync upstream". Tinh chỉnh đặt ở `wb-theme.css` (token) và `index.css` (class
`cashy-*`).
