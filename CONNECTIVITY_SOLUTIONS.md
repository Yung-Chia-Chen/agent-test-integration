# Ollama/RAGFlow 連線問題解決方案

## 問題描述
Portainer 部署在 Amazon EC2，需要連接到 140.134.60.218:2116 (Ollama) 和 140.134.60.218:2120 (RAGFlow)

## 測試步驟

### 1. 先測試連線
在 Portainer 伺服器上執行：
```bash
# 下載測試腳本
curl -O https://raw.githubusercontent.com/Yung-Chia-Chen/agent-test-integration/main/test_connectivity.sh
chmod +x test_connectivity.sh
./test_connectivity.sh
```

或手動測試：
```bash
# 測試 Ollama
curl -v http://140.134.60.218:2116

# 測試 RAGFlow
curl -v http://140.134.60.218:2120
```

## 解決方案

### 方案 A：如果測試成功 ✅
直接使用原本的配置，OLLAMA_HOST 設定為 `140.134.60.218:2116`

### 方案 B：如果測試失敗 ❌

#### 選項 1：在您家裡架設反向代理（簡單）
在您家裡可以連到 Ollama 的電腦上執行：

```bash
# 安裝 nginx 或使用 Docker
docker run -d --name ollama-proxy \
  -p 8116:80 \
  nginx:alpine

# 配置 nginx 轉發到 140.134.60.218:2116
# 然後使用動態 DNS 或 ngrok 讓 Amazon 可以連到您家的 IP
```

#### 選項 2：使用 ngrok 隧道（最快）
在您家裡的電腦上：
```bash
# 安裝 ngrok
brew install ngrok  # macOS

# 啟動隧道轉發到 Ollama
ngrok http 140.134.60.218:2116
```

會得到一個公網網址如 `https://abc123.ngrok.io`，在 Portainer 環境變數中使用這個網址。

#### 選項 3：修改防火牆規則（需要權限）
如果 140.134.60.218 是您可以控制的伺服器：
1. 登入該伺服器
2. 開放防火牆允許 43.212.245.102 (Amazon IP) 連入
3. 或開放給所有 IP（不推薦）

#### 選項 4：將 Ollama 也部署到 Amazon
在 Portainer 中再部署一個 Ollama 容器：
```yaml
version: '3.8'
services:
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama-data:/root/.ollama

volumes:
  ollama-data:
```

然後環境變數改為：
```
OLLAMA_HOST=ollama:11434
```

## 推薦流程

1. **立即執行**：先用測試腳本確認連線狀況
2. **如果能連**：直接部署，無需修改
3. **如果不能連**：
   - 快速方案：使用 ngrok（10分鐘內完成）
   - 長期方案：部署 Ollama 到 Amazon（需要下載模型）

## 當前設定檢查

您目前的環境變數：
- OLLAMA_HOST=140.134.60.218:2116
- RAGFLOW_BASE_URL=http://140.134.60.218:2120

需要測試這兩個服務從 Amazon 是否可達。
