#!/bin/sh
# Bật hook git của repo: git đọc thẳng thư mục tools/hooks/, không sinh file nào.
set -eu
cd "$(git rev-parse --show-toplevel)"
git config core.hooksPath tools/hooks
# Bản cũ sinh bộ điều phối vào .git/hooks; git không còn đọc chỗ đó nữa, xoá cho khỏi nhầm.
rm -f "$(git rev-parse --git-common-dir)/hooks/pre-commit" "$(git rev-parse --git-common-dir)/hooks/pre-push"
echo "hook git: đã bật (core.hooksPath = tools/hooks)"
