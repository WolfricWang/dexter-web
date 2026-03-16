import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { createHash, randomBytes } from 'crypto';

const USERS_FILE = '.dexter/web-users.json';

export type UserRole = 'admin' | 'user';

interface UserRecord {
  username: string;
  passwordHash: string;
  salt: string;
  createdAt: string;
  role?: UserRole;
}

interface UsersData {
  users: UserRecord[];
}

function hashPassword(password: string, salt: string): string {
  return createHash('sha256').update(password + salt).digest('hex');
}

function loadUsers(): UsersData {
  if (!existsSync(USERS_FILE)) {
    return { users: [] };
  }
  try {
    return JSON.parse(readFileSync(USERS_FILE, 'utf-8')) as UsersData;
  } catch {
    return { users: [] };
  }
}

function saveUsers(data: UsersData): void {
  const dir = '.dexter';
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(USERS_FILE, JSON.stringify(data, null, 2));
}

export function ensureDefaultUser(): void {
  const data = loadUsers();
  if (data.users.length === 0) {
    const salt = randomBytes(16).toString('hex');
    data.users.push({
      username: 'admin',
      passwordHash: hashPassword('admin123', salt),
      salt,
      createdAt: new Date().toISOString(),
      role: 'admin',
    });
    saveUsers(data);
  }
}

export function getRole(username: string): UserRole {
  const data = loadUsers();
  const user = data.users.find((u) => u.username === username);
  if (!user) return 'user';
  return user.role ?? 'admin';
}

export function validateUser(username: string, password: string): boolean {
  const data = loadUsers();
  const user = data.users.find((u) => u.username === username);
  if (!user) return false;
  return hashPassword(password, user.salt) === user.passwordHash;
}

export function changePassword(username: string, oldPassword: string, newPassword: string): boolean {
  const data = loadUsers();
  const user = data.users.find((u) => u.username === username);
  if (!user) return false;
  if (hashPassword(oldPassword, user.salt) !== user.passwordHash) return false;
  const newSalt = randomBytes(16).toString('hex');
  user.salt = newSalt;
  user.passwordHash = hashPassword(newPassword, newSalt);
  saveUsers(data);
  return true;
}

export function listUsers(): string[] {
  return loadUsers().users.map((u) => u.username);
}

export interface UserWithRole {
  username: string;
  role: UserRole;
}

export function listUsersWithRoles(): UserWithRole[] {
  return loadUsers().users.map((u) => ({
    username: u.username,
    role: u.role ?? 'admin',
  }));
}

export function addUser(username: string, password: string, role: UserRole = 'user'): boolean {
  const data = loadUsers();
  if (data.users.find((u) => u.username === username)) return false;
  const salt = randomBytes(16).toString('hex');
  data.users.push({
    username,
    passwordHash: hashPassword(password, salt),
    salt,
    createdAt: new Date().toISOString(),
    role,
  });
  saveUsers(data);
  return true;
}

export function updateRole(username: string, role: UserRole): boolean {
  const data = loadUsers();
  const user = data.users.find((u) => u.username === username);
  if (!user) return false;
  user.role = role;
  saveUsers(data);
  return true;
}

export function deleteUser(username: string): boolean {
  const data = loadUsers();
  const idx = data.users.findIndex((u) => u.username === username);
  if (idx === -1) return false;
  data.users.splice(idx, 1);
  saveUsers(data);
  return true;
}

// Simple token store (in-memory, survives until server restart)
const activeTokens = new Map<string, { username: string; expiresAt: number }>();

export function createToken(username: string): string {
  const token = randomBytes(32).toString('hex');
  activeTokens.set(token, {
    username,
    expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24h
  });
  return token;
}

export function validateToken(token: string): string | null {
  const entry = activeTokens.get(token);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    activeTokens.delete(token);
    return null;
  }
  return entry.username;
}

export function revokeToken(token: string): void {
  activeTokens.delete(token);
}
