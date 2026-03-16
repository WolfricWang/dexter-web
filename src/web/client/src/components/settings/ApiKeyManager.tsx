import { useState, useEffect } from 'react';
import { api, type ApiKeyInfo } from '../../api/client';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../i18n/I18nContext';

export function ApiKeyManager() {
  const [keys, setKeys] = useState<ApiKeyInfo[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const { theme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === 'dark';

  const loadKeys = async () => {
    try {
      const { keys: k } = await api.getApiKeys();
      setKeys(k);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadKeys();
  }, []);

  const handleSave = async (provider: string) => {
    if (!inputValue.trim()) return;
    setSaving(true);
    setMessage(null);
    try {
      await api.saveApiKey(provider, inputValue.trim());
      setMessage({ type: 'success', text: t('apikeys.saved') });
      setEditing(null);
      setInputValue('');
      loadKeys();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : t('apikeys.saveFailed') });
    } finally {
      setSaving(false);
    }
  };

  const searchKeys = [
    { envVar: 'EXASEARCH_API_KEY', name: 'Exa', priority: 1 },
    { envVar: 'PERPLEXITY_API_KEY', name: 'Perplexity', priority: 2 },
    { envVar: 'TAVILY_API_KEY', name: 'Tavily', priority: 3 },
  ];

  const llmKeys = keys.filter(
    (k) => !searchKeys.some((sk) => sk.envVar === k.envVar),
  );
  const webSearchKeys = keys.filter((k) =>
    searchKeys.some((sk) => sk.envVar === k.envVar),
  );

  const renderKeyRow = (k: ApiKeyInfo, editKey: string) => (
    <div
      key={editKey}
      className={`flex items-center gap-3 border rounded-lg px-3 py-2.5 ${
        isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-gray-50 border-gray-200'
      }`}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={`text-sm font-medium ${isDark ? 'text-zinc-200' : 'text-gray-700'}`}>
            {k.displayName}
          </span>
          <span
            className={`text-xs px-1.5 py-0.5 rounded ${
              k.configured
                ? 'bg-emerald-900/30 text-emerald-400'
                : isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-gray-200 text-gray-500'
            }`}
          >
            {k.configured ? t('apikeys.configured') : t('apikeys.notSet')}
          </span>
        </div>
        {k.configured && k.maskedValue && (
          <span className={`text-xs font-mono ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
            {k.maskedValue}
          </span>
        )}
      </div>
      {editing === editKey ? (
        <div className="flex items-center gap-1">
          <input
            type="password"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={t('apikeys.enterKey')}
            className={`w-48 text-xs border rounded px-2 py-1.5 focus:outline-none focus:border-blue-500 ${
              isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-200' : 'bg-white border-gray-300 text-gray-800'
            }`}
            onKeyDown={(e) => e.key === 'Enter' && handleSave(k.provider)}
            autoFocus
          />
          <button
            onClick={() => handleSave(k.provider)}
            disabled={saving}
            className="text-xs px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
          >
            {t('apikeys.save')}
          </button>
          <button
            onClick={() => { setEditing(null); setInputValue(''); }}
            className={`text-xs px-2 py-1.5 ${isDark ? 'text-zinc-400 hover:text-zinc-200' : 'text-gray-400 hover:text-gray-600'}`}
          >
            {t('apikeys.cancel')}
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setEditing(editKey); setInputValue(''); setMessage(null); }}
          className="text-xs px-2 py-1.5 text-blue-400 hover:text-blue-300"
        >
          {k.configured ? t('apikeys.update') : t('apikeys.addKey')}
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {message && (
        <div
          className={`text-xs px-3 py-2 rounded-lg ${
            message.type === 'success'
              ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-800'
              : 'bg-red-900/30 text-red-400 border border-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <div>
        <h3 className={`text-sm font-medium mb-3 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
          {t('apikeys.llmProviders')}
        </h3>
        <div className="space-y-2">
          {llmKeys.map((k) => renderKeyRow(k, k.provider))}
        </div>
      </div>

      <div>
        <h3 className={`text-sm font-medium mb-1 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
          {t('apikeys.webSearch')}
        </h3>
        <p className={`text-xs mb-3 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
          {t('apikeys.webSearchNote')}
        </p>
        <div className="space-y-2">
          {webSearchKeys.map((k) => renderKeyRow(k, k.envVar))}
        </div>
      </div>
    </div>
  );
}
