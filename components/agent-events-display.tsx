'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Brain, Search, CheckCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export interface AgentEvent {
  type: 'process_start' | 'thinking_complete' | 'tool_call_start' | 'tool_call_end' | 'final_result' | 'error' | 'debug' | 'process_complete';
  timestamp: number;
  content?: string;
  message?: string;
  tool_name?: string;
  final_output?: string;
  error?: string;
  user_input?: string;
  status?: string;
}

interface AgentEventsDisplayProps {
  events: AgentEvent[];
  isLoading?: boolean;
  finalResult?: string;
  className?: string;
  executionTime?: number;
}

export function AgentEventsDisplay({ 
  events, 
  isLoading = false, 
  finalResult,
  className,
  executionTime 
}: AgentEventsDisplayProps) {
  // 創建 ref 來控制滾動
  const eventsContainerRef = useRef<HTMLDivElement>(null);
  const userScrolledRef = useRef(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false); // 添加折疊狀態
  
  // 檢測用戶是否手動滾動
  const handleScroll = () => {
    if (!eventsContainerRef.current) return;
    
    const { scrollTop, scrollHeight, clientHeight } = eventsContainerRef.current;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 5; // 5px tolerance
    
    userScrolledRef.current = !isAtBottom;
    setShowScrollIndicator(!isAtBottom && events.length > 0);
    
    // 清除之前的定時器
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // 如果用戶滾動到底部，重新啟用自動滾動
    if (isAtBottom) {
      scrollTimeoutRef.current = setTimeout(() => {
        userScrolledRef.current = false;
      }, 1000);
    }
  };
  
  // 當事件更新時自動滾動到底部（僅當用戶沒有手動滾動時）
  useEffect(() => {
    if (eventsContainerRef.current && !userScrolledRef.current) {
      eventsContainerRef.current.scrollTo({
        top: eventsContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [events, isLoading]);

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'process_start':
        return <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse" />;
      case 'thinking_complete':
        return <Brain className="w-3 h-3 text-blue-500" />;
      case 'tool_call_start':
        return <Search className="w-3 h-3 text-yellow-500" />;
      case 'tool_call_end':
        return <CheckCircle className="w-3 h-3 text-green-500" />;
      case 'final_result':
        return <CheckCircle className="w-3 h-3 text-green-600" />;
      case 'process_complete':
        return <CheckCircle className="w-3 h-3 text-green-600" />;
      case 'error':
        return <div className="w-3 h-3 bg-red-500 rounded-full" />;
      case 'debug':
        return <div className="w-3 h-3 bg-gray-400 rounded-full" />;
      default:
        return <div className="w-3 h-3 bg-gray-400 rounded-full" />;
    }
  };

  const getEventBadgeColor = (type: string) => {
    switch (type) {
      case 'process_start':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'thinking_complete':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
      case 'tool_call_start':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'tool_call_end':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'final_result':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'process_complete':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'debug':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const formatEventMessage = (event: AgentEvent) => {
    switch (event.type) {
      case 'process_start':
        return '🚀 Agent 開始處理您的查詢...';
      case 'thinking_complete':
        return event.content || event.message || '思考過程完成';
      case 'tool_call_start':
        return event.message || `開始調用工具: ${event.tool_name}`;
      case 'tool_call_end':
        return event.message || `工具調用完成: ${event.tool_name}`;
      case 'final_result':
        return '🎉 查詢完成！';
      case 'process_complete':
        return '✅ Agent 處理完成';
      case 'error':
        return `錯誤: ${event.error}`;
      case 'debug':
        return event.message || '調試信息';
      default:
        return event.message || '未知事件';
    }
  };

  if (events.length === 0 && !isLoading) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {/* Agent 執行過程 */}
      {events.length > 0 && (
        <div className="border rounded-lg bg-muted/30 relative overflow-hidden">
          {/* 可折疊的標題欄 */}
          <div 
            className="flex items-center justify-between p-3 bg-muted cursor-pointer hover:bg-muted/80 transition-colors border-b"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <div className="flex items-center gap-2">
              <Brain className="w-3 h-3 text-blue-500" />
              <span className="text-xs font-medium">Agent 執行過程</span>
              {isLoading && (
                <Loader2 className="w-3 h-3 animate-spin text-blue-500" />
              )}
            </div>
            {isCollapsed ? (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            )}
          </div>
          
          {/* 可折疊的內容區域 */}
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <div className="relative p-3">
                  {/* 滾動指示器 */}
                  {showScrollIndicator && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute top-2 right-2 bg-blue-500 text-white text-xs px-2 py-1 rounded-full shadow-lg z-10 cursor-pointer"
                      onClick={() => {
                        if (eventsContainerRef.current) {
                          eventsContainerRef.current.scrollTo({
                            top: eventsContainerRef.current.scrollHeight,
                            behavior: 'smooth'
                          });
                        }
                      }}
                    >
                      新訊息 ↓
                    </motion.div>
                  )}
                  
                  <div 
                    ref={eventsContainerRef}
                    onScroll={handleScroll}
                    className="space-y-2 max-h-64 overflow-y-auto scroll-smooth"
                  >
                    <AnimatePresence>
                      {events.map((event, index) => (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, y: 10, scale: 0.95 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          transition={{ duration: 0.2, ease: "easeOut" }}
                          className="flex items-start gap-2 text-xs"
                        >
                        <div className="flex-shrink-0 mt-0.5">
                          {getEventIcon(event.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={cn("text-xs px-1.5 py-0.5", getEventBadgeColor(event.type))}>
                              {event.type === 'thinking_complete' ? 'thinking...' : event.type.replace('_', ' ')}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {new Date(event.timestamp * 1000).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-xs text-foreground/80">
                            {formatEventMessage(event)}
                          </p>
                        </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* 載入狀態 */}
      {isLoading && (
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
          className="border rounded-lg p-3 bg-muted/30"
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
            >
              AI Agent 正在處理您的查詢...
            </motion.span>
            <motion.span 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-xs text-muted-foreground ml-2"
            >
              (複雜查詢可能需要 30 秒至 2 分鐘)
            </motion.span>
          </div>
        </motion.div>
      )}

      {/* 最終結果 */}
      {finalResult && (
        <motion.div 
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="border rounded-lg p-3 bg-green-50 dark:bg-green-900/20"
        >
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex items-center justify-between text-xs font-medium text-green-800 dark:text-green-300 mb-2"
          >
            <span>查詢結果</span>
            {executionTime && (
              <span className="text-xs text-muted-foreground">
                執行時間: {(executionTime / 1000).toFixed(1)}s
              </span>
            )}
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-sm whitespace-pre-wrap"
          >
            {finalResult}
          </motion.div>
        </motion.div>
      )}
    </div>
  );
}