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

        const stored = await chrome.storage.local.get('searchClicks');
        const clicks: Record<string, number> = stored.searchClicks || {};

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

        const aiScoresMap = parseRelevanceScores(fullResponse, batch.length);
        console.log('[Web Insight AI] Parsed tags map:', tagsMap.map((t) => t?.join(',') || 'empty'));
        console.log('[Web Insight AI] AI scores:', aiScoresMap.map((s) => `${s.relevance}/${s.quality}/${s.authority}/${s.timeliness}`));

        batch.forEach((result, i) => {
          const loading = result.element.querySelector('.web-insight-ai-tag-loading');
          if (loading) loading.remove();
          if (tagsMap[i] && tagsMap[i].length > 0) {
            try {
              const keywordScore = computeKeywordOverlap(query, result.title, result.description);
              const urlSignal = computeUrlSignal(result.url);
              const finalScore = calculateFinalScore(aiScoresMap[i], keywordScore, urlSignal, clicks[result.url] || 0);
              console.log(`[Web Insight AI] Result ${i}: kw=${keywordScore} url=${urlSignal} clicks=${clicks[result.url]||0} AI=${JSON.stringify(aiScoresMap[i])} final=${finalScore}`);
              adapter.injectTag(result.element, tagsMap[i], finalScore);
              processedCount++;
            } catch (e) {
              console.warn(`[Web Insight AI] Failed to inject tags for result ${i}:`, e);
            }
          } else {
            console.log(`[Web Insight AI] No tags for result ${i}: ${result.title}`);
          }
        });

        console.log(`[Web Insight AI] Tags injected for ${processedCount} results`);

        setupClickTracking(batch.map((r) => r.url));
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

  return `你是一个搜索结果分析助手。用户搜索了：「${query}」。请根据以下 ${results.length} 条搜索结果的信息，对每条结果：
1. 生成 2-3 个简短的标签（中文），描述该链接的质量和类型
2. 给出四个维度的评分（0-100）：
   - 相关性：标题/描述与搜索意图的匹配程度
   - 质量：内容的专业程度和可信度
   - 权威：来源网站的权威性（官方、知名平台等）
   - 时效：内容信息是否足够新

${items}

请严格按以下格式输出（每条结果一行）：
1. 标签1, 标签2 | 相关: 85, 质量: 70, 权威: 90, 时效: 60
2. 标签1, 标签2 | 相关: 60, 质量: 50, 权威: 40, 时效: 30
...
${results.length}. 标签1, 标签2 | 相关: 分数, 质量: 分数, 权威: 分数, 时效: 分数`;
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
      const cleanContent = numberedMatch[2].replace(/\s*[|｜]\s*(相关|质量|权威|时效|匹配度)[：:]\s*\d+.*$/, '');
      tags = cleanContent
        .split(/[,;，；、]/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0 && t.length < 20);
    }

    if (!numberedMatch && seqIndex < count) {
      const cleanContent = trimmed.replace(/\s*[|｜]\s*(相关|质量|权威|时效|匹配度)[：:]\s*\d+.*$/, '');
      const commaSplit = cleanContent.split(/[,;，；、]/);
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

function parseRelevanceScores(response: string, count: number): {
  relevance: number | null;
  quality: number | null;
  authority: number | null;
  timeliness: number | null;
}[] {
  const scores = new Array(count).fill(null).map(() => ({
    relevance: null as number | null,
    quality: null as number | null,
    authority: null as number | null,
    timeliness: null as number | null,
  }));
  const lines = response.split('\n');
  let seqIndex = 0;

  const dims = [
    { key: 'relevance', regex: /相关[：:]\s*(\d+)/ },
    { key: 'quality', regex: /质量[：:]\s*(\d+)/ },
    { key: 'authority', regex: /权威[：:]\s*(\d+)/ },
    { key: 'timeliness', regex: /时效[：:]\s*(\d+)/ },
  ] as const;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    const numMatch = trimmed.match(/^(\d+)[.、)]/);
    let idx: number | null = null;
    if (numMatch) {
      idx = parseInt(numMatch[1], 10) - 1;
    } else if (seqIndex < count) {
      idx = seqIndex++;
    }
    if (idx === null || idx < 0 || idx >= count) continue;

    for (const d of dims) {
      const m = trimmed.match(d.regex);
      if (m) {
        const val = parseInt(m[1], 10);
        if (val >= 0 && val <= 100) {
          (scores[idx] as any)[d.key] = val;
        }
      }
    }
  }

  return scores;
}

function calculateFinalScore(
  aiScores: { relevance: number | null; quality: number | null; authority: number | null; timeliness: number | null },
  keywordOverlap: number,
  urlSignal: number,
  clickCount: number,
): number {
  const rel = aiScores.relevance ?? 50;
  const qual = aiScores.quality ?? 50;
  const auth = aiScores.authority ?? 50;
  const time = aiScores.timeliness ?? 50;
  const clickBonus = Math.min(clickCount * 5, 10);
  return Math.round(
    keywordOverlap * 0.30 +
    rel * 0.20 +
    qual * 0.25 +
    auth * 0.15 +
    time * 0.05 +
    urlSignal * 0.05 +
    clickBonus,
  );
}

function computeKeywordOverlap(query: string, title: string, description: string): number {
  if (!query) return 50;
  const queryWords = new Set(query.toLowerCase().replace(/[^\u4e00-\u9fa5a-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length > 1));
  if (queryWords.size === 0) return 50;
  const targetText = `${title} ${description}`.toLowerCase().replace(/[^\u4e00-\u9fa5a-z0-9\s]/g, '');
  const targetWords = new Set(targetText.split(/\s+/).filter((w) => w.length > 1));
  let overlap = 0;
  queryWords.forEach((w) => { if (targetWords.has(w)) overlap++; });
  return Math.round((overlap / queryWords.size) * 100);
}

function computeUrlSignal(url: string): number {
  let score = 50;
  try {
    const host = new URL(url).hostname;
    if (/\.gov\.cn|\.edu\.cn|\.edu$/.test(host)) score += 30;
    else if (/github\.com|stackoverflow\.com|npmjs\.com|pypi\.org/.test(host)) score += 25;
    else if (/wikipedia\.org|\.org$/.test(host)) score += 15;
    else if (/zhihu\.com|csdn\.net|juejin\.cn|segmentfault\.com/.test(host)) score += 10;
    else if (/\.io$|\.dev$|docs\./.test(host)) score += 10;
    if (host.includes('official') || host.includes('doc')) score += 10;
  } catch {}
  return Math.min(100, score);
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

function setupClickTracking(urls: string[]): void {
  if (window.__webInsightClickTracked) return;
  window.__webInsightClickTracked = true;

  document.addEventListener('click', async (e) => {
    const link = (e.target as HTMLElement).closest('a[href]') as HTMLAnchorElement | null;
    if (!link) return;
    const href = link.href;
    if (!href || href.startsWith('javascript:')) return;

    try {
      const stored = await chrome.storage.local.get('searchClicks');
      const clicks: Record<string, number> = stored.searchClicks || {};
      clicks[href] = (clicks[href] || 0) + 1;
      await chrome.storage.local.set({ searchClicks: clicks });
    } catch {}
  });
}

declare global {
  interface Window {
    __webInsightClickTracked?: boolean;
  }
}