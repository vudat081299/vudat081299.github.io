---
name: agent-practices
description: Mẹo làm việc đã phải trả giá mới rút ra trong repo này, không riêng project nào. Dùng khi chạy nhiều subagent song song, sửa hàng loạt bằng script, trích nguồn hay con số (facts/, shop/docs/), đo hoặc chụp một trang trong trình duyệt, làm lại giao diện mà phải giữ nguyên hành vi, hoặc làm việc trong worktree. KHÔNG dùng để tra luật của một project cụ thể — luật ấy ở CLAUDE.md của project đó.
---

# Mẹo làm việc chung trong repo này

Mỗi mục dưới đây từng làm mất thời gian thật hoặc sinh lỗi thật. Luật của từng project không ở đây.

## Chạy nhiều agent

- Tổng số agent mặc định khoảng 5–7, ước lượng **trước** khi sinh (REPO-010). Chạy song song không
  làm tổng quota ít đi, chỉ đốt nhanh hơn.
- Mỗi agent làm trong một worktree riêng và **commit sớm**: một lần chạm giới hạn quota không làm mất
  việc. Gặp giới hạn thì kiểm `git log` từng worktree trước khi nhắn lại cho agent nào.
- Agent review sửa luôn phần của mình (nhắn tiếp cho chính agent ấy); bước tích hợp và soát cuối thì
  phiên chính tự làm — người gộp không phải người sửa.
- Đưa agent một bản trích (extract) thì **đếm lại** các trường then chốt trong bản trích và so với
  nguồn trước khi giao. Bản trích lặng lẽ rơi mất nội dung còn tệ hơn bản trích sập: agent không báo
  được thứ nó không bao giờ thấy (từng gặp: mảng object in ra `[object Object]`, dữ liệu nằm trong
  `<script>` chứ không trong `<template>` nên trích ra rỗng). Grep bản trích tìm `[object Object]` và
  mục rỗng; dặn agent nói ra khi một trường trông hỏng.
- File brief để agent khác đọc: ghi xong thì `ls` lại **đúng** đường dẫn đã đưa agent, trước khi sinh
  agent.

## Sửa hàng loạt bằng script

- `assert s.count(a) == 1` cho từng phép thay chỉ chứng minh các phép bạn viết ra đều trúng, **không**
  chứng minh độ phủ. Kết thúc bằng một lượt quét ngược trên **kết quả**: đi cây text đã render, bắt node
  còn mang dấu hiệu "phía chưa xử lý". Phép kiểm cặp (mỗi `.t-en` có `.t-vi`) không bắt được phần tử
  chưa hề được đụng tới, nên phải có cả hai phép quét.
- Script bị ngắt giữa chừng thì lượt viết lại là một bản thảo MỚI: giả định nó thiếu gì đó và đi tìm.
- Sửa tiếng Việt bằng cách cắt chuỗi con trên bản gốc, đừng gõ lại — gõ lại sinh lỗi chính tả.

## Nguồn và con số

- WebFetch là **tóm tắt của một model nhỏ**, không phải nguồn: nó từng bịa ngày đăng dù câu trích vẫn
  khớp. Dùng WebFetch/WebSearch để *tìm*; để gắn nhãn `[đã kiểm]` thì `curl -sL -A "Mozilla/5.0" URL`,
  bỏ thẻ script/style, grep đúng câu định trích; ngày thì đọc `datePublished` / `dateModified` trong
  JSON-LD. curl bị chặn (403 — fsis.usda.gov, cdc.gov, foodsafety.gov đều vậy) hoặc trang dựng bằng
  JS: mở bằng Chrome thật (playwright, mục *Đo và chụp* dưới) rồi đọc `document.body.innerText` — vẫn
  là đọc nguồn. Không mở được bằng cả hai cách thì ghi `[chưa kiểm]`.
- Bản sửa của một phiên cũ — nhánh chưa gộp, báo cáo rà — cũng là một nguồn phải kiểm, dù nó ghi là
  đã đối chiếu: một nhánh từng "sửa" bảng lưu giữ cồn của USDA mà đọc lệch đúng một dòng (35% là mốc
  30 phút, không phải một giờ). Đối chiếu lại với tài liệu gốc, không với lời của nhánh.
