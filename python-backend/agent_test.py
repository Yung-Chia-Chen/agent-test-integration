from __future__ import annotations
import asyncio
import os
import json
import base64
import re
import requests
from dotenv import load_dotenv
import argparse
import sys
import time
from functools import wraps
from openai import AsyncOpenAI
from litellm import completion
from agents import (
    Agent,
    Model,
    ModelProvider,
    OpenAIChatCompletionsModel,
    RunConfig,
    Runner,
    function_tool,
    set_tracing_disabled,
)
# 全域變數控制事件輸出
_stream_events = False

# Simple in-memory caches to avoid repeated slow network calls during a single
# Python process lifetime. Keys are strings, values are tuples (timestamp, result).
_CACHE: dict = {}
_CACHE_TTL = 300  # seconds

def _get_cached(key: str):
    entry = _CACHE.get(key)
    if not entry:
        return None
    ts, value = entry
    if time.time() - ts > _CACHE_TTL:
        del _CACHE[key]
        return None
    return value

def _set_cache(key: str, value):
    _CACHE[key] = (time.time(), value)

def emit_event(event_type: str, **kwargs):
    """發送事件到前端，只在串流模式下輸出"""
    if _stream_events:
        event = {
            "type": event_type,
            "timestamp": time.time(),
            **kwargs
        }
        print(json.dumps(event, ensure_ascii=False), flush=True)

# 載入環境變數
load_dotenv()

# 配置參數 - 從環境變數載入
BASE_URL = os.getenv("OPENAI_BASE_URL")
API_KEY = os.getenv("OPENAI_API_KEY")
MODEL_NAME = os.getenv("OPENAI_MODEL_NAME")

RAGFLOW_BASE_URL = os.getenv("RAGFLOW_BASE_URL")
RAGFLOW_API_KEY = os.getenv("RAGFLOW_API_KEY")
RAGFLOW_KB_ID = os.getenv("RAGFLOW_KB_ID")
OLLAMA_HOST = os.getenv("OLLAMA_HOST")

# 檢查必要的環境變數
if not all([BASE_URL, API_KEY, MODEL_NAME]):
    raise ValueError("請在 .env.local 中設置 OPENAI_BASE_URL, OPENAI_API_KEY, OPENAI_MODEL_NAME")

if not all([RAGFLOW_BASE_URL, RAGFLOW_API_KEY, RAGFLOW_KB_ID]):
    raise ValueError("請在 .env.local 中設置 RAGFLOW_BASE_URL, RAGFLOW_API_KEY, RAGFLOW_KB_ID")

if not OLLAMA_HOST:
    raise ValueError("請在 .env.local 中設置 OLLAMA_HOST")

# 建立自訂 OpenAI client 與 provider
client = AsyncOpenAI(base_url=BASE_URL, api_key=API_KEY)
set_tracing_disabled(disabled=True)

class CustomModelProvider(ModelProvider):
    def get_model(self, model_name: str | None) -> Model:
        return OpenAIChatCompletionsModel(model=model_name or MODEL_NAME, openai_client=client)

CUSTOM_MODEL_PROVIDER = CustomModelProvider()

# 型號映射表
MODEL_MAPPING = {
    "GFM22": "GF-22M",
    "GLM40": "GL-40M",
    "WFM50": "WF-50M",
    "BFM30": "BF-30M",
    "HTFM60": "HT-60F",
    "WE70": "WE-70",
    "QWFM45": "QW-45F"
}

# RAGFlow 配置
RAGFLOW_HEADERS = {
    'Content-Type': 'application/json',
    'Authorization': f'Bearer {RAGFLOW_API_KEY}'
}

# ============ 翻譯功能 ============

async def detect_language(text: str) -> dict:
    """
    偵測文本語言
    
    Args:
        text: 要偵測的文本
    
    Returns:
        包含語言代碼和語言名稱的字典
    """
    try:
        response = await client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{
                "role": "system",
                "content": """你是語言偵測專家。偵測用戶輸入的語言，以 JSON 格式返回：
{
  "language_code": "語言代碼（如 en, ja, ko, zh-TW, zh-CN 等）",
  "language_name": "語言名稱（如 English, Japanese, Korean, Traditional Chinese 等）",
  "is_chinese": true/false
}

常見語言代碼：
- en: English
- ja: Japanese
- ko: Korean
- zh-TW: Traditional Chinese (繁體中文)
- zh-CN: Simplified Chinese (簡體中文)
- es: Spanish
- fr: French
- de: German
- vi: Vietnamese
- th: Thai"""
            }, {
                "role": "user",
                "content": text
            }],
            response_format={"type": "json_object"}
        )
        
        result = json.loads(response.choices[0].message.content)
        return result
        
    except Exception as e:
        # 預設為繁體中文
        return {
            "language_code": "zh-TW",
            "language_name": "Traditional Chinese",
            "is_chinese": True
        }


