import { useState, useEffect } from 'react';
import { api, type ProviderInfo, type SettingsInfo } from '../../api/client';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../i18n/I18nContext';

interface HeaderProps {
  onModelChange?: (model: string, provider: string) => void;
  username?: string;
  onLogout?: () => void;
}

export function Header({ onModelChange, username, onLogout }: HeaderProps) {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [settings, setSettings] = useState<SettingsInfo | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const { t, locale, setLocale } = useI18n();
  const isDark = theme === 'dark';

  useEffect(() => {
    api.getProviders().then(({ providers: p }) => setProviders(p));
    api.getSettings().then((s) => setSettings(s));
  }, []);

  const currentModel = settings?.modelId || 'gpt-5.2';
  const currentProvider = settings?.provider || 'openai';

  const currentProviderInfo = providers.find((p) => p.id === currentProvider);
  const currentModelInfo = currentProviderInfo?.models.find((m) => m.id === currentModel);
  const displayName = currentModelInfo?.displayName || currentModel;

  const handleSelect = async (providerId: string, modelId: string) => {
    setShowDropdown(false);
    await api.updateSettings({ provider: providerId, modelId });
    setSettings((s) => (s ? { ...s, provider: providerId, modelId } : s));
    onModelChange?.(modelId, providerId);
  };

  const btnClass = `p-1.5 rounded-lg text-sm transition-colors ${
    isDark ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
  }`;

  return (
    <header className={`h-12 border-b flex items-center px-4 justify-between flex-shrink-0 ${
      isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200'
    }`}>
      <div className="flex items-center gap-2">
        <span className="text-lg">📊</span>
        <span className={`font-semibold text-sm ${isDark ? 'text-zinc-200' : 'text-gray-800'}`}>Dexter</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Language toggle */}
        <button
          onClick={() => setLocale(locale === 'en' ? 'zh' : 'en')}
          className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
            isDark ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          {locale === 'en' ? '中文' : 'EN'}
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className={btnClass}
          title={isDark ? t('header.switchToLight') : t('header.switchToDark')}
        >
          {isDark ? '☀️' : '🌙'}
        </button>

        {/* Model selector */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg transition-colors ${
              isDark
                ? 'text-zinc-300 bg-zinc-800 hover:bg-zinc-700'
                : 'text-gray-700 bg-gray-100 hover:bg-gray-200'
            }`}
          >
            <span className={isDark ? 'text-zinc-500' : 'text-gray-400'}>{t('header.model')}:</span>
            <span className="font-medium">{displayName}</span>
            <span className={isDark ? 'text-zinc-500' : 'text-gray-400'}>▾</span>
          </button>

          {showDropdown && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowDropdown(false)} />
              <div className={`absolute right-0 top-full mt-1 w-64 border rounded-lg shadow-xl z-20 py-1 max-h-80 overflow-y-auto ${
                isDark ? 'bg-zinc-800 border-zinc-700' : 'bg-white border-gray-200'
              }`}>
                {providers
                  .filter((p) => p.hasApiKey && p.models.length > 0)
                  .map((p) => (
                    <div key={p.id}>
                      <div className={`px-3 py-1.5 text-xs font-medium uppercase tracking-wide ${
                        isDark ? 'text-zinc-500' : 'text-gray-400'
                      }`}>
                        {p.displayName}
                      </div>
                      {p.models.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => handleSelect(p.id, m.id)}
                          className={`w-full text-left px-3 py-1.5 text-sm transition-colors ${
                            m.id === currentModel && p.id === currentProvider
                              ? 'text-blue-400'
                              : isDark ? 'text-zinc-300 hover:bg-zinc-700' : 'text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          {m.displayName}
                        </button>
                      ))}
                    </div>
                  ))}
                {providers.filter((p) => p.hasApiKey && p.models.length > 0).length === 0 && (
                  <p className={`px-3 py-2 text-xs ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                    {t('header.noProviders')}
                  </p>
                )}
              </div>
            </>
          )}
        </div>

        {/* User info */}
        {username && (
          <div className="flex items-center gap-2">
            <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>{username}</span>
            <button
              onClick={onLogout}
              className={`text-xs px-2 py-1 rounded transition-colors ${
                isDark
                  ? 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800'
                  : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              }`}
            >
              {t('header.logout')}
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
