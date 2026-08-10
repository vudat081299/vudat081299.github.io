# web-builder — trạng thái sau khi đồng bộ v0.6

**Cập nhật 2026-08-02.** Bốn lỗi trong bản rà soát trước **đã đóng hết**. File này giờ chỉ giữ những gì
*còn lại*, và toàn bộ là việc **phía trang**, không phải phía kit.

Bản kit trong repo: **v0.6** — đọc được lúc chạy, không cần đoán theo số dòng nữa:

```js
getComputedStyle(document.documentElement).getPropertyValue('--wb-version').replace(/"/g, '')   // → 0.6
```

---

## Đã đóng

| # | Lỗi | Đóng bằng |
|---|---|---|
| 1 | `.wb-container` là content-box → tràn 40px | kit v0.6: `box-sizing` trên `.wb-container` **và** một rule chung cho mọi phần tử `wb-*` (CSS section 53) |
| 2 | Thiếu hẳn nhóm `.wb-footer*` | kit v0.6 có đủ (`__inner`, `__top`, `__brand`, `__cols`, `__bottom`, `__copy`, `--slim`…) |
| 3 | Rail stepper ngang xuyên qua marker | kit v0.6: rail vẽ vào **khe giữa** hai marker (`left: calc(50% + size/2)`, `width: calc(100% - size)`) thay vì che bằng nền đục — nên đúng luôn cho `.is-todo`, `--dashed`, `--dot` và dark |
| 4 | `__actions` không thu hẹp | kit v0.6 ghi rõ **hợp đồng slot**: `__actions` **chỉ chứa nút icon** (nó không bao giờ gập, vì theme toggle / tìm kiếm / avatar phải còn bấm được trên điện thoại); nút **chữ** đặt cuối `__menu`, sau một `__spacer` lồng bên trong — `__menu` giờ `flex: 1 1 auto` nên spacer đó đẩy CTA sang phải khi thanh rộng, và CTA tự chui vào ☰ khi thanh hẹp |

**Bản vá page-local đã gỡ** khỏi `vietnamese-home-cooking.html` (kit lo rồi):

- `.wb-container { box-sizing: border-box }`
- `.wb-steps--horizontal .wb-steps__item.is-todo .wb-steps__marker { background: var(--wb-surface) }` (+ `.dark`).
  Đây là bản vá **kém hơn** cách kit sửa: nó lấp nền vòng tròn, sẽ lộ mảng sai màu nếu stepper đặt trên
  canvas hay trong thẻ khác nền — nên để lại thì fix của kit không hiện ra.

`.mc-timerbar { box-sizing: border-box }` **giữ nguyên** — component riêng của trang.

**Số đo trước/sau** (cùng trang, chỉ khác file CSS):

| Trang | Bề rộng | CSS cũ | v0.6 |
|---|---|---|---|
| `vietnamese-home-cooking.html` | 1280 | tràn 40px | **0** |
| `vietnamese-home-cooking.html` | 390 | tràn 40px | **0** |
| `finance-econ-rulebook.html` | 1280 | tràn 40px | **0** |

---

## Còn lại — việc phía trang

### A. `finance-econ-rulebook.html` tràn ngang ở màn hẹp — **không phải lỗi kit**

Tràn **66px ở 390**, **136px ở 320**. Đo với CSS cũ và CSS v0.6 ra **y hệt** → có sẵn từ trước, kit không
liên quan.

Thủ phạm là **công thức KaTeX**: phần tử sâu nhất còn thò ra là một `span.mord` (`white-space: nowrap`) —
công thức dài không xuống dòng được nên kéo giãn cả `section` lên 436px trong khung 390px.

Sửa: cho khối toán tự cuộn ngang thay vì đẩy cả trang:

```css
.katex-display { overflow-x: auto; overflow-y: hidden; max-width: 100%; }
```

### B. `json-analysis/index.html` đang dùng **một bản kit riêng, cũ hơn**

Nó link `web-builder.css` **tương đối trong thư mục nó** → `json-analysis/web-builder.css` (16/07, 112KB,
không có `--wb-version`), chứ không dùng bản chung ở `web-builder/`. Nên nó **không** được hưởng lần đồng bộ
này, và đang tràn 32px ở 390/320.

Hai lựa chọn: trỏ nó sang `../web-builder/web-builder.css` (một bản kit cho cả site — nên làm), hoặc copy
bản mới đè lên. Trỏ sang bản chung thì lần sau không phải nhớ có hai chỗ.

### C. `vietnamese-home-cooking.html` — `.mc-navhide` giờ đã có cách làm chuẩn

Trang đang ẩn chữ trong `.wb-navbar__actions` dưới 720px để né lỗi #4. Cách này **vẫn chạy đúng**, không gấp.
Nhưng đúng bài của kit bây giờ là bỏ `.mc-navhide` và **chuyển 3 nút chữ vào cuối `.wb-navbar__menu`** sau một
`__spacer` lồng trong: khi hẹp chúng chui vào ☰ (vẫn bấm được) thay vì biến mất.

---

## Kiểm lại sau mỗi lần đồng bộ kit

Mở 3 trang ở 320 / 390 / 1280, cả sáng lẫn tối:

```js
document.documentElement.scrollWidth - document.documentElement.clientWidth   // phải = 0
```

Cẩn thận một cái bẫy: **so hai hình chữ nhật theo trục ngang thôi thì báo nhầm.** Ở ≤640px trang
`vietnamese-home-cooking.html` tự dựng stepper thành **dọc**, mọi bước cùng toạ độ x — kiểm 1 chiều sẽ kêu "rail xuyên
marker" trong khi thực tế chúng cách nhau theo trục y. Kiểm cả hai trục, hoặc chỉ kiểm khi
`flex-direction` thật sự là `row`.
