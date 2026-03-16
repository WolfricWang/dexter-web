import { useState, type FormEvent } from 'react';
import { api, setToken, setStoredUsername } from '../../api/client';
import { useI18n } from '../../i18n/I18nContext';
import { useTheme } from '../../context/ThemeContext';

interface LoginPageProps {
  onLogin: (username: string) => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { t, locale, setLocale } = useI18n();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError(t('login.errorEmpty'));
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await api.login(username, password);
      setToken(result.token);
      setStoredUsername(result.username);
      onLogin(result.username);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('401')) {
        setError(t('login.errorCredentials'));
      } else {
        setError(t('login.errorGeneric'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-zinc-950' : 'bg-gray-50'}`}>
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <button
          onClick={toggleTheme}
          className={`p-1.5 rounded-lg text-sm transition-colors ${
            isDark ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
          }`}
        >
          {isDark ? '☀️' : '🌙'}
        </button>
        <button
          onClick={() => setLocale(locale === 'en' ? 'zh' : 'en')}
          className={`px-2 py-1 rounded-lg text-xs font-medium transition-colors ${
            isDark ? 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200'
          }`}
        >
          {locale === 'en' ? '中文' : 'EN'}
        </button>
      </div>

      <div className="w-full max-w-sm mx-4">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">📊</div>
          <h1 className={`text-2xl font-bold ${isDark ? 'text-zinc-100' : 'text-gray-900'}`}>Dexter</h1>
          <p className={`text-sm mt-1 ${isDark ? 'text-zinc-500' : 'text-gray-500'}`}>{t('login.subtitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className={`border rounded-xl p-6 space-y-4 ${
          isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-200 shadow-sm'
        }`}>
          {error && (
            <div className="bg-red-900/30 text-red-400 border border-red-800 text-sm px-3 py-2 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <label className={`block text-xs mb-1.5 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
              {t('login.username')}
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={t('login.usernamePlaceholder')}
              autoFocus
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors ${
                isDark
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500'
                  : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
            />
          </div>

          <div>
            <label className={`block text-xs mb-1.5 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
              {t('login.password')}
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t('login.passwordPlaceholder')}
              className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors ${
                isDark
                  ? 'bg-zinc-800 border-zinc-700 text-zinc-100 placeholder-zinc-500'
                  : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
              }`}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:opacity-60 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {loading ? t('login.loading') : t('login.submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
