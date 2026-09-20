# ADR 0001 — Giữ trang tĩnh, không dựng framework

**Ngày:** 20/09/2026 · **Trạng thái:** đang áp dụng

## Bối cảnh

`shop/` đang là HTML/CSS/JS thuần trên GitHub Pages, không bước build. Phiên này được phép đổi
sang công nghệ khác (Next.js, Nuxt, Vite…) nếu thấy đáng.

## Quyết định

Giữ nguyên trang tĩnh. Thêm hai trang mới (`scent-finder.html`, `gift.html`) theo đúng lối cũ.

## Vì sao

- **Việc cần làm là một bản demo để mang đi đàm phán.** Một đường link mở được ngay trên điện
  thoại của chủ shop có giá trị hơn một kiến trúc đẹp. Framework thêm bước build, thêm chỗ hỏng
  vào đúng lúc không được phép hỏng.
- **Ba lớp cổng của repo đã hiểu định dạng này.** Đổi stack là vứt toàn bộ `lint-shop.py` đi
  viết lại — mất nhiều hơn được.
- **Chi phí lưu trữ bằng không**, và không có gì hết hạn. Nếu thương vụ không thành, không ai
  phải trả tiền duy trì một thứ chẳng ai dùng.
- Quy mô nội dung hiện tại (5 mùi, 5 sản phẩm, 5 câu hỏi) chưa chạm giới hạn nào của trang tĩnh.

## Đánh đổi chấp nhận

- Không có kết xuất phía máy chủ → SEO yếu hơn. Chấp nhận: lưu lượng hiện tại đến từ mạng xã
  hội, không từ tìm kiếm.
- Không giữ được bí mật nào trong mã → mọi tích hợp cần khoá đều phải chờ một hàm serverless.
- `shop.css` và `shop.js` chưa gắn hash vào tên file → khách cũ có thể dùng bản cache tới ~10
  phút sau khi deploy.

## Xét lại khi

Chạm **một** trong bốn điều kiện sau — chưa chạm thì không bàn lại:

1. cần giữ bí mật (khoá API sàn, khoá cổng thanh toán);
2. cần nhận webhook (báo-có chuyển khoản tự động);
3. cần trạng thái chung nhiều người cùng thấy (tồn kho thật, nhiều kênh);
4. sửa `data/shop.json` bằng tay trở thành việc khổ sở thường xuyên.

Ba điều kiện đầu giải được bằng **một hàm serverless** cạnh trang tĩnh, không cần viết lại.
Chỉ điều kiện 4 mới thật sự đòi đổi kiến trúc.
