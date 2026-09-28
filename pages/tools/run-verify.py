#!/usr/bin/env python3
"""Chạy các cổng kiến thức `pages/tools/verify-*.py` — hook pre-commit, check.sh và CI cùng gọi file này.

Mỗi cổng khai trang nó kiểm ở một dòng gần đầu file:

    PAGES = ['pages/<trang>.html', …]

Nhờ vậy thêm một cổng mới là xong: không phải khai tên nó ở hook, ở gates.yml hay trong tài
liệu. Trước đây phải sửa tay cả ba chỗ ấy cho mỗi cổng, và đã có lần quên: hai cổng verify-*
sống vài tuần chỉ trên máy người viết, GitHub Actions không chạy.

Lệnh:
  python3 pages/tools/run-verify.py              chạy mọi cổng
  python3 pages/tools/run-verify.py <file>…      chỉ cổng có trang (hoặc chính file cổng) trong danh sách
  python3 pages/tools/run-verify.py --list       cổng nào kiểm trang nào

Cổng thiếu dòng PAGES, hoặc khai một trang không tồn tại, là lỗi — nếu không, cổng ấy sẽ lặng lẽ
không bao giờ được chạy ở pre-commit.
"""
import ast
import pathlib
import subprocess
import sys
import time

HERE = pathlib.Path(__file__).resolve().parent
ROOT = HERE.parent.parent


def discover():
    """[(đường dẫn cổng, [trang…] hoặc None, lỗi hoặc None)]"""
    out = []
    for v in sorted(HERE.glob('verify-*.py')):
        rel = v.relative_to(ROOT).as_posix()
        pages, err = None, None
        try:
            tree = ast.parse(v.read_text(encoding='utf-8'))
        except SyntaxError as e:
            out.append((rel, None, f'không đọc được: {e}'))
            continue
        for node in tree.body:
            if isinstance(node, ast.Assign) and any(
                    isinstance(t, ast.Name) and t.id == 'PAGES' for t in node.targets):
                try:
                    pages = ast.literal_eval(node.value)
                except ValueError:
                    err = 'PAGES phải là một list chuỗi viết thẳng, không tính toán'
        if err is None:
            if not pages or not isinstance(pages, list) or not all(isinstance(p, str) for p in pages):
                err = "thiếu dòng PAGES = ['pages/<trang>.html', …] ở đầu file"
            else:
                missing = [p for p in pages if not (ROOT / p).is_file()]
                if missing:
                    err = 'PAGES khai trang không tồn tại: ' + ', '.join(missing)
        out.append((rel, pages, err))
    return out


def main(argv):
    gates = discover()
    bad = [(g, e) for g, _, e in gates if e]
    if '--list' in argv:
        for g, pages, e in gates:
            print(f'{g}: ' + (', '.join(pages) if pages else f'LỖI — {e}'))
        return 1 if bad else 0
    if bad:
        for g, e in bad:
            print(f'run-verify: {g}: {e}')
        return 1

    changed = {a for a in argv if not a.startswith('-')}
    if changed:
        todo = [(g, p) for g, p, _ in gates if g in changed or changed.intersection(p)]
    else:
        todo = [(g, p) for g, p, _ in gates]

    failed = []
    for g, pages in todo:
        t0 = time.time()
        print(f'run-verify: {g} ({", ".join(pages)})', flush=True)
        rc = subprocess.run([sys.executable, str(ROOT / g)], cwd=str(ROOT)).returncode
        print(f'run-verify: {g} → {"qua" if rc == 0 else "TRƯỢT"} ({time.time() - t0:.1f}s)', flush=True)
        if rc != 0:
            failed.append((g, pages))

    for g, pages in failed:
        sys.stderr.write(f"""
──────────────────────────────────────────────────────────────────────
Cổng kiến thức {g} không qua — kiểm {', '.join(pages)}.

Hoặc một con số / dữ liệu trong trang vừa lệch khỏi phép tính của nó, hoặc một
dòng JS then chốt đã đổi. Sửa trang cho khớp — hoặc, nếu con số mới mới là đúng,
sửa phép tính trong cổng. Cổng kiểm gì: đọc docstring đầu file ấy.

Chạy lại:  python3 {g}
──────────────────────────────────────────────────────────────────────
""")
    if not todo and changed:
        print('run-verify: commit không chạm trang nào có cổng kiến thức.')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
