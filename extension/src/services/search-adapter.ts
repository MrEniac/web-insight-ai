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
    const items = document.querySelectorAll('#search .g');
    items.forEach((item) => {
      const titleEl = item.querySelector('h3');
      const linkEl = item.querySelector('a[data-ved]');
      const descEl = item.querySelector('[data-sncf], .VwiC3b');

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