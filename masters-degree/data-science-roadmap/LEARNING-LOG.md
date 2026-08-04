# Nhật ký học — data-science-roadmap

Chủ trang **vừa viết trang này vừa học nó**. File này là chỗ ghi lại việc học đó, và nó
tồn tại vì một lý do rất cụ thể:

> Một dòng *"mục 3 của `d-eda`: đọc xong vẫn không hiểu datacard để làm gì"* có giá trị
> hơn mọi cổng tự động trong `tools/`. Cổng chỉ đoán bằng heuristic (bài này chưa có
> hình, đoạn này nhiều số quá). Dòng trên là **một người đọc thật, ở một vị trí cụ thể,
> nói ra chỗ nó không hoạt động**. Không có file này thì thông tin đó bay hơi sau mỗi
> buổi học.

**Ai ghi:** agent ghi, chủ trang nói. Đây không phải file gõ tay — nhật ký học gõ tay
chết trong vòng một tuần. Ba đường vào, tất cả đều không phải mở file này ra sửa:

| đường vào | khi nào |
|---|---|
| gõ trên trang — nút **Sổ học** ở thanh trên | lúc đang học, ngay khi vừa tắc. Lưu vào bộ nhớ trình duyệt trước, chưa vào file này |
| `node tools/learn.mjs --import <file>` | bấm **Tải .md** trên trang rồi trộn bản đó vào đây |
| `node tools/learn.mjs --add <id> <loại> <nội dung>` | chủ trang nhắc tới một bài trong lúc trò chuyện, agent ghi hộ |

**Ba chỗ nó được dùng thật**, đừng coi là sổ cho vui:

1. **Danh sách sửa nội dung có bằng chứng.** Chỗ tắc còn mở = việc cần làm, kèm địa chỉ.
2. **Cổng `G-LEARN` đối chiếu được.** Hai bài khác nhau cùng tắc ở một khái niệm nghĩa là
   khái niệm đó đang được dạy **muộn hơn chỗ cần dùng** — đúng việc `concepts.json` làm,
   nhưng chạy trên dữ liệu thật thay vì danh sách từ khoá gõ tay. Xem `CLAUDE.md` §8.
3. **Bằng chứng cho chặng 9 (luận văn).** Câu hội đồng *"kiểm chứng thiết kế học tập bằng
   gì"* — đây là câu trả lời, và nó phải được ghi từ đầu chứ không dựng lại lúc viết.

---

## Cách ghi một dòng

```
### `<id bài>` · <tiêu đề bài>
- YYYY-MM-DD · <loại> · <nội dung một dòng>
  <dòng tiếp, thụt 2 dấu cách>
```

Sáu loại, và chỉ sáu:

| trong file | gõ trên CLI | nghĩa |
|---|---|---|
| `mức 1` | `m1` | đã đọc / hiểu |
| `mức 2` | `m2` | đã gõ lại code, chạy được |
| `mức 3` | `m3` | đã làm ra deliverable, qua hết `ACCEPT` của bài |
| `tắc` | `tac` | **chỗ đọc mà không hiểu** — dòng đáng giá nhất trong file này |
| `gỡ` | `go` | chỗ tắc đó đã gỡ được, và bằng cách nào |
| `ghi` | `ghi` | ghi chú thường (ý tưởng, liên hệ, câu hỏi cho hội đồng) |

Ba luật của file này:

1. **Mục `## Sổ` là NGUỒN và chỉ được thêm vào cuối.** Không lệnh nào sửa hay xoá một dòng
   đã có ở đó. Hạ mức cũng là *thêm* một dòng `mức` mới — mức hiện tại của một bài là dòng
   `mức` **mới nhất** của nó, nên lịch sử không bao giờ bị viết lại.
2. **Khối `learn:summary` là SẢN PHẨM.** Nó được sinh lại toàn bộ từ (Sổ + HTML) mỗi lần
   `node tools/learn.mjs --write`. Đừng sửa tay — sửa cũng bị ghi đè. Nó là hàm thuần, không
   có dấu thời gian, nên chạy hai lần cho ra đúng một kết quả.
3. **Một chỗ tắc "còn mở"** cho tới khi có một dòng `gỡ`, hoặc bài đó đạt `mức 3`. Danh
   sách chỗ tắc còn mở là hàng đợi việc cần sửa nội dung.

Luật `tools/` không phụ thuộc vào file này: xoá `LEARNING-LOG.md` đi thì cổng vẫn chạy
bình thường, chỉ mất phần `G-LEARN`.

---

<!-- learn:summary — TỰ SINH, đừng sửa tay. Sinh lại: node tools/learn.mjs --write -->

**0/84 bài đã chạm · 0 bài đạt mức cao nhất · 0 h/106.5 h khối lượng (0%)**

Sổ chưa có dòng nào. Thêm bằng `node tools/learn.mjs --add <id> <loại> <nội dung>`,
hoặc gõ trên trang (nút **Sổ học** ở thanh trên) rồi `--import` bản xuất về đây.

<!-- /learn:summary -->

---

## Sổ — nguồn sự thật, chỉ thêm vào cuối

<!-- Nhóm xếp theo THỨ TỰ HỌC (learn.mjs tự chèn đúng chỗ), không theo thứ tự gõ —
     mở file ra là đọc được như một lộ trình, không phải một dòng thời gian lộn xộn. -->
