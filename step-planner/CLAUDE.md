# `step-planner/` — kế hoạch dự án từng bước

- Một trang, `index.html`: dự án chia thành bước (hàng) và bước con (thẻ), theo dõi trạng thái, người làm, hạn,
  ghi quyết định, xuất / nhập Markdown và JSON. Giao diện tiếng Việt, chữ ngắn kiểu ghi chú.
- Quyết định của chủ trang: [DECISIONS.md](DECISIONS.md) (PLAN-001 trở đi).
- Không bước build. Mở bằng HTTP: `python3 -m http.server` ở gốc repo, rồi `http://localhost:8000/step-planner/`.
  Mở bằng `file://` thì trang báo cách mở; `fetch` mẫu hỏng thì banner báo cùng lệnh ấy.

## File

| File | Việc |
|---|---|
| `index.html` | markup, hộp thoại, script theme trước lần vẽ đầu, script báo `file://` |
| `css/planner.css` | token ở đầu (tới dòng `/* ── hết token ── */`), rồi từng component, mỗi khối mở bằng một dòng chú thích |
| `js/core.js` | logic thuần: chuẩn hoá, tiến độ, việc tiếp theo, Markdown và JSON vào / ra; không DOM, chạy được trong Node |
| `js/store.js` | `localStorage`: khoá `stepPlanner.v1`, theme `hub-theme`; mọi lần đọc / ghi bọc try/catch |
| `js/main.js` | vẽ bảng, sự kiện, hộp thoại, kéo thả, toast Hoàn tác |
| `data/templates.json` | mẫu dự án, trang đọc bằng vòng lặp (REPO-001) |

## Dữ liệu

- Bộ nhớ: `{version, workspaces[], lastId, me{wsId: tên}}` ở khoá `stepPlanner.v1`. Đổi khuôn thì tăng số khoá.
- Workspace `{id, name, templateId, createdAt, updatedAt, people[], steps[], log[]}`.
- Step `{id, title, goal, doneWhen, notes, revisit: null | {reason, date}, subs[]}`.
- Sub `{id, title, status, owner, due, doneWhen, notes}`; `status` ∈ `todo doing done blocked skip`; `due` là `YYYY-MM-DD` hoặc rỗng.
- Log `{id, date, decision, why}`.
- Mọi dữ liệu đi qua `normSub` / `normStep` / `normWorkspace` trước khi lưu: chuỗi một dòng gộp khoảng trắng,
  ghi chú bỏ khoảng trắng cuối dòng. Nhờ vậy Markdown đi rồi về ra đúng bản cũ.
- `me` (người dùng là ai) chỉ ở máy này, không xuất.
- Bộ nhớ bị chặn: trang chạy trong bộ nhớ tạm và hiện banner. Dữ liệu hỏng: chép sang `stepPlanner.v1.corrupt`, bắt đầu trống.

## Hành vi

- Tiến độ = xong / (tổng − bỏ qua). Việc tiếp theo = bước con đầu tiên không `done`, không `skip`.
- Bấm chip trạng thái: chưa làm → đang làm → xong → chưa làm; bị chặn → đang làm; bỏ qua → chưa làm.
  Bị chặn và bỏ qua chọn trong hộp sửa.
- Sắp xếp: nút ↑ ↓ cho bước, ← → cho bước con; kéo thả trên máy tính (bước con kéo được sang bước khác).
  Hộp sửa bước con có ô "Thuộc bước" để chuyển bằng bàn phím.
- Đang lọc (tìm hoặc người làm) thì tắt sắp xếp và nút thêm bước: vị trí giữa các mục bị ẩn không rõ.
- Tìm không phân biệt hoa thường và dấu. Tên bước khớp thì hiện cả hàng.
- Xoá bước, bước con, quyết định: toast có Hoàn tác, trả về đúng chỗ. Xoá dự án: hỏi lại, không hoàn tác.
- Sau mỗi thao tác bằng nút, focus về lại nút ấy (hoặc tên mục) sau khi vẽ lại.
- Tab khác sửa cùng khoá thì trang đọc lại (sự kiện `storage`).
- Chữ người dùng chỉ vào DOM qua `textContent` (hàm `h` trong `main.js`). Không `innerHTML` ở `js/` — cổng kiểm.
- Không dùng `alert` / `confirm` / `prompt` của trình duyệt: hỏi lại bằng `#dlg-ask`.

## Mẫu (`data/templates.json`)

- `{note, templates[]}`; mẫu `{id, name, description, people?, steps[]}`; bước `{title, goal, doneWhen, notes?, subs[]}`;
  bước con `{title, doneWhen?, owner?, notes?}`. Không thẻ HTML. `owner` phải nằm trong `people` của mẫu.
