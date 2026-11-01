# `masters-degree/class-schedule/` — lịch học cao học

Trang lịch học cá nhân của ba môn cao học Khoa học dữ liệu: tổng quan hôm nay, buổi tiếp theo, tiến độ,
lịch tháng / tuần / danh sách, panel chi tiết môn và buổi. Niêm yết ở section đầu (`Everyday`) của trang chủ.

## File

- `data/schedule.json`: mọi dữ liệu — `instructors`, `courses`, `sessions` (mỗi buổi một dòng: môn, ngày, giảng viên).
- `src/time.js`: ngày giờ theo `Asia/Ho_Chi_Minh`, không phụ thuộc múi giờ máy người xem.
- `src/model.js`: kiểm dữ liệu và dựng `ClassSession`; không đụng DOM, chạy được trong Node.
- `src/state.js`, `src/store.js`: trạng thái trang và tuỳ chọn trong `localStorage`.
- `src/views/`: `dashboard.js`, `calendar.js` (tháng, tuần, danh sách), `panel.js`, `parts.js` (mảnh dùng chung).
- `src/main.js`: nạp dữ liệu, sự kiện, vẽ lại từng vùng.
- `styles.css`: token màu trên `:root`, dark mode qua `prefers-color-scheme` và `data-theme`.

## Luật dữ liệu

- Chỉ ghi buổi có trong lịch của trường. Không sinh buổi định kỳ, không lấp ngày trống.
- Giảng viên gắn theo từng buổi (`sessions[].instructorId`), không theo môn: một môn có thể có nhiều người dạy luân phiên.
- Giờ và phòng lấy từ môn; buổi nào khác thì ghi đè bằng `start`, `end`, `room` trên dòng của buổi đó.
- Thông tin chưa có thì để `null` (trang hiện "Chưa cập nhật"), đừng đoán.
- Đổi lịch thì sửa cả `SOURCE` / `COURSE` trong `tools/verify.mjs`: đó là bản chép lịch gốc để so.
- Mọi số đếm và tiến độ tính từ `sessions` và đồng hồ; không ghi tay.

## Code

- JavaScript ES module thuần, không build. Kiểu khai bằng JSDoc, `// @ts-check` ở đầu mỗi file.
- Dựng HTML bằng `html\`\`` trong `src/html.js`: giá trị chèn vào luôn được escape.
- Thử ở một thời điểm khác: thêm `?now=2026-11-18T18:15` (giờ Việt Nam) vào URL.
- Mở bằng HTTP: `python3 -m http.server` ở gốc repo, rồi `http://localhost:8000/masters-degree/class-schedule/`.

## Cổng: `sh masters-degree/class-schedule/tools/check.sh`

- `node tools/verify.mjs`: dữ liệu khớp lịch gốc từng buổi, giờ Việt Nam, trạng thái, tiến độ, tìm kiếm.
- `tsc -p tsconfig.json`: kiểm kiểu JSDoc (dùng `tsc` toàn cục, hoặc của `cashy/node_modules`).
- Cổng không bấm nút. CI chạy thêm `node tools/smoke.cjs <url>`: bấm thật điều hướng, chip lọc, panel, tìm
  kiếm, giảng viên theo ngày, tràn ngang ở 375px. Sửa sự kiện hay view thì chạy nó trước khi commit.