async def translate_text(text: str, target_language: str, source_language: str = "zh-TW") -> str:
    """
    翻譯文本
    
    Args:
        text: 要翻譯的文本
        target_language: 目標語言代碼
        source_language: 源語言代碼
    
    Returns:
        翻譯後的文本
    """
    try:
        # 如果源語言和目標語言相同，直接返回
        if source_language == target_language:
            return text
        
        # 語言名稱映射
        language_names = {
            "en": "English",
            "ja": "Japanese",
            "ko": "Korean",
            "zh-TW": "Traditional Chinese",
            "zh-CN": "Simplified Chinese",
            "es": "Spanish",
            "fr": "French",
            "de": "German",
            "vi": "Vietnamese",
            "th": "Thai"
        }
        
        target_name = language_names.get(target_language, target_language)
        source_name = language_names.get(source_language, source_language)
        
        response = await client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{
                "role": "system",
                "content": f"""你是專業翻譯專家。將文本從 {source_name} 翻譯成 {target_name}。

重要規則：
1. 保持 HTML 標籤不變（如 <table>, <tr>, <td> 等）
2. 保持專業術語的準確性（如減速機型號、技術規格）
3. 數字、型號、單位保持原樣
4. 表格結構完全保持不變
5. 翻譯要自然、流暢、專業

只返回翻譯後的文本，不要添加任何解釋。"""
            }, {
                "role": "user",
                "content": text
            }],
            temperature=0.3  # 降低溫度以獲得更一致的翻譯
        )
        
        return response.choices[0].message.content
        
    except Exception as e:
        emit_event("error", message=f"翻譯失敗: {str(e)}")
        return text  # 翻譯失敗則返回原文

# ============ 產品分析工具 ============

def extract_type_model(text: str) -> str:
    """從OCR結果中提取TYPE型號"""
    patterns = [
        r'TYPE[:\s]*([A-Z0-9-]+)',
        r'型號[:\s]*([A-Z0-9-]+)',
        r'([A-Z]{2,}[0-9]+[A-Z]*)',
        r'([A-Z]+-[0-9]+[A-Z]*)'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return match.group(1).upper()
    
    cleaned_text = text.strip().replace("未找到型號", "").strip().upper()
    return cleaned_text if cleaned_text else "未知型號"

def map_model_number(model_number: str) -> str:
    """型號映射表轉換"""
    model_upper = model_number.upper()
    return MODEL_MAPPING.get(model_upper, model_number)

@function_tool
async def extract_product_model(image_path: str) -> str:
    """
    從產品標籤圖片中提取型號信息
    
    Args:
        image_path: 圖片檔案路徑
    
    Returns:
        識別到的產品型號
    """
    # 發送工具調用開始事件
    emit_event("tool_call_start", 
              tool_name="extract_product_model", 
              message="正在調用 extract_product_model...")
    
    try:
        # 檢查檔案是否存在
        if not os.path.exists(image_path):
            result = f"錯誤：圖片檔案不存在 - {image_path}"
            emit_event("tool_call_end", 
                      tool_name="extract_product_model", 
                      message="extract_product_model 調用完成")
            return result
        
        # 轉換圖片為 base64
        with open(image_path, "rb") as image_file:
            image_base64 = base64.b64encode(image_file.read()).decode('utf-8')
        
        image_url = f"data:image/jpeg;base64,{image_base64}"
        
        # OCR 提示詞
        prompt = """請仔細觀察這張產品標籤圖片，找出TYPE欄位的型號資訊。
請只回傳TYPE對應的型號，例如：如果看到TYPE GLM40，請回傳：GLM40
如果找不到TYPE欄位，請回傳：未找到型號"""
        
        # 調用 Ollama 視覺模型
        response = completion(
            model="ollama/qwen2.5vl:7b",
            messages=[{
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": image_url}}
                ]
            }],
            api_base=f"http://{OLLAMA_HOST}",
            stream=False
        )
        
        extracted_text = response.choices[0].message.content
        detected_model = extract_type_model(extracted_text)
        mapped_model = map_model_number(detected_model)
        
        if mapped_model != detected_model:
            result = f"識別型號：{detected_model} → 映射型號：{mapped_model}"
        else:
            result = f"識別型號：{detected_model}"
        
        emit_event("tool_call_end", 
                  tool_name="extract_product_model", 
                  message="extract_product_model 調用完成")
        return result
            
    except Exception as e:
        result = f"圖片識別錯誤：{str(e)}"
        emit_event("tool_call_error", 
                  tool_name="extract_product_model", 
                  message=f"extract_product_model 調用失敗: {str(e)}")
        return result

