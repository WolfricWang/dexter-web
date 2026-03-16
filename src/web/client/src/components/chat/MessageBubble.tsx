import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import type { ChatMessage } from '../../api/useChat';
import { ThinkingBlock } from './ThinkingBlock';
import { ToolCallBlock } from './ToolCallBlock';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../i18n/I18nContext';

function formatDuration(ms: number): string {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

function formatTokens(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

export function MessageBubble({ message, isStreaming }: { message: ChatMessage; isStreaming?: boolean }) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === 'dark';

  if (message.role === 'user') {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[75%] bg-blue-600 text-white px-4 py-2.5 rounded-2xl rounded-br-md text-sm leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  const hasThinking = message.thinking && message.thinking.length > 0;
  const hasTools = message.tools && message.tools.length > 0;
  const hasContent = message.content.trim().length > 0;
  const showSpinner = isStreaming && !hasContent;

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-6 h-6 rounded-md bg-emerald-600 flex items-center justify-center text-xs font-bold text-white">
          D
        </div>
        <span className={`text-xs font-medium ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>Dexter</span>
      </div>

      <div className="ml-8">
        {hasThinking && <ThinkingBlock lines={message.thinking!} />}

        {hasTools && (
          <div className="mb-3 space-y-1">
            {message.tools!.map((tool) => (
              <ToolCallBlock key={tool.id} tool={tool} />
            ))}
          </div>
        )}

        {showSpinner && (
          <div className={`flex items-center gap-2 text-sm ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
            <span className="inline-block w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            {t('chat.processing')}
          </div>
        )}

        {hasContent && (
          <div className={`markdown-content text-sm leading-relaxed ${isDark ? 'text-zinc-200' : 'text-gray-800'}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
          </div>
        )}

        {message.duration != null && (
          <div className={`mt-2 text-xs flex items-center gap-3 ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>
            <span>{formatDuration(message.duration)}</span>
            {message.tokenUsage && (
              <span>{formatTokens(message.tokenUsage.totalTokens)} tokens</span>
            )}
            {message.tokensPerSecond != null && (
              <span>{message.tokensPerSecond.toFixed(0)} tok/s</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
