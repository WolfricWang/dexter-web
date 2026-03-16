import { useState } from 'react';
import { ApiKeyManager } from './ApiKeyManager';
import { ModelSelector } from './ModelSelector';
import { UserManager } from './UserManager';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../i18n/I18nContext';

interface SettingsPanelProps {
  onClose: () => void;
  isAdmin?: boolean;
}

type Tab = 'model' | 'apikeys' | 'users';

export function SettingsPanel({ onClose, isAdmin = false }: SettingsPanelProps) {
  const [tab, setTab] = useState<Tab>('model');
  const { theme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === 'dark';

  const tabs: { id: Tab; label: string }[] = [
    { id: 'model', label: t('settings.tabModel') },
    ...(isAdmin ? [{ id: 'apikeys' as Tab, label: t('settings.tabApiKeys') }] : []),
    ...(isAdmin ? [{ id: 'users' as Tab, label: t('settings.tabUsers') }] : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className={`w-full max-w-lg max-h-[80vh] border rounded-xl shadow-2xl flex flex-col ${
        isDark ? 'bg-zinc-900 border-zinc-700' : 'bg-white border-gray-200'
      }`}>
        <div className={`flex items-center justify-between px-5 py-3 border-b ${
          isDark ? 'border-zinc-800' : 'border-gray-200'
        }`}>
          <h2 className={`text-sm font-semibold ${isDark ? 'text-zinc-200' : 'text-gray-800'}`}>
            {t('settings.title')}
          </h2>
          <button
            onClick={onClose}
            className={`text-lg leading-none ${isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-gray-400 hover:text-gray-600'}`}
          >
            ✕
          </button>
        </div>

        <div className={`flex border-b ${isDark ? 'border-zinc-800' : 'border-gray-200'}`}>
          {tabs.map((item) => (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                tab === item.id
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : isDark ? 'text-zinc-500 hover:text-zinc-300' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {tab === 'model' && <ModelSelector />}
          {tab === 'apikeys' && <ApiKeyManager />}
          {tab === 'users' && <UserManager />}
        </div>
      </div>
    </div>
  );
}
