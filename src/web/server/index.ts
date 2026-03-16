#!/usr/bin/env bun
import { config } from 'dotenv';
config({ quiet: true });

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { serveStatic } from 'hono/bun';
import { existsSync } from 'fs';
import { join } from 'path';
import { ensureDefaultUser, validateToken } from './auth.js';
import authRoutes from './routes/auth.js';
import chatRoutes from './routes/chat.js';
import sessionsRoutes from './routes/sessions.js';
import modelsRoutes from './routes/models.js';
import settingsRoutes from './routes/settings.js';

ensureDefaultUser();

const app = new Hono();

const defaultOrigins = ['http://localhost:5173', 'http://localhost:3002', 'http://127.0.0.1:5173'];
const extraOrigins = process.env.WEB_CORS_ORIGINS
  ? process.env.WEB_CORS_ORIGINS.split(',').map((s) => s.trim()).filter(Boolean)
  : [];
const corsOrigins = [...defaultOrigins, ...extraOrigins];

app.use(
  '*',
  cors({
    origin: corsOrigins,
    allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowHeaders: ['Content-Type', 'Authorization'],
  }),
);

// Auth routes (no auth required)
app.route('/', authRoutes);
app.get('/api/health', (c) => c.json({ status: 'ok', version: '2026.2.26' }));

// Auth middleware for all other /api/* routes
// SSE (EventSource) can't send headers, so also accept ?token= query param
app.use('/api/*', async (c, next) => {
  let token: string | undefined;
  const auth = c.req.header('Authorization');
  if (auth?.startsWith('Bearer ')) {
    token = auth.slice(7);
  } else {
    const url = new URL(c.req.url);
    token = url.searchParams.get('token') || undefined;
  }
  if (!token) {
    return c.json({ error: '未登录' }, 401);
  }
  const username = validateToken(token);
  if (!username) {
    return c.json({ error: '登录已过期' }, 401);
  }
  c.set('username' as never, username as never);
  await next();
});

app.route('/', chatRoutes);
app.route('/', sessionsRoutes);
app.route('/', modelsRoutes);
app.route('/', settingsRoutes);

// Serve frontend static files in production
const distPath = join(import.meta.dir, '../../../dist/web');
if (existsSync(distPath)) {
  app.use('/*', serveStatic({ root: distPath }));
  app.get('*', serveStatic({ path: join(distPath, 'index.html') }));
}

const PORT = parseInt(process.env.WEB_PORT || '3002', 10);

console.log(`Dexter Web API starting on http://localhost:${PORT}`);

export default {
  port: PORT,
  fetch: app.fetch,
  idleTimeout: 255,
};