@function_tool
async def retrieve_product_knowledge(query: str) -> str:
    """
    從知識庫檢索產品相關信息
    
    Args:
        query: 搜索查詢內容（可以是型號、產品類型、關鍵詞等）
    
    Returns:
        檢索到的產品資料摘要
    """
    emit_event("tool_call_start",
              tool_name="retrieve_product_knowledge",
              message="正在調用 retrieve_product_knowledge...")
    start_ts = time.time()

    # Check cache first
    cached = _get_cached(f"retrieve:{query}")
    if cached is not None:
        emit_event("tool_call_end",
                  tool_name="retrieve_product_knowledge",
                  message="retrieve_product_knowledge 從快取返回",
                  cached=True)
        return cached
    
    try:
        # 直接使用查詢內容檢索
        # Reduce top_k and results to improve latency. Use threadpool to avoid
        # blocking the event loop since requests is synchronous.
        search_data = {
            "question": query,
            "dataset_ids": [RAGFLOW_KB_ID],
            "top_k": 128,
            "similarity_threshold": 0.25,
            "vector_similarity_weight": 0.6,
            "keyword": True,
            "highlight": True
        }

        response = await asyncio.to_thread(
            requests.post,
            f"{RAGFLOW_BASE_URL}/api/v1/retrieval",
            headers=RAGFLOW_HEADERS,
            json=search_data,
            timeout=20,
        )
        
        if response.status_code == 200:
            data = response.json()
            if data and data.get('code') == 0:
                chunks = data.get('data', {}).get('chunks', [])
                
                # 基本過濾：只保留相似度較高的前 5 個結果以減少處理時間
                filtered_chunks = [
                    chunk for chunk in chunks 
                    if chunk.get('similarity', 0) >= 0.25
                ][:5]
                
                if filtered_chunks:
                    results = []
                    results.append(f"檢索查詢：{query}")
                    results.append(f"找到 {len(filtered_chunks)} 個相關結果\n")
                    
                    for i, chunk in enumerate(filtered_chunks, 1):
                        content = chunk.get('content', '').strip()
                        doc_name = chunk.get('document_keyword', chunk.get('document_name', f'Document{i}'))
                        similarity = chunk.get('similarity', 0)
                        
                        results.append(f"【資料 {i}】")
                        results.append(f"來源：{doc_name}")
                        results.append(f"相似度：{similarity:.3f}")
                        results.append(f"內容：\n{content}")
                        results.append("-" * 50)
                    
                    final_result = "\n".join(results)
                    # Cache the result for short period to speed up repeated queries
                    _set_cache(f"retrieve:{query}", final_result)
                    emit_event("tool_call_end",
                              tool_name="retrieve_product_knowledge",
                              message="retrieve_product_knowledge 調用完成",
                              duration=time.time()-start_ts)
                    return final_result
                else:
                    final_result = f"在知識庫中未找到關於「{query}」的相關資料。\n建議：\n1. 嘗試使用不同的關鍵詞\n2. 確認型號或產品名稱是否正確\n3. 提供更具體的產品描述"
                    _set_cache(f"retrieve:{query}", final_result)
                    emit_event("tool_call_end",
                              tool_name="retrieve_product_knowledge",
                              message="retrieve_product_knowledge 調用完成",
                              duration=time.time()-start_ts)
                    return final_result
            else:
                final_result = f"知識庫搜索失敗：{data.get('message', '未知錯誤')}"
                emit_event("tool_call_end", 
                          tool_name="retrieve_product_knowledge", 
                          message="retrieve_product_knowledge 調用完成")
                return final_result
        else:
            final_result = f"API 請求失敗：HTTP {response.status_code}"
            emit_event("tool_call_end",
                      tool_name="retrieve_product_knowledge",
                      message="retrieve_product_knowledge 調用完成",
                      duration=time.time()-start_ts)
            return final_result
            
    except Exception as e:
        final_result = f"產品搜索錯誤：{str(e)}"
        emit_event("tool_call_error",
                  tool_name="retrieve_product_knowledge",
                  message=f"retrieve_product_knowledge 調用失敗: {str(e)}",
                  duration=time.time()-start_ts)
        return final_result

