import { Hono } from 'hono';
import { listSessions, getSession, deleteSession } from '../session-store.js';

const app = new Hono();

app.get('/api/sessions', (c) => {
  const username = (c.get('username' as never) as string) || undefined;
  const sessions = listSessions(username);
  return c.json({ sessions });
});

app.get('/api/sessions/:id', (c) => {
  const session = getSession(c.req.param('id'));
  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }
  return c.json({ session });
});

app.delete('/api/sessions/:id', (c) => {
  const deleted = deleteSession(c.req.param('id'));
  if (!deleted) {
    return c.json({ error: 'Session not found' }, 404);
  }
  return c.json({ ok: true });
});

export default app;
