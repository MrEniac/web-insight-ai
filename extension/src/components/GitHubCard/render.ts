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

export function renderGitHubCard(result: string): void {
  let container = document.getElementById(CARD_ID);
  if (!container) {
    container = document.createElement('div');
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

    const readmeBox = document.querySelector('#readme')
      || document.querySelector('[data-testid="readme"]')
      || document.querySelector('.markdown-body');

    if (readmeBox?.parentElement) {
      readmeBox.parentElement.insertBefore(container, readmeBox);
    } else {
      const main = document.querySelector('main') || document.querySelector('.repository-content');
      main?.prepend(container);
    }
  }

  container.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;">
      <span style="font-size:18px;">🤖</span>
      <span style="font-size:16px;font-weight:600;color:#58a6ff;">Web Insight AI</span>
      <span style="font-size:12px;color:#8b949e;margin-left:auto;">Powered by Ollama</span>
    </div>
    <div style="white-space:pre-wrap;line-height:1.7;color:#c9d1d9;">${escapeHtml(result)}</div>
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}