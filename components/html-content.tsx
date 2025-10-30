'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface HtmlContentProps {
  content: string;
  className?: string;
}

export function HtmlContent({ content, className }: HtmlContentProps) {
  // 檢查內容是否包含 HTML 表格
  const hasHtmlTable = content.includes('<table') || content.includes('<thead') || content.includes('<tbody');
  
  if (!hasHtmlTable) {
    // 如果沒有 HTML 表格，使用普通的文本顯示
    return (
      <div className={cn("whitespace-pre-wrap", className)}>
        {content}
      </div>
    );
  }

  // 如果有 HTML 表格，使用 dangerouslySetInnerHTML 渲染，並添加滾動容器
  return (
    <div className={cn("prose prose-sm max-w-none", className)}>
      <div className="overflow-x-auto border rounded-lg">
        <div 
          dangerouslySetInnerHTML={{ 
            __html: content.replace(
              /<table class="product-specs">/g, 
              '<table class="product-specs">'
            )
          }}
        />
      </div>
    </div>
  );
}