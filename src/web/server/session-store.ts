import { existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';

const SESSIONS_DIR = '.dexter/web-sessions';

export interface SessionMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  events?: unknown[];
}

export interface SessionMeta {
  id: string;
  title: string;
  model: string;
  provider: string;
  username: string;
  createdAt: string;
  updatedAt: string;
}

export interface SessionData extends SessionMeta {
  messages: SessionMessage[];
}

function ensureDir() {
  if (!existsSync(SESSIONS_DIR)) {
    mkdirSync(SESSIONS_DIR, { recursive: true });
  }
}

function sessionPath(id: string): string {
  return join(SESSIONS_DIR, `${id}.json`);
}

export function listSessions(username?: string): SessionMeta[] {
  ensureDir();
  const files = readdirSync(SESSIONS_DIR).filter((f) => f.endsWith('.json'));
  const sessions: SessionMeta[] = [];
  for (const file of files) {
    try {
      const data = JSON.parse(readFileSync(join(SESSIONS_DIR, file), 'utf-8')) as SessionData;
      if (username && data.username && data.username !== username) continue;
      sessions.push({
        id: data.id,
        title: data.title,
        model: data.model,
        provider: data.provider,
        username: data.username || '',
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      });
    } catch {
      // skip corrupt files
    }
  }
  return sessions.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getSession(id: string): SessionData | null {
  const path = sessionPath(id);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as SessionData;
  } catch {
    return null;
  }
}

export function saveSession(session: SessionData): void {
  ensureDir();
  writeFileSync(sessionPath(session.id), JSON.stringify(session, null, 2));
}

export function deleteSession(id: string): boolean {
  const path = sessionPath(id);
  if (!existsSync(path)) return false;
  try {
    unlinkSync(path);
    return true;
  } catch {
    return false;
  }
}

export function createSession(id: string, model: string, provider: string, firstQuery: string, username: string): SessionData {
  const now = new Date().toISOString();
  const title = firstQuery.length > 60 ? firstQuery.slice(0, 57) + '...' : firstQuery;
  const session: SessionData = {
    id,
    title,
    model,
    provider,
    username,
    createdAt: now,
    updatedAt: now,
    messages: [],
  };
  saveSession(session);
  return session;
}

export function appendMessage(sessionId: string, message: SessionMessage): void {
  const session = getSession(sessionId);
  if (!session) return;
  session.messages.push(message);
  session.updatedAt = new Date().toISOString();
  saveSession(session);
}
