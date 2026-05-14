export default defineContentScript({
  matches: ['https://www.google.com/*', 'https://www.google.co.jp/*', 'https://www.google.co.uk/*', 'https://www.bing.com/*', 'https://www.baidu.com/*'],
  main() {
    console.log('[Web Insight AI] Content script loaded for search engines');

    let running = false;

    const enhanceSearchResults = async () => {
      if (running) return;
      running = true;

      try {
        const { SearchEngineAdapter } = await import('@/services/search-adapter');
        const adapter = SearchEngineAdapter.detect();
        if (!adapter) { running = false; return; }

        const results = adapter.extractResults();
        if (results.length === 0) { running = false; return; }

        const unprocessed = results.filter((r) => !r.element.querySelector('.web-insight-ai-tags'));
        if (unprocessed.length === 0) { running = false; return; }

        console.log(`[Web Insight AI] Processing ${unprocessed.length} search results with AI`);

        for (const result of unprocessed) {
          const loadingEl = document.createElement('span');
          loadingEl.className = 'web-insight-ai-tag-loading';
          loadingEl.textContent = ' ↻ analyzing...';
          loadingEl.style.cssText = 'font-size:12px;color:#8b949e;margin-left:4px;';
          result.element.querySelector('h3')?.appendChild(loadingEl);
        }

        const { AIService } = await import('@/services/ai-service');
        const ai = new AIService();
        await ai.loadConfig();

        const batchPrompt = buildSearchBatchPrompt(unprocessed);
        let fullResponse = '';

        await ai.chatStream(
          [{ role: 'user', content: batchPrompt }],
          (chunk) => {
            fullResponse += chunk;
          },
        );

        const tagsMap = parseBatchResponse(fullResponse, unprocessed.length);
        unprocessed.forEach((result, i) => {
          const loading = result.element.querySelector('.web-insight-ai-tag-loading');
          if (loading) loading.remove();
          if (tagsMap[i] && tagsMap[i].length > 0) {
            adapter.injectTag(result.element, tagsMap[i]);
          }
        });
      } catch (err) {
        console.error('[Web Insight AI] Search enhancement error:', err);
      } finally {
        running = false;
      }
    };

    let debounceTimer: ReturnType<typeof setTimeout>;
    const debouncedEnhance = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(enhanceSearchResults, 1000);
    };

    const observer = new MutationObserver(() => {
      debouncedEnhance();
    });

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        debouncedEnhance();
        observer.observe(document.body, { childList: true, subtree: true });
      });
    } else {
      debouncedEnhance();
      observer.observe(document.body, { childList: true, subtree: true });
    }
  },
});

function buildSearchBatchPrompt(results: Array<{ title: string; url: string; description: string }>): string {
  const items = results
    .map((r, i) => `结果${i + 1}：\n标题：${r.title}\nURL：${r.url}\n描述：${r.description || '无'}`)
    .join('\n\n');

  return `你是一个搜索结果分析助手。请根据以下 ${results.length} 条搜索结果的信息，为每条结果生成 2-3 个简短的标签（中文），描述该链接的质量和类型。标签例如：官方文档、教程、工具、博客、视频、开源项目、API参考、新闻、论坛讨论、个人观点、过时内容、高质量、值得收藏。

${items}

请严格按以下格式输出（每条结果一行，不包含其他内容）：
1. 标签1, 标签2, 标签3
2. 标签1, 标签2, 标签3
...
${results.length}. 标签1, 标签2, 标签3`;
}

function parseBatchResponse(response: string, count: number): string[][] {
  const tagsMap: string[][] = [];
  const lines = response.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();
    const match = trimmed.match(/^(\d+)[.、]\s*(.+)$/);
    if (match) {
      const index = parseInt(match[1], 10) - 1;
      if (index >= 0 && index < count) {
        tagsMap[index] = match[2]
          .split(/[,;，；、]/)
          .map((t) => t.trim())
          .filter((t) => t.length > 0 && t.length < 20);
      }
    }
  }

  return tagsMap;
}