# Cashy — kiến trúc

Không phải Clean Architecture. Chỉ ba lớp và **một quy tắc**.

```
ui  ──▶  usecases  ──▶  domain
                   └─▶  data
```

Phụ thuộc chạy **một chiều**. `domain` không import gì ở trên nó; `ui` không bao
giờ import `data` để ghi. Quy tắc này được `scripts/check-layers.mjs` kiểm tra
trong `pnpm build`, nên nó không mục theo thời gian.

---

## 1. Ba lớp

| Thư mục | Là gì | Được import | Cấm |
|---|---|---|---|
| `domain/` | Luật nghiệp vụ + tính toán, **thuần 100%** | `lib/` | React, store, localStorage |
| `data/` | Store, localStorage, migrations, seed | `domain/`, `lib/` | `usecases/`, `ui/` |
| `usecases/` | "App làm được gì" — đọc state → hỏi domain → commit | `domain/`, `data/`, `lib/` | `ui/` |
| `ui/kit/` | Design system `wb-*` | `lib/` | `domain/`, `data/`, `usecases/` |
| `ui/**` | Màn hình & component | `domain/`, `usecases/`, `useCashy()` | ghi thẳng vào store |
| `lib/` | Tiện ích lá | `domain/types` | mọi thứ khác |

`lib/` chỉ phụ thuộc vào *kiểu* của domain (`ThemeMode`), không phụ thuộc luật —
nên mọi lớp import nó đều an toàn.

### Cây thư mục

```
src/
  domain/       ← luật. không React, không IO.
    types.ts sort.ts category.ts tag.ts transaction.ts
    subscription.ts analytics.ts
    date.ts period.ts money.ts txStatus.ts
    index.ts    ← barrel
    *.test.ts   ← test nằm cạnh luật nó kiểm
  data/
    store.ts        ← getState / commit / subscribe / useCashy (37 dòng)
    persistence.ts  ← load / save localStorage
    migrations.ts   ← v1..v5
    seed.ts sample.ts draft.ts
  usecases/     ← một module mỗi aggregate
    workspace.ts settings.ts categories.ts tags.ts
    transactions.ts subscriptions.ts index.ts
  ui/
    kit/        ← design system, không biết Cashy là gì
    common/     ← component chia sẻ có biết domain (AmountDisplay, TagChip…)
    app/        ← Layout, ErrorBoundary
    features/   ← dashboard/ transactions/ subscriptions/
                  categories/ tags/ settings/ onboarding/
    dev/        ← WbGallery (dev-only, code-split)
  lib/          ← id, palette, cn, router, theme, toast, confirm, modals
```

---

## 2. `domain/` — nơi đặt luật

Thuần tuyệt đối: không React, không IO, `now` luôn là tham số có default. Đó là lý
do test chạy được mà không cần dựng app, không cần jsdom, không cần localStorage.

Import module cụ thể (`@/domain/subscription`) khi chỉ cần một mảng; import barrel
`@/domain` khi màn hình thật sự trải nhiều mảng.

Vài luật đáng chú ý sống ở đây:

- **`dueCharges()`** — chu kỳ nào còn nợ. Đi từ `firstUnpaidCycle`, **không** từ
  ngày bắt đầu, nên dịch vụ đăng ký một năm trước không dựng lại 12 tháng nợ.
  Idempotent: chu kỳ đã có charge thì không bao giờ sinh lại.
- **`paymentsOf()`** — lịch sử trả tiền đọc thẳng từ sổ. `paymentTxIds` và
  `lastPaidAt` trong `Subscription` **chỉ là cache** của hàm này; `paymentsDrifted()`
  là thứ phát hiện cache lệch.
- **`chargesSurvivingDeletion()`** — xoá subscription thì charge đã ghi nhận **ở
  lại**: tiền đã tiêu vẫn là tiền đã tiêu. Chỉ pending/skipped bị xoá theo.
- **`startCycle()`** — gói năm đăng ký sau tháng thanh toán thì kỳ đầu là năm sau,
  không phải một tháng đã trôi qua.

Cycle key luôn là `"YYYY-MM"` cho **cả** gói tháng lẫn gói năm — gói năm đơn giản
là mỗi năm chỉ có một key. Nhờ vậy `subMonth`, khoá chống trùng và toàn bộ sổ cũ
chạy được với gói năm mà không cần nhánh code thứ hai.

---

## 3. `usecases/` — nơi đặt trình tự

