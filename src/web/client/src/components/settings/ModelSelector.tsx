import { useState, useEffect } from 'react';
import { api, type ProviderInfo, type SettingsInfo } from '../../api/client';
import { useTheme } from '../../context/ThemeContext';
import { useI18n } from '../../i18n/I18nContext';

const CUSTOM_MODEL_ID = '__custom__';

interface ModelSelectorProps {
  onSaved?: () => void;
}

export function ModelSelector({ onSaved }: ModelSelectorProps) {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [settings, setSettings] = useState<SettingsInfo | null>(null);
  const [selectedProvider, setSelectedProvider] = useState('');
  const [selectedModel, setSelectedModel] = useState('');
  const [customModelId, setCustomModelId] = useState('');
  const [saving, setSaving] = useState(false);
  const { theme } = useTheme();
  const { t } = useI18n();
  const isDark = theme === 'dark';

  useEffect(() => {
    let providersList: ProviderInfo[] = [];
    void api.getProviders().then(({ providers: p }) => {
      providersList = p;
      setProviders(p);
      return api.getSettings();
    }).then((s) => {
      if (!s) return;
      setSettings(s);
      setSelectedProvider(s.provider);
      const prov = providersList.find((x) => x.id === s.provider);
      const ids = prov?.models.map((m) => m.id) ?? [];
      if (ids.length && ids.includes(s.modelId)) {
        setSelectedModel(s.modelId);
        setCustomModelId('');
      } else {
        setSelectedModel(CUSTOM_MODEL_ID);
        setCustomModelId(s.modelId || '');
      }
    }).catch(() => {});
  }, []);

  const rawProviderModels = providers.find((p) => p.id === selectedProvider)?.models || [];
  const allowCustom = selectedProvider === 'openai' || selectedProvider === 'openrouter';
  const currentProviderModels = allowCustom
    ? [...rawProviderModels, { id: CUSTOM_MODEL_ID, displayName: t('model.customOption') }]
    : rawProviderModels;

  const effectiveModelId =
    customModelId.trim() || (selectedModel !== CUSTOM_MODEL_ID ? selectedModel : '');

  const handleProviderChange = (id: string) => {
    setSelectedProvider(id);
    const models = providers.find((p) => p.id === id)?.models || [];
    if (models.length > 0 && models[0].id !== CUSTOM_MODEL_ID) {
      setSelectedModel(models[0].id);
      setCustomModelId('');
    } else if (id === 'openai' || id === 'openrouter') {
      setSelectedModel(CUSTOM_MODEL_ID);
    }
  };

  const handleSave = async () => {
    if (!effectiveModelId.trim()) return;
    setSaving(true);
    try {
      const modelIdToSave = effectiveModelId;
      await api.updateSettings({ provider: selectedProvider, modelId: modelIdToSave });
      setSettings((s) =>
        s ? { ...s, provider: selectedProvider, modelId: modelIdToSave } : s,
      );
      onSaved?.();
    } catch {
      // ignore
    } finally {
      setSaving(false);
    }
  };

  const hasChanged =
    settings &&
    (settings.provider !== selectedProvider || settings.modelId !== effectiveModelId);

  const selectClass = `w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-500 ${
    isDark ? 'bg-zinc-900 border-zinc-700 text-zinc-200' : 'bg-gray-50 border-gray-300 text-gray-800'
  }`;

  return (
    <div className="space-y-4">
      <div>
        <label className={`block text-xs mb-1.5 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
          {t('model.provider')}
        </label>
        <select
          value={selectedProvider}
          onChange={(e) => handleProviderChange(e.target.value)}
          className={selectClass}
        >
          {providers.map((p) => (
            <option key={p.id} value={p.id}>
              {p.displayName} {!p.hasApiKey && p.requiresApiKey ? t('model.noKey') : ''}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={`block text-xs mb-1.5 ${isDark ? 'text-zinc-400' : 'text-gray-500'}`}>
          {t('model.model')}
        </label>
        {currentProviderModels.length > 0 ? (
          <>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className={selectClass}
            >
              {currentProviderModels.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName}
                </option>
              ))}
            </select>
            {allowCustom && (
              <div className="mt-2">
                <label className={`block text-xs mb-1 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
                  {t('model.customLabel')}
                </label>
                <input
                  value={customModelId}
                  onChange={(e) => setCustomModelId(e.target.value)}
                  placeholder={t('model.modelPlaceholder')}
                  className={selectClass}
                />
              </div>
            )}
          </>
        ) : (
          <input
            value={selectedModel}
            onChange={(e) => setSelectedModel(e.target.value)}
            placeholder={t('model.modelPlaceholder')}
            className={selectClass}
          />
        )}
      </div>

      {hasChanged && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg disabled:opacity-50 transition-colors"
        >
          {saving ? t('model.saving') : t('model.save')}
        </button>
      )}

      {settings && (
        <div className={`text-xs mt-2 ${isDark ? 'text-zinc-500' : 'text-gray-400'}`}>
          {t('model.current')}: {settings.provider} / {effectiveModelId || settings.modelId}
        </div>
      )}
    </div>
  );
}
