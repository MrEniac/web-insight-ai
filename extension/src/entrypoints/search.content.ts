export default defineContentScript({
  matches: ['https://*.google.com/*', 'https://*.google.co.jp/*', 'https://*.google.co.uk/*', 'https://*.bing.com/*', 'https://*.baidu.com/*'],
  main() {
    console.log('[Web Insight AI] Content script loaded for search engines:', window.location.href);

    let running = false;
    let processedCount = 0;

    const enhanceSearchResults = async () => {
      if (running) {
        console.log('[Web Insight AI] Search enhancement already running, skipping');
        return;
      }
      running = true;

      try {
        const { SearchEngineAdapter } = await import('@/services/search-adapter');
        const adapter = SearchEngineAdapter.detect();
        console.log('[Web Insight AI] Search adapter detected:', adapter ? adapter.constructor.name : null);

        if (!adapter) {
          console.warn('[Web Insight AI] No search adapter for:', window.location.hostname);
          running = false;
          return;
        }

        const results = adapter.extractResults();
        console.log(`[Web Insight AI] Extracted ${results.length} search results`);

        if (results.length === 0) {
          running = false;
          return;
        }

        const unprocessed = results.filter((r) => !r.element.querySelector('.web-insight-ai-tags'));
        console.log(`[Web Insight AI] Unprocessed results: ${unprocessed.length}, previously processed: ${processedCount}`);

        if (unprocessed.length === 0) {
          running = false;
          return;
        }

        const { AIService } = await import('@/services/ai-service');
        const ai = new AIService();
        await ai.loadConfig();
        console.log('[Web Insight AI] AI config loaded, mode:', (ai as any).config?.mode);

        for (const result of unprocessed.slice(0, 10)) {
          const loadingEl = document.createElement('span');
          loadingEl.className = 'web-insight-ai-tag-loading';
          loadingEl.textContent = ' ↻ analyzing...';
          loadingEl.style.cssText = 'font-size:12px;color:#8b949e;margin-left:4px;';
          result.element.querySelector('h3')?.appendChild(loadingEl);
        }

        const batch = unprocessed.slice(0, 10);
        const batchPrompt = buildSearchBatchPrompt(batch);
        console.log('[Web Insight AI] Sending batch prompt, length:', batchPrompt.length);

        let fullResponse = '';

        try {
          await ai.chatStream(
            [{ role: 'user', content: batchPrompt }],
            (chunk) => {
              fullResponse += chunk;
            },
          );
        } catch (err) {
          console.error('[Web Insight AI] AI call failed:', err);
          batch.forEach((result) => {
            const loading = result.element.querySelector('.web-insight-ai-tag-loading');
            if (loading) loading.remove();
          });
          running = false;
          return;
        }

        console.log('[Web Insight AI] AI response length:', fullResponse.length);
        console.log('[Web Insight AI] AI response preview:', fullResponse.substring(0, 300));

        const tagsMap = parseBatchResponse(fullResponse, batch.length);
        console.log('[Web Insight AI] Parsed tags map:', tagsMap.map((t) => t?.join(',') || 'empty'));

        batch.forEach((result, i) => {
          const loading = result.element.querySelector('.web-insight-ai-tag-loading');
          if (loading) loading.remove();
          if (tagsMap[i] && tagsMap[i].length > 0) {
            adapter.injectTag(result.element, tagsMap[i]);
            processedCount++;
          }
        });

        console.log(`[Web Insight AI] Tags injected for ${processedCount} results`);
      } catch (err) {
        console.error('[Web Insight AI] Search enhancement error:', err);
      } finally {
        running = false;
      }
    };

    let debounceTimer: ReturnType<typeof setTimeout>;
    const debouncedEnhance = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(enhanceSearchResults, 1500);
    };

    const observer = new MutationObserver(() => {
      debouncedEnhance();
    });

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        console.log('[Web Insight AI] DOMContentLoaded, starting search enhancement');
        debouncedEnhance();
        observer.observe(document.body, { childList: true, subtree: true });
      });
    } else {
      console.log('[Web Insight AI] Document ready, starting search enhancement');
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
    const match = trimmed.match(/^(\d+)[.、)]\s*(.+)$/);
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

  for (let i = 0; i < count; i++) {
    if (!tagsMap[i]) tagsMap[i] = [];
  }

  return tagsMap;
}