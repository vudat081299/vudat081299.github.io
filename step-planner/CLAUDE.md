# `step-planner/` — Data Science Step Planner

- Tên hiển thị: Data Science Step Planner (`<title>`, đầu trang, trang chủ, dòng đầu Markdown xuất ra). Thư mục và khoá
  bộ nhớ giữ tên `step-planner` để URL và cổng không đổi.
- Một trang, `index.html`: dự án chia thành bước (hàng) và bước con (thẻ), theo dõi trạng thái, người làm, hạn,
  ghi quyết định, xuất / nhập Markdown và JSON. Ưu tiên dự án dữ liệu, dùng được cho dự án bất kỳ.
- Giao diện tiếng Việt, chữ ngắn kiểu ghi chú. Quyết định của chủ trang: [DECISIONS.md](DECISIONS.md).
- Không bước build. Mở bằng HTTP: `python3 -m http.server` ở gốc repo, rồi `http://localhost:8000/step-planner/`.
  Mở bằng `file://` thì trang báo cách mở; `fetch` mẫu hỏng thì banner báo cùng lệnh ấy.

## File

| File | Việc |
|---|---|
| `index.html` | markup, hộp thoại, script theme trước lần vẽ đầu, script báo `file://` |
| `css/planner.css` | token ở đầu (tới dòng `/* ── hết token ── */`), rồi từng component, mỗi khối mở bằng một dòng chú thích |
| `js/core.js` | logic thuần: chuẩn hoá, ngày, tiến độ, việc tiếp theo, Markdown và JSON vào / ra; không DOM, chạy được trong Node |
| `js/store.js` | `localStorage` (khoá `stepPlanner.v1`, theme `hub-theme`), `sessionStorage` (dự án của tab); mọi truy cập bọc try/catch |
| `js/main.js` | vẽ bảng, sự kiện, hộp thoại, kéo thả, toast Hoàn tác, nhắc sao lưu |
| `data/templates.json` | mẫu dự án, trang đọc bằng vòng lặp (REPO-001) |

## Dữ liệu

- `localStorage['stepPlanner.v1']`: `{version, workspaces[], lastId, me{wsId: tên}, lastBackup, dirtySince}`. Đổi khuôn thì tăng số khoá.
- Workspace `{id, name, templateId, createdAt, updatedAt, notes, people[], steps[], log[]}`.
- Step `{id, title, goal, doneWhen, notes, revisit: null | {reason, date}, subs[]}`.
- Sub `{id, title, status, owner, due, doneWhen, notes}`; `status` ∈ `todo doing done blocked skip`; `due` là `YYYY-MM-DD` hoặc rỗng.
- Log `{id, date, decision, why}`.
- Mọi dữ liệu đi qua `normSub` / `normStep` / `normWorkspace`: chuỗi một dòng gộp khoảng trắng, ghi chú bỏ khoảng trắng
  cuối dòng, phần tử không phải object bị bỏ, ngày phải có thật (`parseDate` kiểm đi rồi về: ngày 31 tháng 2 bị loại).
- `me` (người dùng là ai) và hai mốc sao lưu chỉ ở máy này, không xuất.
- Mỗi tab giữ dự án đang mở ở `sessionStorage['stepPlanner.tab']`; `lastId` chỉ dùng cho tab mới mở.
- Bộ nhớ bị chặn: trang chạy trong bộ nhớ tạm và hiện banner. Dữ liệu hỏng: chép sang `stepPlanner.v1.corrupt`, bắt đầu trống.
- Lúc mở trang gọi `navigator.storage.persist()` (Safari xoá dữ liệu do script ghi sau 7 ngày không mở trang).

## Hành vi

- Tiến độ = xong / (tổng − bỏ qua). "Tiếp theo" chỉ tô một thẻ: bước con đầu tiên không `done`, không `skip` của bước
  đầu tiên còn việc.
- Bấm chip trạng thái: chưa làm → đang làm → xong → chưa làm; bị chặn → đang làm; bỏ qua → chưa làm.
  Bị chặn và bỏ qua chọn trong hộp sửa.
