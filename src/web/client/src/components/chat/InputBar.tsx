import { useState, useRef, useEffect } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../i18n/I18nContext';

interface InputBarProps {
  onSend: (query: string) => void;
  onStop: () => void;
  isStreaming: boolean;
  disabled?: boolean;
}

export function InputBar({ onSend, onStop, isStreaming, disabled }: InputBarProps) {
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { theme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === 'dark';

  useEffect(() => {
    if (!isStreaming && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isStreaming]);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || isStreaming || disabled) return;
    onSend(trimmed);
    setValue('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }
  };

  return (
    <div className={`border-t px-4 py-3 ${
      isDark ? 'border-zinc-800 bg-zinc-950' : 'border-gray-200 bg-white'
    }`}>
      <div className="max-w-3xl mx-auto flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            handleInput();
          }}
          onKeyDown={handleKeyDown}
          placeholder={t('chat.placeholder')}
          rows={1}
          disabled={disabled}
          className={`flex-1 border rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none transition-colors disabled:opacity-50 ${
            isDark
              ? 'bg-zinc-900 border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:border-blue-500'
              : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500'
          }`}
        />
        {isStreaming ? (
          <button
            onClick={onStop}
            className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-sm font-medium transition-colors flex-shrink-0"
          >
            {t('chat.stop')}
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!value.trim() || disabled}
            className={`px-4 py-2.5 rounded-xl text-white text-sm font-medium transition-colors flex-shrink-0 ${
              !value.trim() || disabled
                ? isDark ? 'bg-zinc-700 text-zinc-500' : 'bg-gray-300 text-gray-500'
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {t('chat.send')}
          </button>
        )}
      </div>
    </div>
  );
}
