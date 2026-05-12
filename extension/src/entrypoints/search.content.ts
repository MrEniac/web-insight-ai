export default defineContentScript({
  matches: ['https://www.google.com/*', 'https://www.google.co.jp/*', 'https://www.google.co.uk/*', 'https://www.bing.com/*', 'https://www.baidu.com/*'],
  main() {
    console.log('[Web Insight AI] Content script loaded for search engines');

    const enhanceSearchResults = async () => {
      const { SearchEngineAdapter } = await import('@/services/search-adapter');
      const adapter = SearchEngineAdapter.detect();
      if (!adapter) return;

      const results = adapter.extractResults();
      if (results.length === 0) return;

      console.log(`[Web Insight AI] Found ${results.length} search results`);
    };

    const observer = new MutationObserver(() => {
      enhanceSearchResults();
    });

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        enhanceSearchResults();
        observer.observe(document.body, { childList: true, subtree: true });
      });
    } else {
      enhanceSearchResults();
      observer.observe(document.body, { childList: true, subtree: true });
    }
  },
});