def extract_model_from_query(query: str) -> str:
    """從查詢中提取可能的型號"""
    # 常見型號模式
    patterns = [
        r'\b([A-Z]{1,3}-?\d{1,4}[A-Z]*)\b',  # B-50, GLM40, KOE-155 等
        r'\b([A-Z]+\d+[A-Z]*)\b',             # GLM40, BFM30 等
        r'\b([A-Z]-\d+)\b',                   # B-50, F-30 等
    ]
    
    for pattern in patterns:
        matches = re.findall(pattern, query.upper())
        if matches:
            return matches[0]
    
    return None

@function_tool
async def extract_query_keywords(user_query: str) -> str:
    """
    從用戶查詢中提取關鍵詞用於 RAGFlow 檢索
    
    Args:
        user_query: 用戶的查詢內容
    
    Returns:
        提取的關鍵詞和搜索建議
    """
    emit_event("tool_call_start",
              tool_name="extract_query_keywords",
              message="正在調用 extract_query_keywords...")

    # Cache check to avoid repeated LLM calls for identical queries
    cached = _get_cached(f"keywords:{user_query}")
    if cached is not None:
        emit_event("tool_call_end",
                  tool_name="extract_query_keywords",
                  message="extract_query_keywords 從快取返回",
                  cached=True)
        return cached

    start_ts = time.time()
    try:
        response = await client.chat.completions.create(
            model=MODEL_NAME,
            messages=[{
                "role": "system",
                "content": """你是查詢分析專家。從用戶的問題中提取關鍵詞用於檢索減速機資料。

請分析用戶問題，提取：
1. 型號（如 B-50, W-70, 雙段蝸輪齒輪減速機等）
2. 產品類型（如 單段、雙段、法蘭式、中空型等）
3. 技術規格（如 馬力、轉速、扭矩等）
4. 其他關鍵詞

⚠️ 特別注意「不確定型」的回答：
- "不知道"、"不清楚"、"沒有"、"隨便"、"看看"
- "沒有特定需求"、"還在考慮"、"不確定"
- 這些回答表示用戶需要引導，設置 needs_overview: true

以 JSON 格式回應：
{
    "has_specific_query": true/false,  // 是否有具體的查詢內容
    "needs_overview": true/false,  // 是否需要產品概覽（當用戶說「不知道」時）
    "model_numbers": ["型號1", "型號2"],  // 提取的型號
    "product_types": ["類型1", "類型2"],  // 產品類型
    "specifications": ["規格1", "規格2"],  // 技術規格
    "search_query": "最佳搜索查詢",  // 用於 RAGFlow 的搜索字串
    "needs_guidance": true/false,  // 是否需要引導（第一次不明確）
    "user_uncertainty": "high/medium/low"  // 用戶的不確定程度
}

判斷規則：
- has_specific_query = false + needs_overview = true → 用戶說「不知道」，需要展示產品概覽
- has_specific_query = false + needs_guidance = true → 首次詢問，需要引導
- has_specific_query = true → 有明確查詢，直接檢索"""
            }, {
                "role": "user",
                "content": user_query
            }],
            response_format={"type": "json_object"}
        )

        result = json.loads(response.choices[0].message.content)

        emit_event("tool_call_end",
                  tool_name="extract_query_keywords",
                  message="關鍵詞提取完成",
                  result=result,
                  duration=time.time()-start_ts)

        out = json.dumps(result, ensure_ascii=False)
        _set_cache(f"keywords:{user_query}", out)
        return out

    except Exception as e:
        error_result = {"status": "error", "error": str(e)}
        emit_event("tool_call_error",
                  tool_name="extract_query_keywords",
                  message=f"提取失敗: {str(e)}",
                  duration=time.time()-start_ts)
        return json.dumps(error_result, ensure_ascii=False)

