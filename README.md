# 🤖 AI Agent 產品查詢系統

一個整合 AI Agent、RAG 檢索、視覺識別和多語言翻譯的智能產品查詢系統。

## ✨ 功能特色

- 🔍 **智能產品查詢**：使用 AI Agent 分析用戶需求，從知識庫檢索產品資料
- 📸 **圖片識別**：上傳產品圖片自動識別型號（使用 Ollama Vision）
- 🌍 **多語言支援**：自動偵測語言並翻譯（支援 10+ 語言）
- 💬 **對話式交互**：保留對話上下文，支援連續提問
- ⚡ **即時串流**：Server-Sent Events 實現實時回饋
- 📊 **事件可視化**：顯示 Agent 執行過程（思考、工具調用、翻譯等）

## 🏗️ 技術架構

### 前端
- **Next.js 15** (App Router + React 19 RC)
- **Tailwind CSS 4** + Shadcn/ui
- **Framer Motion** (動畫)
- **NextAuth.js** (認證)

### 後端
- **Python AI Agent** (自定義 Agent 框架)
- **OpenAI API** (LLM)
- **Ollama** (視覺識別)
- **RAGFlow** (知識庫檢索)

## 🚀 快速開始

### 本機開發

1. **安裝依賴**
```bash
pnpm install
```

2. **設置環境變數**
```bash
cp .env.example.agent .env.local
# 編輯 .env.local 填寫你的 API Keys
```

3. **啟動開發伺服器**
```bash
pnpm dev
```

4. **訪問應用**
```
http://localhost:3000
```

### 環境變數說明

```bash
# OpenAI Configuration
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_API_KEY=your-api-key
OPENAI_MODEL_NAME=gpt-4o-mini

# RAGFlow Configuration
RAGFLOW_BASE_URL=https://your-ragflow-instance
RAGFLOW_API_KEY=your-ragflow-key
RAGFLOW_KB_ID=your-kb-id

# Ollama Configuration
OLLAMA_HOST=localhost:11434

# NextAuth
AUTH_SECRET=your-secret
NEXTAUTH_URL=http://localhost:3000

# Python
PYTHON_PATH=/path/to/python
```

## 🐳 Docker 部署

### 使用 Docker Compose

```bash
# 1. 設置生產環境變數
cp .env.production.example .env.production
# 編輯 .env.production

# 2. 建置並啟動
docker-compose up -d

# 3. 查看日誌
docker-compose logs -f

# 4. 訪問
http://localhost:3000
```

### 使用 Portainer 部署

請參考 [DEPLOYMENT.md](./DEPLOYMENT.md) 獲取詳細的 Portainer 部署指南。

## 📁 專案結構

```
agent_test_Integration/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # 認證相關
│   │   ├── auth.ts              # NextAuth 配置
│   │   └── api/auth/            # 認證 API
│   ├── (chat)/                   # 聊天功能
│   │   ├── agent-test/          # Agent 測試頁面
│   │   └── api/                 # API Routes
│   │       ├── agent/           # Agent 調用 API
│   │       └── upload-product-image/  # 圖片上傳 API
│   ├── layout.tsx               # Root Layout
│   └── page.tsx                 # 首頁
├── components/                   # React 元件
│   ├── agent-events-display.tsx # Agent 事件顯示
│   ├── html-content.tsx         # HTML 內容渲染
│   └── ui/                      # UI 元件庫
├── python-backend/              # Python 後端
│   └── agent_test.py            # AI Agent 主程式
├── lib/                         # 工具函數
│   ├── db/                      # 資料庫
│   └── utils.ts                 # 工具函數
├── hooks/                       # React Hooks
├── docker-compose.yml           # Docker Compose 配置
├── Dockerfile                   # Docker 映像配置
└── DEPLOYMENT.md                # 部署指南
```

## 🔧 開發指令

```bash
# 開發
pnpm dev              # 啟動開發伺服器（使用 Turbopack）
pnpm build            # 建置生產版本
pnpm start            # 啟動生產伺服器

# 程式碼品質
pnpm lint             # 執行 Biome linting
pnpm lint:fix         # 自動修復並格式化
pnpm format           # 格式化程式碼

# 資料庫
pnpm db:generate      # 生成資料庫遷移
pnpm db:migrate       # 執行資料庫遷移
pnpm db:studio        # 開啟資料庫視覺化工具

# 測試
pnpm test             # 執行 Playwright 測試
```

## 📝 使用說明

### 基本使用

1. **文字查詢**：直接輸入問題，例如「請幫我查詢 B-50 的相關數據」
2. **圖片查詢**：點擊圖片圖標上傳產品圖片，系統會自動識別並查詢
3. **多語言**：用任何語言提問，系統會自動翻譯

### Agent 功能

系統 Agent 會依序執行：
1. **語言偵測**：偵測輸入語言
2. **查詢分析**：提取關鍵詞（型號、產品類型、規格）
3. **知識檢索**：從 RAGFlow 檢索相關產品資料
4. **圖片識別**（如有上傳）：使用 Ollama 識別產品型號
5. **結果翻譯**：將結果翻譯回用戶的語言

### 支援的產品型號

- B 系列：B-50, B-30 等
- W 系列：W-70, W-50 等
- GL 系列：GL-40M 等
- GF 系列：GF-22M 等
- 其他系列...

## 🤝 貢獻

歡迎提交 Issue 和 Pull Request！

## 📄 授權

MIT License

## 📞 聯絡

如有問題，請開 Issue 討論。

---

**注意**：本專案需要配置 OpenAI API、RAGFlow 服務和 Ollama 服務才能正常運行。