- Bấm vào thẻ (ngoài nút) là mở hộp sửa. Mỗi thẻ chỉ hai điểm dừng Tab: tên (mở sửa) và chip.
- Nút phụ (dời, nhân bản, xoá, quay lại) có `tabindex=-1`. Bàn phím làm cùng việc: Alt + ← → trên tên bước con,
  Alt + ↑ ↓ trên tên bước, ô "Thuộc bước" / "Vị trí" và nút Xoá / Nhân bản / Quay lại trong hộp sửa.
- Kéo thả trên máy tính; bước con kéo được sang bước khác.
- Đang lọc (tìm hoặc người làm) thì tắt sắp xếp và nút thêm bước. Thêm bước con khi đang lọc người thì điền sẵn người
  ấy; thẻ mới vẫn bị lọc ẩn thì toast "Đã thêm — đang bị bộ lọc ẩn".
- Tìm không phân biệt hoa thường và dấu. Tên, mục tiêu hay ghi chú của bước khớp thì hiện cả hàng.
- Xoá bước con, quyết định: một bấm. Xoá bước còn bước con: hỏi lại. Sau khi xoá, focus nhảy vào nút Hoàn tác
  của toast (15 giây); Ctrl/Cmd + Z cũng hoàn tác khi không gõ chữ và không có hộp thoại mở.
- Hoàn tác tìm lại dự án và bước theo id (tab khác có thể đã thay `state`). Xoá dự án thì toast biến mất; xoá dự án
  hỏi lại, không hoàn tác.
- Hộp sửa: mở thì focus ô đầu; tên là textarea tự cao, Enter lưu. Esc, × hay Huỷ khi chữ đã đổi thì hỏi "Bỏ thay đổi?".
- Thành viên: sửa tên trên một dòng (số dòng không đổi) thì mọi bước con của người cũ và "Tôi là" đổi theo.
- Ghi chú bước gập dưới tên bước; ghi chú thẻ cắt ba dòng, có nút "Xem thêm". Link http(s) trong ghi chú bấm được.
- Nhật ký quyết định: sửa và xoá được; hiện theo ngày, mới nhất trước.
- Nhắc sao lưu: có thay đổi chưa sao lưu từ ≥ 3 ngày thì nút "Chưa sao lưu N ngày" / "Chưa sao lưu lần nào" hiện cạnh
  Xuất; bấm là tải bản sao lưu mọi dự án. Chỉ bản sao lưu tất cả (tải hoặc chép) mới đặt lại mốc.
- Tab khác sửa cùng khoá thì trang đọc lại (sự kiện `storage`) và giữ dự án của tab này.
- Chữ người dùng chỉ vào DOM qua `textContent` (hàm `h` trong `main.js`). Không `innerHTML` ở `js/` — cổng kiểm.
- Không dùng `alert` / `confirm` / `prompt` của trình duyệt: hỏi lại bằng `#dlg-ask`.

## Mẫu (`data/templates.json`)

- `{note, templates[]}`; mẫu `{id, name, description, people?, steps[]}`; bước `{title, goal, doneWhen, notes?, subs[]}`;
  bước con `{title, doneWhen?, owner?, notes?}`. Không thẻ HTML. `owner` phải nằm trong `people` của mẫu. Đúng một mẫu trống.
- Mẫu chung không gắn vào một bài toán cụ thể. Tên bước, bước con: tiếng Việt, tên gốc tiếng Anh trong ngoặc để tra.
- `crisp-dm` theo CRISP-DM 1.0 Step-by-step guide (Chapman et al., 2000): bước là sáu pha, bước con là generic task
  của pha, `doneWhen` là output của task theo guide, `notes` là câu hỏi gợi ý và bẫy hay gặp.
- Việc thêm ngoài CRISP-DM 1.0 ghi nguồn trong tên thẻ: tái lập, kết quả theo nhóm (CRISP-ML(Q)), model card
  (Mitchell et al., 2019), nghiệm thu (TDSP). Không thêm việc không có nguồn.
