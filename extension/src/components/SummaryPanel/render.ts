export interface SummaryPanelOptions {
  title: string;
  summary: string;
}

const PANEL_ID = 'web-insight-ai-summary-panel';

export function showSummaryPanel(options: SummaryPanelOptions): void {
  removeExistingPanel();

  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 420px;
    max-height: 80vh;
    overflow-y: auto;
    background: linear-gradient(135deg, #0d1117, #161b22);
    border: 1px solid #30363d;
    border-radius: 12px;
    color: #e6edf3;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    z-index: 2147483647;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    padding: 20px;
  `;

  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:18px;">🤖</span>
        <span style="font-size:16px;font-weight:600;color:#58a6ff;">AI Summary</span>
      </div>
      <button id="web-insight-ai-close" style="background:none;border:none;color:#8b949e;cursor:pointer;font-size:18px;padding:4px 8px;">✕</button>
    </div>
    <div style="font-size:15px;font-weight:500;color:#e6edf3;margin-bottom:8px;">${escapeHtml(options.title)}</div>
    <div class="web-insight-ai-summary-content" style="white-space:pre-wrap;line-height:1.7;color:#c9d1d9;">${escapeHtml(options.summary)}</div>
  `;

  document.body.appendChild(panel);

  const closeBtn = document.getElementById('web-insight-ai-close');
  closeBtn?.addEventListener('click', () => {
    panel.remove();
  });
}

export function showSummaryStreamPanel(title: string): { onChunk: (text: string) => void; onComplete: () => void } {
  removeExistingPanel();

  const panel = document.createElement('div');
  panel.id = PANEL_ID;
  panel.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 420px;
    max-height: 80vh;
    overflow-y: auto;
    background: linear-gradient(135deg, #0d1117, #161b22);
    border: 1px solid #30363d;
    border-radius: 12px;
    color: #e6edf3;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    z-index: 2147483647;
    box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    padding: 20px;
  `;

  panel.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
      <div style="display:flex;align-items:center;gap:8px;">
        <span style="font-size:18px;">🤖</span>
        <span style="font-size:16px;font-weight:600;color:#58a6ff;">AI Summary</span>
        <span style="font-size:12px;color:#8b949e;" class="web-insight-ai-status">Streaming...</span>
      </div>
      <button id="web-insight-ai-close" style="background:none;border:none;color:#8b949e;cursor:pointer;font-size:18px;padding:4px 8px;">✕</button>
    </div>
    <div style="font-size:15px;font-weight:500;color:#e6edf3;margin-bottom:8px;">${escapeHtml(title)}</div>
    <div class="web-insight-ai-thinking" style="display:flex;align-items:center;gap:8px;color:#8b949e;margin-bottom:8px;">
      <div class="web-insight-ai-summary-spinner" style="
        width:14px;height:14px;border:2px solid #30363d;border-top:2px solid #58a6ff;
        border-radius:50%;animation:webInsightAISpin 1s linear infinite;
      "></div>
      <span>AI is thinking...</span>
    </div>
    <div class="web-insight-ai-summary-content" style="white-space:pre-wrap;line-height:1.7;color:#c9d1d9;"></div>
    <span class="web-insight-ai-cursor" style="display:inline-block;width:8px;height:14px;background:#58a6ff;animation:webInsightAIBlink 1s step-end infinite;vertical-align:middle;"></span>
  `;

  if (!document.getElementById('web-insight-ai-summary-styles')) {
    const style = document.createElement('style');
    style.id = 'web-insight-ai-summary-styles';
    style.textContent = `@keyframes webInsightAIBlink { 50% { opacity: 0; } } @keyframes webInsightAISpin { to { transform: rotate(360deg); } }`;
    document.head.appendChild(style);
  }

  document.body.appendChild(panel);

  const closeBtn = document.getElementById('web-insight-ai-close');
  closeBtn?.addEventListener('click', () => {
    panel.remove();
  });

  let fullText = '';
  let hasFirstChunk = false;

  const onChunk = (text: string) => {
    if (!hasFirstChunk) {
      hasFirstChunk = true;
      const thinkingEl = panel.querySelector('.web-insight-ai-thinking');
      if (thinkingEl) thinkingEl.remove();
    }
    fullText += text;
    const contentEl = panel.querySelector('.web-insight-ai-summary-content');
    if (contentEl) {
      contentEl.textContent = fullText;
    }
  };

  const onComplete = () => {
    const cursor = panel.querySelector('.web-insight-ai-cursor');
    const status = panel.querySelector('.web-insight-ai-status');
    if (cursor) cursor.remove();
    if (status) status.textContent = 'Powered by AI';
  };

  return { onChunk, onComplete };
}

function removeExistingPanel(): void {
  document.getElementById(PANEL_ID)?.remove();
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}