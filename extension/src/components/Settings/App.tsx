import { useState, useEffect } from 'react';
import type { AiConfig } from '@/services/ai-service';
import { AIService } from '@/services/ai-service';

type ModelMode = 'local' | 'cloud' | 'custom';

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
    setSaving(false);
  }

  const cloudProviders = [
    { value: 'openai', label: 'OpenAI' },
    { value: 'deepseek', label: 'DeepSeek' },
    { value: 'qwen', label: '通义千问' },
    { value: 'siliconflow', label: '硅基流动' },
  ];

  return (
    <div style={{ width: '360px', padding: '16px', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <h1 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: '#1f2937' }}>
        Web Insight AI Settings
      </h1>

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
              {ollamaStatus.available ? 'Connected' : 'Disconnected'}
            </span>
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
                <option value="">Auto (qwen2.5:7b)</option>
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
            onChange={(e) => setConfig({ ...config, cloudProvider: e.target.value })}
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