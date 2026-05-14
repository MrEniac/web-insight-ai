export interface SearchResult {
  title: string;
  url: string;
  description: string;
  element: HTMLElement;
}

interface SearchAdapter {
  extractResults(): SearchResult[];
  injectTag(element: HTMLElement, tags: string[], score?: number | null): void;
}

class GoogleAdapter implements SearchAdapter {
  extractResults(): SearchResult[] {
    const results: SearchResult[] = [];
    const selectors = [
      '#search .g',
      '#rso .g',
      '#rso > div',
      '#search div[data-hveid]',
    ];

    let items: NodeListOf<Element> | null = null;
    for (const sel of selectors) {
      items = document.querySelectorAll(sel);
      if (items.length > 0) break;
    }

    if (!items || items.length === 0) {
      items = document.querySelectorAll('h3');
      items.forEach((h3) => {
        const link = h3.closest('a') || h3.querySelector('a');
        if (!link) return;
        const parent = h3.closest('div[data-hveid]') || h3.closest('.g') || h3.parentElement?.parentElement;
        if (!parent) return;
        results.push({
          title: h3.textContent?.trim() || '',
          url: (link as HTMLAnchorElement).href || '',
          description: '',
          element: parent as HTMLElement,
        });
      });
      if (results.length > 0) return results;
    }

    items?.forEach((item) => {
      const titleEl = item.querySelector('h3');
      const linkEl = titleEl?.closest('a') || item.querySelector('a[href^="http"]');
      const descEl = item.querySelector('[data-sncf], .VwiC3b, span.aCOpRe, div[data-sncf]');

      if (titleEl && linkEl) {
        results.push({
          title: titleEl.textContent?.trim() || '',
          url: (linkEl as HTMLAnchorElement).href || '',
          description: descEl?.textContent?.trim() || '',
          element: item as HTMLElement,
        });
      }
    });
    return results;
  }

  injectTag(element: HTMLElement, tags: string[], score?: number | null): void {
    injectTagsToElement(element, tags, score);
  }
}

function createScoreBadge(score: number): HTMLElement {
  const span = document.createElement('span');
  const pct = score >= 80 ? 3 : score >= 50 ? 2 : 1;
  const colors: Record<number, [string, string]> = {
    3: ['#e8f5e9', '#2e7d32'],
    2: ['#fff3e0', '#e65100'],
    1: ['#fce4ec', '#c62828'],
  };
  const [bg, fg] = colors[pct];
  span.textContent = `匹配 ${score}%`;
  span.style.cssText = `background:${bg};color:${fg};padding:2px 8px;border-radius:12px;font-size:12px;font-weight:600;`;
  return span;
}

export class SearchEngineAdapter {
  static detect(): SearchAdapter | null {
    const host = window.location.hostname;
    if (host.includes('google.')) return new GoogleAdapter();
    if (host.includes('bing.com')) return new BingAdapter();
    if (host.includes('baidu.com')) return new BaiduAdapter();
    return null;
  }
}

class BingAdapter implements SearchAdapter {
  extractResults(): SearchResult[] {
    const results: SearchResult[] = [];
    const items = document.querySelectorAll('#b_results .b_algo');
    items.forEach((item) => {
      const titleEl = item.querySelector('h2 a');
      const descEl = item.querySelector('.b_caption p');
      if (titleEl) {
        results.push({
          title: titleEl.textContent?.trim() || '',
          url: (titleEl as HTMLAnchorElement).href || '',
          description: descEl?.textContent?.trim() || '',
          element: item as HTMLElement,
        });
      }
    });
    return results;
  }

  injectTag(element: HTMLElement, tags: string[], score?: number | null): void {
    injectTagsToElement(element, tags, score);
  }
}

class BaiduAdapter implements SearchAdapter {
  extractResults(): SearchResult[] {
    const results: SearchResult[] = [];
    const items = document.querySelectorAll('#content_left .result, #content_left .c-container');
    items.forEach((item) => {
      const titleEl = item.querySelector('h3 a');
      const descEl = item.querySelector('.c-abstract, .content-right_8Zs40');
      if (titleEl) {
        results.push({
          title: titleEl.textContent?.trim() || '',
          url: (titleEl as HTMLAnchorElement).href || '',
          description: descEl?.textContent?.trim() || '',
          element: item as HTMLElement,
        });
      }
    });
    return results;
  }

  injectTag(element: HTMLElement, tags: string[], score?: number | null): void {
    injectTagsToElement(element, tags, score);
  }
}

function injectTagsToElement(element: HTMLElement, tags: string[], score?: number | null): void {
  const existing = element.querySelector('.web-insight-ai-tags');
  if (existing) existing.remove();

  if (!element || !element.isConnected) {
    console.warn('[Web Insight AI] Cannot inject tags: element not in DOM');
    return;
  }

  const tagContainer = document.createElement('div');
  tagContainer.className = 'web-insight-ai-tags';
  tagContainer.style.cssText = 'display:flex;gap:4px;margin-top:6px;flex-wrap:wrap;align-items:center;z-index:1;position:relative;';

  if (score !== null && score !== undefined) {
    const badge = createScoreBadge(score);
    tagContainer.appendChild(badge);
  }

  tags.forEach((tag) => {
    const span = document.createElement('span');
    span.textContent = tag;
    span.style.cssText = 'background:#e8f5e9;color:#2e7d32;padding:2px 8px;border-radius:12px;font-size:12px;white-space:nowrap;';
    tagContainer.appendChild(span);
  });

  const container = findAppendTarget(element);
  if (container) {
    container.appendChild(tagContainer);
  }
}

function findAppendTarget(element: HTMLElement): HTMLElement | null {
  if (element.isConnected) return element;
  const h3 = document.querySelector('h3');
  if (h3) {
    const parent = h3.closest('.g') || h3.closest('[data-hveid]') || h3.parentElement?.parentElement;
    if (parent instanceof HTMLElement) return parent;
  }
  return null;
}