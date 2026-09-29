#!/usr/bin/env python3
"""Cổng chất lượng cho cooking/ — các trang bếp tự chứa, mỗi trang một file, cộng cooking/data/*.json.

Vì sao cần: mỗi trang ở đây là một tài liệu dài, tự chứa cả CSS lẫn JS inline, và push main =
deploy thẳng lên GitHub Pages. Không có build step nào bắt lỗi hộ, nên một anchor gãy hay một id
trùng sẽ ra web mà không ai biết. Công thức của các trang công thức nằm ở cooking/data/*.json,
nên cổng kiểm cả data — phần HTML không nhìn thấy nó.

Phép kiểm HTML nằm ở tools/htmlcheck.py, dùng chung với pages/tools/lint-pages.py — cooking/
có đúng bộ kiểm của pages/. File này giữ phần của riêng cooking/: cách chọn file, check_data()
cho cooking/data/*.json, và check_sisters() cho dòng
"trang chị em" ở chân trang.

Hai mức, theo đúng quy ước của factlint.py:
  · LỖI  — chặn commit. Sai khách quan, sửa được ngay.
  · XEM  — chỉ cảnh báo. Đáng nhìn nhưng không đủ chắc để chặn.

Chạy:
  python3 cooking/tools/lint-cooking.py          # tất cả trang + data
  python3 cooking/tools/lint-cooking.py a.html   # vài trang / file data cụ thể
  python3 cooking/tools/lint-cooking.py -v       # in cả mức XEM

Exit code: 1 nếu có LỖI, 0 nếu không.
"""
import json
import pathlib
import re
import sys

# Nạp bộ kiểm chung ở tools/ của gốc repo. Tắt .pyc: repo không bỏ qua __pycache__/, và mỗi lần
# chạy cổng không được để lại file lạ trong cây làm việc.
sys.dont_write_bytecode = True
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[2] / 'tools'))
import htmlcheck  # noqa: E402

COOKING_DIR = pathlib.Path(__file__).resolve().parent.parent



def check_data(path: pathlib.Path):
    """Kiểm một file cooking/data/*.json.

    Nội dung công thức chuyển sang JSON thì phần kiểm HTML không còn thấy nó nữa — cổng bị
    mù đúng chỗ nội dung vừa dọn tới. Ở đây chỉ kiểm thứ đúng/sai khách quan, và lãi thêm
    thứ HTML chưa bao giờ kiểm được: id trùng, khoá phân loại trỏ vào chỗ không tồn tại,
    và bảng region/dips lệch khỏi danh sách công thức.
    """
    errors = []
    try:
        d = json.loads(path.read_text(encoding='utf-8'))
    except Exception as e:
        return ['JSON không đọc được — %s' % e], []

    recipes = d.get('recipes') or []
    if not recipes:
        errors.append('không có công thức nào')

    ids, seen = [], set()
    for i, r in enumerate(recipes):
        where = r.get('id') or ('recipes[%d]' % i)
        for f in ('id', 'name', 'cat', 'ing', 'steps'):
            if f not in r or not r[f]:
                errors.append('%s: thiếu hoặc rỗng "%s"' % (where, f))
        rid = r.get('id')
        if rid:
            if rid in seen:
                errors.append('%s: id trùng' % rid)
            seen.add(rid)
            ids.append(rid)
        for step in (r.get('steps') or []):
            if not step.get('t') and not step.get('d'):
                errors.append('%s: có bước không có tên lẫn mô tả' % where)
        for ing in (r.get('ing') or []):
            if not ing.get('n'):
                errors.append('%s: có nguyên liệu không có tên' % where)

    # khoá phân loại phải tồn tại trong chính taxonomy của trang
    for key, tax in (('cat', 'cats'), ('role', 'roles'), ('diff', 'diffs')):
        allowed = {t.get('k') for t in (d.get(tax) or [])}
        if not allowed:
            continue
        if key == 'diff':
            allowed |= set(range(1, 6))     # diff là số, thang riêng
            continue
        for r in recipes:
            v = r.get(key)
            if v is not None and v not in allowed:
                errors.append('%s: %s="%s" không có trong %s' % (r.get('id'), key, v, tax))

    # bảng phụ khoá theo id công thức — lệch là bug thật, HTML không kiểm được
    for tbl in ('region', 'dips'):
        m = d.get(tbl)
        if isinstance(m, dict):
            orphan = [k for k in m if k not in seen]
            if orphan:
                errors.append('%s: %d khoá không khớp công thức nào (%s%s)'
                              % (tbl, len(orphan), ', '.join(orphan[:3]),
                                 '…' if len(orphan) > 3 else ''))
    return errors, []


def check_sisters():
    """Dòng "trang chị em" ở chân mỗi trang phải trỏ tới đủ mọi trang còn lại trong cooking/.

    Danh sách ấy viết tay ở từng trang, nên mỗi lần có trang mới là các trang cũ bị quên: đã có
    lúc bốn trang công thức không trỏ tới food-fundamentals.html và hai trang Âu không trỏ tới
    trang Hàn. Vì thế luôn kiểm cả thư mục, không chỉ file đang commit — thêm một trang mới là
    làm sai các trang CŨ, mà commit chỉ chứa trang mới.
    """
    pages = sorted(p.name for p in COOKING_DIR.glob('*.html'))
    errors = []
    for name in pages:
        s = (COOKING_DIR / name).read_text(encoding='utf-8')
        m = re.search(r'trang chị em:(.*?)</(?:div|footer)>', s, re.S)
        if not m:
            errors.append(f'{name}: chân trang không có dòng "trang chị em"')
            continue
        linked = set(re.findall(r'href="([a-z0-9-]+\.html)"', m.group(1)))
        missing = [p for p in pages if p != name and p not in linked]
        if missing:
            errors.append(f'{name}: dòng "trang chị em" thiếu ' + ', '.join(missing))
    return errors


def main(argv):
    verbose, names = htmlcheck.parse_args(argv)

    named_data = []
    if names:
        targets = []
        for n in names:
            p = pathlib.Path(n)
            if not p.is_absolute():
                p = COOKING_DIR / ('data/' if p.suffix == '.json' else '') / p.name
            if p.suffix == '.html' and p.exists():
                targets.append(p)
            elif p.suffix == '.json' and p.exists():
                named_data.append(p)
    else:
        targets = sorted(COOKING_DIR.glob('*.html'))

    # Hook truyền tên file đang commit; phải kiểm cả data được truyền, kẻo cổng im lặng
    # bỏ qua đúng chỗ nội dung vừa dọn tới.
    data_files = named_data if names else sorted((COOKING_DIR / 'data').glob('*.json'))

    if not targets and not data_files:
        print('lint-cooking: không có gì để kiểm.')
        return 0

    total_err = 0
    total_note = 0
    for path in data_files:
        errors, _ = check_data(path)
        total_err += len(errors)
        htmlcheck.print_result(f'data/{path.name}', errors, [], verbose)

    for path in targets:
        errors, notes = htmlcheck.check_page(path)
        total_err += len(errors)
        total_note += len(notes)
        htmlcheck.print_result(path.name, errors, notes, verbose)

    if targets:
        errors = check_sisters()
        total_err += len(errors)
        htmlcheck.print_result('trang chị em (cả thư mục)', errors, [], verbose)

    print()
    if total_note and not verbose:
        print(f'{total_note} mục mức XEM (thêm -v để xem).')
    if total_err:
        print(f'cooking: {total_err} LỖI trên {len(targets)} trang + {len(data_files)} file data.')
        return 1
    print(f'cooking: OK ({len(targets)} trang, {len(data_files)} file data).')
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
