# Cashy — kiến trúc

Không phải Clean Architecture. Chỉ ba lớp và **một quy tắc**.

```
ui  ──▶  usecases  ──▶  domain
                   └─▶  data
```

Phụ thuộc chạy **một chiều**. `domain` không import gì ở trên nó; `ui` không bao
giờ import `data` để ghi. Quy tắc này được `scripts/check-layers.mjs` kiểm tra
trong `pnpm build`, nên nó không thể mục theo thời gian.

## Các lớp

| Thư mục | Là gì | Được import | Cấm |
|---|---|---|---|
| `domain/` | Luật nghiệp vụ + tính toán, **thuần 100%** | `lib/` | React, store, localStorage |
| `data/` | Store, localStorage, migrations, seed | `domain/`, `lib/` | `usecases/`, `ui/` |
| `usecases/` | "App làm được gì" — đọc state → hỏi domain → commit | `domain/`, `data/`, `lib/` | `ui/` |
| `ui/kit/` | Design system `wb-*` | `lib/` | `domain/`, `data/`, `usecases/` |
| `ui/` | Màn hình & component | `domain/`, `usecases/`, `useCashy()` | ghi thẳng vào store |
| `lib/` | Tiện ích lá, không thuộc lớp nào | — | (không phụ thuộc gì) |

## `domain/` — nơi đặt luật

Thuần tuyệt đối: không React, không IO, `now` luôn là tham số có default. Đó là
lý do test chạy được mà không cần dựng app.

```
sort.ts · category.ts · tag.ts · transaction.ts · subscription.ts · analytics.ts
date.ts · period.ts · money.ts · txStatus.ts · types.ts
```

Import một module cụ thể (`@/domain/subscription`) khi chỉ cần một mảng; import
barrel `@/domain` khi màn hình thật sự trải nhiều mảng.

Vài luật đáng chú ý sống ở đây:

- `dueCharges()` — chu kỳ nào còn nợ. Đi từ `firstUnpaidCycle`, **không** từ ngày
  bắt đầu, nên dịch vụ đăng ký một năm trước không dựng lại 12 tháng nợ.
- `paymentsOf()` — lịch sử trả tiền đọc thẳng từ sổ. Hai field lưu trong
  `Subscription` chỉ là cache của hàm này.
- `chargesSurvivingDeletion()` — xoá subscription thì charge đã ghi nhận **ở lại**:
  tiền đã tiêu vẫn là tiền đã tiêu.

## `usecases/` — nơi đặt trình tự

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

Nếu một usecase bắt đầu dài ra vì *quyết định* thay vì *sắp xếp*, phần quyết định
đó thuộc về `domain/`.

## `ui/` — đọc và ghi

- **Đọc**: `useCashy()` từ `@/data/store`. Đây là thứ duy nhất UI được lấy từ `data`.
- **Ghi**: gọi usecase. Không bao giờ `commit`/`getState`.

Ranh giới component — cố ý *không* prop-drill mọi thứ:

- **Leaf** (`SubscriptionCard`, `TransactionTable`, `SubscriptionDues`) nhận
  callback qua props. Không biết store tồn tại, nên render được trong gallery.
- **Container / màn hình** (`Dashboard`, `Subscriptions`, `Transactions`) gọi
  usecase trực tiếp và truyền callback xuống.
- **Modal singleton** (`TransactionEditor`, `SubscriptionEditor`) là container —
  chúng gọi usecase, đăng ký handler qua `lib/modals`.

## Test

```bash
pnpm test          # vitest run
pnpm test:watch
pnpm check:layers  # cũng chạy trong pnpm build
```

Test nhắm vào `domain/` — chỗ có luật. Không cần jsdom, không cần localStorage,
không cần mount component:

```ts
expect(dueCharges([sub], [], new Date("2026-03-20")).map((c) => c.subMonth))
  .toEqual(["2026-01", "2026-02", "2026-03"]);
```

## Thêm một tính năng thì sửa ở đâu

1. Luật mới hoặc phép tính mới → `domain/`, kèm test.
2. Một thao tác mới người dùng làm được → `usecases/`.
3. Chỗ hiển thị → `ui/features/<area>/`.
4. Primitive dùng lại được, không dính nghiệp vụ → `ui/kit/`.

Nếu thấy mình muốn import `@/data/store` từ trong `ui/` để ghi, hoặc import React
vào `domain/` — dừng lại. `pnpm check:layers` sẽ chặn, và nó chặn có lý do.
