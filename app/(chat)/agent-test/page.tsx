'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Send, ImageIcon } from 'lucide-react';
import { AgentEventsDisplay, AgentEvent } from '@/components/agent-events-display';
import { HtmlContent } from '@/components/html-content';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { toast } from '@/components/toast';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  events?: AgentEvent[];
  isStreaming?: boolean;
}

export default function AgentTestPage() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentEvents, setCurrentEvents] = useState<AgentEvent[]>([]);
  const [uploading, setUploading] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentEvents]);

  // 處理圖片上傳
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 檢查檔案類型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        type: 'error',
        description: '檔案格式不支援，請上傳 JPEG 或 PNG 圖片',
      });
      return;
    }

    // 檢查檔案大小 (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        type: 'error',
        description: '檔案過大，請上傳小於 10MB 的圖片',
      });
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload-product-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '上傳失敗');
      }

      const result = await response.json();
      
      if (result.success) {
        const userMessage = `我剛上傳了一張產品圖片，路徑是：${result.filePath}。請分析這張圖片中的產品型號並提供詳細的技術規格資料。`;
        handleSubmit(null, userMessage);

        toast({
          type: 'success',
          description: `圖片上傳成功，正在分析產品...`,
        });
      } else {
        throw new Error(result.error || '上傳失敗');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        type: 'error',
        description: `上傳失敗：${error instanceof Error ? error.message : '未知錯誤'}`,
      });
    } finally {
      setUploading(false);
    }

    // 清空 input 值，允許重複選擇同一檔案
    event.target.value = '';
  };

  const handleSubmit = async (e: React.FormEvent | null, customInput?: string) => {
    if (e) e.preventDefault();
    const messageText = customInput || input;
    if (!messageText.trim() || isLoading) return;

    // 添加用戶消息
    const userMessage: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setCurrentEvents([]);

    // 添加助手消息（流式）
    const assistantMessage: ChatMessage = {
      id: Math.random().toString(36).substr(2, 9),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      events: [],
      isStreaming: true,
    };

    setMessages(prev => [...prev, assistantMessage]);

    try {
      // 關閉之前的連接
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      // 發送 POST 請求到 API
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          input: messageText,
          // 傳送對話歷史（排除當前用戶訊息和正在串流的助手訊息）
          history: messages.slice(0, -2).map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      const events: AgentEvent[] = [];
      let finalResult = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const eventData = JSON.parse(line.substring(6));
                events.push(eventData);
                setCurrentEvents([...events]);

                // 處理最終結果
                if (eventData.type === 'final_result') {
                  finalResult = eventData.final_output || '';
                }
              } catch (parseError) {
                console.error('Failed to parse event:', parseError);
              }
            }
          }
        }
      }

      // 更新助手消息
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessage.id 
          ? { ...msg, content: finalResult, events, isStreaming: false }
          : msg
      ));

    } catch (error) {
      console.error('Request failed:', error);
      
      // 更新助手消息為錯誤狀態
      setMessages(prev => prev.map(msg => 
        msg.id === assistantMessage.id 
          ? { ...msg, content: `錯誤：${error instanceof Error ? error.message : '未知錯誤'}`, isStreaming: false }
          : msg
      ));
    } finally {
      setIsLoading(false);
      setCurrentEvents([]);
    }
  };

  return (
    <div className="flex h-screen bg-background">
      {/* 主聊天區域 */}
      <div className="flex-1 flex flex-col">
        {/* 標題欄 */}
        <div className="border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center px-4">
            <h1 className="text-lg font-semibold">Agent 測試界面</h1>
          </div>
        </div>

        {/* 消息區域 */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <h2 className="text-xl font-semibold mb-2">開始對話</h2>
                <p>上傳產品圖片或輸入問題來測試 Agent 功能</p>
              </div>
            )}

            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "flex gap-3",
                  message.role === 'user' ? "justify-end" : "justify-start"
                )}
              >
                {message.role === 'assistant' && (
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    🤖
                  </div>
                )}
                
                <div className={cn(
                  "max-w-[80%] space-y-2",
                  message.role === 'user' && "order-2"
                )}>
                  {/* Agent 事件顯示 - 放在上面 */}
                  {message.role === 'assistant' && (
                    <>
                      {message.isStreaming && currentEvents.length > 0 && (
                        <AgentEventsDisplay 
                          events={currentEvents}
                          isLoading={true}
                        />
                      )}
                      {!message.isStreaming && message.events && message.events.length > 0 && (
                        <AgentEventsDisplay 
                          events={message.events}
                        />
                      )}
                    </>
                  )}

                  {/* 消息氣泡 - 放在下面 */}
                  <div className={cn(
                    "rounded-lg px-4 py-2",
                    message.role === 'user' 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted"
                  )}>
                    {message.role === 'user' ? (
                      <div className="whitespace-pre-wrap">
                        {message.content || (message.isStreaming ? "思考中..." : "")}
                      </div>
                    ) : (
                      <HtmlContent 
                        content={message.content || (message.isStreaming ? "思考中..." : "")}
                      />
                    )}
                  </div>
                </div>

                {message.role === 'user' && (
                  <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    👤
                  </div>
                )}
              </motion.div>
            ))}
            
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* 輸入區域 */}
        <div className="border-t border-border bg-background p-4">
          <div className="max-w-3xl mx-auto">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="輸入問題或上傳產品圖片..."
                  disabled={isLoading}
                  className="w-full px-4 py-2 pr-12 border border-border rounded-lg bg-background focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                />
                
                {/* 圖片上傳按鈕 */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading || uploading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-8 w-8 p-0"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ImageIcon className="h-4 w-4" />
                  )}
                </Button>
              </div>
              
              <Button 
                type="submit" 
                disabled={!input.trim() || isLoading}
                className="px-4"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}