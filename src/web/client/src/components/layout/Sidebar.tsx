import { useState, useEffect } from 'react';
import { api, type SessionMeta } from '../../api/client';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../i18n/I18nContext';

interface SidebarProps {
  activeSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onOpenSettings: () => void;
  refreshKey: number;
}

export function Sidebar({
  activeSessionId,
  onSelectSession,
  onNewChat,
  onOpenSettings,
  refreshKey,
}: SidebarProps) {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const { theme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === 'dark';

  const loadSessions = async () => {
    try {
      const { sessions: list } = await api.getSessions();
      setSessions(list);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadSessions();
  }, [refreshKey]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (!confirm(t('sidebar.deleteConfirm'))) return;
    await api.deleteSession(id);
    loadSessions();
  };

  return (
    <div className={`w-64 border-r flex flex-col h-full ${
      isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-gray-50 border-gray-200'
    }`}>
      <div className="p-3">
        <button
          onClick={onNewChat}
          className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
            isDark
              ? 'text-zinc-300 bg-zinc-800 hover:bg-zinc-700'
              : 'text-gray-700 bg-white hover:bg-gray-100 border border-gray-200'
          }`}
        >
          <span className="text-lg leading-none">+</span>
          {t('sidebar.newChat')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-0.5">
        {sessions.map((s) => (
          <div
            key={s.id}
            onClick={() => onSelectSession(s.id)}
            className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-sm transition-colors ${
              activeSessionId === s.id
                ? isDark ? 'bg-zinc-700/60 text-zinc-100' : 'bg-blue-50 text-blue-700'
                : isDark ? 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <span className="flex-1 truncate">{s.title}</span>
            <button
              onClick={(e) => handleDelete(e, s.id)}
              className={`opacity-0 group-hover:opacity-100 transition-all text-xs flex-shrink-0 ${
                isDark ? 'text-zinc-500 hover:text-red-400' : 'text-gray-400 hover:text-red-500'
              }`}
              title={t('sidebar.delete')}
            >
              ✕
            </button>
          </div>
        ))}
        {sessions.length === 0 && (
          <p className={`text-xs text-center py-4 ${isDark ? 'text-zinc-600' : 'text-gray-400'}`}>
            {t('sidebar.noConversations')}
          </p>
        )}
      </div>

      <div className={`p-3 border-t ${isDark ? 'border-zinc-800' : 'border-gray-200'}`}>
        <button
          onClick={onOpenSettings}
          className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors ${
            isDark
              ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          <span>⚙</span>
          {t('sidebar.settings')}
        </button>
      </div>
    </div>
  );
}
