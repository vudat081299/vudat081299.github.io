# Cashy

Sổ chi tiêu cá nhân. Vite + React + TypeScript, không Tailwind — hệ thiết kế là
`src/styles/web-builder.css` (`wb-*`), lớp app là `src/index.css` (`cashy-*`).

Dữ liệu nằm hoàn toàn trong `localStorage` (`cashy_state_v1`), có chuỗi migration
theo `version`. Không server, không tài khoản.

```bash
pnpm install
pnpm dev      # http://localhost:5173
pnpm build
```

## Vài quy ước dễ vấp

**Thứ tự import CSS.** `main.tsx` nạp `index.css` TRƯỚC `web-builder.css`. Nên mọi
override `wb-*` ở lớp app phải tăng specificity (`.wb-btn.cashy-btn--quiet-danger`),
và với `:hover` ở dark còn phải viết rõ nhánh `.dark` — `.dark .wb-btn--ghost:hover`
cũng 0-3-0 và nạp sau.

**Tiền luôn là số nguyên VND.** Không float, không cent.

**Subscription không tự tiêu tiền.** Mỗi kỳ đến hạn nó sinh một transaction
`pending`; chỉ khi user xác nhận nó mới thành `recorded` và mới được tính vào tổng.
`paymentTxIds` / `lastPaidAt` chỉ là cache đọc lại từ sổ (`paymentsOf`), không bao
giờ là nguồn sự thật.

**Cycle key luôn là `"YYYY-MM"`** cho cả gói tháng lẫn gói năm — gói năm đơn giản là
mỗi năm chỉ có một key. Nhờ vậy `subMonth`, khoá chống trùng và toàn bộ sổ cũ chạy
được với gói năm mà không cần nhánh code thứ hai.

---

## Câu hỏi đang chờ xác nhận

Ghi ở đây theo yêu cầu. Chưa làm gì trong số này.

### 1. Icon xoá ở dòng giao dịch

Yêu cầu trước: *"không cần để icon xoá đâu, để họ vào edit rồi mới cho phép xoá,
icon xoá để luôn hiện nhé"* — hai vế ngược nhau.

Đang hiểu là: **bỏ nút xoá khỏi dòng, nút EDIT luôn hiện** (không còn ẩn theo
hover), xoá chỉ nằm trong form edit. Nếu ý là giữ cả nút xoá trên dòng thì nói,
tôi trả lại.

### 2. Gói năm — đổi ngày thanh toán giữa chừng

Nếu sửa `monthOfYear` của một gói năm đã trả vài kỳ, lưới chu kỳ dịch đi và
`firstUnpaidCycle` (tính từ `lastPaidAt`) có thể lệch khỏi lưới mới. Hai hướng:

- **A.** Giữ nguyên lịch sử, chu kỳ mới tính từ ngày mới — có thể sinh một kỳ
  ngắn/dài bất thường đúng một lần.
- **B.** Chặn sửa ngày khi đã có lịch sử, bắt tạo gói mới.

Thiên về **A** vì không bắt mất lịch sử. Gói tháng cũng vướng tương tự nhưng nhẹ
hơn nhiều.

### 3. "Mark N paid" nên ghi ngày nào

Bấm *Mark 2 paid* cho gói trễ 2 kỳ: hiện 2 transaction được ghi `recorded` với
**ngày đến hạn của từng kỳ** (05/06 và 05/07), không phải hôm nay. Tức sổ nói "đã
trả đúng hạn cả 2 kỳ".

Nếu thực tế trả gộp cả 2 vào hôm nay thì con số theo tháng nằm sai chỗ. Có nên hỏi
"trả vào ngày nào?" khi catch-up, hay cứ giữ ngày đến hạn?

### 4. Bỏ qua một kỳ (skip)

Store đã có `skipSubscriptionCharge` nhưng **không nút nào gọi tới nó**. Trường hợp
thật: tháng đó không dùng dịch vụ, không trả, cũng không muốn nó nằm mãi ở trạng
thái nợ. Thêm nút *Skip* cạnh *Mark paid* không?

### 5. Bốn màn còn tiếng Việt

Đã dịch sidebar + Overview sang tiếng Anh. Còn **Subscriptions / Categories / Tags
/ Settings** và toàn bộ form (Thêm giao dịch, Thêm đăng ký) vẫn tiếng Việt, nên app
đang lai hai ngôn ngữ. Dịch nốt hay giữ nguyên?

### 6. Giờ giao dịch dùng để làm gì

Giờ đã lưu (`occurredTime`, optional) và hiện ở bảng + chi tiết. Nhưng chưa có gì
**dùng** nó: không sort theo giờ, không lọc, không biểu đồ theo giờ trong ngày.
Định dùng vào việc gì thì nói để làm tiếp cho đúng hướng.

### 7. Padding card subscription = 8px

Đã set đúng 8px như yêu cầu (trước đó head 16/18 · body 18 · foot 14/18). Ở màn
hẹp trông khá sát mép — nếu thấy chật thì 10–12px vẫn giữ được cảm giác gọn.

---

## Phiên 22/07 — làm tự động (Dat đọc sau khi tới công ty)

Batch lớn, làm theo yêu cầu "giải quyết hết, đừng hỏi trong session". Đã commit +
push lên `refactor/componentize-and-confirm`. Chỗ tự quyết + còn mở ghi dưới đây,
KHÔNG cần trả lời gấp — cứ nhắn khi rảnh.