- Đúng một mẫu trống (`steps: []`).
- `it5425-sports` sinh từ `masters-degree/data-management-visualization/data/sports-monitoring-project.json`
  (`phases`, `team`) và danh sách "Xong khi nào" (`#lt-xong`) của trang đồ án. Không sửa tay:
  `python3 step-planner/tools/lint.py --write-course`. Cổng đỏ khi trang đồ án đổi mà mẫu chưa sinh lại.
- Người làm trong mẫu là tên vai, không tên người. Không ghi tên giảng viên.

## Markdown

Xuất và nhập cùng một khuôn; xuất rồi nhập lại ra đúng cấu trúc cũ (tên, trạng thái, người, hạn, ghi chú, quay lại,
nhật ký). `tools/test-core.mjs` kiểm với mọi mẫu và một dự án có đủ ký tự khó.

```
# Tên dự án

> Step Planner · định dạng 1
> Mẫu: <templateId>
> Người: @Tên A · @Tên B

## 1. Tên bước
Mục tiêu: …
Xong khi: …
Quay lại: YYYY-MM-DD · lý do
Ghi chú:
  dòng ghi chú

- [ ] Tên bước con · @người · hạn YYYY-MM-DD
  Xong khi: …
  dòng ghi chú

## Nhật ký quyết định

- YYYY-MM-DD · quyết định
  Vì sao: dòng đầu
  dòng tiếp
```

- Dấu trạng thái: `[ ]` chưa làm, `[~]` đang làm, `[x]` xong (đọc cả `[X]`), `[!]` bị chặn, `[-]` bỏ qua. Dấu lạ đọc là chưa làm.
- Dòng bước con và dòng `Người:` tách bằng ` · `. Trong giá trị, `\` viết `\\`, `·` viết `\·`.
- Phần sau tên bước con: `@…` là người làm, `hạn YYYY-MM-DD` là hạn; phần khác nối lại vào tên.
- Dòng thụt hai dấu cách thuộc bước con / `Ghi chú:` / quyết định ngay trên nó. Dòng thụt đầu `Xong khi: ` của bước con
  là `doneWhen`; dòng thụt đầu `Vì sao: ` của quyết định mở phần lý do.
- Trong ghi chú: dòng trống viết `\`; dòng bắt đầu bằng `\`, `Xong khi:` hay `Vì sao:` thêm một `\` phía trước.
- `## N. …` là bước; `## Nhật ký quyết định` (không số) là nhật ký; `## …` khác không số vẫn đọc là bước, kèm cảnh báo.
- Dòng không thụt, không theo khuôn, nằm trong một bước: nối vào ghi chú của bước (Markdown viết tay không mất chữ).
- Số `1.1`, `1.2` trên bảng là số suy ra, không ghi vào Markdown.

## JSON

- Một dự án: `{format: "step-planner", version: 1, exportedAt, workspace}`.
- Sao lưu: `{format, version, exportedAt, workspaces: [...]}`.
- Nhập nhận cả hai, mảng dự án, hoặc một dự án trần (có `steps`).
- Nhập luôn tạo dự án mới với id mới; trùng tên thì thêm ` (nhập)`. Không bao giờ ghi đè.

## Giao diện

- Token và theme như `masters-degree/class-schedule/`: đen, trắng, xanh lá; hổ phách cho bị chặn và quay lại.
- Theme theo hệ điều hành tới khi bấm nút (REPO-024), khoá `hub-theme` chung cả site.
- Máy tính: cột tên bước rộng cố định bên trái, thẻ bước con cùng bề rộng nên các hàng thẳng cột; hàng thẻ cuộn
  ngang bên trong, cột tên đứng yên. ≤ 640px: tên bước nằm trên hàng thẻ.
- Trang không bao giờ cuộn ngang (smoke đo ở 390px).

## Cổng: `sh step-planner/tools/check.sh`

- `tools/lint.py`: khuôn mẫu, mẫu đồ án khớp nguồn, không `innerHTML`, mã màu chỉ trong khối token.
- `node --check` cho `js/*.js`; `tools/test-core.mjs`: Markdown và JSON đi rồi về, tiến độ, trạng thái.
- `tools/smoke.cjs` (cổng tự dựng máy chủ tạm; thiếu playwright thì bỏ qua, CI chạy ở job smoke): tạo từ mọi mẫu,
  thêm / sửa / xoá / hoàn tác, nút và kéo thả, lọc, quay lại, nhật ký, tải lại, xuất → nhập, 390px, bộ nhớ bị chặn,
  dữ liệu hỏng, lỗi console. Chạy tay: `node step-planner/tools/smoke.cjs http://127.0.0.1:8347/step-planner/`.
