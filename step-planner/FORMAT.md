# Khuôn Markdown và JSON của step-planner

Luật chung của project ở [CLAUDE.md](CLAUDE.md). Code: `toMarkdown`, `fromMarkdown`, `parseImport` (`js/core/markdown.js`, `js/core/io.js`);
mục System design: `designMd`, `designReader` (`js/core/design-md.js`). Đổi khuôn thì sửa file này và `tools/test-core.mjs`.

## Markdown xuất ra

Xuất rồi nhập lại ra đúng cấu trúc cũ. Nhãn và khối cách nhau một dòng trống (khuôn dưới bỏ bớt); dòng trong khối có hai
dấu cách cuối (xuống dòng khi xem trên GitHub / VS Code).

```
# Tên dự án
> Data Science Step Planner · format 3
>
> Template: <templateId>
dòng ghi chú dự án

## 1. Tên bước
Goal: …
Done when: …
Reopened: YYYY-MM-DD · iteration N · lý do
Notes:
  dòng ghi chú
Docs:
  - [Tên link](https://…)
  - [Evidence: Tên link](https://…)
  - Tên văn bản
    ````markdown
    thân văn bản, kể cả ``` và dòng #, -, nhãn
    ````
Outputs:
  - tên đầu ra · data/clean/x.parquet
    hợp đồng một dòng
Inputs:
  - tên đầu ra ← tên bên giao

