# Agent Test Integration - 部署指南

## 📦 使用 Portainer 部署

### 前置準備

1. **確保 Portainer 已安裝並運行**
2. **準備好以下資訊**：
   - OpenAI API Key
   - RAGFlow 服務地址和 API Key
   - Ollama 服務地址

### 方法一：使用 Docker Compose (推薦)

#### 步驟 1: 準備專案

```bash
# 確保所有檔案都已保存
git add .
git commit -m "Add Docker configuration"
```

#### 步驟 2: 在 Portainer 中部署

1. **登入 Portainer** (從截圖看到的網址)
2. **選擇 "local" 環境**
3. **點擊左側 "Stacks"**
4. **點擊 "+ Add stack"**
5. **設置 Stack 資訊**：
   - Name: `agent-test-integration`
   - Build method: 選擇 "Upload" 或 "Git Repository"

##### 選項 A: 使用 Upload (簡單)

1. 將整個專案打包成 zip：
   ```bash
   cd /Users/chenyongjia/Documents/code/agent_test_Integration
   zip -r agent-test.zip . -x "node_modules/*" ".next/*" "uploads/*"
   ```

2. 在 Portainer 上傳 `agent-test.zip`

##### 選項 B: 使用 Git Repository (推薦)

1. 將專案推送到 GitHub/GitLab：
   ```bash
   git remote add origin <your-git-repo-url>
   git push -u origin main
   ```

2. 在 Portainer 填寫：
   - Repository URL: 你的 Git 倉庫地址
   - Repository reference: `refs/heads/main`
   - Compose path: `docker-compose.yml`

#### 步驟 3: 設置環境變數

在 Portainer 的 "Environment variables" 區塊，添加以下變數：

**必要變數**：
```
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=你的-OpenAI-API-Key
OPENAI_MODEL_NAME=gpt-4o-mini

RAGFLOW_BASE_URL=你的-RAGFlow-地址
RAGFLOW_API_KEY=你的-RAGFlow-API-Key
RAGFLOW_KB_ID=你的-知識庫-ID

OLLAMA_HOST=你的-Ollama-地址:11434

AUTH_SECRET=生成一個隨機字串（至少32字符）
NEXTAUTH_URL=http://你的伺服器IP:3000
```

**可選變數**：
```
POSTGRES_URL=（如果不使用資料庫，留空）
```

#### 步驟 4: 部署

1. **點擊 "Deploy the stack"**
2. **等待建置完成**（首次建置約 5-10 分鐘）
3. **檢查狀態**：在 Stacks 列表中應該看到 `agent-test-integration` 狀態為 "Running"

#### 步驟 5: 訪問應用

- 打開瀏覽器訪問：`http://你的伺服器IP:3000`
- 如果在本機：`http://localhost:3000`

### 方法二：使用預建映像（快速）

如果不想每次都建置，可以先在本機建置映像：

```bash
# 1. 建置映像
docker build -t agent-test-integration:latest .

# 2. 儲存映像
docker save agent-test-integration:latest > agent-test-integration.tar

# 3. 在 Portainer 中：
#    - 進入 Images
#    - 點擊 "Import"
#    - 上傳 agent-test-integration.tar

# 4. 修改 docker-compose.yml 中的 build 為 image:
#    image: agent-test-integration:latest
```

### 🔧 本機測試 Docker 部署

在部署到 Portainer 前，建議先在本機測試：

```bash
# 1. 建置並啟動
docker-compose up --build

# 2. 訪問 http://localhost:3000

# 3. 檢查日誌
docker-compose logs -f app

# 4. 停止
docker-compose down
```

### 🌐 配置域名訪問（進階）

如果想要讓別人透過域名訪問：

1. **設置反向代理（Nginx/Traefik）**
2. **配置 DNS 記錄**
3. **啟用 HTTPS（Let's Encrypt）**

在 Portainer 中可以使用內建的 Traefik 或 Nginx Proxy Manager。

### 📊 監控和管理

部署後，在 Portainer 中可以：

- **查看日誌**：點擊容器 → Logs
- **監控資源**：查看 CPU/Memory 使用情況
- **重啟服務**：點擊 Restart
- **更新應用**：Pull and redeploy

### ⚠️ 重要注意事項

1. **端口衝突**：確保 3000 端口未被佔用
2. **資源限制**：截圖顯示你的環境只有 2 CPU 和 1GB RAM，可能需要優化
3. **持久化數據**：uploads 目錄會自動持久化
4. **Ollama 服務**：如果沒有外部 Ollama，需要取消註解 docker-compose.yml 中的 ollama 服務
5. **環境變數**：請勿將 .env.local 提交到 Git（已在 .gitignore 中）

### 🐛 常見問題

**問題 1**: 建置失敗
```bash
# 查看建置日誌
docker-compose logs --tail=100 app
```

**問題 2**: Python 後端無法調用
```bash
# 檢查 Python 路徑
docker exec -it agent-test-app which python3
```

**問題 3**: 檔案上傳失敗
```bash
# 檢查權限
docker exec -it agent-test-app ls -la /app/uploads
```

### 📞 需要協助？

如果遇到問題，可以：
1. 檢查 Portainer 中的容器日誌
2. 查看 Docker 建置輸出
3. 確認所有環境變數已正確設置

---

## 🚀 快速開始（最簡單的方式）

如果只是想快速測試：

```bash
# 1. 確保 Docker 已安裝
docker --version

# 2. 複製 .env.local 為 .env.production 並填寫正確的值
cp .env.local .env.production

# 3. 啟動
docker-compose up -d

# 4. 查看日誌
docker-compose logs -f

# 5. 訪問
open http://localhost:3000
```

成功後，就可以在 Portainer 中用相同的方式部署！