### Đã xử lý xong (gỡ khỏi danh sách chờ ở trên)

- **(4) Skip một kỳ** — giờ có thật: danh sách "Cần xác nhận" có nút *Bỏ qua*
  (kèm Undo toast); catch-up nhiều kỳ là 3 lựa chọn *Trả / Bỏ qua / Để sau* cho
  TỪNG kỳ. Hoàn tác một kỳ đã trả: Undo toast ngay lúc bấm + modal **"Lịch sử"**
  (trên card và ở bảng Đăng ký) để hoàn tác/khôi phục bất kỳ kỳ nào về sau.
- **Nhất quán owed/due** — "cần trả / trễ hạn / suspended" giờ đọc theo charge
  thực tế (pending/recorded/skipped), không còn lệch với danh sách dues khi trả
  kỳ mới mà bỏ kỳ cũ.

### Tự quyết trong phiên này (nói nếu muốn đổi)

1. **Toggle Ngày/Tuần/Tháng của chart Cash flow** chỉ hiện khi khoảng > 30 ngày;
   ẩn khi > 800 ngày (multi-year "All time" tự gom theo NĂM — daily/weekly sẽ ra
   hàng nghìn cột). Mặc định: > 62 ngày mở ở "Tháng", còn lại "Ngày"; reset về
   mặc định mỗi khi đổi khoảng ngày. Legend & toggle đã đổi chỗ (legend trước).
2. **Pie "Spending by category"** — click một lát → lát nhô ra khỏi vành + làm mờ
   các lát khác, tâm donut hiện tên/số tiền/% của lát đó. Danh sách bên cạnh liệt
   kê HẾT category (cuộn nếu dài), click đồng bộ hai chiều với donut. Bỏ chọn khi
   đổi khoảng ngày.
3. **Dialog** — sửa Modal dùng chung thành flex-column: head + foot CỐ ĐỊNH, chỉ
   body cuộn (áp dụng cho MỌI modal, không riêng Thêm giao dịch). Trạng thái là
   capsule mở ra 5 màu để chọn bằng mắt. Ghi chú dùng đúng component `wb Textarea`
   (tự giãn). Số tiền thêm addon "₫", dùng `Field/Input` từ docs.
4. **Kỳ đầu prorated** — công thức: `phần_của_bạn × số_ngày_còn_lại / số_ngày_kỳ`,
   làm tròn đồng. Chỉ hiện toggle khi ngày bắt đầu rơi SAU ngày chốt của kỳ đầu.
   Ô "số tiền kỳ đầu" để trống = dùng gợi ý (placeholder, cập nhật động). Các kỳ
   sau vẫn giá đầy đủ. **Giả định cần xác nhận:** mình prorate cho đoạn
   `[ngày bắt đầu → ngày chốt kế tiếp]`. Nếu dịch vụ của bạn tính khác (từ ngày
   bắt đầu → cuối tháng dương lịch, hay có phí kích hoạt riêng) thì mình chỉnh.

### Gói gia đình — đã làm phần DATA, phần LINK USER còn mở (cần bạn chốt)

Đã lưu đầy đủ & sát thực tế: `fullAmount` (giá cả gói), `members` (số người chia),
`amount` (phần của bạn); nút "Chia đều" set `amount = fullAmount / members`; card
hiện "phần bạn trong gói N người". Data giờ phản ánh đúng thực tế, không còn là con
số 1/N trơ trọi.

Phần "**link user vào gói family để tracing / nhắc đóng tiền**" (bạn nói "về sau")
là feature lớn, CHƯA làm vì nó đụng kiến trúc — cần bạn chốt hướng:

- App hiện **1 người dùng, offline, localStorage, không tài khoản**. "Link nhiều
  user thật" đòi hỏi **(a)** backend + auth (thoát mô hình offline), HOẶC **(b)**
  một "gói dùng chung" cục bộ: bạn là chủ gói, nhập danh sách thành viên (tên +
  phần tiền), app nhắc bạn THU tiền từng người mỗi kỳ — vẫn offline.
- **Đề xuất của mình:** làm (b) trước — entity
  `SharedPlan { id, name, fullAmount, cycle, members: [{ name, share, paidUntil }] }`,
  subscription cá nhân trỏ tới qua `sharedPlanId`; mỗi kỳ nhắc "ai đã đưa tiền / ai
  còn nợ". Khi nào cần đồng bộ nhiều thiết bị thật mới lên (a).
- **Câu hỏi chốt hướng:** bạn muốn gói family để **(1)** chỉ theo dõi PHẦN CỦA BẠN
  (đang có rồi), hay **(2)** bạn là chủ gói, theo dõi cả việc THU TIỀN từ mấy người
  kia? Nếu (2) thì mình dựng `SharedPlan` như trên.

### Ghi chú nhỏ

- Item (3) "Mark N paid ghi ngày nào" ở trên vẫn giữ nguyên (ghi theo ngày đến hạn
  từng kỳ) — chưa đổi, chờ bạn.
- Dữ liệu demo ở cổng 5200 mình bấm thử khá nhiều (revert vài kỳ Adobe, thêm gói
  test "YouTube Family") — chỉ là localStorage của origin đó, KHÔNG ảnh hưởng
  code/nhánh.
