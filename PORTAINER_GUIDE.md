# 🎓 Portainer 部署教學 - 給新手的完整指南

## 📚 目錄
1. [什麼是 Portainer？](#什麼是-portainer)
2. [什麼是 Docker？](#什麼是-docker)
3. [為什麼需要容器化？](#為什麼需要容器化)
4. [如何在 Portainer 部署你的專案？](#如何在-portainer-部署你的專案)
5. [常見問題解答](#常見問題解答)

---

## 什麼是 Portainer？

**簡單來說**：Portainer 是一個 **Docker 的圖形化管理介面**。

### 類比理解

```
┌─────────────────────────────────────────────────┐
│  想像你的電腦是一個大房子 🏠                      │
├─────────────────────────────────────────────────┤
│  ● Docker = 房間管理系統                          │
│    - 可以在房子裡建立很多「獨立房間」（容器）       │
│    - 每個房間可以運行不同的應用                    │
│    - 房間之間互不干擾                             │
│                                                   │
│  ● Portainer = 智能家居控制面板 🎛️                │
│    - 用圖形介面管理這些房間                        │
│    - 不用打指令，點點滑鼠就能操作                  │
│    - 可以看到每個房間的狀態、資源使用情況          │
└─────────────────────────────────────────────────┘
```

### 從你的截圖可以看到

```
Portainer 介面
├── Environments（環境）
│   └── local（本地環境）
│       ├── 4 stacks（4 個應用堆疊）
│       ├── 9 containers（9 個容器在運行）
│       ├── 2 CPU
│       └── 958.6 MB RAM
└── Live connect（即時連接狀態）
```

這表示你的老師已經幫你設定好一個 Docker 環境！

---

## 什麼是 Docker？

### 傳統部署 vs Docker 部署

#### 傳統方式（複雜）😓

```
你的開發環境                    別人的電腦
┌──────────────┐              ┌──────────────┐
│ macOS        │              │ Windows      │
│ Node.js 20   │    ❌        │ Node.js 18   │
│ Python 3.11  │   無法運行    │ Python 3.9   │
│ 你的專案     │              │ 你的專案     │
└──────────────┘              └──────────────┘

問題：
✗ 環境不一致
✗ 需要手動安裝一堆東西
✗ 「在我電腦上可以運行啊！」
```

#### Docker 方式（簡單）😊

```
你的開發環境                    任何電腦
┌──────────────┐              ┌──────────────┐
│ Docker       │              │ Docker       │
│ ┌──────────┐ │              │ ┌──────────┐ │
│ │ 你的專案 │ │    ✅        │ │ 你的專案 │ │
│ │ Node 20  │ │   完美運行    │ │ Node 20  │ │
│ │ Python11 │ │              │ │ Python11 │ │
│ └──────────┘ │              │ └──────────┘ │
└──────────────┘              └──────────────┘

優點：
✓ 環境完全一致
✓ 一鍵部署
✓ 跨平台運行
```

---

## 為什麼需要容器化？

### 你的專案特殊性

你的專案有兩個部分：

```
┌─────────────────────────────────────────┐
│  你的 AI Agent 專案                      │
├─────────────────────────────────────────┤
│                                          │
│  ┌────────────────┐  ┌────────────────┐│
│  │   前端 (Next.js) │  │  後端 (Python)  ││
│  │                │  │                ││
│  │  ● Node.js 20  │  │  ● Python 3.11 ││
│  │  ● pnpm        │  │  ● OpenAI SDK  ││
│  │  ● React 19    │  │  ● LiteLLM     ││
│  │  ● Next.js 15  │  │  ● Agents      ││
│  └────────────────┘  └────────────────┘│
│           ↕                  ↕           │
│  需要完全正確的版本才能運行              │
└─────────────────────────────────────────┘
```

**不使用 Docker**：
- 別人電腦上要安裝 Node.js 20、Python 3.11、pnpm...
- 版本錯誤就會出問題
- 配置環境要花很多時間

**使用 Docker**：
- 把所有東西「打包」成一個映像檔
- 別人只需要 Docker 就能運行
- 環境完全一致，不會有問題

---

## 如何在 Portainer 部署你的專案？

### 整體流程圖

```
┌──────────────────────────────────────────────────┐
│  第 1 步：準備檔案                                 │
│  ✓ 我已經幫你建立了 Dockerfile                     │
│  ✓ 我已經幫你建立了 docker-compose.yml            │
│  ✓ 我已經幫你建立了 .dockerignore                 │
└──────────────────────────────────────────────────┘
                      ↓
┌──────────────────────────────────────────────────┐
│  第 2 步：測試本機是否可以運行                      │
│  → 在你的 VSCode 終端機執行測試指令                │
└──────────────────────────────────────────────────┘
                      ↓
┌──────────────────────────────────────────────────┐
│  第 3 步：上傳到 Portainer                         │
│  → 兩種方式：直接上傳 或 用 Git                    │
└──────────────────────────────────────────────────┘
                      ↓
┌──────────────────────────────────────────────────┐
│  第 4 步：設置環境變數                             │
│  → 填寫你的 API Keys（OpenAI、RAGFlow 等）        │
└──────────────────────────────────────────────────┘
                      ↓
┌──────────────────────────────────────────────────┐
│  第 5 步：部署並訪問                               │
│  → 點擊部署，等待完成                             │
│  → 透過網址訪問你的應用                           │
└──────────────────────────────────────────────────┘
```

---

## 🚀 詳細步驟

### 步驟 1：測試本機是否可以建置

在你的 VSCode 終端機執行：

```bash
# 1. 確認 Docker 已安裝
docker --version
# 應該看到：Docker version 24.x.x

# 2. 確認 Docker 正在運行
docker ps
# 應該看到容器列表（或空列表）

# 3. 建置 Docker 映像（測試是否有問題）
docker build -t agent-test:local .
# 這會花 5-10 分鐘

# 4. 如果建置成功，啟動測試
docker-compose up
# 訪問 http://localhost:3000 測試

# 5. 測試完畢後停止
按 Ctrl+C
docker-compose down
```

### 步驟 2：準備環境變數

編輯 `.env.production` 檔案：

```bash
# 在 VSCode 中打開 .env.production
# 填寫真實的值：

OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=sk-xxxxx（你的真實 API Key）
OPENAI_MODEL_NAME=gpt-4o-mini

RAGFLOW_BASE_URL=https://xxx（你的 RAGFlow 地址）
RAGFLOW_API_KEY=xxx（你的 RAGFlow Key）
RAGFLOW_KB_ID=xxx（你的知識庫 ID）

OLLAMA_HOST=xxx:11434（你的 Ollama 地址）

AUTH_SECRET=xxx（生成一個隨機字串）
NEXTAUTH_URL=http://你的伺服器IP:3000
```

**生成 AUTH_SECRET**：
```bash
# 在終端機執行
openssl rand -base64 32
# 複製輸出的字串到 AUTH_SECRET
```

### 步驟 3：在 Portainer 部署

#### 方法 A：直接上傳（最簡單）

**3.1 打包專案**

```bash
# 在專案目錄執行
cd /Users/chenyongjia/Documents/code/agent_test_Integration

# 打包（排除不需要的檔案）
zip -r agent-test.zip . -x \
  "node_modules/*" \
  ".next/*" \
  "uploads/*" \
  ".git/*" \
  "__pycache__/*"

# 會生成 agent-test.zip（約 5-10 MB）
```

**3.2 在 Portainer 部署**

1. **登入 Portainer**
   - 打開截圖中的網址
   - 使用你的帳號密碼登入

2. **選擇環境**
   - 點擊 "local" 環境

3. **建立 Stack**
   - 左側選單點擊 "Stacks"
   - 點擊 "+ Add stack" 按鈕

4. **填寫資訊**
   ```
   Name: agent-test-integration
   Build method: 選擇 "Upload"
   ```

5. **上傳檔案**
   - 點擊 "Upload" 按鈕
   - 選擇剛才打包的 `agent-test.zip`

6. **設置環境變數**
   - 往下滾動到 "Environment variables"
   - 點擊 "+ Add environment variable"
   - 逐一添加以下變數：
   
   ```
   Name: OPENAI_API_KEY          Value: sk-xxxxx
   Name: OPENAI_BASE_URL         Value: https://api.openai.com/v1
   Name: OPENAI_MODEL_NAME       Value: gpt-4o-mini
   Name: RAGFLOW_BASE_URL        Value: 你的RAGFlow地址
   Name: RAGFLOW_API_KEY         Value: 你的RAGFlow Key
   Name: RAGFLOW_KB_ID           Value: 你的知識庫ID
   Name: OLLAMA_HOST             Value: 你的Ollama地址
   Name: AUTH_SECRET             Value: 你生成的隨機字串
   Name: NEXTAUTH_URL            Value: http://你的IP:3000
   ```

7. **部署**
   - 點擊最下方的 "Deploy the stack" 按鈕
   - 等待建置完成（5-10 分鐘）

8. **檢查狀態**
   - 回到 Stacks 列表
   - 看到 `agent-test-integration` 狀態為綠色 "running"

9. **訪問應用**
   - 打開瀏覽器
   - 訪問 `http://你的伺服器IP:3000`
   - 應該可以看到你的 Agent 測試介面！

#### 方法 B：使用 Git（進階）

1. **推送到 Git**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin <你的GitHub/GitLab倉庫>
   git push -u origin main
   ```

2. **在 Portainer 設置**
   - Build method: 選擇 "Git Repository"
   - Repository URL: 填寫你的倉庫地址
   - Repository reference: `refs/heads/main`
   - Compose path: `docker-compose.yml`

3. **後續步驟**：與方法 A 相同（設置環境變數、部署）

---

## 📊 部署後的監控

### 在 Portainer 中查看

1. **查看容器狀態**
   ```
   Stacks → agent-test-integration → app
   ```

2. **查看日誌**
   ```
   點擊容器名稱 → Logs
   可以看到應用的運行日誌
   ```

3. **查看資源使用**
   ```
   點擊容器名稱 → Stats
   可以看到 CPU、記憶體使用情況
   ```

4. **重啟應用**
   ```
   點擊容器名稱 → Restart
   ```

---

## 🎯 分享給別人使用

部署成功後，告訴你的朋友：

```
嘿！試試我的 AI Agent 產品查詢系統：
http://你的伺服器IP:3000

可以：
✓ 輸入問題查詢產品
✓ 上傳產品圖片識別型號
✓ 用任何語言提問
```

**如果要更專業**：

1. **申請域名**（例如 agent.yourdomain.com）
2. **設置 DNS 指向你的伺服器**
3. **配置 HTTPS**（使用 Let's Encrypt）
4. **設置反向代理**（Nginx 或 Traefik）

這樣別人就可以用漂亮的網址訪問了！

---

## 🐛 常見問題解答

### Q1: 建置失敗怎麼辦？

**檢查步驟**：
1. 查看 Portainer 的建置日誌
2. 確認 Docker 有足夠的記憶體（至少 2GB）
3. 確認網路連線正常

**常見錯誤**：
```
Error: Cannot find module 'xxx'
→ 解決：確認 package.json 中有該套件

Error: ENOSPC: no space left on device
→ 解決：清理 Docker 空間 docker system prune -a

Error: Context deadline exceeded
→ 解決：網路太慢，重試或使用更快的網路
```

### Q2: 應用啟動了但無法訪問？

**檢查步驟**：
1. 確認容器狀態是 "running"
2. 確認端口 3000 沒有被防火牆阻擋
3. 檢查容器日誌是否有錯誤

```bash
# 在 Portainer 的終端機執行
curl http://localhost:3000
# 應該返回 HTML 內容
```

### Q3: Python 後端調用失敗？

**檢查環境變數**：
```
在 Portainer 中：
Stacks → agent-test-integration → Environment variables

確認所有必要的變數都已設置：
✓ OPENAI_API_KEY
✓ RAGFLOW_API_KEY
✓ OLLAMA_HOST
等等...
```

### Q4: 上傳圖片失敗？

**檢查目錄權限**：
```bash
# 在容器終端機執行
ls -la /app/uploads
# 應該可以寫入
```

### Q5: 如何更新應用？

**步驟**：
1. 修改本機程式碼
2. 重新打包或推送到 Git
3. 在 Portainer 中點擊 Stack → "Pull and redeploy"
4. 等待更新完成

---

## 🎉 恭喜！

如果你成功部署了，恭喜你！你已經學會：

- ✅ Docker 容器化
- ✅ 使用 Portainer 部署
- ✅ 環境變數配置
- ✅ 應用監控和管理

現在你的 AI Agent 系統可以：
- 🌐 24/7 在線運行
- 🔗 透過網址分享給任何人
- 📊 在 Portainer 中監控和管理

**下一步**：
- 配置域名和 HTTPS
- 添加更多功能
- 優化性能和安全性

---

**需要幫助？**
- 查看 [DEPLOYMENT.md](./DEPLOYMENT.md) 獲取更多技術細節
- 查看 [README.md](./README.md) 了解專案功能
- 檢查 Portainer 中的容器日誌排查問題
