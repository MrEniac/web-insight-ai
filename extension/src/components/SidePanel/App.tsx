import { useState, useEffect, useRef } from 'react';

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  streaming?: boolean;
}

export default function App() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [config, setConfig] = useState<{
    mode: string;
    ollamaUrl: string;
    backendUrl: string;
    selectedModel: string;
    cloudProvider: string;
  }>({ mode: 'local', ollamaUrl: 'http://localhost:11434', backendUrl: 'http://localhost:8080', selectedModel: 'qwen3.5:2b', cloudProvider: 'openai' });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    chrome.storage.local.get(['modelMode', 'ollamaUrl', 'backendUrl', 'selectedModel', 'cloudProvider']).then((stored) => {
      setConfig({
        mode: stored.modelMode || 'local',
        ollamaUrl: stored.ollamaUrl || 'http://localhost:11434',
        backendUrl: stored.backendUrl || 'http://localhost:8080',
        selectedModel: stored.selectedModel || 'qwen3.5:2b',
        cloudProvider: stored.cloudProvider || 'openai',
      });
    });
  }, []);

  async function sendMessage() {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    const assistantMessage: Message = { role: 'assistant', content: '', streaming: true };
    setMessages((prev) => [...prev, assistantMessage]);

    try {
      const { AIService } = await import('@/services/ai-service');
      const ai = new AIService();
      const chatMessages = [...messages, userMessage].map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

      let fullContent = '';
      await ai.chatStream(chatMessages, (chunk) => {
        fullContent += chunk;
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: fullContent, streaming: true };
          return updated;
        });
      });
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: fullContent, streaming: false };
        return updated;
      });
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = { role: 'assistant', content: `Error: ${(err as Error).message}`, streaming: false };
        return updated;
      });
    } finally {
      setLoading(false);
    }
  }

  function openSettings() {
    chrome.tabs.create({ url: chrome.runtime.getURL('popup.html') });
  }

  if (showSettings) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #30363d', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#e6edf3', fontWeight: 600 }}>Settings</span>
          <button
            onClick={() => setShowSettings(false)}
            style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '18px' }}
          >
            ✕
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: '#161b22', color: '#e6edf3' }}>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px', color: '#8b949e' }}>Mode</label>
            <div style={{ fontSize: '14px' }}>{config.mode === 'local' ? 'Local (Ollama)' : config.mode === 'cloud' ? 'Cloud API' : 'Custom API'}</div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px', color: '#8b949e' }}>Model</label>
            <div style={{ fontSize: '14px' }}>{config.selectedModel || 'default'}</div>
          </div>
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, marginBottom: '4px', color: '#8b949e' }}>Backend</label>
            <div style={{ fontSize: '14px' }}>{config.backendUrl}</div>
          </div>
          <p style={{ fontSize: '12px', color: '#8b949e', marginTop: '16px' }}>
            Click the extension icon to open full settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #30363d', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ color: '#e6edf3', fontWeight: 600 }}>Web Insight AI</span>
        <button
          onClick={openSettings}
          style={{ background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer', fontSize: '16px', padding: '4px' }}
          title="Open Settings"
        >
          ⚙️
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', background: '#161b22' }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#8b949e', marginTop: '40px' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🤖</div>
            <div style={{ fontSize: '14px' }}>Ask me anything about the current page</div>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} style={{ marginBottom: '12px', display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{
              maxWidth: '80%',
              padding: '10px 14px',
              borderRadius: '12px',
              background: msg.role === 'user' ? '#1f6feb' : '#21262d',
              color: '#e6edf3',
              fontSize: '14px',
              lineHeight: '1.5',
              border: msg.role === 'user' ? 'none' : '1px solid #30363d',
            }}>
              <div style={{ whiteSpace: 'pre-wrap' }}>{msg.content}{msg.streaming ? '▍' : ''}</div>
            </div>
          </div>
        ))}
        {loading && messages[messages.length - 1]?.content === '' && (
          <div style={{ color: '#8b949e', fontSize: '13px' }}>AI is thinking...</div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div style={{ padding: '12px', borderTop: '1px solid #30363d', background: '#0d1117', display: 'flex', gap: '8px' }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') sendMessage(); }}
          placeholder="Ask about this page..."
          style={{
            flex: 1,
            padding: '8px 12px',
            background: '#21262d',
            border: '1px solid #30363d',
            borderRadius: '6px',
            color: '#e6edf3',
            fontSize: '14px',
            outline: 'none',
          }}
        />
        <button
          onClick={sendMessage}
          disabled={loading}
          style={{
            padding: '8px 16px',
            background: loading ? '#21262d' : '#1f6feb',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}