- [x] Tên bước con · parallel · redo · due YYYY-MM-DD · done YYYY-MM-DD
  Done when: …
  Cancelled because: dòng đầu
    dòng tiếp của lý do
  dòng ghi chú
  Docs:
    - [Tên link](https://…)
  Outputs:
    - tên · ref
      hợp đồng
  Inputs:
    - tên đầu ra ← 2. tên bước › tên bước con

## System design
Path: tên lối [path: id]
  Flow 1: …
  Accept: …
Profile: <câu> <trả lời> · <câu> <trả lời>

- Tên khâu: phương án [khâu: id, id]
  Own: công cụ tự ghi
  dòng ghi chú
- Tên khâu: not needed [khâu: skip]

Handoffs:
- Khâu A → Khâu B [handoff: a > b]
  Via: File
  What: …
  Where: …
  Promise: dòng đầu
    dòng tiếp
  Check: …

Warnings:
- tên luật: lời báo

## Decision log
- YYYY-MM-DD · quyết định
  Step: 2. tên bước
  Why: dòng đầu
  dòng tiếp
```

## Luật của khuôn

- Dòng đầu (`… · format N`) chỉ để đọc, trang không dựa vào nó. Số thứ tự trên bảng không ghi; `## N.` và `Step: N.` là vị trí.
- Nhãn không phân biệt hoa thường. Nhãn định dạng 2 (tiếng Việt) vẫn nhập: `Mẫu`, `Mục tiêu`, `Xong khi`, `Quay lại`
  (`· vòng N`), `Vòng`, `Ghi chú`, `Tài liệu`, `Huỷ vì`, `Vì sao`, `Bước`, `hạn`, `## Nhật ký quyết định`.
- Dấu: `[ ]` / `[]` mới, `[~]` đang làm, `[>]` chờ, `[!]` bị chặn, `[x]` / `[X]` xong, `[-]` bỏ qua, `[/]` huỷ; dấu lạ là mới.
- Dòng bước con: phần tử tách bằng ` · `. `parallel` (cả `song song`): nhập ô của bước con ngay trước. `redo` (cả `làm lại`):
  dấu Redo. `due <ngày>`: hạn. `done <ngày>`: `doneAt`, chỉ ghi khi Done và có ngày.
- Trong tên bước con: `\` → `\\`, `·` → `\·`, `@` → `\@`, `hạn` / `due` → `\hạn` / `\due`.
- Dòng thụt hai thuộc bước con / `Notes:` / quyết định ngay trên nó. Dòng thụt đầu `Done when: ` của bước con là `doneWhen`.
- Lý do: dòng thụt `<nhãn>: dòng đầu` sau `Done when:`, dòng sau thụt bốn. Nhập nhận mọi nhãn lý do (cả `Huỷ vì`) khi trạng
  thái có lý do; không thì là ghi chú.
- Dòng ghi chú: dòng trống viết `\`; dòng mở bằng `\`, khoảng trắng, `#`, `>`, đầu mục danh sách, `**` hay một nhãn (kể cả
  định dạng 2, `Outputs`, `Inputs`) thêm `\`.
- Vòng: bước đang mở lại ghi vòng trong `Reopened:`; bước đã đóng vòng mà `round` > 1 có dòng `Iteration: N` thay chỗ ấy.
  Dòng cũ `Quay lại: YYYY-MM-DD · lý do` (không vòng) đọc là vòng 2.
- Quyết định: `Step: N. tên` ngay dưới dòng quyết định. Nhập: bước thứ N nếu đúng tên; không thì bước đầu tiên tên đúng cả
  chuỗi (file cũ `Step: tên`), rồi bước đầu tiên tên đúng phần sau số. So tên bỏ dấu, không phân biệt hoa thường; không
  thấy thì cảnh báo, bỏ link. Dòng thụt đầu `Why: ` mở phần lý do.

### Tài liệu

- Nhãn `Docs:` (bước: không thụt, sau `Notes:`; bước con: thụt hai, sau các dòng của bước con); mỗi tài liệu một mục thụt thêm hai.
- Link `- [tên](url)`; url có ngoặc thì `(<url>)`. Văn bản `- tên` rồi khối rào thụt thêm hai; rào `` ` `` dài hơn chuỗi
  `` ` `` dài nhất trong thân (tối thiểu ba); dòng trống của thân ghi rỗng.
- Bằng chứng (`proof`): tên mở bằng `Evidence: `. Tên thật mở bằng `Evidence:` mà không là bằng chứng thì ghi `\Evidence: …`.
- Trong tên tài liệu: `\`, `[`, `]` thoát bằng `\`.

### Bàn giao

- Nhãn `Outputs:` rồi `Inputs:`, sau `Docs:`. Bước: nhãn không thụt, mục thụt hai. Bước con: nhãn thụt hai, mục thụt bốn.
- Đầu ra `- tên · ref`; hợp đồng là dòng thụt thêm hai ngay dưới, thoát như dòng ghi chú. Viết tay `- tên · ref · hợp đồng` cũng đọc.
- Đầu vào `- tên đầu ra ← tên bên giao` (tên bước con, hay tên bước nếu đầu ra của cả bước). Có bên giao khác cùng tên đầu ra
  và cùng tên (bỏ dấu, không phân biệt hoa thường; kể cả bước trùng tên bước con) thì bên giao ghi `N. tên bước` hay
  `N. tên bước › tên bước con`, N là số bước như `## N.`. Tên bên giao không số mà mở bằng `N. ` thì ghi `\N. …`.
