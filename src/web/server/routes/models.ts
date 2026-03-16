import { Hono } from 'hono';
import { PROVIDERS as PROVIDER_DEFS } from '../../../providers.js';
import { getModelsForProvider } from '../../../utils/model.js';
import { checkApiKeyExistsForProvider } from '../../../utils/env.js';

const app = new Hono();

app.get('/api/providers', (c) => {
  const providers = PROVIDER_DEFS.map((p) => ({
    id: p.id,
    displayName: p.displayName,
    hasApiKey: checkApiKeyExistsForProvider(p.id),
    requiresApiKey: !!p.apiKeyEnvVar,
    models: getModelsForProvider(p.id),
  }));
  return c.json({ providers });
});

app.get('/api/providers/:id/models', (c) => {
  const providerId = c.req.param('id');
  const models = getModelsForProvider(providerId);
  const hasApiKey = checkApiKeyExistsForProvider(providerId);
  return c.json({ providerId, hasApiKey, models });
});

export default app;
