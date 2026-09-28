#!/usr/bin/env python3
"""PreToolUse (Bash) — chặn lệnh git viết lại lịch sử hoặc force-push trước khi agent kiểm HEAD.

Vì sao: repo có nhiều phiên agent chạy song song và cùng push thẳng lên main, nên HEAD có thể
không còn là commit bạn vừa tạo. `--amend` sửa "commit đang là HEAD", không phải "commit của
tôi" — đã có lần nó ghi đè message của phiên khác. Luật nằm ở CLAUDE.md gốc, mục Git; hook này
biến luật ấy từ chữ thành cổng.

Chặn gì:
  · commit --amend, rebase, pull --rebase, reset --hard — chặn và in HEAD + 3 commit gần nhất.
    Đã kiểm và đúng là commit của mình thì chạy lại với mã HEAD ở đầu lệnh:
        GIT_REWRITE_OK=<sha> git commit --amend …
    Phiên khác vừa commit thì HEAD đổi, mã không khớp, lệnh vẫn bị chặn — đúng trường hợp cần chặn.
    --amend lên một commit đã có trên origin/main thì chặn luôn: đã push rồi thì tạo commit mới.
  · push kèm --force / -f / --force-with-lease / +ref — luôn chặn. Force-push lên main phải hỏi
    chủ repo; chủ repo tự chạy bằng `! git push …` nếu đồng ý.

Exit 2 = Claude Code chặn lệnh và đưa stderr cho agent đọc. Mọi lỗi khác của chính script này
đều cho lệnh đi qua (exit 0), để một hook hỏng không khoá cả phiên.
"""
import json
import os
import re
import shlex
import subprocess
import sys

CONTROL = {'&&', '||', ';', '|', '&', '(', ')', ';;', '|&'}
REBASE_SAFE = {'--abort', '--continue', '--skip', '--quit', '--edit-todo', '--show-current-patch'}
TOKEN_ENV = 'GIT_REWRITE_OK'


def git(args, cwd, timeout=10):
    try:
        r = subprocess.run(['git'] + args, cwd=cwd, capture_output=True, text=True, timeout=timeout)
        return r.returncode, r.stdout.rstrip()
    except (OSError, subprocess.SubprocessError):
        return 1, ''


def segments(cmd):
    lex = shlex.shlex(cmd, posix=True, punctuation_chars=True)
    lex.whitespace_split = True
    seg = []
    for tok in lex:
        if tok in CONTROL:
            if seg:
                yield seg
            seg = []
        else:
            seg.append(tok)
    if seg:
        yield seg


def parse_git(seg, cwd):
    """Trả (thư mục repo, lệnh con, tham số, env) nếu đoạn này là một lệnh git, không thì None."""
    env = {}
    i = 0
    while i < len(seg) and re.match(r'^[A-Za-z_][A-Za-z0-9_]*=', seg[i]):
        k, v = seg[i].split('=', 1)
        env[k] = v
        i += 1
    if i >= len(seg) or os.path.basename(seg[i]) != 'git':
        return None
    i += 1
    where = cwd
    while i < len(seg) and seg[i].startswith('-'):
        opt = seg[i]
        if opt == '-C' and i + 1 < len(seg):
            where = os.path.join(where, os.path.expanduser(seg[i + 1]))
            i += 2
        elif opt in ('-c', '--git-dir', '--work-tree', '--namespace') and i + 1 < len(seg):
            i += 2
        else:
            i += 1
    if i >= len(seg):
        return None
    return where, seg[i], seg[i + 1:], env


def is_force_push(args):
    for a in args:
        if a in ('--force', '--force-with-lease', '--force-if-includes') or \
                a.startswith('--force-with-lease=') or a.startswith('--force-if-includes='):
            return True
        if a.startswith('-') and not a.startswith('--') and 'f' in a[1:]:
            return True
        if a.startswith('+') and len(a) > 1:
            return True
    return False


