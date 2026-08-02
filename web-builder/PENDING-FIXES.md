# web-builder.css — lỗi đang chờ sửa

Bản trong repo: `web-builder/web-builder.css` (2826 dòng — số dòng dưới đây theo bản này).
Bản mới nhất của skill `anthropic-skills:web-builder`: 2947 dòng.
**Lỗi 1 và 3 vẫn còn nguyên trong bản mới nhất** → phải sửa thật, không phải chỉ đồng bộ file.
Lỗi 2 thì bản mới đã có sẵn → chỉ cần port sang.

Trang đang dùng kit: `index.html`, `finance-econ-rulebook.html`, `mam-com-viet.html`.

---

## 1. `.wb-container` là content-box → tràn ngang 40px

**Dòng 2109:**

```css
.wb-container { width: 100%; max-width: var(--wb-container-max, 1120px); margin-inline: auto; padding-inline: 20px; }
```

File **không có** `box-sizing: border-box` toàn cục (chỉ 1 chỗ ở dòng 883 cho `.wb-check input`).
Nên `width: 100%` + `padding-inline: 20px` = tràn 40px ở mọi viewport hẹp hơn `max-width`.

**Đo được:** viewport 1280px, `<main class="wb-container wb-container--wide">` rộng 1320px →
`documentElement.scrollWidth` 1320 vs `clientWidth` 1280, có thanh cuộn ngang, nội dung mép phải bị cắt.

**Sửa:** thêm `box-sizing: border-box` vào `.wb-container`, hoặc đặt reset
`*, *::before, *::after { box-sizing: border-box }` toàn file (cần rà lại vì nhiều component
đang tính theo content-box).

**Ảnh hưởng:** `finance-econ-rulebook.html`, `mam-com-viet.html`.

---

## 2. Thiếu hẳn nhóm `.wb-footer*`

`grep -c wb-footer` trong CSS repo = **0**.

Class đang dùng trong `finance-econ-rulebook.html` nhưng không tồn tại:
`wb-footer`, `wb-footer--slim`, `wb-footer__inner`, `wb-footer__bottom`, `wb-footer__copy`
→ footer trang đó hiện render không style.

**Sửa:** port nhóm `.wb-footer*` từ bản skill 2947 dòng (bắt đầu ở dòng 2916 bản đó:
`.wb-footer`, `__inner`, `__top`, `__brand`, `__mark`, `__name`, `__tagline`, `__cols`,
`__col`, `__title`, `__bottom`, `__copy`, `--slim`).

---

## 3. Rail của stepper ngang chạy xuyên qua marker

**Triệu chứng:** ở `.wb-steps--horizontal`, các bước `.is-todo` bị đường nối cắt ngang qua **giữa** vòng tròn.

**Nguyên nhân — hai geometry khác nhau, state rule chỉ đúng với một cái.**

Rail dọc (mặc định, dòng 2592) bắt đầu **dưới** marker nên không bao giờ chồng lên nó:

```css
.wb-steps__item::before { top: var(--wb-steps-size); bottom: 0; ... }
```

Rail ngang (**dòng 2646–2649**) chạy từ tâm marker này sang tâm marker kế → xuyên thẳng qua
vòng tròn tiếp theo:

```css
.wb-steps--horizontal .wb-steps__item::before {
  left: 50%; top: calc(var(--wb-steps-size) / 2); right: auto; bottom: auto;
  width: 100%; height: var(--wb-bw); transform: translateY(-50%);
}
```

Nó chỉ *trông* đúng nhờ `.wb-steps__marker` có `z-index: 1` + nền đục
`background: var(--wb-gray-900)` (dòng 2598–2605) che đi. Nhưng đúng những state cố tình
bỏ nền lại gỡ mất tấm che đó:

- dòng 2618–2621 `.wb-steps__item.is-todo .wb-steps__marker { background: transparent; … }`
- dòng 2622 `.dark .wb-steps__item.is-todo .wb-steps__marker { background: transparent; … }`
- dòng 2628–2632 `.wb-steps__item--dashed .wb-steps__marker { background: transparent; … }` (dính cùng lỗi)
- `--dot` + `.is-todo` cũng vậy