- Trong tên, ref: `\`, `·`, `←` thoát bằng `\`.
- Đầu vào mất nguồn (bên giao đã xoá): `- (deleted output)`, không có `←`. Nhập lại vẫn là đầu vào mất nguồn (bảng báo lỗi,
  không cảnh báo). Đầu ra thật tên `(deleted output)` luôn ghi kèm `← bên giao`.
- Nhập đầu vào: tìm theo tên đầu ra (bỏ dấu, không phân biệt hoa thường), trùng thì theo bên giao: `N. tên đầy đủ` là bước
  thứ N nếu đúng tên, rồi tên đầy đủ (`bước › bước con`, hay tên bước), rồi tên bước con. Còn nhiều cái khớp: ưu tiên tên đầu
  ra đúng hoa thường, rồi tên bên giao đúng hoa thường. File cũ (`bước › bước con` không số) vẫn nhập đúng. Không có tên bên
  giao mà chỉ một đầu ra cùng tên thì lấy nó. Không thấy: cảnh báo, bỏ. Nhiều cái khớp: lấy cái đầu, cảnh báo.

### System design

- Mục `## System design` sau các bước, trước nhật ký. Nhập chỉ đọc id trong ngoặc vuông cuối dòng; tên trước ngoặc để người đọc.
- `Path:` có dòng thụt `Flow N:`, `Accept:` chép từ danh mục; nhập bỏ qua chúng.
- `Profile:` một dòng, mỗi câu hồ sơ `<id câu> <id trả lời>`, tách bằng ` · `.
- Khâu: `- tên: phương án [khâu: id, id]`; khâu Not needed chỉ ghi `[khâu: skip]`, không ghi lựa chọn ẩn. Dòng thụt `Own:`
  (chỉ dòng đầu) là công cụ tự ghi, dòng thụt khác là ghi chú; ghi chú mở bằng `Own:` thì thoát `\`.
- `Handoffs:` rồi mỗi đường nối `- A → B [handoff: a > b]`; dòng thụt `Via:` (id hay nhãn của cách bàn giao), `What:`,
  `Where:`, `Promise:` (dòng tiếp thụt bốn, thoát như ghi chú), `Check:`.
- `Warnings:` (luật đang báo) chỉ để đọc; nhập bỏ qua. Dòng lạ trong mục: cảnh báo.
- Dấu `sd` của bước con không ghi vào Markdown.

## Nhập Markdown cũ và viết tay (dễ dãi)

- Người làm (dòng `Người:`, `` `@tên` ``, `@tên`) bị bỏ khỏi tên, không cảnh báo. Trước `##` đầu: dòng đầu không `#` là tên
  dự án, việc thành bước "General", chữ khác là ghi chú dự án. Dòng lạ trong bước (đoạn văn, `###`) nối vào ghi chú bước.
- Bước con: `- [ ] x`, `- [] x`, `* [ ] x`, `+ [ ] x`, `1. [ ] x`, gạch đầu dòng thường `- x` (mới); mục lồng xếp phẳng.
- Hạn: `hạn` / `due` + `YYYY-MM-DD`, `YYYY-M-D`, `DD/MM/YYYY`, `D/M/YYYY`. Ngày không có thật thì cảnh báo, giữ trong tên.
- Tiêu đề bước: `## 1. x`, `## 1) x`, `## 2 x`, `## Bước 1: x`, `## Step 2) x`, `## x`. `## Nhật ký (quyết định)` / `## Decision
  log` là nhật ký; trong đó mỗi gạch đầu dòng hay dòng thường là một quyết định, ngày đầu dòng (hai kiểu) là ngày.
- Sau `Docs:`: mục là link, hoặc mục có rào ``` / ~~~ ngay dòng sau; mục của bước không cần thụt, của bước con thụt ≥ 2.
  Link không phải http(s): cảnh báo, bỏ. Thiếu rào đóng: đọc tới hết file, cảnh báo.
- Xem trước khi nhập liệt kê mọi cảnh báo.

## JSON

- Một dự án: `{format: "step-planner", version: 3, exportedAt, workspace}`. Sao lưu: `{…, workspaces: [...]}`. Trang không
  dựa vào `version`: bản 1 (có người, không tài liệu), bản 2 (không ô song song) vẫn nhập.
- Trường mới có mặc định (`outs`, `ins`, `doneAt`, `proof`, `sd`, `design.path`, `design.edges`) không tăng `version`: đi qua chuẩn hoá.
- Nhập nhận cả hai, mảng dự án, hoặc một dự án trần. Mục sai khuôn thì bỏ, kèm cảnh báo; không còn dự án nào thì báo lỗi,
  không lộ TypeError. Chữ mở bằng `{`, hay `[` rồi một giá trị JSON, là JSON; còn lại (kể cả `[tên](url)`) là Markdown.
- Mặc định tạo dự án mới (id mới cho bước, bước con, tài liệu, đầu ra; đầu vào, quyết định trỏ theo; trùng tên thì
  ` (imported)`, ` (imported 2)`…). "Thay dự án đang mở" (một dự án) có Hoàn tác.
