#!/usr/bin/env python3
"""
測試 OpenAI API 連接
"""
import os
import asyncio
from dotenv import load_dotenv
from openai import AsyncOpenAI

# 載入環境變數
load_dotenv()

async def test_openai_connection():
    """測試 OpenAI API 連接"""
    
    # 讀取配置
    base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
    api_key = os.getenv("OPENAI_API_KEY", "")
    model_name = os.getenv("OPENAI_MODEL_NAME", "gpt-4o-mini")
    
    if not api_key:
        print("❌ 錯誤: 請設置 OPENAI_API_KEY 環境變數")
        return False
    
    print(f"🔧 配置信息:")
    print(f"   Base URL: {base_url}")
    print(f"   Model: {model_name}")
    print(f"   API Key: {'*' * 10}{api_key[-10:] if len(api_key) > 10 else '***'}")
    print()
    
    try:
        # 建立客戶端
        client = AsyncOpenAI(base_url=base_url, api_key=api_key)
        
        # 測試簡單對話
        print("🧪 測試 OpenAI 連接...")
        response = await client.chat.completions.create(
            model=model_name,
            messages=[
                {"role": "user", "content": "Hello! Please respond in Traditional Chinese."}
            ],
            max_tokens=100,
            temperature=0.7
        )
        
        # 顯示結果
        content = response.choices[0].message.content
        print("✅ OpenAI 連接測試成功!")
        print(f"📝 模型回應: {content}")
        print(f"📊 使用 tokens: {response.usage.total_tokens if response.usage else 'N/A'}")
        return True
        
    except Exception as e:
        print(f"❌ OpenAI 連接測試失敗: {str(e)}")
        return False

if __name__ == "__main__":
    success = asyncio.run(test_openai_connection())
    if success:
        print("\n🎉 OpenAI 配置正確，可以正常使用!")
    else:
        print("\n💥 請檢查 OpenAI 配置是否正確")