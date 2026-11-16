# HANDOFF — big-data-storage-processing

Làm xong mục nào thì xoá mục ấy. Số dòng trỏ vào `big-data-storage-processing.html`; sửa thì sửa cả bản `-v2`.

## CHỜ CHỦ TRANG

- Chọn một trong hai bản giao diện: `big-data-storage-processing.html` (màu theo chặng) hay
  `big-data-storage-processing-v2.html` (bảng màu trang chủ). Chọn xong: giữ một file ở tên gốc, xoá file còn
  lại, bỏ nút `.vswitch`, sửa mục "Hai bản giao diện" trong `CLAUDE.md`.
- Quiz hỏi ý chỉ có trong khối gập (1 Q4, 2 Q3, 3.1 Q3–Q5, 3.3 Q3 Q5, 6 Q5, 7 Q3): giữ, hay đưa ý ấy lên khung xương?

## CHƯA LÀM — sai kiến thức

- 1 (~669): "khoảng cách mạng và đĩa đã hẹp lại" — theo số trong khối, mạng 10–100 Gb/s đã nhanh hơn một HDD.
- 3.3 (~1508): bảng ghi Secondary NameNode là cách chịu lỗi; callout dưới nói đúng là nó chỉ làm checkpoint.
- 2 (~1073): Paxos bước 5 kết luận thiếu quy tắc "proposer lấy lại giá trị đã được chấp nhận" (nằm trong khối gập).
- 4.2 (2371, 2504): "cộng và nhân không giao hoán" — đúng là hai thao tác +1000 và ×1,05 không giao hoán.
- 4.6 (3110): stage build không dựng bảng băm; task của stage join dựng (bài báo Presto ICDE'19, IV-D).
- 5 (3335): tên topic `/orders` không hợp lệ trong Kafka (`[a-zA-Z0-9._-]`); dùng `orders`.
- 6 (4193): "tổng hạng bằng N" thiếu điều kiện "trang nào cũng có link ra" ngay trong câu.
- 7 (4739), 10 (5497, 5701, 5730): "Spark nhanh hơn Hadoop n lần" thiếu điều kiện "từ vòng 2, 100 GB"; "tới 20 lần" lệch 25,3×.
- 9 (5372): Samza không còn gắn chặt Kafka và YARN (samza.apache.org).
- Nghi, cần kiểm: LHC 15 PB/năm (bài 1, số cũ), Hive chạy ở client (bài 2), `coalesce(2)` vẽ 3+1 (bài 7),
  Kafka 700 MB/s (bài 5, tài liệu ghi ~600), "consumer tự giữ offset" (bài 5), nguồn Twitter/Kinesis của
  Structured Streaming (bài 8), sơ đồ "Trước Presto" có Redshift (bài 4.6).

## CHƯA LÀM — thiếu nhất quán

- 3.1 (~1424): khối gập hứa bài 3.3 dạy generation stamp và lease; bài 3.3 không có.
- 3.1 quiz Q3: đáp án "sống qua khởi động lại" không có trong thân; ý "bộ nhớ ảo đơn giản hơn" của hình lại thiếu.
- 3.3 quiz Q4, 4.1 quiz Q1–Q3, 4.2 recap (2499), 4.3 bản đồ (2539): ý không được dạy trong thân bài.
- 4.2 (2446): một khái niệm ba tên — "đọc-sau-ghi", Read Your Own Writes, read-after-write của S3.
- 4.3: `data-short="Amazon DynamoDB"` lệch `h2` "Amazon Dynamo".
- 4.6 (3103): hứa trả lời "bao nhiêu task" nhưng không trả lời.
- 5 (3555, 3683): "cùng key cùng partition" thiếu điều kiện số partition không đổi.
- 6 (4008, 4026): Job 4 "chỉ map" trong hình, "hàm đồng nhất" ở bảng; khoá đầu vào map ghi ba kiểu.
- 7 (4706): "master" lúc là driver, lúc là cluster manager.
- 9 (5338): "Serving gộp hai view" lệch hình (hộp Truy vấn gộp).
- 1: "ba bài toán" nhưng bảng có 4 hàng; nhãn khối "bao nhiêu vòng" không có số vòng; Nhớ ghi "Hadoop" thay vì "hệ big data".

## CHƯA LÀM — khung xương và Đọc liền

- Tỉ lệ khung xương lệch xa tiêu chí 50–65%: 4.3 (77%), 9 (77–80%); hơi quá: 1 (69%), 2 (68%), 3.1 (72%), 4.6 (66%).
- Thuật ngữ dùng ở khung xương mà chưa giải nghĩa: rack, NFS/AFS/GFS, HA, Tez, chunkserver, NewSQL, 2PC, RF,
  publish–subscribe, `countByWindow`, BI/ETL/OLTP, TF-IDF, BFS.
- Mục mở quá 1–3 câu: 3.1 "Nhân bản", 6 BFS và PageRank.
- Nhãn khối gập không khớp nội dung: 3.1 hint "ba lợi, hai hại", 4.6 (3249), 5 (3413), 8 (4988 "cửa sổ cố định").
- Lặp hoặc gãy mạch khi Đọc liền: 1 (khối Watson chen giữa), 2 (YARN), 3.1 (bảng bốn ngữ nghĩa), 4.1 (bảng so SQL),
  4.3 (N/R/W dùng trước định nghĩa), 4.6 (Exchange), 5 (Failover), 7 (stage định nghĩa hai lần, 4 hay 3 partition),
  8 (năm yêu cầu), 9 (micro-batch định nghĩa lại).
