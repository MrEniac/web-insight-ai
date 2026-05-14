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
          if (result.element.querySelector('.web-insight-ai-tag-loading')) continue;
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
        const aiScores = parseRelevanceScores(fullResponse, batch.length);
        console.log('[Web Insight AI] Parsed tags:', tagsMap.map((t) => t?.join(',') || 'empty'));
        console.log('[Web Insight AI] AI scores:', aiScores);

        batch.forEach((result, i) => {
          const loading = result.element.querySelector('.web-insight-ai-tag-loading');
          if (loading) loading.remove();
          if (tagsMap[i] && tagsMap[i].length > 0) {
            try {
              const keywordScore = computeKeywordOverlap(query, result.title, result.description);
              const urlSignal = computeUrlSignal(result.url);
              const clickCount = clicks[result.url] || 0;
              const finalScore = calculateFinalScore(keywordScore, urlSignal, aiScores[i] ?? 50, clickCount);
              console.log(`[Web Insight AI] Result ${i}: ai=${aiScores[i]} kw=${keywordScore} url=${urlSignal} final=${finalScore}`);
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
      debounceTimer = setTimeout(enhanceSearchResults, 3000);
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

  return `你是一个搜索结果分析助手。用户搜索了：「${query}」。请根据以下 ${results.length} 条搜索结果的信息，为每条结果生成 2-3 个简短的标签（中文），并评估与搜索意图的综合相关度（0-100分）。

${items}

请严格按以下格式输出（每条一行，标签后用 | 分隔分数）：
1. 标签1, 标签2, 标签3 | 85
2. 标签1, 标签2, 标签3 | 60
${results.length}. 标签1, 标签2, 标签3 | 分数`;
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
      const cleanContent = numberedMatch[2].replace(/\s*[|｜]\s*\d+\s*$/, '');
      tags = cleanContent
        .split(/[,;，；、]/)
        .map((t) => t.trim())
        .filter((t) => t.length > 0 && t.length < 20);
    }

    if (!numberedMatch && seqIndex < count) {
      const cleanContent = trimmed.replace(/\s*[|｜]\s*\d+\s*$/, '');
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

function calculateFinalScore(
  keywordOverlap: number,
  urlSignal: number,
  aiScore: number,
  clickCount: number,
): number {
  const clickBonus = Math.min(clickCount * 5, 10);
  return Math.round(
    aiScore * 0.70 +
    keywordOverlap * 0.10 +
    urlSignal * 0.15 +
    clickBonus * 0.05,
  );
}

function parseRelevanceScores(response: string, count: number): (number | null)[] {
  const scores: (number | null)[] = new Array(count).fill(null);
  const lines = response.split('\n');
  let seqIndex = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const numMatch = trimmed.match(/^(\d+)[.、)]/);
    let idx: number | null = null;
    if (numMatch) idx = parseInt(numMatch[1], 10) - 1;
    else if (seqIndex < count) idx = seqIndex++;
    if (idx === null || idx < 0 || idx >= count) continue;
    const scoreMatch = trimmed.match(/[|｜]\s*(\d+)\s*$/);
    if (scoreMatch) {
      const val = parseInt(scoreMatch[1], 10);
      if (val >= 0 && val <= 100) scores[idx] = val;
    }
  }
  return scores;
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

    const tier1 = /\.gov($|\.[a-z]{2}$)|\.edu($|\.[a-z]{2}$)|\.mil($|\.[a-z]{2}$)/;
    const tier2 = /(github\.com|stackoverflow\.com|wikipedia\.org|npmjs\.com|pypi\.org|crates\.io|rubygems\.org|docker\.com|hub\.docker\.com)/;
    const tier3 = /(mozilla\.org|webkit\.org|chromium\.org|apache\.org|gnu\.org|kernel\.org|opensource\.org|ietf\.org|w3\.org)/;
    const tier4 = /(reuters\.com|bbc\.com|bbc\.co\.uk|cnn\.com|nytimes\.com|wsj\.com|bloomberg\.com|apnews\.com|theguardian\.com|economist\.com|ft\.com)/;
    const tier5 = /(apple\.com|google\.com|microsoft\.com|amazon\.com|meta\.com|ibm\.com|oracle\.com|intel\.com|nvidia\.com|amd\.com|cisco\.com|adobe\.com|salesforce\.com|sap\.com|vmware\.com)/;
    const tier6 = /(arxiv\.org|researchgate\.net|scholar\.google\.com|nature\.com|science\.org|ieee\.org|acm\.org|springer\.com|elsevier\.com|pubmed\.ncbi\.nlm\.nih\.gov)/;
    const tier7 = /(medium\.com|dev\.to|hashnode\.dev|reddit\.com|news\.ycombinator\.com|hackernews\.com|\.substack\.com)/;
    const tier8 = /(\.org$|\.io$|\.dev$|docs\.|documentation)/;

    if (tier1.test(host)) score += 30;
    else if (tier2.test(host)) score += 28;
    else if (tier3.test(host)) score += 26;
    else if (tier4.test(host)) score += 25;
    else if (tier5.test(host)) score += 24;
    else if (tier6.test(host)) score += 22;
    else if (tier7.test(host)) score += 15;
    else if (tier8.test(host)) score += 10;
    else if (/zhihu\.com|csdn\.net|juejin\.cn|segmentfault\.com|oschina\.net|v2ex\.com/.test(host)) score += 8;
    else if (/\.cn$/.test(host) && !/gov\.cn|edu\.cn/.test(host)) score += 5;

    if (host.includes('official') || host.includes('doc') || host.includes('developer')) score += 5;
    if (/^www\./.test(host)) score += 3;
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