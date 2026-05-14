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
        const query = extractSearchQuery();
        const batchPrompt = buildSearchBatchPrompt(batch, query);
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
        const scoresMap = parseRelevanceScores(fullResponse, batch.length);
        console.log('[Web Insight AI] Parsed tags map:', tagsMap.map((t) => t?.join(',') || 'empty'));
        console.log('[Web Insight AI] Parsed scores map:', scoresMap.map((s) => s !== null ? s : 'none'));

        batch.forEach((result, i) => {
          const loading = result.element.querySelector('.web-insight-ai-tag-loading');
          if (loading) loading.remove();
          if (tagsMap[i] && tagsMap[i].length > 0) {
            adapter.injectTag(result.element, tagsMap[i], scoresMap[i]);
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

function buildSearchBatchPrompt(results: Array<{ title: string; url: string; description: string }>, query: string): string {
  const items = results
    .map((r, i) => `结果${i + 1}：\n标题：${r.title}\nURL：${r.url}\n描述：${r.description || '无'}`)
    .join('\n\n');

  return `你是一个搜索结果分析助手。用户搜索了：「${query}」。请根据以下 ${results.length} 条搜索结果的信息，为每条结果：
1. 生成 2-3 个简短的标签（中文），描述该链接的质量和类型
2. 给出匹配度评分（0-100），表示该结果与搜索意图的匹配程度

标签例如：官方文档、教程、工具、博客、视频、开源项目、API参考、新闻、论坛讨论、个人观点、过时内容、高质量、值得收藏、不相关

${items}

请严格按以下格式输出（每条结果一行）：
1. 标签1, 标签2, 标签3 | 匹配度: 85
2. 标签1, 标签2, 标签3 | 匹配度: 60
...
${results.length}. 标签1, 标签2, 标签3 | 匹配度: 分数`;
}

function parseBatchResponse(response: string, count: number): string[][] {
  const tagsMap: string[][] = [];
  const lines = response.split('\n');
  let seqIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    let tags: string[] | null = null;
    let targetIndex: number | null = null;

    const numberedMatch = trimmed.match(/^(\d+)[.、)]\s*(.+)$/);
    if (numberedMatch) {
      targetIndex = parseInt(numberedMatch[1], 10) - 1;
      tags = numberedMatch[2]
        .split(/[,;，；、]/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0 && t.length < 20);
    }

    if (!numberedMatch && seqIndex < count) {
      const commaSplit = trimmed.split(/[,;，；、]/);
      if (commaSplit.length >= 2) {
        targetIndex = seqIndex;
        tags = commaSplit.map((t) => t.trim()).filter((t) => t.length > 0 && t.length < 20);
      }
    }

    if (targetIndex !== null && targetIndex >= 0 && targetIndex < count && tags && tags.length > 0) {
      if (!tagsMap[targetIndex]) {
        tagsMap[targetIndex] = tags;
        if (!numberedMatch) seqIndex++;
      }
    }
  }

  for (let i = 0; i < count; i++) {
    if (!tagsMap[i]) tagsMap[i] = [];
  }

  return tagsMap;
}

function parseRelevanceScores(response: string, count: number): (number | null)[] {
  const scores: (number | null)[] = new Array(count).fill(null);
  const lines = response.split('\n');
  let seqIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const scoreMatch = trimmed.match(/匹配度[：:]\s*(\d+)/);
    if (scoreMatch) {
      const score = parseInt(scoreMatch[1], 10);
      if (score >= 0 && score <= 100) {
        const numMatch = trimmed.match(/^(\d+)[.、)]/);
        if (numMatch) {
          const index = parseInt(numMatch[1], 10) - 1;
          if (index >= 0 && index < count) {
            scores[index] = score;
          }
        } else if (seqIndex < count) {
          scores[seqIndex] = score;
          seqIndex++;
        }
      }
    }
  }

  return scores;
}

function extractSearchQuery(): string {
  try {
    const url = new URL(window.location.href);
    const googleQ = url.searchParams.get('q');
    if (googleQ) return googleQ;
    const bingQ = url.searchParams.get('q');
    if (bingQ) return bingQ;
    const baiduWd = url.searchParams.get('wd') || url.searchParams.get('word');
    if (baiduWd) return baiduWd;
  } catch {}
  return '';
}