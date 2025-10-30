import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import { auth } from '@/app/(auth)/auth';
import { join } from 'path';

// 設置最大執行時間為 10 分鐘
export const maxDuration = 600; // 秒

export async function POST(request: NextRequest) {
  try {
    // 檢查身份驗證
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { input, history } = await request.json();
    
    if (!input || typeof input !== 'string') {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 });
    }

    // 驗證 history 格式（如果提供）
    const chatHistory = Array.isArray(history) ? history : [];

    // 設置路徑 - 使用環境變數
    const pythonPath = process.env.PYTHON_PATH || '/Users/chenyongjia/.pyenv/versions/agent_test/bin/python';
    const scriptPath = join(process.cwd(), 'python-backend', 'agent_test.py');
    const workingDir = join(process.cwd(), 'python-backend');

    // 創建串流響應
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        // 準備 Python 命令參數
        const pythonArgs = [
          scriptPath,
          '--input',
          input,
          '--history',
          JSON.stringify(chatHistory)
        ];

        // 調用 Python 後端
        const pythonProcess = spawn(pythonPath, pythonArgs, {
          cwd: workingDir,
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let buffer = '';
        let hasStarted = false;
        let isClosed = false;

        // 發送開始事件
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: 'process_start',
            timestamp: Date.now() / 1000,
            message: 'Agent 開始處理'
          })}\n\n`)
        );

        pythonProcess.stdout.on('data', (data) => {
          hasStarted = true;
          buffer += data.toString();
          
          // 處理多行 JSON 輸出
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // 保留最後一個不完整的行
          
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine && !isClosed) {
              try {
                const event = JSON.parse(trimmedLine);
                // 發送事件到前端
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
                );
              } catch (parseError) {
                console.error('Failed to parse JSON:', trimmedLine);
                // 如果無法解析為 JSON，可能是普通文本輸出
                if (!isClosed) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({
                      type: 'debug',
                      timestamp: Date.now() / 1000,
                      message: trimmedLine
                    })}\n\n`)
                  );
                }
              }
            }
          }
        });

        pythonProcess.stderr.on('data', (data) => {
          const errorMessage = data.toString();
          console.error('Python stderr:', errorMessage);
          if (!isClosed) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'error',
                error: errorMessage,
                timestamp: Date.now() / 1000
              })}\n\n`)
            );
          }
        });

        pythonProcess.on('close', (code) => {
          if (isClosed) return; // 避免重複處理
          
          if (code !== 0) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'error',
                error: `Process exited with code ${code}`,
                timestamp: Date.now() / 1000
              })}\n\n`)
            );
          } else if (hasStarted) {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({
                type: 'process_complete',
                timestamp: Date.now() / 1000,
                message: 'Agent 處理完成'
              })}\n\n`)
            );
          }
          isClosed = true;
          controller.close();
        });

        pythonProcess.on('error', (error) => {
          if (isClosed) return; // 避免重複處理
          
          console.error('Failed to start Python process:', error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              error: `Failed to start process: ${error.message}`,
              timestamp: Date.now() / 1000
            })}\n\n`)
          );
          isClosed = true;
          controller.close();
        });

        // 設置超時（10分鐘）
        const timeout = setTimeout(() => {
          if (isClosed) return; // 避免重複處理
          
          pythonProcess.kill();
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({
              type: 'error',
              error: 'Process timeout after 10 minutes',
              timestamp: Date.now() / 1000
            })}\n\n`)
          );
          isClosed = true;
          controller.close();
        }, 600000); // 10分鐘 = 600,000 毫秒

        pythonProcess.on('close', () => {
          clearTimeout(timeout);
        });
      },
    });

    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });

  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
