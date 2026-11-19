/* Dải tiến độ (minimap) cạnh phải mỗi khung (MDAN-016), thuần: đoạn theo vị trí / chiều cao từng đơn vị, khung nhìn,
   chấm nhận xét, vị trí cuộn khi bấm / kéo trên dải. Toạ độ vào là toạ độ nội dung của khung (tổng cao total),
   ra là px trên dải cao H.
   Xuất: mmDots, mmScroll, mmSegments, mmView.
   Dùng: không module nào. */

/* Đoạn của dải: items [{ top, bottom, state }] theo thứ tự (state: 'done' | 'changed' | 'todo' | 'sug'). Mỗi đơn vị
   co theo H / total, cao ít nhất minH; hai đơn vị liền nhau cùng trạng thái, cách nhau ≤ gap px trên dải, gộp một đoạn
   (văn bản dài không thành nghìn phần tử). Trả [{ y, h, state, n }], n: số đơn vị trong đoạn. */
export function mmSegments(items, total, H, minH, gap) {
  var out = [], k = total > 0 ? H / total : 0, last = null;
  minH = minH || 0; gap = gap == null ? 1 : gap;
  items.forEach(function (it) {
    if (!(it.bottom > it.top) || !k) return;
    var y = Math.max(0, Math.min(H, it.top * k)), b = Math.max(0, Math.min(H, it.bottom * k));
    if (b - y < minH) { b = Math.min(H, y + minH); y = Math.max(0, b - minH); }
    if (last && last.state === it.state && y - (last.y + last.h) <= gap) {
      last.h = Math.max(last.h, b - last.y); last.n++;
      return;
    }
    last = { y: y, h: b - y, state: it.state, n: 1 };
    out.push(last);
  });
  return out;
}
/* Hộp khung nhìn trên dải: phần [scroll, scroll + view] của nội dung cao total, cao ít nhất minH, trọn trong dải. */
export function mmView(scroll, view, total, H, minH) {
  if (!(total > 0)) return { y: 0, h: H };
  var h = Math.min(H, Math.max(minH || 0, view / total * H)), y = scroll / total * H;
  return { y: Math.max(0, Math.min(H - h, y)), h: h };
}
/* Vị trí cuộn khi bấm / kéo tới y trên dải: điểm ấy của nội dung nằm giữa khung nhìn, kẹp trong [0, total - view]. */
export function mmScroll(y, H, total, view) {
  if (!(H > 0) || !(total > view)) return 0;
  var s = Math.max(0, Math.min(1, y / H)) * total - view / 2;
  return Math.max(0, Math.min(total - view, s));
}
/* Chấm nhận xét: ys (toạ độ nội dung) đổi ra px trên dải, bỏ chấm cách chấm trước < minGap px. Trả mảng y tăng dần. */
export function mmDots(ys, total, H, minGap) {
  var out = [];
  if (!(total > 0)) return out;
  ys.slice().sort(function (a, b) { return a - b; }).forEach(function (v) {
    var y = Math.max(0, Math.min(H, v / total * H));
    if (!out.length || y - out[out.length - 1] >= (minGap || 0)) out.push(y);
  });
  return out;
}
