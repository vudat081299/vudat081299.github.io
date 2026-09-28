# CLAUDE.md — thesis-topic-selector

Bảng chọn đề tài luận văn thạc sĩ Data Science: một trang HTML tự chứa liệt kê các đề tài, xếp
theo mức tác động thật, kèm một bộ tiêu chí để chấm từng đề tài trước khi nó được vào danh sách.
Quyết định của chủ trang: [DECISIONS.md](DECISIONS.md) (mã `THESIS-…`).

## File nào làm gì

| file | vai |
|---|---|
| `thesis-topic-selector.html` | trang. Đề tài nằm trong `const TOPICS = [...]`, lĩnh vực trong `DOMAINS`; điểm tác động nằm **riêng** trong `const IMPACT = {...}`, không nằm trong object đề tài. Changelog "Bản 1 → Bản N" ở phần giới thiệu — mục "Chưa làm" của bản mới nhất là danh sách việc còn nợ |
| `thesis-topic-rubric.md` | bộ tiêu chí chấm. Chỉ định nghĩa tiêu chí, không chứa kết quả chấm |
| `calibrate.js` | sinh lại bảng hiệu chuẩn §1b/§1c của rubric từ `TOPICS` + `IMPACT`, và kiểm toàn vẹn |
| `thesis-topic-review-<ngày>.md` | kết quả một lượt chấm — mỗi lượt một file, không sửa lượt cũ |
| `classmate-topics*.md` | đề tài lớp đã đăng ký và các lượt đánh giá chúng — mốc cho câu "thế nào là đủ" |

## Luật

1. **Chấm theo rubric TRƯỚC khi thêm đề tài** (THESIS-001). Mỗi ứng viên: blocker `B1`–`B8`
   (nhất là `B3` và `B8`), rồi `R1`–`R6` — verdict là mức xấu nhất, chấm văn xuôi trước rồi mới
   đối chiếu trường khai báo — rồi `V1`–`V3`, phép thử sàn `QUA_NHO` (rubric mục 5d), cờ
   `F1`–`F37`. Chỉ `DI_DUOC` / `DI_DUOC_CO_DIEU_KIEN` được vào bảng chọn. Kết quả chấm ghi thành
   một file `thesis-topic-review-<ngày>.md`.
2. **`B8` (tra công trình gần nhất) chạy thật, ngay lúc chấm.** Nó là blocker duy nhất không đọc
   ra được từ hồ sơ đề tài, và đề tài do AI tự nghĩ ra trượt nó với tỉ lệ cao.
3. **Không lọc im lặng, không đánh lại số.** Đề tài bị loại vẫn nêu tên + verdict trong changelog.
   Đề tài `PHAI_SIET_LAI` thì **viết lại câu hỏi**, không xoá. Số `#N` không bao giờ đánh lại:
   mọi ghi chú trỏ theo số đó, và dãy số có lỗ chính là hồ sơ của các lượt loại.
4. **`src` bắt buộc cho mọi đề tài** (`ai:<model-id>` · `ext:<đơn vị> · <loại> · <năm>` ·
   `mix:<model> ← <nguồn>`). Với `ai:*`, mọi tên bộ dữ liệu và mọi phát biểu trong `d.why` mặc
   định là `CHƯA KIỂM` (rubric 1d) — `F37` là cờ phải soi nhiều nhất. Xuất xứ của đề tài cũ truy
   bằng commit đầu tiên chứa `id` của nó rồi đọc trailer `Co-Authored-By`; đừng đoán. Đừng thêm
   hậu tố ngày vào `src`: khuôn kiểm `F34` trong `calibrate.js` neo `$`.
5. **`calibrate.js` giữ toàn vẹn cho rubric; đừng sinh lại cả khối §1b bằng cách dán output.**
   `node calibrate.js` in §1b/§1c, `node calibrate.js --check` thoát 2 khi số đề tài lệch quá 10%
   so với `calibrated_topics`. Cột "Hệ quả" trong rubric là diễn giải viết tay, script chỉ sinh ô
   rỗng — sửa đúng dòng cần sửa.
6. **Số đếm ở phần giới thiệu do trang tự tính** từ `TOPICS` lúc tải (`<span data-stat>` +
   `fillStats()`); số viết trong HTML chỉ là dự phòng khi không có JS. Đừng gõ tay một số đếm mới.
7. **Mọi DOI, mã arXiv và con số trích dẫn được tra lại bằng một lượt độc lập** với lượt tra
   chính, trước khi ghi lên trang.
8. **Không nêu tên nơi làm việc của chủ trang, hay tên người thật, trong bất kỳ file nào ở đây.**
   Repo public và được deploy. Cần nhắc thì viết chung: "một công ty phần mềm bán hàng Việt Nam".

## Tra `B8` — những cách đã chạy được

- **OpenAlex:** `filter=title_and_abstract.search:<q>,from_publication_date:YYYY-01-01&sort=relevance_score:desc`.
  Tham số `search=` là fulltext và ra rác. Abstract nằm ở `abstract_inverted_index`, phải dựng
  lại. Lọc theo trường: thêm `authorships.institutions.id:<id>` (id đã ghi ở review 2026-09-24).
- **arXiv API** trả 429 / rỗng khi nhiều agent gọi song song — lúc đó tra mã arXiv qua OpenAlex
  bằng DOI `10.48550/arxiv.<id>`.
- **License:** GitHub API không đăng nhập chỉ 60 lượt/giờ — đọc file thô
  `raw.githubusercontent.com/<repo>/main/LICENSE`; Hugging Face: `huggingface.co/api/datasets/<id>`
  (`tags: license:*`). Semantic Scholar không có khoá thì gần như luôn 429.
- Gọi API bằng curl / python, không qua WebFetch — WebFetch trả bản tóm tắt của một model, không
  phải nguồn.

## Cổng

Không có hook hay cổng riêng. `node calibrate.js --check` là phép kiểm duy nhất, và phải chạy tay.
Trang không nằm trong `pages/`, nên `lint-pages.py` không soi nó; cổng trang chủ
(`tools/lint-collection.py`) chỉ kiểm link tới trang còn sống.
