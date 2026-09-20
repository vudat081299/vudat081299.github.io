# ADR 0003 — Hộp quà là một dòng ghép trong giỏ, giá tính lại mỗi lần đọc

**Ngày:** 20/09/2026 · **Trạng thái:** đang áp dụng

## Bối cảnh

Giỏ hàng cũ chỉ biết `{id, q}` trỏ vào `D.products`. Hộp quà là món **ghép**: một cỡ hộp, N mùi,
một kiểu thiệp, một lời nhắn, một cách gói. Nó không có trong `products`.

Giỏ cũ đã mang hai lỗi từng sửa (toast nói dối khi hết tồn kho; dòng `q=0` vẫn hiện). Không
được làm hỏng hai chỗ ấy.

## Quyết định

Dòng hộp quà là `{id, q, g}` với `id` là băm ổn định của cấu hình và `g` là **cấu hình, không
phải giá**. `byId()` nhận ra tiền tố `gift-`, tìm dòng tương ứng trong giỏ rồi **dựng tạm** một
đối tượng sản phẩm từ cấu hình đó.

Nhờ vậy mọi thứ phía sau — `subtotal()`, `lineHTML()`, `setQty()`, `orderText()` — chạy y như
với món thường và không cần biết hộp quà tồn tại.

## Vì sao không lưu giá trong giỏ

Luật số 6 của repo: số suy ra được thì đừng ghi. Nếu lưu giá, shop đổi giá nến xong thì cái hộp
nằm sẵn trong giỏ của khách vẫn giữ giá cũ, và không ai biết là cũ. Tính lại mỗi lần đọc thì
không có trạng thái nào để lệch.

Tồn kho cũng vậy: hộp bán được bao nhiêu cái là do món **khan nhất** quyết định, chia cho số lần
mùi ấy được dùng trong hộp. Hộp ba ngọn cùng một mùi, tồn 20 → gói được 6 hộp.

## Đánh đổi chấp nhận

- `byId()` quét tuyến tính trong giỏ cho dòng hộp quà. Giỏ có vài chục dòng là cùng, không đáng
  tối ưu.
- Cấu hình hộp nằm trong `localStorage` nên đổi cấu trúc `g` sẽ làm hỏng giỏ cũ của khách. Chưa
  có phiên bản hoá; đã ghi vào [sổ nợ](../NO-KY-THUAT.md).
- Một mùi có hai sản phẩm thì hộp quà lặng lẽ lấy cái đầu tiên. Cổng đã cảnh báo ở mức XEM.

## Xét lại khi

- Cần cho khách sửa lại hộp đã nằm trong giỏ (hiện phải xoá rồi gói lại).
- Cần lưu đơn lên máy chủ → lúc đó `g` phải có số phiên bản.