- CRISP-DM: chia train / validation / test ngay sau chọn và ghép dữ liệu, trước làm sạch, điền thiếu, tạo đặc trưng;
  mọi biến đổi fit chỉ trên train. Đừng thêm bước con nào làm rò rỉ dữ liệu test.
- Task 4.2 Generate test design của CRISP-DM nằm ở pha 3 của mẫu, ngay sau Tích hợp; ghi chú thẻ nói vì sao dời.
- `smoke.cjs` tìm `kiem chat` (đúng một bước con) và `hieu nghiep vu` (đúng một bước) trên mẫu `crisp-dm`: đừng đưa
  hai cụm ấy vào chỗ khác của mẫu.
- `stats-report` theo chu trình PPDAC (MacKay & Oldford; Wild & Pfannkuch, 1999): bước là năm khâu, bước con là mục
  của từng khâu.
- `it5425-sports` sinh từ `masters-degree/data-management-visualization/data/sports-monitoring-project.json` (`phases`,
  `team`, `week1`) và danh sách "Xong khi nào" (`#lt-xong`) của trang đồ án. Không sửa tay:
  `python3 step-planner/tools/lint.py --write-course`. Cổng đỏ khi trang đồ án đổi mà mẫu chưa sinh lại.
- Người làm trong mẫu đồ án: vai, không tên người. Chỉ ghi khi nguồn nói rõ — pha một vai, việc mở đầu "Vai N",
  việc P0 khớp bảng `week1` (`P0_FROM_WEEK1` trong `lint.py`). Không đoán. Không ghi tên giảng viên.
- Ghi chú mỗi bước của mẫu đồ án có link trang đồ án kèm neo (`#lt-lich`, `#can-xac-nhan`, `#lt-xong`); cổng kiểm neo còn.

## Markdown

Xuất rồi nhập lại ra đúng cấu trúc cũ (tên, trạng thái, người, hạn, ghi chú, quay lại, nhật ký, ghi chú dự án).
Xem trên GitHub / VS Code: nhãn cách nhau một dòng trống, dòng trong khối có hai dấu cách cuối (xuống dòng cứng).

```
# Tên dự án

> Data Science Step Planner · định dạng 1
>
> Mẫu: <templateId>
>
> Người: `@Tên A` · `@Tên B`

dòng ghi chú dự án

## 1. Tên bước

Mục tiêu: …

Xong khi: …

Quay lại: YYYY-MM-DD · lý do

Ghi chú:
  dòng ghi chú

- [ ] Tên bước con · `@người` · hạn YYYY-MM-DD
  Xong khi: …
  dòng ghi chú

## Nhật ký quyết định

- YYYY-MM-DD · quyết định
  Vì sao: dòng đầu
  dòng tiếp
```

- Dấu trạng thái: `[ ]` / `[]` chưa làm, `[~]` đang làm, `[x]` / `[X]` xong, `[!]` bị chặn, `[-]` bỏ qua. Dấu lạ đọc là chưa làm.
- Người làm xuất trong dấu `` ` `` để dán lên GitHub không gọi tên tài khoản nào; đọc cả `` `@tên` `` và `@tên`.
- Trên dòng bước con và dòng `Người:`, phần tử tách bằng ` · `. Trong tên: `\` viết `\\`, `·` viết `\·`, `@` viết `\@`,
  chữ `hạn` / `due` viết `\hạn` / `\due`.
- Dòng thụt hai dấu cách thuộc bước con / `Ghi chú:` / quyết định ngay trên nó. Dòng thụt đầu `Xong khi: ` của bước con
  là `doneWhen`; dòng thụt đầu `Vì sao: ` của quyết định mở phần lý do.
- Dòng ghi chú: dòng trống viết `\`; dòng bắt đầu bằng `\`, `#`, `>`, đầu mục danh sách, `**` hay một nhãn (`Mục tiêu:`,
  `Xong khi:`, `Vì sao:`, `Quay lại:`, `Ghi chú:`) thêm một `\` phía trước.
- Dòng đầu (`Data Science Step Planner · …` hay `Step Planner · …` cũ) chỉ để đọc; trang không dựa vào nó.

Nhập Markdown viết tay (dễ dãi):

- Bước con: `- [ ] x`, `- [] x`, `* [ ] x`, `+ [ ] x`, `1. [ ] x`, gạch đầu dòng thường `- x` (chưa làm). Mục lồng
  (`  - [ ] con`) thành bước con cùng bước, xếp phẳng.
- `@tên` ở đâu trên dòng cũng được; nhiều `@` thì người đầu làm, người sau vào ghi chú ("Người khác: …").
- Hạn: `hạn` / `due` + `YYYY-MM-DD`, `YYYY-M-D`, `DD/MM/YYYY`, `D/M/YYYY`. Ngày không có thật thì cảnh báo, giữ trong tên.
- Tiêu đề bước: `## 1. x`, `## 1) x`, `## 2 x`, `## Bước 1: x`, `## Step 2) x`, hay `## x` không số.
  `## Nhật ký quyết định` / `## Nhật ký` là nhật ký.