def rewrite_kind(sub, args):
    if sub == 'commit' and '--amend' in args:
        return 'commit --amend'
    if sub == 'rebase' and not (set(args) & REBASE_SAFE):
        return 'rebase'
    if sub == 'pull' and any(a in ('--rebase', '-r') or a.startswith('--rebase=') for a in args) \
            and '--rebase=false' not in args:
        return 'pull --rebase'
    if sub == 'reset' and '--hard' in args:
        return 'reset --hard'
    return None


def explain(kind, where, head):
    _, log = git(['log', '--format=  %h %s — %an, %ar', '-3'], where)
    git(['fetch', 'origin', 'main', '-q'], where, timeout=15)
    rc, lr = git(['rev-list', '--left-right', '--count', 'origin/main...HEAD'], where)
    lines = [
        f'Chặn: `git {kind}` viết lại lịch sử.',
        'Repo này có nhiều phiên chạy song song và cùng push thẳng lên main, nên HEAD có thể không',
        'còn là commit bạn vừa tạo (luật ở CLAUDE.md gốc, mục Git).',
        '',
        f'HEAD và 3 commit gần nhất ({where}):',
        log or '  (không đọc được git log)',
    ]
    if rc == 0 and lr:
        behind, ahead = lr.split()
        lines.append(f'So với origin/main: {behind} commit chỉ có trên origin, {ahead} commit chỉ có ở local.')
    lines += [
        '',
        'Kiểm xong mà HEAD đúng là commit của bạn và CHƯA push thì chạy lại với tiền tố:',
        f'  {TOKEN_ENV}={head[:7]} git {kind} …',
        'HEAD không phải của bạn thì DỪNG — đừng amend/rebase lên commit của phiên khác.',
    ]
    return '\n'.join(lines) + '\n'


def check(seg, cwd):
    parsed = parse_git(seg, cwd)
    if not parsed:
        return None
    where, sub, args, env = parsed
    if sub == 'push' and is_force_push(args):
        return ('Chặn: force-push. Luật repo: force-push lên main luôn phải hỏi chủ repo trước, kể cả khi\n'
                'commit là của chính bạn — bạn không biết phiên khác đang ở đâu. Hỏi chủ repo; nếu đồng ý,\n'
                'để họ tự chạy bằng `! git push …`. Đồng bộ bình thường thì dùng commit mới, không force.\n')
    kind = rewrite_kind(sub, args)
    if not kind:
        return None
    rc, head = git(['rev-parse', 'HEAD'], where)
    if rc != 0 or not head:
        return None
    if kind == 'commit --amend':
        rc_up, _ = git(['rev-parse', '--verify', '-q', 'origin/main'], where)
        pushed, _ = git(['merge-base', '--is-ancestor', 'HEAD', 'origin/main'], where)
        if rc_up == 0 and pushed == 0:
            return (f'Chặn: HEAD ({head[:7]}) đã có trên origin/main. Đã push rồi thì đừng amend —\n'
                    'sửa bằng một commit mới nói rõ chỗ sai (luật ở CLAUDE.md gốc, mục Git).\n')
    token = env.get(TOKEN_ENV, '')
    if len(token) >= 7 and head.startswith(token):
        return None
    return explain(kind, where, head)


def main():
    try:
        data = json.load(sys.stdin)
    except (ValueError, OSError):
        return 0
    cmd = (data.get('tool_input') or {}).get('command') or ''
    if 'git' not in cmd:
        return 0
    cwd = data.get('cwd') or os.getcwd()
    try:
        segs = list(segments(cmd))
    except ValueError:
        return 0
    for seg in segs:
        msg = check(seg, cwd)
        if msg:
            sys.stderr.write(msg)
            return 2
    return 0


if __name__ == '__main__':
    try:
        sys.exit(main())
    except SystemExit:
        raise
    except Exception:  # hook hỏng thì cho lệnh đi qua, đừng khoá cả phiên
        sys.exit(0)
