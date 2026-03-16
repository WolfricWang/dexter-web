import { Hono } from 'hono';
import {
  validateUser,
  createToken,
  revokeToken,
  validateToken,
  changePassword,
  listUsersWithRoles,
  addUser,
  deleteUser,
  updateRole,
  getRole,
} from '../auth.js';

const app = new Hono();

app.post('/api/auth/login', async (c) => {
  const body = await c.req.json<{ username: string; password: string }>();
  if (!body.username || !body.password) {
    return c.json({ error: '用户名和密码不能为空' }, 400);
  }
  if (!validateUser(body.username, body.password)) {
    return c.json({ error: '用户名或密码错误' }, 401);
  }
  const token = createToken(body.username);
  return c.json({ token, username: body.username });
});

app.post('/api/auth/logout', async (c) => {
  const auth = c.req.header('Authorization');
  if (auth?.startsWith('Bearer ')) {
    revokeToken(auth.slice(7));
  }
  return c.json({ ok: true });
});

app.get('/api/auth/me', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: '未登录' }, 401);
  }
  const username = validateToken(auth.slice(7));
  if (!username) {
    return c.json({ error: '登录已过期' }, 401);
  }
  const role = getRole(username);
  return c.json({ username, role });
});

app.post('/api/auth/change-password', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: '未登录' }, 401);
  }
  const username = validateToken(auth.slice(7));
  if (!username) {
    return c.json({ error: '登录已过期' }, 401);
  }
  const body = await c.req.json<{ oldPassword: string; newPassword: string }>();
  if (!body.oldPassword || !body.newPassword) {
    return c.json({ error: '请填写旧密码和新密码' }, 400);
  }
  if (body.newPassword.length < 4) {
    return c.json({ error: '新密码至少4位' }, 400);
  }
  if (!changePassword(username, body.oldPassword, body.newPassword)) {
    return c.json({ error: '旧密码不正确' }, 400);
  }
  return c.json({ ok: true });
});

app.get('/api/auth/users', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: '未登录' }, 401);
  }
  const username = validateToken(auth.slice(7));
  if (!username) {
    return c.json({ error: '登录已过期' }, 401);
  }
  if (getRole(username) !== 'admin') {
    return c.json({ error: '需要管理员权限' }, 403);
  }
  return c.json({ users: listUsersWithRoles() });
});

app.post('/api/auth/users', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: '未登录' }, 401);
  }
  const currentUser = validateToken(auth.slice(7));
  if (!currentUser) {
    return c.json({ error: '登录已过期' }, 401);
  }
  if (getRole(currentUser) !== 'admin') {
    return c.json({ error: '需要管理员权限' }, 403);
  }
  const body = await c.req.json<{ username: string; password: string; role?: 'admin' | 'user' }>();
  if (!body.username || !body.password) {
    return c.json({ error: '用户名和密码不能为空' }, 400);
  }
  const role = body.role === 'admin' ? 'admin' : 'user';
  if (!addUser(body.username, body.password, role)) {
    return c.json({ error: '用户名已存在' }, 400);
  }
  return c.json({ ok: true });
});

app.put('/api/auth/users/:username/role', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: '未登录' }, 401);
  }
  const currentUser = validateToken(auth.slice(7));
  if (!currentUser) {
    return c.json({ error: '登录已过期' }, 401);
  }
  if (getRole(currentUser) !== 'admin') {
    return c.json({ error: '需要管理员权限' }, 403);
  }
  const target = c.req.param('username');
  if (target === currentUser) {
    return c.json({ error: '不能修改自己的权限' }, 400);
  }
  const body = await c.req.json<{ role: 'admin' | 'user' }>();
  if (body.role !== 'admin' && body.role !== 'user') {
    return c.json({ error: '无效的权限类型' }, 400);
  }
  if (!updateRole(target, body.role)) {
    return c.json({ error: '用户不存在' }, 404);
  }
  return c.json({ ok: true });
});

app.delete('/api/auth/users/:username', async (c) => {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return c.json({ error: '未登录' }, 401);
  }
  const currentUser = validateToken(auth.slice(7));
  if (!currentUser) {
    return c.json({ error: '登录已过期' }, 401);
  }
  if (getRole(currentUser) !== 'admin') {
    return c.json({ error: '需要管理员权限' }, 403);
  }
  const target = c.req.param('username');
  if (target === currentUser) {
    return c.json({ error: '不能删除自己' }, 400);
  }
  if (!deleteUser(target)) {
    return c.json({ error: '用户不存在' }, 404);
  }
  return c.json({ ok: true });
});

export default app;
