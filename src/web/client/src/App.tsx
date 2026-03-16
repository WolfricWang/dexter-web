import { useState, useCallback, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { ChatView } from './components/chat/ChatView';
import { SettingsPanel } from './components/settings/SettingsPanel';
import { LoginPage } from './components/auth/LoginPage';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { I18nProvider } from './i18n/I18nContext';
import { getStoredUsername, setToken, setStoredUsername, api } from './api/client';

function AppInner() {
  const [user, setUser] = useState<string | null>(getStoredUsername());
  const [userRole, setUserRole] = useState<'admin' | 'user' | null>(null);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0);
  const [currentModel, setCurrentModel] = useState<string | undefined>();
  const [currentProvider, setCurrentProvider] = useState<string | undefined>();
  const { theme } = useTheme();

  useEffect(() => {
    const handler = () => {
      setUser(null);
      setUserRole(null);
    };
    window.addEventListener('auth:expired', handler);
    return () => window.removeEventListener('auth:expired', handler);
  }, []);

  // Verify token on mount and load role
  useEffect(() => {
    if (user) {
      api.getMe()
        .then((me) => setUserRole(me.role))
        .catch(() => {
          setUser(null);
          setUserRole(null);
          setToken(null);
          setStoredUsername(null);
        });
    } else {
      setUserRole(null);
    }
  }, [user]);

  const handleLogin = useCallback((username: string) => {
    setUser(username);
    api.getMe().then((me) => setUserRole(me.role)).catch(() => setUserRole('user'));
  }, []);

  const handleLogout = useCallback(async () => {
    try { await api.logout(); } catch { /* ignore */ }
    setToken(null);
    setStoredUsername(null);
    setUser(null);
    setUserRole(null);
    setActiveSessionId(null);
  }, []);

  const handleNewChat = useCallback(() => {
    setActiveSessionId(null);
    setSidebarRefreshKey((k) => k + 1);
  }, []);

  const handleSessionCreated = useCallback((id: string) => {
    setActiveSessionId(id);
    setSidebarRefreshKey((k) => k + 1);
  }, []);

  const handleModelChange = useCallback((model: string, provider: string) => {
    setCurrentModel(model);
    setCurrentProvider(provider);
  }, []);

  if (!user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  const isDark = theme === 'dark';

  return (
    <div className={`h-screen flex flex-col ${isDark ? 'bg-zinc-950 text-zinc-100' : 'bg-white text-zinc-900'}`}>
      <Header onModelChange={handleModelChange} username={user} onLogout={handleLogout} />
      <div className="flex flex-1 min-h-0">
        <Sidebar
          activeSessionId={activeSessionId}
          onSelectSession={setActiveSessionId}
          onNewChat={handleNewChat}
          onOpenSettings={() => setShowSettings(true)}
          refreshKey={sidebarRefreshKey}
        />
        <main className="flex-1 min-w-0">
          <ChatView
            sessionId={activeSessionId}
            onSessionCreated={handleSessionCreated}
            model={currentModel}
            provider={currentProvider}
          />
        </main>
      </div>

      {showSettings && (
        <SettingsPanel
          onClose={() => setShowSettings(false)}
          isAdmin={userRole === 'admin'}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <I18nProvider>
      <ThemeProvider>
        <AppInner />
      </ThemeProvider>
    </I18nProvider>
  );
}
