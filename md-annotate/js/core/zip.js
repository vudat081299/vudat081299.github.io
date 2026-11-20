/* Ghi file ZIP, thuần (không DOM, không nén): mỗi mục lưu nguyên (method 0, "store"), tên UTF-8 (cờ bit 11), CRC-32,
   header cục bộ, thư mục trung tâm, bản ghi kết thúc. Không ZIP64: quá 65 535 mục hay 4 GiB thì ném lỗi.
   Mục có path kết thúc bằng '/' là folder (rỗng), để folder trống vẫn có trong file tải về.
   Giờ trong ZIP là giờ địa phương kiểu MS-DOS (2 giây một nấc, từ 1980).
   Xuất: crc32, zipFiles.
   Dùng: không module nào. */

var TABLE = null;
function table() {
  if (TABLE) return TABLE;
  TABLE = new Uint32Array(256);
  for (var n = 0; n < 256; n++) {
    var c = n;
    for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
    TABLE[n] = c >>> 0;
  }
  return TABLE;
}
/* CRC-32 (IEEE, như zlib) của một mảng byte. */
export function crc32(bytes) {
  var t = table(), c = 0xFFFFFFFF;
  for (var i = 0; i < bytes.length; i++) c = t[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function dosTime(d) {
  var y = d.getFullYear();
  if (y < 1980) return { time: 0, date: (0 << 9) | (1 << 5) | 1 };
  if (y > 2107) y = 2107;
  return {
    time: (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1),
    date: ((y - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate()
  };
}
/* files: [{ path, text }] (path dùng '/', không bắt đầu bằng '/'); date: giờ ghi cho mọi mục (mặc định bây giờ).
   Trả Uint8Array của cả file .zip. */
export function zipFiles(files, date) {
  var enc = new TextEncoder(), t = dosTime(date instanceof Date && !isNaN(date) ? date : new Date());
  if (files.length > 0xFFFF) throw new Error('Too many files for a ZIP without ZIP64.');
  var items = files.map(function (f) {
    var dir = /\/$/.test(f.path), name = enc.encode(f.path), data = dir ? new Uint8Array(0) : enc.encode(f.text || '');
    return { name: name, data: data, crc: crc32(data), dir: dir };
  });
  var size = 22;
  items.forEach(function (it) { size += 30 + it.name.length + it.data.length + 46 + it.name.length; });
  if (size > 0xFFFFFFFF) throw new Error('ZIP larger than 4 GiB needs ZIP64.');
  var out = new Uint8Array(size), v = new DataView(out.buffer), o = 0;
  var u16 = function (x) { v.setUint16(o, x, true); o += 2; };
  var u32 = function (x) { v.setUint32(o, x >>> 0, true); o += 4; };
  var put = function (b) { out.set(b, o); o += b.length; };
  /* Phần chung của header cục bộ và mục thư mục trung tâm: cần 2.0, cờ UTF-8, store, giờ, CRC, cỡ, độ dài tên. */
  var common = function (it) {
    u16(20); u16(0x0800); u16(0); u16(t.time); u16(t.date);
    u32(it.crc); u32(it.data.length); u32(it.data.length); u16(it.name.length);
  };
  items.forEach(function (it) {
    it.at = o;
    u32(0x04034B50); common(it); u16(0); put(it.name); put(it.data);
  });
  var cd = o;
  items.forEach(function (it) {
    u32(0x02014B50); u16(20); common(it);
    u16(0); u16(0); u16(0); u16(0); u32(it.dir ? 0x10 : 0); u32(it.at); put(it.name);
  });
  var cdSize = o - cd;
  u32(0x06054B50); u16(0); u16(0); u16(items.length); u16(items.length); u32(cdSize); u32(cd); u16(0);
  return out;
}
