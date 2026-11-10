# Quyết định — class-schedule

<!-- index:start -->
- SCHED-001 · Đen, trắng, xanh lá như trang chủ; hổ phách cho môn thứ ba · `masters-degree/class-schedule/styles.css`, `masters-degree/class-schedule/index.html`
- SCHED-002 · Giao diện tối giản: khoảng trắng thay hộp viền · `masters-degree/class-schedule/styles.css`, `masters-degree/class-schedule/index.html`, `masters-degree/class-schedule/src/views/*.js`
<!-- index:end -->

## SCHED-001 · Đen, trắng, xanh lá như trang chủ; hổ phách cho môn thứ ba
09/11/2026 · `masters-degree/class-schedule/styles.css`, `masters-degree/class-schedule/index.html`

Token màu, font (Space Grotesk, Be Vietnam Pro, JetBrains Mono) và hai theme chép từ trang chủ (REPO-023) vào `styles.css` riêng.
Tên tone trong data giữ nguyên; CSS đổi `indigo` thành xanh lá, `teal` thành mực đen/trắng, `amber` thành hổ phách.
Xanh lá còn đánh dấu hôm nay, buổi đang học và vạch giờ hiện tại. Chữ nào cũng ≥ 4,5:1 trên nền thật của nó.

## SCHED-002 · Giao diện tối giản: khoảng trắng thay hộp viền
10/11/2026 · `masters-degree/class-schedule/styles.css`, `masters-degree/class-schedule/index.html`, `masters-degree/class-schedule/src/views/*.js`

Chia nhóm bằng khoảng trắng và cỡ chữ, không bằng thẻ viền, pill hay nhãn mono in hoa.
Màu chỉ để phân biệt môn và đánh dấu hôm nay / đang học. Mỗi thông tin hiện ở một chỗ chính.