Demo state mặc định (marker đen đục) thì đẹp nên không ai bắt được.

**Sửa — chữa geometry thay vì che bằng nền:**

```css
.wb-steps--horizontal .wb-steps__item::before {
  left: calc(50% + var(--wb-steps-size) / 2);
  top: calc(var(--wb-steps-size) / 2); right: auto; bottom: auto;
  width: calc(100% - var(--wb-steps-size));
  height: var(--wb-bw); transform: translateY(-50%);
}
```

Vì `.wb-steps--horizontal .wb-steps__item` là `flex: 1 1 0` (rộng bằng nhau) và marker căn giữa,
khoảng cách hai tâm = đúng 100% chiều rộng item, nên rail vẽ đúng vào khe giữa hai vòng tròn.

**Số đo sau khi áp dụng** (stepper "Lộ trình học nấu" trong `mam-com-viet.html`, viewport 1280):

```
item0: marker[173,205]  rail[204,475]  next marker starts 474
item1: marker[474,506]  rail[505,775]  next marker starts 774
item2: marker[774,806]  rail[805,1076] next marker starts 1075
```

Rail không đè lên marker nào → `is-todo` để nền trong suốt cũng đúng, và tự động đúng luôn
cho `--dashed`, `--dot` và dark mode.

**Docs không sai:** `references/components-catalog.md:979–998` mô tả `--horizontal` và
`.is-todo (muted outline)` là tổ hợp hợp lệ, ví dụ markup y hệt cách đang dùng. Chỉ CSS sai.

---

## 4. (nhẹ hơn) `.wb-navbar__actions` không có cơ chế thu hẹp

`.wb-navbar__actions { display: flex; align-items: center; gap: 8px; flex: none; }`

Container query `@container (max-width: 640px)` của navbar chỉ xử lý `.wb-navbar__menu`
(gập vào hamburger), **không** xử lý `__actions`. Navbar có 3–4 nút chữ trong `__actions`
sẽ tràn khỏi viewport mà kit không có lối thoát nào.

**Đo được:** `mam-com-viet.html` ở 390px, `scrollWidth` = 512 vs `clientWidth` = 390
(tràn 122px), thủ phạm là `.wb-navbar__actions`.

**Đề xuất:** cho `__actions` một hành vi thu hẹp trong container query (ví dụ chỉ giữ icon),
hoặc ít nhất ghi rõ trong docs rằng `__actions` phải là icon-only và mọi nút chữ phải nằm
trong `__menu`.

---

## Sau khi sửa lib, gỡ các bản vá page-local

Trong `mam-com-viet.html`:

- `.wb-container { box-sizing: border-box; }` — gỡ khi lỗi 1 xong
- `.wb-steps--horizontal .wb-steps__item.is-todo .wb-steps__marker { background: var(--wb-surface) }`
  (+ biến thể `.dark`) — gỡ khi lỗi 3 xong. Bản vá này **kém hơn** cách sửa ở lib vì nó lấp nền
  bằng `--wb-surface`, sẽ lộ mảng sai màu nếu stepper ngang được đặt trên nền canvas hoặc trong
  thẻ có nền khác.
- `.mc-timerbar { box-sizing: border-box }` — **giữ nguyên**, đó là component riêng của trang.

Trong `mam-com-viet.html` còn một chỗ né lỗi 4: các class `.mc-navhide` ẩn chữ trong
`.wb-navbar__actions` dưới 720px.

**Kiểm tra lại sau khi sửa:** mở cả 3 trang ở 320 / 390 / 1280px, xác nhận
`document.documentElement.scrollWidth === clientWidth`; xem stepper "Lộ trình học nấu — bốn chặng"
trong `mam-com-viet.html` ở cả light và dark; xem footer `finance-econ-rulebook.html`.
