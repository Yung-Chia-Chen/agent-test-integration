#!/bin/sh
set -e

# 確保 uploads 目錄存在
# 如果目錄已經存在（由 volume 掛載），不會報錯
mkdir -p /app/uploads/products 2>/dev/null || true

# 啟動應用程式
exec node server.js
