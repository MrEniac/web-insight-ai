export interface PageContent {
  title: string;
  text: string;
  url: string;
  length: number;
}

export class ReadabilityService {
  static extract(doc: Document): PageContent | null {
    const title = doc.title || '';
    const body = doc.body;
    if (!body) return null;

    const clonedBody = body.cloneNode(true) as HTMLElement;

    const removeSelectors = [
      'nav', 'header', 'footer', 'aside',
      '[role="navigation"]', '[role="banner"]', '[role="contentinfo"]',
      '.sidebar', '.ad', '.advertisement', '.comment', '.comments',
      '.social-share', '.related-posts', '.recommendation',
      'iframe', 'script', 'style', 'noscript',
    ];

    removeSelectors.forEach((selector) => {
      clonedBody.querySelectorAll(selector).forEach((el) => el.remove());
    });

    const text = clonedBody.textContent?.trim() || '';
    if (text.length < 100) return null;

    return {
      title,
      text: text.slice(0, 12000),
      url: window.location.href,
      length: text.length,
    };
  }
}