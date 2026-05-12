export interface AnalysisResult {
  repoName: string;
  projectType: string;
  techStack: string[];
  difficulty: string;
  beginnerFriendly: boolean;
  mainPurpose: string;
  activityLevel: string;
  summary: string;
}

const CARD_ID = 'web-insight-ai-github-card';
const LOADING_ID = 'web-insight-ai-loading';

export function renderGitHubCardLoading(): void {
  removeExistingCard();

  const container = document.createElement('div');
  container.id = LOADING_ID;
  container.style.cssText = `
    margin: 16px 0;
    padding: 16px;
    background: linear-gradient(135deg, #0d1117, #161b22);
    border: 1px solid #30363d;
    border-radius: 8px;
    color: #e6edf3;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    font-size: 14px;
  `;

  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
      <span style="font-size:18px;">🤖</span>
      <span style="font-size:16px;font-weight:600;color:#58a6ff;">Web Insight AI</span>
      <span style="font-size:12px;color:#8b949e;margin-left:auto;">Analyzing...</span>
    </div>
    <div style="display:flex;align-items:center;gap:8px;color:#8b949e;">
      <div class="web-insight-ai-spinner" style="
        width:16px;height:16px;border:2px solid #30363d;border-top:2px solid #58a6ff;
        border-radius:50%;animation:webInsightAISpin 1s linear infinite;
      "></div>
      <span>Analyzing repository...</span>
    </div>
  `;

  injectSpinnerStyle();
  insertCardIntoPage(container);
}

export function renderGitHubCard(result: string): void {
  removeExistingCard();
  removeLoading();

  const container = document.createElement('div');
  container.id = CARD_ID;
  container.style.cssText = `
    margin: 16px 0;
    padding: 16px;
    background: linear-gradient(135deg, #0d1117, #161b22);
    border: 1px solid #30363d;
    border-radius: 8px;
    color: #e6edf3;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    max-width: 100%;
    overflow: hidden;
  `;

  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
      <span style="font-size:18px;">🤖</span>
      <span style="font-size:16px;font-weight:600;color:#58a6ff;">Web Insight AI</span>
      <span style="font-size:12px;color:#8b949e;margin-left:auto;">Powered by Ollama</span>
    </div>
    <div class="web-insight-ai-result" style="white-space:pre-wrap;line-height:1.7;color:#c9d1d9;">${escapeHtml(result)}</div>
  `;

  insertCardIntoPage(container);
}

export function renderGitHubCardStream(): { container: HTMLElement; onChunk: (text: string) => void; onComplete: () => void } {
  removeExistingCard();
  removeLoading();

  const container = document.createElement('div');
  container.id = CARD_ID;
  container.style.cssText = `
    margin: 16px 0;
    padding: 16px;
    background: linear-gradient(135deg, #0d1117, #161b22);
    border: 1px solid #30363d;
    border-radius: 8px;
    color: #e6edf3;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    max-width: 100%;
    overflow: hidden;
  `;

  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
      <span style="font-size:18px;">🤖</span>
      <span style="font-size:16px;font-weight:600;color:#58a6ff;">Web Insight AI</span>
      <span style="font-size:12px;color:#8b949e;margin-left:auto;" class="web-insight-ai-status">Streaming...</span>
    </div>
    <div class="web-insight-ai-result" style="white-space:pre-wrap;line-height:1.7;color:#c9d1d9;"></div>
    <span class="web-insight-ai-cursor" style="display:inline-block;width:8px;height:14px;background:#58a6ff;margin-left:2px;animation:webInsightAIBlink 1s step-end infinite;vertical-align:middle;"></span>
  `;

  insertCardIntoPage(container);

  let fullText = '';

  const onChunk = (text: string) => {
    fullText += text;
    const resultEl = container.querySelector('.web-insight-ai-result');
    if (resultEl) {
      resultEl.textContent = fullText;
    }
  };

  const onComplete = () => {
    const cursor = container.querySelector('.web-insight-ai-cursor');
    const status = container.querySelector('.web-insight-ai-status');
    if (cursor) cursor.remove();
    if (status) status.textContent = 'Powered by Ollama';
  };

  return { container, onChunk, onComplete };
}

export function renderGitHubCardError(error: string): void {
  removeExistingCard();
  removeLoading();

  const container = document.createElement('div');
  container.id = CARD_ID;
  container.style.cssText = `
    margin: 16px 0;
    padding: 16px;
    background: linear-gradient(135deg, #0d1117, #161b22);
    border: 1px solid #f85149;
    border-radius: 8px;
    color: #e6edf3;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    font-size: 14px;
    line-height: 1.6;
  `;

  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
      <span style="font-size:18px;">⚠️</span>
      <span style="font-size:16px;font-weight:600;color:#f85149;">Web Insight AI</span>
    </div>
    <div style="color:#f85149;">${escapeHtml(error)}</div>
    <div style="margin-top:8px;color:#8b949e;font-size:12px;">Make sure Ollama is running at http://localhost:11434</div>
  `;

  insertCardIntoPage(container);
}

function insertCardIntoPage(element: HTMLElement): void {
  const readmeBox = document.querySelector('#readme')
    || document.querySelector('[data-testid="readme"]')
    || document.querySelector('.markdown-body');

  if (readmeBox?.parentElement) {
    readmeBox.parentElement.insertBefore(element, readmeBox);
  } else {
    const main = document.querySelector('main') || document.querySelector('.repository-content');
    main?.prepend(element);
  }
}

function removeExistingCard(): void {
  document.getElementById(CARD_ID)?.remove();
}

function removeLoading(): void {
  document.getElementById(LOADING_ID)?.remove();
}

function injectSpinnerStyle(): void {
  if (document.getElementById('web-insight-ai-styles')) return;

  const style = document.createElement('style');
  style.id = 'web-insight-ai-styles';
  style.textContent = `
    @keyframes webInsightAISpin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @keyframes webInsightAIBlink {
      50% { opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}