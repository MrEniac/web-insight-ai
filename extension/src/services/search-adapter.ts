export interface SearchResult {
  title: string;
  url: string;
  description: string;
  element: HTMLElement;
}

interface SearchAdapter {
  extractResults(): SearchResult[];
  injectTag(element: HTMLElement, tags: string[]): void;
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

  injectTag(element: HTMLElement, tags: string[]): void {
    const tagContainer = document.createElement('div');
    tagContainer.className = 'web-insight-ai-tags';
    tagContainer.style.cssText = 'display:flex;gap:4px;margin-top:4px;flex-wrap:wrap;';

    tags.forEach((tag) => {
      const span = document.createElement('span');
      span.textContent = tag;
      span.style.cssText = 'background:#e8f5e9;color:#2e7d32;padding:2px 8px;border-radius:12px;font-size:12px;';
      tagContainer.appendChild(span);
    });

    const existing = element.querySelector('.web-insight-ai-tags');
    if (existing) existing.remove();
    element.appendChild(tagContainer);
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

  injectTag(element: HTMLElement, tags: string[]): void {
    const tagContainer = document.createElement('div');
    tagContainer.className = 'web-insight-ai-tags';
    tagContainer.style.cssText = 'display:flex;gap:4px;margin-top:4px;flex-wrap:wrap;';

    tags.forEach((tag) => {
      const span = document.createElement('span');
      span.textContent = tag;
      span.style.cssText = 'background:#e8f5e9;color:#2e7d32;padding:2px 8px;border-radius:12px;font-size:12px;';
      tagContainer.appendChild(span);
    });

    const existing = element.querySelector('.web-insight-ai-tags');
    if (existing) existing.remove();
    element.appendChild(tagContainer);
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

  injectTag(element: HTMLElement, tags: string[]): void {
    const tagContainer = document.createElement('div');
    tagContainer.className = 'web-insight-ai-tags';
    tagContainer.style.cssText = 'display:flex;gap:4px;margin-top:4px;flex-wrap:wrap;';

    tags.forEach((tag) => {
      const span = document.createElement('span');
      span.textContent = tag;
      span.style.cssText = 'background:#e8f5e9;color:#2e7d32;padding:2px 8px;border-radius:12px;font-size:12px;';
      tagContainer.appendChild(span);
    });

    const existing = element.querySelector('.web-insight-ai-tags');
    if (existing) existing.remove();
    element.appendChild(tagContainer);
  }
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