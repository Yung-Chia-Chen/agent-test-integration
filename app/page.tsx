import Link from 'next/link';

export default function RootPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-md mx-auto text-center p-8 bg-white rounded-lg shadow-lg">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">
          AI Agent 測試系統
        </h1>
        <p className="text-gray-600 mb-8">
          歡迎使用 AI Agent 測試系統，您可以在這裡測試 AI Agent 的功能和性能。
        </p>
        <Link 
          href="/agent-test" 
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors duration-200"
        >
          開始測試 →
        </Link>
      </div>
    </div>
  );
}