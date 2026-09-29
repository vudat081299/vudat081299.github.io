# `masters-degree/thesis-topic-selector/` — chọn đề tài luận văn

Bảng đề tài luận văn thạc sĩ Data Science, xếp theo mức tác động, kèm bộ tiêu chí chấm từng đề tài.
Quyết định: [DECISIONS.md](DECISIONS.md).

## File

- `thesis-topic-selector.html`: trang. Đề tài ở `const TOPICS`, lĩnh vực ở `DOMAINS`, điểm tác động riêng ở
  `const IMPACT`. Mục "Chưa làm" của bản mới nhất trong changelog đầu trang là việc còn nợ.
- `thesis-topic-rubric.md`: bộ tiêu chí chấm, không chứa kết quả.
- `calibrate.js`: sinh bảng hiệu chuẩn §1b/§1c của rubric và kiểm toàn vẹn.
- `thesis-topic-review-<ngày>.md`: kết quả một lượt chấm; không sửa lượt cũ.
- `classmate-topics*.md`: đề tài của lớp — mốc cho câu "thế nào là đủ".

## Luật

1. Chấm theo rubric trước khi thêm đề tài (THESIS-001): `B1`–`B8`, rồi `R1`–`R6` (verdict là mức xấu nhất),
   `V1`–`V3`, phép thử `QUA_NHO`, cờ `F1`–`F37`. Chỉ `DI_DUOC` / `DI_DUOC_CO_DIEU_KIEN` được vào bảng. Ghi kết
   quả thành một file `thesis-topic-review-<ngày>.md`.
2. `B8` (tra công trình gần nhất) phải chạy thật lúc chấm; đề tài do AI nghĩ ra hay trượt nó.
3. Không lọc im lặng, không đánh lại số `#N`. Đề tài bị loại vẫn ghi tên và verdict trong changelog; đề tài
   `PHAI_SIET_LAI` thì viết lại câu hỏi, không xoá.
4. Mọi đề tài có `src` (`ai:<model>` · `ext:<đơn vị> · <loại> · <năm>` · `mix:<model> ← <nguồn>`). Với `ai:*`,
   mọi tên bộ dữ liệu và phát biểu trong `d.why` mặc định `CHƯA KIỂM` (cờ `F37`). Xuất xứ đề tài cũ: đọc
   trailer `Co-Authored-By` của commit đầu tiên chứa `id` ấy. Không thêm hậu tố ngày vào `src`.
5. Đừng dán cả output của `calibrate.js` đè lên §1b; cột "Hệ quả" viết tay, chỉ sửa đúng dòng cần sửa.
6. Số đếm ở phần giới thiệu do trang tự tính (`data-stat` + `fillStats()`); đừng gõ tay.
7. Mọi DOI, mã arXiv và con số trích dẫn được tra lại bằng một lượt độc lập trước khi ghi lên trang.
8. Không nêu tên nơi làm việc của chủ trang hay tên người thật. Cần nhắc thì viết "một công ty phần mềm bán
   hàng Việt Nam".

## Tra `B8`

- OpenAlex: `filter=title_and_abstract.search:<q>,from_publication_date:YYYY-01-01&sort=relevance_score:desc`
  (đừng dùng `search=`). Abstract ở `abstract_inverted_index`. Lọc theo trường:
  `authorships.institutions.id:<id>` (id ghi trong `thesis-topic-review-2026-09-24.md`).
- arXiv trả 429 khi nhiều agent gọi cùng lúc: tra qua OpenAlex bằng DOI `10.48550/arxiv.<id>`.
- License: GitHub API không đăng nhập chỉ 60 lượt/giờ, nên đọc `raw.githubusercontent.com/<repo>/main/LICENSE`;
  Hugging Face: `huggingface.co/api/datasets/<id>`. Semantic Scholar không có khoá thì gần như luôn 429.
- Gọi API bằng curl hoặc python, không qua WebFetch.

## Cổng: `sh masters-degree/thesis-topic-selector/tools/check.sh`

Chạy `node calibrate.js --check`: đỏ khi số đề tài lệch quá 10% so với bảng hiệu chuẩn.
