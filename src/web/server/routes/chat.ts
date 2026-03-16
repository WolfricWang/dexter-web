import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { runAgentForMessage } from '../../../gateway/agent-runner.js';
import type { AgentEvent } from '../../../agent/types.js';
import { getSetting } from '../../../utils/config.js';
import { resolveProvider, getProviderById } from '../../../providers.js';
import {
  createSession,
  getSession,
  appendMessage,
} from '../session-store.js';

const DEFAULT_MODEL = 'gpt-5.2';
const DEFAULT_PROVIDER = 'openai';

const app = new Hono();

const activeRuns = new Map<
  string,
  { abort: AbortController; events: AgentEvent[]; done: boolean; query: string }
>();

app.post('/api/chat', async (c) => {
  const body = await c.req.json<{
    sessionId?: string;
    query: string;
    model?: string;
    provider?: string;
  }>();

  if (!body.query?.trim()) {
    return c.json({ error: 'query is required' }, 400);
  }

  const username = (c.get('username' as never) as string) || 'anonymous';
  const rawModel = body.model || (getSetting('modelId', null) as string | null) || DEFAULT_MODEL;
  const provider =
    body.provider || (getSetting('provider', null) as string | null) || resolveProvider(rawModel).id || DEFAULT_PROVIDER;

  const providerDef = getProviderById(provider);
  const model = providerDef?.modelPrefix?.endsWith(':') && !rawModel.startsWith(providerDef.modelPrefix)
    ? `${providerDef.modelPrefix}${rawModel}`
    : rawModel;

  const sessionId = body.sessionId || crypto.randomUUID();

  let session = getSession(sessionId);
  if (!session) {
    session = createSession(sessionId, model, provider, body.query, username);
  }

  appendMessage(sessionId, {
    role: 'user',
    content: body.query,
    timestamp: new Date().toISOString(),
  });

  const abortController = new AbortController();
  const runState: { abort: AbortController; events: AgentEvent[]; done: boolean; query: string } = {
    abort: abortController,
    events: [],
    done: false,
    query: body.query,
  };
  activeRuns.set(sessionId, runState);

  (async () => {
    try {
      const answer = await runAgentForMessage({
        sessionKey: `web:${username}:${sessionId}`,
        query: body.query,
        model,
        modelProvider: provider,
        maxIterations: 15,
        signal: abortController.signal,
        onEvent: async (event: AgentEvent) => {
          runState.events.push(event);
        },
      });
      runState.done = true;

      if (answer) {
        appendMessage(sessionId, {
          role: 'assistant',
          content: answer,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (err) {
      const errorEvent: AgentEvent = {
        type: 'done',
        answer: `Error: ${err instanceof Error ? err.message : String(err)}`,
        toolCalls: [],
        iterations: 0,
        totalTime: 0,
      };
      runState.events.push(errorEvent);
      runState.done = true;
    } finally {
      setTimeout(() => activeRuns.delete(sessionId), 30000);
    }
  })();

  return c.json({ sessionId, model, provider });
});

app.get('/api/chat/:sessionId/stream', async (c) => {
  const sessionId = c.req.param('sessionId');
  const runState = activeRuns.get(sessionId);

  if (!runState) {
    return c.json({ error: 'No active run for this session' }, 404);
  }

  return streamSSE(c, async (stream) => {
    let cursor = 0;

    while (true) {
      while (cursor < runState.events.length) {
        const event = runState.events[cursor];
        await stream.writeSSE({
          event: event.type,
          data: JSON.stringify(event),
        });
        cursor++;
      }

      if (runState.done && cursor >= runState.events.length) {
        break;
      }

      await stream.sleep(100);
    }
  });
});

app.post('/api/chat/:sessionId/stop', async (c) => {
  const sessionId = c.req.param('sessionId');
  const runState = activeRuns.get(sessionId);

  if (!runState) {
    return c.json({ error: 'No active run' }, 404);
  }

  runState.abort.abort();
  return c.json({ ok: true });
});

export default app;
