import { useState } from 'react';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../i18n/I18nContext';

export function ThinkingBlock({ lines }: { lines: string[] }) {
  const [expanded, setExpanded] = useState(false);
  const { theme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === 'dark';

  if (!lines.length) return null;

  const preview = lines[lines.length - 1]?.slice(0, 120) || '';

  return (
    <div className="mb-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-2 text-xs transition-colors ${
          isDark ? 'text-zinc-500 hover:text-zinc-400' : 'text-gray-400 hover:text-gray-600'
        }`}
      >
        <span className="inline-block w-4 text-center">{expanded ? '▼' : '▶'}</span>
        <span>{t('chat.thinking')}{!expanded && preview ? `: ${preview}...` : ''}</span>
      </button>
      {expanded && (
        <div className={`mt-1 ml-6 text-xs space-y-1 max-h-48 overflow-y-auto ${
          isDark ? 'text-zinc-500' : 'text-gray-400'
        }`}>
          {lines.map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
      )}
    </div>
  );
}