- Trước `##` đầu tiên: dòng đầu không có `#` là tên dự án; việc thành bước "Việc chung"; chữ khác là ghi chú dự án.
- Trong nhật ký: gạch đầu dòng hay dòng thường đều là một quyết định; ngày đầu dòng (hai kiểu) là ngày quyết định.
- Dòng lạ trong bước (đoạn văn, `###`) nối vào ghi chú bước. Xem trước khi nhập liệt kê mọi cảnh báo.
- Số `1.1`, `1.2` trên bảng là số suy ra, không ghi vào Markdown.

## JSON

- Một dự án: `{format: "step-planner", version: 1, exportedAt, workspace}`. Sao lưu: `{…, workspaces: [...]}`.
- Nhập nhận cả hai, mảng dự án, hoặc một dự án trần. Mục nào không phải object hay thiếu mảng `steps` thì bỏ, kèm cảnh
  báo tiếng Việt; không còn dự án nào thì báo lỗi, không bao giờ lộ TypeError.
- Mặc định tạo dự án mới (id mới); trùng tên thì thêm ` (nhập)`, ` (nhập 2)`… "Thay dự án đang mở" (chỉ khi nhập
  đúng một dự án) giữ id, có Hoàn tác.

## Giao diện

- Màu, cỡ, khoảng cách chỉ ở token đầu `css/planner.css` (REPO-028); bảng màu theo trang chủ (REPO-023).
- Theme theo hệ điều hành tới khi bấm nút (REPO-024), khoá `hub-theme` chung cả site.
- Cột tên bước rộng cố định, thẻ cùng bề rộng nên các hàng thẳng cột; hàng thẻ cuộn ngang bên trong và báo còn chỗ
  cuộn (lớp `more-left` / `more-right`). Nút "+ Bước con" luôn ở cột tên bước. ≤ 640px: tên bước nằm trên hàng thẻ.
- Trang không bao giờ cuộn ngang (smoke đo ở 390px). Tạo hay mở dự án thì về đầu trang, không cuộn theo focus.

## Cổng: `sh step-planner/tools/check.sh`

- `tools/lint.py`: khuôn mẫu, mẫu đồ án khớp nguồn và neo, không `innerHTML`, mã màu chỉ trong khối token.
- `node --check` cho `js/*.js`; `tools/test-core.mjs`: Markdown và JSON đi rồi về, Markdown viết tay, JSON sai khuôn,
  ngày, tên trùng, đổi tên người làm, tiến độ.
- `tools/smoke.cjs` (cổng tự dựng máy chủ tạm; thiếu playwright thì bỏ qua, CI chạy ở job smoke): mọi mẫu, thêm / sửa /
  xoá / hoàn tác (nút, Ctrl+Z), nút và kéo thả, lọc và thêm khi lọc, Esc có chữ chưa lưu, đổi tên thành viên, quay lại,
  nhật ký, tải lại, xuất → nhập, thay dự án + hoàn tác, JSON sai khuôn, nhắc sao lưu, hai tab, 390px, bộ nhớ bị chặn,
  dữ liệu hỏng, lỗi console. Chạy tay: `node step-planner/tools/smoke.cjs http://127.0.0.1:8347/step-planner/`.