Một usecase đọc state hiện tại, hỏi `domain/` state kế tiếp nên là gì, rồi commit.
Hết. Không render, không luật riêng.

```ts
export function syncSubscriptions(): void {
  const state = getState();
  const now = new Date();
  const fresh = dueCharges(state.subscriptions, state.transactions, now)
    .map((c) => ({ ...c, id: uid(), createdAt: now.toISOString() }));
  if (fresh.length) commit({ ...state, transactions: [...fresh, ...state.transactions] });
}
```

Ranh giới: nếu một usecase dài ra vì *quyết định* thay vì *sắp xếp*, phần quyết
định đó thuộc về `domain/`. `syncSubscriptions` trước đây 35 dòng vì nó tự quyết
kỳ nào đến hạn; giờ 5 dòng vì `dueCharges` lo việc đó.

`usecases/transactions.ts` được phép import `usecases/subscriptions.ts` (xoá một
charge làm lệch lịch sử của subscription sở hữu nó). Chiều ngược lại thì không —
`subscriptions.ts` tự commit để tránh vòng lặp import.

---

## 4. `ui/` — đọc và ghi

- **Đọc**: `useCashy()` từ `@/data/store`. Đây là thứ **duy nhất** UI được lấy từ
  `data` (cùng `data/draft` cho bản nháp giao dịch).
- **Ghi**: gọi usecase. Không bao giờ `commit` / `getState`.

Ranh giới component — cố ý **không** prop-drill mọi thứ:

| Loại | Ví dụ | Cách nối |
|---|---|---|
| Leaf | `SubscriptionCard`, `TransactionTable`, `SubscriptionDues` | nhận callback qua props; **không biết store tồn tại** |
| Container / màn hình | `Dashboard`, `Subscriptions`, `Transactions` | gọi usecase, truyền callback xuống |
| Modal singleton | `TransactionEditor`, `SubscriptionEditor` | là container; gọi usecase, đăng ký handler qua `lib/modals` |

Prop-drill toàn bộ sẽ khổ hơn hiện tại mà không mua thêm được gì. Lợi ích thật của
việc leaf không biết store: chúng render được trong `ui/dev/WbGallery` và trong
test mà không cần app phía sau.

### Một cú click đi qua đâu

```
người dùng bấm "Đã trả"
  └─ SubscriptionCard  gọi prop  onConfirmCharges([txId])
      └─ Subscriptions.tsx (màn hình)  gọi usecase
          └─ usecases/subscriptions.confirmSubscriptionCharges()
              ├─ getState()
              ├─ commit({ …, transactions: … })   → data/store → localStorage
              └─ syncPayments()
                  └─ domain/subscription.paymentsOf()   ← luật ở đây
                      └─ paymentsDrifted() → chỉ update khi thật sự lệch
  └─ useSyncExternalStore đánh thức mọi component đang đọc
```

---

## 5. Test

```bash
pnpm test          # vitest run
pnpm test:watch
pnpm check:layers  # cũng chạy trong pnpm build
```

Test nhắm vào `domain/` — chỗ có luật. Không jsdom, không localStorage, không mount:

```ts
expect(dueCharges([sub], [], new Date("2026-03-20")).map((c) => c.subMonth))
  .toEqual(["2026-01", "2026-02", "2026-03"]);
```

Đây chính là thứ trước đây không làm được: khi luật còn nằm trong store, hỏi "gói
năm nợ gì vào 15/03" phải dựng cả localStorage.

`check-layers.mjs` đã được thử ngược — cắm vi phạm giả vào `domain/` và `ui/` thì
nó fail, không chỉ pass trên cây sạch.

---

## 6. Thêm một tính năng thì sửa ở đâu

1. Luật mới hoặc phép tính mới → `domain/`, **kèm test**.
2. Một thao tác mới người dùng làm được → `usecases/`.
3. Chỗ hiển thị → `ui/features/<area>/`.
4. Primitive dùng lại được, không dính nghiệp vụ → `ui/kit/`.
5. Đổi hình dạng dữ liệu đã lưu → tăng `CURRENT_VERSION` + thêm nhánh trong
   `data/migrations.ts`. Migration cũ không bao giờ được sửa.

Nếu thấy mình muốn import `@/data/store` từ `ui/` để ghi, hoặc import React vào
`domain/` — dừng lại. `pnpm check:layers` sẽ chặn, và nó chặn có lý do.
