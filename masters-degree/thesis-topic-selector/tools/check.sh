#!/bin/sh
# Cổng của thesis-topic-selector: bảng hiệu chuẩn còn khớp danh sách đề tài trên trang.
set -u
cd "$(dirname "$0")/.."
node calibrate.js --check
