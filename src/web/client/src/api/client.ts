const BASE = '';

function getToken(): string | null {
  return localStorage.getItem('dexter_token');
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem('dexter_token', token);
  } else {
    localStorage.removeItem('dexter_token');
  }
}

export function getStoredUsername(): string | null {
  return localStorage.getItem('dexter_username');
}

export function setStoredUsername(username: string | null): void {
  if (username) {
    localStorage.setItem('dexter_username', username);
  } else {
    localStorage.removeItem('dexter_username');
  }
}

export async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string>),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(`${BASE}${path}`, { ...options, headers });
  if (res.status === 401) {
    setToken(null);
    setStoredUsername(null);
    window.dispatchEvent(new Event('auth:expired'));
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export interface SessionMeta {
  id: string;
  title: string;
  model: string;
  provider: string;
  username?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface SessionData extends SessionMeta {
  messages: SessionMessage[];
}

export interface ProviderInfo {
  id: string;
  displayName: string;
  hasApiKey: boolean;
  requiresApiKey: boolean;
  models: { id: string; displayName: string }[];
}

export interface ApiKeyInfo {
  provider: string;
  displayName: string;
  envVar: string;
  configured: boolean;
  maskedValue: string | null;
}

export interface SettingsInfo {
  provider: string;
  modelId: string;
  webSearch: { name: string; envVar: string; configured: boolean; priority: number }[];
  activeSearchProvider: string | null;
}

export const api = {
  login: (username: string, password: string) =>
    apiFetch<{ token: string; username: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  logout: () =>
    apiFetch<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),

  getMe: () =>
    apiFetch<{ username: string; role: 'admin' | 'user' }>('/api/auth/me'),

  changePassword: (oldPassword: string, newPassword: string) =>
    apiFetch<{ ok: boolean }>('/api/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({ oldPassword, newPassword }),
    }),

  getUsers: () =>
    apiFetch<{ users: { username: string; role: 'admin' | 'user' }[] }>('/api/auth/users'),

  addUser: (username: string, password: string, role?: 'admin' | 'user') =>
    apiFetch<{ ok: boolean }>('/api/auth/users', {
      method: 'POST',
      body: JSON.stringify({ username, password, role }),
    }),

  updateUserRole: (username: string, role: 'admin' | 'user') =>
    apiFetch<{ ok: boolean }>(`/api/auth/users/${username}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),

  deleteUser: (username: string) =>
    apiFetch<{ ok: boolean }>(`/api/auth/users/${username}`, { method: 'DELETE' }),

  getSessions: () => apiFetch<{ sessions: SessionMeta[] }>('/api/sessions'),
  getSession: (id: string) => apiFetch<{ session: SessionData }>(`/api/sessions/${id}`),
  deleteSession: (id: string) => apiFetch<{ ok: boolean }>(`/api/sessions/${id}`, { method: 'DELETE' }),

  sendMessage: (data: { sessionId?: string; query: string; model?: string; provider?: string }) =>
    apiFetch<{ sessionId: string; model: string; provider: string }>('/api/chat', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  stopGeneration: (sessionId: string) =>
    apiFetch<{ ok: boolean }>(`/api/chat/${sessionId}/stop`, { method: 'POST' }),

  getProviders: () => apiFetch<{ providers: ProviderInfo[] }>('/api/providers'),

  getSettings: () => apiFetch<SettingsInfo>('/api/settings'),
  updateSettings: (data: { provider?: string; modelId?: string }) =>
    apiFetch<{ ok: boolean }>('/api/settings', { method: 'PUT', body: JSON.stringify(data) }),

  saveApiKey: (provider: string, apiKey: string) =>
    apiFetch<{ ok: boolean }>('/api/settings/apikey', {
      method: 'POST',
      body: JSON.stringify({ provider, apiKey }),
    }),

  getApiKeys: () => apiFetch<{ keys: ApiKeyInfo[] }>('/api/settings/apikeys'),
};
