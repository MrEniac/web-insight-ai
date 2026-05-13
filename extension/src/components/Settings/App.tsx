import { useState, useEffect } from 'react';
import type { AiConfig } from '@/services/ai-service';
import { AIService } from '@/services/ai-service';

type ModelMode = 'local' | 'cloud' | 'custom';

interface ProviderConfigDto {
  providerName: string;
  apiUrl: string;
  modelName: string;
  encryptedApiKey: string;
  enabled: boolean;
}

export default function App() {
  const [config, setConfig] = useState<AiConfig>({
    mode: 'local',
    ollamaUrl: 'http://localhost:11434',
    backendUrl: 'http://localhost:8080',
    cloudApiKey: '',
    cloudProvider: 'openai',
    customApiUrl: '',
    customApiKey: '',
    selectedModel: '',
  });
  const [ollamaStatus, setOllamaStatus] = useState<{ available: boolean; models: string[] }>({ available: false, models: [] });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [cloudModel, setCloudModel] = useState('');
  const [customModel, setCustomModel] = useState('');

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    const ai = new AIService();
    const cfg = await ai.loadConfig();
    setConfig(cfg);
    checkOllama(cfg.ollamaUrl);
  }

  async function checkOllama(url?: string) {
    const ai = new AIService();
    ai['config'] = { ...config, ollamaUrl: url || config.ollamaUrl };
    const status = await ai.checkOllamaStatus();
    setOllamaStatus(status);
  }

  async function saveConfig() {
    setSaving(true);
    setMessage(null);
    try {
      await chrome.storage.local.set({
        modelMode: config.mode,
        ollamaUrl: config.ollamaUrl,
        backendUrl: config.backendUrl,
        cloudApiKey: config.cloudApiKey,
        cloudProvider: config.cloudProvider,
        customApiUrl: config.customApiUrl,
        customApiKey: config.customApiKey,
        selectedModel: config.selectedModel,
      });

      if (config.mode === 'cloud' && config.cloudApiKey) {
        await saveProviderToBackend({
          providerName: config.cloudProvider,
          apiUrl: '',
          modelName: cloudModel,
          encryptedApiKey: config.cloudApiKey,
          enabled: true,
        });
      }

      if (config.mode === 'custom' && config.customApiKey) {
        await saveProviderToBackend({
          providerName: 'custom',
          apiUrl: config.customApiUrl,
          modelName: customModel,
          encryptedApiKey: config.customApiKey,
          enabled: true,
        });
      }

      setMessage({ type: 'success', text: 'Settings saved!' });
    } catch (e: any) {
      setMessage({ type: 'error', text: e.message || 'Save failed' });
    }
    setSaving(false);
  }

  async function saveProviderToBackend(dto: ProviderConfigDto) {
    const existing = await fetch(`${config.backendUrl}/api/settings/providers/${dto.providerName}`).catch(() => null);
    const isUpdate = existing && existing.ok;
    const url = `${config.backendUrl}/api/settings/providers${isUpdate ? `/${dto.providerName}` : ''}`;
    const method = isUpdate ? 'PUT' : 'POST';
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dto),
    });
  }

  const cloudProviders = [
    { value: 'openai', label: 'OpenAI', defaultModel: 'gpt-4o-mini' },
    { value: 'deepseek', label: 'DeepSeek', defaultModel: 'deepseek-chat' },
    { value: 'qwen', label: '通义千问', defaultModel: 'qwen-plus' },
    { value: 'siliconflow', label: '硅基流动', defaultModel: 'Qwen/Qwen2.5-7B-Instruct' },
  ];

  return (
    <div style={{ width: '360px', padding: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <h1 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: '#1f2937' }}>
        Web Insight AI Settings
      </h1>

      {message && (
        <div style={{
          padding: '8px 12px',
          marginBottom: '12px',
          borderRadius: '6px',
          fontSize: '12px',
          background: message.type === 'success' ? '#ecfdf5' : '#fef2f2',
          color: message.type === 'success' ? '#059669' : '#dc2626',
          border: `1px solid ${message.type === 'success' ? '#a7f3d0' : '#fecaca'}`,
        }}>
          {message.text}
        </div>
      )}

      <div style={{ marginBottom: '16px' }}>
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '6px', color: '#374151' }}>
          Model Mode
        </label>
        <div style={{ display: 'flex', gap: '8px' }}>
          {(['local', 'cloud', 'custom'] as ModelMode[]).map((mode) => (
            <button
              key={mode}
              onClick={() => setConfig({ ...config, mode })}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: config.mode === mode ? '1px solid #3b82f6' : '1px solid #d1d5db',
                background: config.mode === mode ? '#eff6ff' : '#fff',
                color: config.mode === mode ? '#1d4ed8' : '#374151',
                fontSize: '13px',
                cursor: 'pointer',
              }}
            >
              {mode === 'local' ? 'Local (Ollama)' : mode === 'cloud' ? 'Cloud API' : 'Custom API'}
            </button>
          ))}
        </div>
      </div>

      {config.mode === 'local' && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px', fontWeight: 500, color: '#374151' }}>Ollama Status:</span>
            <span style={{ fontSize: '12px', color: ollamaStatus.available ? '#059669' : '#dc2626' }}>
              {ollamaStatus.available ? '✓ Connected' : '✗ Disconnected'}
            </span>
            <button
              onClick={() => checkOllama()}
              style={{ fontSize: '11px', color: '#3b82f6', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
            >
              Refresh
            </button>
          </div>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px', color: '#374151' }}>
            Ollama URL
          </label>
          <input
            type="text"
            value={config.ollamaUrl}
            onChange={(e) => setConfig({ ...config, ollamaUrl: e.target.value })}
            onBlur={() => checkOllama(config.ollamaUrl)}
            style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
          />
          {ollamaStatus.available && ollamaStatus.models.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px', color: '#374151' }}>
                Select Model
              </label>
              <select
                value={config.selectedModel}
                onChange={(e) => setConfig({ ...config, selectedModel: e.target.value })}
                style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
              >
                <option value="">Auto</option>
                {ollamaStatus.models.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {config.mode === 'cloud' && (
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px', color: '#374151' }}>
            Cloud Provider
          </label>
          <select
            value={config.cloudProvider}
            onChange={(e) => {
              setConfig({ ...config, cloudProvider: e.target.value });
              const p = cloudProviders.find(p => p.value === e.target.value);
              setCloudModel(p?.defaultModel || '');
            }}
            style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', marginBottom: '8px', boxSizing: 'border-box' }}
          >
            {cloudProviders.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>

          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px', color: '#374151' }}>
            API Key
          </label>
          <input
            type="password"
            value={config.cloudApiKey}
            onChange={(e) => setConfig({ ...config, cloudApiKey: e.target.value })}
            placeholder="sk-..."
            style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
          />
          <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>API Key will be encrypted and stored in backend server.</p>

          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px', marginTop: '8px', color: '#374151' }}>
            Model Name (optional)
          </label>
          <input
            type="text"
            value={cloudModel}
            onChange={(e) => setCloudModel(e.target.value)}
            placeholder={cloudProviders.find(p => p.value === config.cloudProvider)?.defaultModel || 'Model name'}
            style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
          />

          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px', marginTop: '8px', color: '#374151' }}>
            Backend URL
          </label>
          <input
            type="text"
            value={config.backendUrl}
            onChange={(e) => setConfig({ ...config, backendUrl: e.target.value })}
            style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
          />
        </div>
      )}

      {config.mode === 'custom' && (
        <div style={{ marginBottom: '16px' }}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px', color: '#374151' }}>
            API URL (OpenAI compatible)
          </label>
          <input
            type="text"
            value={config.customApiUrl}
            onChange={(e) => setConfig({ ...config, customApiUrl: e.target.value })}
            placeholder="https://api.example.com/v1"
            style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', marginBottom: '8px', boxSizing: 'border-box' }}
          />

          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px', color: '#374151' }}>
            API Key
          </label>
          <input
            type="password"
            value={config.customApiKey}
            onChange={(e) => setConfig({ ...config, customApiKey: e.target.value })}
            style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
          />
          <p style={{ fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>API Key will be encrypted and stored in backend server.</p>

          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px', marginTop: '8px', color: '#374151' }}>
            Model Name (optional)
          </label>
          <input
            type="text"
            value={customModel}
            onChange={(e) => setCustomModel(e.target.value)}
            placeholder="e.g., gpt-4o-mini"
            style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
          />

          <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px', marginTop: '8px', color: '#374151' }}>
            Backend URL
          </label>
          <input
            type="text"
            value={config.backendUrl}
            onChange={(e) => setConfig({ ...config, backendUrl: e.target.value })}
            style={{ width: '100%', padding: '6px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '13px', boxSizing: 'border-box' }}
          />
        </div>
      )}

      <button
        onClick={saveConfig}
        disabled={saving}
        style={{
          width: '100%',
          padding: '10px',
          background: saving ? '#93c5fd' : '#3b82f6',
          color: '#fff',
          border: 'none',
          borderRadius: '6px',
          fontSize: '14px',
          fontWeight: 500,
          cursor: saving ? 'not-allowed' : 'pointer',
        }}
      >
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}