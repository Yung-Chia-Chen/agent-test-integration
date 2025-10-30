#!/bin/bash
# 連線測試腳本
# 在 Portainer 伺服器上執行此腳本來測試連線

echo "=========================================="
echo "測試連線到 RAGFlow 和 Ollama"
echo "=========================================="

echo ""
echo "1. 測試 RAGFlow (140.134.60.218:2120)..."
if curl -s --connect-timeout 5 http://140.134.60.218:2120 > /dev/null 2>&1; then
    echo "✅ RAGFlow 連線成功"
else
    echo "❌ RAGFlow 連線失敗"
fi

echo ""
echo "2. 測試 Ollama (140.134.60.218:2116)..."
if curl -s --connect-timeout 5 http://140.134.60.218:2116 > /dev/null 2>&1; then
    echo "✅ Ollama 連線成功"
else
    echo "❌ Ollama 連線失敗"
fi

echo ""
echo "3. 測試 DNS 解析..."
nslookup 140.134.60.218

echo ""
echo "4. 測試 ping..."
ping -c 3 140.134.60.218

echo ""
echo "=========================================="
echo "測試完成"
echo "=========================================="
