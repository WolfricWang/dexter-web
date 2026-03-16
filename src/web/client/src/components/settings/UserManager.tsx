import { useState, useEffect } from 'react';
import { api, getStoredUsername } from '../../api/client';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../i18n/I18nContext';

interface UserWithRole {
  username: string;
  role: 'admin' | 'user';
}

export function UserManager() {
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [oldPwd, setOldPwd] = useState('');
  const [newPwd, setNewPwd] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [adding, setAdding] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);
  const { theme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === 'dark';

  const currentUser = getStoredUsername() || '';

  const loadUsers = async () => {
    try {
      const { users: u } = await api.getUsers();
      setUsers(u);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleAddUser = async () => {
    if (!newUsername.trim() || !newPassword.trim()) {
      setMessage({ type: 'error', text: t('users.emptyFields') });
      return;
    }
    setAdding(true);
    setMessage(null);
    try {
      await api.addUser(newUsername.trim(), newPassword.trim(), newRole);
      setMessage({ type: 'success', text: t('users.created', { username: newUsername.trim() }) });
      setNewUsername('');
      setNewPassword('');
      setNewRole('user');
      loadUsers();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : t('users.createFailed') });
    } finally {
      setAdding(false);
    }
  };

  const handleRoleChange = async (username: string, newRoleVal: 'admin' | 'user') => {
    setMessage(null);
    try {
      await api.updateUserRole(username, newRoleVal);
      const roleLabel = newRoleVal === 'admin' ? t('users.roleAdmin') : t('users.roleUser');
      setMessage({ type: 'success', text: t('users.roleChanged', { username, role: roleLabel }) });
      loadUsers();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : t('users.roleChangeFailed') });
    }
  };

  const handleDeleteUser = async (username: string) => {
    if (!confirm(t('users.deleteConfirm', { username }))) return;
    try {
      await api.deleteUser(username);
      setMessage({ type: 'success', text: t('users.deleted', { username }) });
      loadUsers();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : t('users.deleteFailed') });
    }
  };

  const handleChangePassword = async () => {
    if (!oldPwd || !newPwd) {
      setMessage({ type: 'error', text: t('users.pwdEmptyFields') });
      return;
    }
    setChangingPwd(true);
    setMessage(null);
    try {
      await api.changePassword(oldPwd, newPwd);
      setMessage({ type: 'success', text: t('users.pwdChanged') });
      setOldPwd('');
      setNewPwd('');
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : t('users.pwdChangeFailed') });
    } finally {
      setChangingPwd(false);
    }
  };

  const inputClass = `w-full text-xs border rounded px-2 py-1.5 focus:outline-none focus:border-blue-500 ${
    isDark ? 'bg-zinc-800 border-zinc-700 text-zinc-200' : 'bg-white border-gray-300 text-gray-800'
  }`;

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

      {/* Change own password */}
      <div>
        <h3 className={`text-sm font-medium mb-3 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
          {t('users.changePassword')} ({t('users.currentUser')}: {currentUser})
        </h3>
        <div className="space-y-2">
          <input
            type="password"
            value={oldPwd}
            onChange={(e) => setOldPwd(e.target.value)}
            placeholder={t('users.currentPassword')}
            className={inputClass}
          />
          <input
            type="password"
            value={newPwd}
            onChange={(e) => setNewPwd(e.target.value)}
            placeholder={t('users.newPassword')}
            className={inputClass}
          />
          <button
            onClick={handleChangePassword}
            disabled={changingPwd}
            className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
          >
            {changingPwd ? t('users.changing') : t('users.changeBtn')}
          </button>
        </div>
      </div>

      {/* User list */}
      <div>
        <h3 className={`text-sm font-medium mb-3 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
          {t('users.userList')}
        </h3>
        <div className="space-y-2">
          {users.map((u) => (
            <div
              key={u.username}
              className={`flex items-center justify-between border rounded-lg px-3 py-2 ${
                isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-sm ${isDark ? 'text-zinc-200' : 'text-gray-700'}`}>
                  {u.username}
                </span>
                {u.username === currentUser ? (
                  <>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${
                      u.role === 'admin'
                        ? 'bg-amber-900/40 text-amber-400'
                        : isDark ? 'bg-zinc-800 text-zinc-500' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {u.role === 'admin' ? t('users.roleAdmin') : t('users.roleUser')}
                    </span>
                    <span className="text-xs text-blue-400">{t('users.current')}</span>
                  </>
                ) : (
                  <select
                    value={u.role}
                    onChange={(e) => handleRoleChange(u.username, e.target.value as 'admin' | 'user')}
                    className={`text-xs border rounded px-1.5 py-0.5 focus:outline-none focus:border-blue-500 ${
                      u.role === 'admin'
                        ? 'bg-amber-900/40 text-amber-400 border-amber-800'
                        : isDark
                          ? 'bg-zinc-800 text-zinc-400 border-zinc-700'
                          : 'bg-gray-100 text-gray-500 border-gray-300'
                    }`}
                  >
                    <option value="admin">{t('users.roleAdmin')}</option>
                    <option value="user">{t('users.roleUser')}</option>
                  </select>
                )}
              </div>
              {u.username !== currentUser && (
                <button
                  onClick={() => handleDeleteUser(u.username)}
                  className="text-xs text-red-400 hover:text-red-300 flex-shrink-0"
                >
                  {t('users.deleteUser')}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add user */}
      <div>
        <h3 className={`text-sm font-medium mb-3 ${isDark ? 'text-zinc-300' : 'text-gray-700'}`}>
          {t('users.addUser')}
        </h3>
        <div className="space-y-2">
          <input
            type="text"
            value={newUsername}
            onChange={(e) => setNewUsername(e.target.value)}
            placeholder={t('users.username')}
            className={inputClass}
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder={t('users.password')}
            className={inputClass}
          />
          <div className="flex items-center gap-2">
            <span className={`text-xs ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>{t('users.role')}:</span>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as 'admin' | 'user')}
              className={inputClass}
            >
              <option value="user">{t('users.roleUser')}</option>
              <option value="admin">{t('users.roleAdmin')}</option>
            </select>
          </div>
          <button
            onClick={handleAddUser}
            disabled={adding}
            className="text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded disabled:opacity-50"
          >
            {adding ? t('users.adding') : t('users.addBtn')}
          </button>
        </div>
      </div>
    </div>
  );
}