- Con số đúng không làm kết luận đúng. Trước khi dùng một tỉ phần, hỏi **mẫu số là gì** và thứ mình kết
  luận có nằm trong mẫu số không: các phần cộng lại đúng 100% trong một tập đóng thì chỉ so sánh được
  *bên trong* tập ấy. Nhãn `[đã kiểm]` cho con số, nhãn riêng (`[chưa kiểm]`, `[đoán]`) cho suy luận.
- Chủ trang chỉ ra một lỗi thì sửa cả **lớp lỗi**: đo xem lớp ấy rộng tới đâu, sửa ở cổng, rồi rà lại.

## Đo và chụp trang trong trình duyệt

- Tin số đo (`getComputedStyle`, `getBoundingClientRect`, cây accessibility) hơn ảnh chụp. Tràn ngang:
  `document.documentElement.scrollWidth - document.documentElement.clientWidth` phải bằng 0.
- Ảnh ra đen hoặc một màu trơn thường là lỗi của khung xem, không phải lỗi render: lớp phủ
  `position:fixed; inset:0`, khung bị thu (`innerWidth === 0` — đừng tin số đo nào lúc ấy, ép
  `resize_window` rồi đo lại), hoặc khung bị ẩn (`document.hidden` → `requestAnimationFrame` không
  chạy, canvas đứng im).
- Cần ảnh thật thì Chrome headless:
  `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size=W,H --virtual-time-budget=9000 --screenshot=out.png <url>`.
  - macOS không có lệnh `timeout`; bọc lệnh trong nó là lệnh lặng lẽ không chạy.
  - headless ép bề rộng tối thiểu 500px, nên không chụp được khổ điện thoại thật.
  - dưới `--virtual-time-budget`, CSS transition không chạy xong: tiêm `transition:none!important`.
  - trang đã cuộn chụp ra trống: dựng một trang dò tạm cạnh file thật, ẩn mọi mục trừ mục cần xem, chụp
    từ đỉnh, xoá trang dò trước khi commit. Đừng chạy nhiều lần headless liên tiếp trong một dòng shell.
- Asset dùng chung không kèm query version bị trình duyệt giữ bản cũ — đo nhầm bản cũ. Xác minh bằng
  headless hoặc thêm query version khi thử.
- Kiểm tương phản bằng JS: tổng hợp màu có alpha lên nền của mọi tổ tiên; bỏ qua nền là gradient cao
  ≤ 2px (đường kẻ mảnh, không phải nền của chữ); phần tử nền trong suốt mà có ảnh gradient đục thì dùng
  các điểm dừng của gradient. Sai mấy chỗ này ra lỗi tương phản giả.
- Mở trang qua HTTP (`python3 -m http.server` ở gốc repo), không qua `file://`.

## Làm lại giao diện mà giữ nguyên hành vi

Chứng minh bằng đo, không bằng mắt:

1. Chép trang gốc sang `scratchpad/orig/`, dựng bản mới vào `scratchpad/new/`; phục vụ cả hai bằng một
   server không cache.
2. Dùng `playwright-core` cài trong scratchpad. Mỗi lần mở trang thì gieo `Math.random` và xoá
   `localStorage`.
3. Bấm mọi nút của mọi mục; sau mỗi lần bấm chụp `textContent` của mọi phần tử có id; so gốc với mới ở
   vài bề rộng. Chạy bản gốc hai lần trước: ra 0 khác biệt thì phép đo mới tất định.
4. So riêng chữ đã bóc thẻ của từng mục để chứng minh nội dung giống từng byte.

Phép này chứng minh bản mới không đổi hành vi, không chứng minh hành vi vốn đúng — rà nội dung là việc khác.

## Đường dẫn và worktree

- Đừng gõ tay đường dẫn repo (`vudat081299` — có số 0): lấy bằng `git rev-parse --show-toplevel`.
  Thấy file "lúc có lúc không" thì `ls` thư mục cha và so từng byte của hai đường dẫn trước khi nghi hạ tầng.
- Làm trong worktree thì mọi lệnh ghi đều trỏ vào worktree (`git -C "$WT" …`, đường dẫn tuyệt đối).
  Shell là zsh: đừng nhét lệnh vào biến rồi gọi `$G` — zsh không tách từ.
- Hook git dùng chung giữa mọi worktree (`git rev-parse --git-common-dir`); cài một lần bằng
  `sh tools/install-hooks.sh` là đủ.
