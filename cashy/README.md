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