# 建立 Agent
async def create_product_analysis_agent():
    """創建產品分析 Agent"""
    agent = Agent(
        name="ReducerSelectionAssistant",
        instructions="""You only respond in 繁體中文.
你是專業的減速機查詢助手，協助客戶查詢減速機產品資料。

## 工作流程：

### 步驟 1: 分析用戶查詢
使用 <think> 標籤思考，然後調用 extract_query_keywords 分析用戶的查詢內容。

### 步驟 2: 根據分析結果處理

**情境 A - 有具體查詢內容（has_specific_query: true）**
例如：
- "雙段蝸輪齒輪減速機"
- "單段立式蝸輪減速機"
- "請幫我查詢 B-50 的相關數據"
- "請幫我查詢雙段蝸輪齒輪減速機的型號有哪些"
- "我需要找 W 系列的規格"

處理方式：
1. 從 extract_query_keywords 結果中獲取 search_query
2. 調用 retrieve_product_knowledge(search_query) 檢索資料
3. 將檢索結果用清晰的格式呈現（規格表用 HTML 表格）
4. 如果找到多個結果，幫助用戶理解差異
5. 如果沒找到資料，禮貌告知並建議使用其他關鍵詞

**情境 B - 第一次查詢不明確（has_specific_query: false 或 needs_guidance: true）**
例如：
- "我需要減速機"
- "什麼減速機適合我"
- "幫我推薦"

處理方式：
詢問用戶更具體的需求：
```
為了幫您找到合適的減速機，請提供以下資訊：

1. 您是否有特定的型號需求？（例如：B-50, W-70）
2. 或者您想了解哪種類型的減速機？（例如：單段、雙段、法蘭式、中空型）
3. 使用場景：主要用在什麼機械上？
4. 技術規格：馬力多少？輸入/輸出轉速？
5. 安裝要求：有特殊的安裝方式或空間限制嗎？

提供更多資訊後，我可以為您查詢詳細的產品規格。
```

**情境 C - 用戶回答「不知道」或無法提供具體信息**
例如：
- "不知道"
- "沒有特定需求"
- "不清楚"
- "隨便看看"

⚠️ **重要：不要重複詢問！改為主動提供資訊和選項**

處理方式：
1. **先調用 retrieve_product_knowledge("減速機")** 獲取產品概覽
2. **展示產品分類和熱門型號**，格式如下：

```
我了解您還在探索階段，讓我為您介紹我們的減速機產品系列：

## 📦 主要產品類型

根據知識庫資料，我們提供以下類型的減速機：

【從 retrieve_product_knowledge 結果中整理出產品分類】

## 🔥 熱門型號

【展示檢索到的常見型號及其基本特點】

## 💡 選擇建議

如果您：
- 需要**高扭矩輸出** → 建議查看雙段系列
- 需要**節省空間** → 建議查看法蘭式系列
- 需要**標準應用** → 建議查看單段系列

您可以：
1. 告訴我您的應用場景（如：輸送帶、攪拌機、升降機等）
2. 或直接選擇想了解的型號或類型
3. 或讓我查詢「全部減速機型號」為您提供完整產品目錄

您想了解哪方面呢？
```

### 步驟 3: 完整回答
- 必須給出具體、完整的回答
- 如果查詢到資料，要清楚呈現並解釋
- **如果用戶無法提供明確需求，主動展示產品分類和選項**
- 不要反覆詢問相同的問題
- 不要編造不存在的資料

### 重要規則：
1. **靈活檢索**：不限定特定的產品類型，用戶提到什麼就查什麼
2. **型號優先**：如果用戶提到型號（B-50, W-70 等），直接查詢該型號
3. **類型查詢**：如果用戶提到類型（雙段、法蘭式等），查詢該類型的相關產品
4. **主動引導**：當用戶不確定需求時，先展示產品概覽，再引導選擇
5. **避免循環**：如果已經詢問過用戶需求，不要重複相同問題，改為提供選項
6. **規格呈現**：產品規格用 HTML 表格清晰呈現
7. **不要假設**：但也不要陷入反覆詢問，適時主動提供資訊

### 格式規則：
- 產品規格用 HTML 表格
- 產品分類用清晰的標題和列表
- 回答要完整、友善、專業
- 不要輸出代碼，要執行工具並解釋結果
- 不要編造資料

使用繁體中文回答。""",
        tools=[
            extract_query_keywords,
            extract_product_model,
            retrieve_product_knowledge
        ],
    )
    return agent

