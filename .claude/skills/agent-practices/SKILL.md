---
name: agent-practices
description: Mẹo làm việc đã phải trả giá mới rút ra trong repo này, không riêng project nào. Dùng khi chạy nhiều subagent song song, sửa hàng loạt bằng script, trích nguồn hay con số (facts/, shop/docs/), đo hoặc chụp một trang trong trình duyệt, làm lại giao diện mà phải giữ nguyên hành vi, hoặc làm việc trong worktree. KHÔNG dùng để tra luật của một project cụ thể — luật ấy ở CLAUDE.md của project đó.
---

# Mẹo làm việc chung trong repo này

Mỗi mục từng làm mất thời gian hoặc sinh lỗi thật. Luật của từng project không ở đây.

## Nhiều agent

- Mặc định khoảng 5–7 agent một đợt, ước lượng trước khi sinh (REPO-010).
- Mỗi agent một worktree riêng, commit sớm. Chạm giới hạn quota thì kiểm `git log` từng worktree trước.
- Agent review tự sửa phần của mình; phiên chính tự ghép và soát cuối.
- Giao bản trích cho agent thì đếm lại các trường chính so với nguồn trước: bản trích hay lặng lẽ rỗng,
  hoặc ra `[object Object]`.
- Ghi file brief xong thì `ls` lại đúng đường dẫn trước khi sinh agent.
- Script dùng chung trong scratchpad có thể bị agent khác ghi đè: đặt tên riêng cho script của mình.

## Sửa hàng loạt bằng script

- `assert s.count(a) == 1` chỉ chứng minh phép thay trúng chỗ, không chứng minh đã phủ hết. Kết thúc bằng
  một lượt quét trên kết quả để tìm chỗ còn sót.
- Script bị ngắt giữa chừng thì coi lần chạy lại là bản mới, và đi tìm chỗ thiếu.
- Sửa tiếng Việt bằng cách cắt chuỗi từ bản gốc, đừng gõ lại.

## Nguồn và con số

- WebFetch là bản tóm tắt của model nhỏ, không phải nguồn. Dùng nó để tìm; để kiểm thì
  `curl -sL -A "Mozilla/5.0" URL` rồi grep đúng câu. Ngày đăng: đọc `datePublished` trong JSON-LD.
- curl bị chặn (403 — fsis.usda.gov, cdc.gov, foodsafety.gov) hoặc trang dựng bằng JS: mở bằng Chrome thật
  (playwright) và đọc `document.body.innerText`. Không mở được thì ghi `[chưa kiểm]`.
- Bản sửa của một phiên cũ cũng phải đối chiếu lại với tài liệu gốc: một nhánh cũ từng đọc lệch một dòng
  bảng USDA.
- Trước khi dùng một tỉ phần, hỏi mẫu số là gì. Nhãn `[đã kiểm]` cho con số; suy luận thì `[chưa kiểm]`
  hoặc `[đoán]`.
- Chủ trang chỉ ra một lỗi thì sửa cả lớp lỗi: đo xem nó rộng tới đâu, sửa ở cổng, rồi rà lại.

## Đo trong trình duyệt

- Tin số đo (`getComputedStyle`, `getBoundingClientRect`) hơn ảnh chụp. Tràn ngang:
  `scrollWidth - clientWidth` phải bằng 0.
- Mở trang qua HTTP (`python3 -m http.server`), không qua `file://`; kiểm mã 200 trước khi tin số đo.
- Ảnh đen hay trơn thường do khung xem: lớp phủ `position:fixed; inset:0`, khung bị thu
  (`innerWidth === 0`), hoặc khung bị ẩn (`requestAnimationFrame` không chạy).
- Chụp ảnh thật:
  `"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --window-size=W,H --virtual-time-budget=9000 --screenshot=out.png <url>`.
  Headless ép bề rộng tối thiểu 500px (khổ điện thoại thì đo bằng playwright); transition không chạy xong
  dưới `--virtual-time-budget` (tiêm `transition:none!important`); macOS không có lệnh `timeout`.
- Asset dùng chung không có query version bị cache: thêm query khi thử.
- Kiểm tương phản: trộn màu có alpha lên nền của mọi tổ tiên; bỏ qua gradient cao ≤ 2px (đường kẻ).

## Làm lại giao diện mà giữ nguyên hành vi

1. Phục vụ bản gốc và bản mới cạnh nhau, không cache.
2. playwright-core: gieo `Math.random`, xoá `localStorage` mỗi lần mở trang.
3. Bấm mọi nút; sau mỗi lần bấm ghi `textContent` của mọi phần tử có id; so gốc với mới ở vài bề rộng.
   Chạy bản gốc hai lần trước để chắc phép đo tất định.
4. So chữ đã bóc thẻ của từng mục.

Phép này chỉ chứng minh hành vi không đổi, không chứng minh hành vi đúng.

## Đường dẫn và worktree

- Đừng gõ tay đường dẫn repo (`vudat081299` có số 0): dùng `git rev-parse --show-toplevel`.
- Trong worktree, mọi lệnh ghi trỏ vào worktree (`git -C "$WT" …`).
- zsh không tách từ khi gọi lệnh cất trong biến (`$G`), và `echo ===` lỗi vì `=` đứng đầu từ.
- Hook git đọc từ `tools/hooks` của chính worktree (`core.hooksPath`), nên worktree cũ chạy hook cũ.
