import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../../api/useChat';
import { MessageBubble } from './MessageBubble';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../i18n/I18nContext';

interface MessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
}

export function MessageList({ messages, isStreaming }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const { theme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === 'dark';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">📊</div>
          <h2 className={`text-lg font-semibold mb-2 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
            {t('chat.title')}
          </h2>
          <p className={`text-sm max-w-sm ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
            {t('chat.subtitle')}
          </p>
          <div className="mt-6 grid grid-cols-2 gap-2 max-w-md">
            {([
              t('chat.quickQuery1'),
              t('chat.quickQuery2'),
              t('chat.quickQuery3'),
              t('chat.quickQuery4'),
            ] as string[]).map((q) => (
              <button
                key={q}
                className={`text-left text-xs border rounded-lg px-3 py-2 transition-colors ${
                  isDark
                    ? 'text-zinc-400 bg-zinc-900 hover:bg-zinc-800 border-zinc-800'
                    : 'text-gray-500 bg-gray-50 hover:bg-gray-100 border-gray-200'
                }`}
                onClick={() => {
                  const event = new CustomEvent('quickQuery', { detail: q });
                  window.dispatchEvent(event);
                }}
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="max-w-3xl mx-auto">
        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            message={msg}
            isStreaming={isStreaming && i === messages.length - 1 && msg.role === 'assistant'}
          />
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