async def process_user_input(user_input: str, chat_history: list = None):
    """處理用戶輸入，整合串流事件、翻譯和完整結果
    
    Args:
        user_input: 用戶當前輸入
        chat_history: 對話歷史，格式為 [{"role": "user"/"assistant", "content": "..."}, ...]
    """
    global _stream_events
    _stream_events = True
    
    # 如果沒有提供歷史記錄，初始化為空列表
    if chat_history is None:
        chat_history = []
    
    # 儲存原始語言資訊
    original_language = None
    translated_input = user_input
    
    try:
        # ============ 步驟 1: 語言偵測與翻譯輸入 ============
        emit_event("language_detection", message="正在偵測語言...")
        
        language_info = await detect_language(user_input)
        original_language = language_info.get("language_code", "zh-TW")
        language_name = language_info.get("language_name", "Unknown")
        is_chinese = language_info.get("is_chinese", True)
        
        emit_event("language_detected", 
                  language_code=original_language,
                  language_name=language_name,
                  is_chinese=is_chinese,
                  message=f"偵測到語言: {language_name}")
        
        # 如果不是中文，翻譯成繁體中文
        if not is_chinese:
            emit_event("translating_input", 
                      message=f"正在將 {language_name} 翻譯成繁體中文...")
            
            translated_input = await translate_text(
                user_input, 
                target_language="zh-TW",
                source_language=original_language
            )
            
            emit_event("translation_complete",
                      original_text=user_input,
                      translated_text=translated_input,
                      message="輸入翻譯完成")
        
        # ============ 步驟 2: Agent 處理（原有邏輯）============
        agent = await create_product_analysis_agent()
        
        # 構建包含歷史對話的完整 context
        # 如果有歷史記錄，將其格式化後加入 input
        full_input = translated_input
        if chat_history and len(chat_history) > 0:
            # 構建對話上下文
            context_parts = ["以下是之前的對話記錄，請參考這些內容來回答新問題：\n"]
            for msg in chat_history[-6:]:  # 只保留最近 6 條對話（3輪）
                role = "用戶" if msg.get("role") == "user" else "助手"
                content = msg.get("content", "")
                context_parts.append(f"{role}: {content}")
            
            context_parts.append(f"\n現在的新問題是：{translated_input}")
            full_input = "\n".join(context_parts)
            
            emit_event("context_added",
                      history_length=len(chat_history),
                      message=f"已加入 {len(chat_history)} 條歷史對話作為上下文")
        
        stream_result = Runner.run_streamed(
            agent,
            input=full_input,  # 使用包含歷史的完整輸入
            run_config=RunConfig(model_provider=CUSTOM_MODEL_PROVIDER),
            max_turns=10,
        )
        
        thinking_buffer = ""
        inside_think_tag = False
        final_result = None
        all_thinking_content = []
        thinking_sent = False
        
        # 串流處理
        async for event in stream_result.stream_events():
            event_type = event.type
            
            try:
                # 處理不同類型的事件
                if event_type == "text_delta":
                    # 這是模型生成的文本片段
                    content = ""
                    if hasattr(event, 'delta'):
                        content = str(event.delta)
                    elif hasattr(event, 'data') and hasattr(event.data, 'delta'):
                        content = str(event.data.delta)
                    
                    if content:
                        # 檢查是否包含 thinking 標籤
                        if '<think>' in content:
                            inside_think_tag = True
                            thinking_start_idx = content.find('<think>') + 7
                            if thinking_start_idx < len(content):
                                thinking_content = content[thinking_start_idx:]
                                thinking_buffer += thinking_content
                        elif '</think>' in content and inside_think_tag:
                            inside_think_tag = False
                            thinking_end_idx = content.find('</think>')
                            if thinking_end_idx > 0:
                                thinking_content = content[:thinking_end_idx]
                                thinking_buffer += thinking_content
                            
                            # 發送思考完成事件
                            if thinking_buffer.strip() and not thinking_sent:
                                emit_event("thinking_complete", 
                                          content=thinking_buffer.strip(),
                                          message="思考過程完成")
                                thinking_sent = True
                            thinking_buffer = ""
                        elif inside_think_tag:
                            # 在思考標籤內的內容
                            thinking_buffer += content
                
                # 處理其他事件類型
                elif event_type in ["raw_response_event", "model_text_delta"]:
                    content = ""
                    if hasattr(event, 'content'):
                        content = str(event.content)
                    elif hasattr(event, 'data'):
                        if hasattr(event.data, 'delta'):
                            content = str(event.data.delta)
                        elif hasattr(event.data, 'content'):
                            content = str(event.data.content)
                        else:
                            content = str(event.data)
                    
                    # 只在還沒發送thinking事件時處理
                    if not thinking_sent and content and not content.startswith('ResponseCreatedEvent'):
                        # 檢查是否包含完整的 thinking 標籤
                        if '<think>' in content and '</think>' in content:
                            # 提取完整的思考內容
                            thinking_start = content.find('<think>') + 7
                            thinking_end = content.find('</think>')
                            if thinking_start < thinking_end:
                                thinking_content = content[thinking_start:thinking_end].strip()
                                if thinking_content:
                                    emit_event("thinking_complete", 
                                              content=thinking_content,
                                              message="思考過程完成")
                                    thinking_sent = True
                
                
            except Exception as e:
                # 靜默處理錯誤，避免中斷流程
                continue
            
            # 捕獲最終結果
            if event_type == "run_completed":
                try:
                    final_result = event.data if hasattr(event, 'data') else event
                except Exception as e:
                    # 靜默處理錯誤
                    pass
        
        # 處理最終結果
        if final_result:
            complete_response = final_result.final_output
        else:
            # 如果沒有捕獲到結果，使用標準方式獲取
            final_result_obj = await Runner.run(
                starting_agent=agent,
                input=translated_input,  # 使用翻譯後的輸入
                run_config=RunConfig(model_provider=CUSTOM_MODEL_PROVIDER),
                max_turns=10,
            )
            complete_response = final_result_obj.final_output
        
        # 提取並清理最終輸出
        final_output = re.sub(r'<think>.*?</think>', '', complete_response, flags=re.DOTALL).strip()
        
        # ============ 步驟 3: 翻譯結果回原語言 ============
        if original_language and original_language != "zh-TW" and not is_chinese:
            emit_event("translating_output",
                      message=f"正在將結果翻譯回 {language_name}...")
            
            final_output = await translate_text(
                final_output,
                target_language=original_language,
                source_language="zh-TW"
            )
            
            emit_event("translation_complete",
                      message="輸出翻譯完成")
        
        # 發送最終結果
        emit_event("final_result", 
                  final_output=final_output,
                  user_input=user_input,
                  original_language=original_language,
                  status="success")
        
        return {
            "type": "final_result",
            "final_output": final_output,
            "user_input": user_input,
            "original_language": original_language,
            "status": "success"
        }
        
    except Exception as e:
        emit_event("error", 
                  error=str(e),
                  user_input=user_input,
                  status="error")
        return {
            "type": "error",
            "error": str(e),
            "user_input": user_input,
            "status": "error"
        }
    finally:
        _stream_events = False

async def cli_main():
    """命令列介面主函數"""
    parser = argparse.ArgumentParser(description='產品分析 Agent CLI')
    parser.add_argument('--input', required=True, help='用戶輸入內容')
    parser.add_argument('--history', type=str, default='[]', help='對話歷史 (JSON 格式)')
    
    args = parser.parse_args()
    
    # 解析歷史記錄
    try:
        chat_history = json.loads(args.history) if args.history else []
    except json.JSONDecodeError:
        chat_history = []
        print(json.dumps({
            "type": "warning",
            "message": "無法解析對話歷史，將使用空歷史"
        }), flush=True)
    
    try:
        # 使用統一的處理函數
        await process_user_input(args.input, chat_history=chat_history)
        
    except Exception as e:
        error_result = {
            "status": "error", 
            "error": str(e),
            "user_input": args.input
        }
        emit_event("error", 
                  error=str(e),
                  user_input=args.input,
                  status="error")
        sys.exit(1)

# 主程式進入點
if __name__ == "__main__":
    asyncio.run(cli_main())
