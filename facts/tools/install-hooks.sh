#!/bin/sh
# Đã dời về tools/install-hooks.sh — bộ điều phối hook là hạ tầng chung của cả repo, không
# riêng facts/. File này còn lại để mọi lệnh cũ `sh facts/tools/install-hooks.sh` vẫn chạy.
exec sh "$(git rev-parse --show-toplevel)/tools/install-hooks.sh" "$@"
