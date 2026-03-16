import { Hono } from 'hono';
import { getSetting, setSetting } from '../../../utils/config.js';
import { checkApiKeyExistsForProvider, saveApiKeyForProvider } from '../../../utils/env.js';
import { PROVIDERS as PROVIDER_DEFS } from '../../../providers.js';
import { getRole } from '../auth.js';

const DEFAULT_MODEL = 'gpt-5.2';
const DEFAULT_PROVIDER = 'openai';

const app = new Hono();

app.get('/api/settings', (c) => {
  const provider = getSetting('provider', DEFAULT_PROVIDER) as string;
  const modelId = getSetting('modelId', DEFAULT_MODEL) as string;

  const searchKeys = [
    { key: 'EXASEARCH_API_KEY', name: 'Exa', priority: 1 },
    { key: 'PERPLEXITY_API_KEY', name: 'Perplexity', priority: 2 },
    { key: 'TAVILY_API_KEY', name: 'Tavily', priority: 3 },
  ];

  const webSearch = searchKeys.map((sk) => ({
    name: sk.name,
    envVar: sk.key,
    configured: !!process.env[sk.key] && !process.env[sk.key]!.startsWith('your-'),
    priority: sk.priority,
  }));

  const activeSearch = webSearch.find((s) => s.configured)?.name || null;

  return c.json({
    provider,
    modelId,
    webSearch,
    activeSearchProvider: activeSearch,
  });
});

app.put('/api/settings', async (c) => {
  const body = await c.req.json<{ provider?: string; modelId?: string }>();

  if (body.provider) {
    setSetting('provider', body.provider);
  }
  if (body.modelId) {
    setSetting('modelId', body.modelId);
  }

  return c.json({ ok: true });
});

app.post('/api/settings/apikey', async (c) => {
  const username = (c.get('username' as never) as string) || '';
  if (getRole(username) !== 'admin') {
    return c.json({ error: '需要管理员权限' }, 403);
  }
  const body = await c.req.json<{ provider: string; apiKey: string }>();

  if (!body.provider || !body.apiKey) {
    return c.json({ error: 'provider and apiKey are required' }, 400);
  }

  const providerDef = PROVIDER_DEFS.find((p) => p.id === body.provider);
  if (!providerDef || !providerDef.apiKeyEnvVar) {
    return c.json({ error: 'Invalid provider or provider does not require API key' }, 400);
  }

  const saved = saveApiKeyForProvider(body.provider, body.apiKey);
  if (!saved) {
    return c.json({ error: 'Failed to save API key' }, 500);
  }

  return c.json({ ok: true, hasApiKey: checkApiKeyExistsForProvider(body.provider) });
});

app.get('/api/settings/apikeys', (c) => {
  const username = (c.get('username' as never) as string) || '';
  if (getRole(username) !== 'admin') {
    return c.json({ error: '需要管理员权限' }, 403);
  }
  const keys = PROVIDER_DEFS.filter((p) => p.apiKeyEnvVar).map((p) => {
    const envVar = p.apiKeyEnvVar!;
    const rawValue = process.env[envVar];
    const configured =
      !!rawValue && rawValue.trim().length > 0 && !rawValue.trim().startsWith('your-');

    let maskedValue: string | null = null;
    if (configured && rawValue) {
      const v = rawValue.trim();
      if (v.length > 8) {
        maskedValue = v.slice(0, 4) + '****' + v.slice(-4);
      } else {
        maskedValue = '****';
      }
    }

    return {
      provider: p.id,
      displayName: p.displayName,
      envVar,
      configured,
      maskedValue,
    };
  });

  return c.json({ keys });
});

export default app;
