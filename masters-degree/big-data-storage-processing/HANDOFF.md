# HANDOFF — big-data-storage-processing

Làm xong mục nào thì xoá mục ấy. Số dòng trỏ vào `big-data-storage-processing.html`; sửa thì sửa cả bản `-v2`.

## CHỜ CHỦ TRANG

- Chọn một trong hai bản giao diện: `big-data-storage-processing.html` (màu theo chặng) hay
  `big-data-storage-processing-v2.html` (bảng màu trang chủ). Chọn xong: giữ một file ở tên gốc, xoá file còn
  lại, bỏ nút `.vswitch`, sửa mục "Hai bản giao diện" trong `CLAUDE.md`.
- Quiz hỏi ý chỉ có trong khối gập (1 Q4, 2 Q3, 3.1 Q3–Q5, 3.3 Q3 Q5, 6 Q5, 7 Q3): giữ, hay đưa ý ấy lên khung xương?

## CHƯA LÀM

### Cần kiểm nguồn

- Nghi, chưa kiểm được: LHC 15 PB/năm (bài 1, số cũ), Hive chạy ở client (bài 2), Kafka 700 MB/s (bài 5,
  tài liệu ghi ~600), "consumer tự giữ offset" (bài 5), nguồn Twitter/Kinesis của Structured Streaming (bài 8), sơ đồ "Trước Presto" có Redshift (bài 4.6).

### Khung xương và Đọc liền

- Tỉ lệ khung xương lệch xa tiêu chí 50–65%: 4.3 (77%), 9 (77–80%); hơi quá: 1 (69%), 2 (68%), 3.1 (72%), 4.6 (66%).
- Thuật ngữ dùng ở khung xương mà chưa giải nghĩa: rack, NFS/AFS/GFS, HA, Tez, chunkserver, NewSQL, 2PC, RF,
  publish–subscribe, `countByWindow`, BI/OLTP, TF-IDF, BFS.
- Mục mở quá 1–3 câu: 3.1 "Nhân bản", 6 BFS và PageRank.
- Nhãn khối gập không khớp nội dung: 4.6 (khối "Sau thời điểm slide"), 5 ("Khi nào không nên dùng Kafka?").
- Lặp hoặc gãy mạch khi Đọc liền: 1 (khối Watson chen giữa), 2 (YARN), 3.1 (bảng bốn ngữ nghĩa), 4.1 (bảng so SQL),
  4.3 (N/R/W dùng trước định nghĩa), 4.6 (Exchange), 5 (Failover), 7 (stage định nghĩa hai lần),
  8 (năm yêu cầu), 9 (micro-batch định nghĩa lại).
