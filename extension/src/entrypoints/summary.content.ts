import '@/assets/main.css';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    console.log('[Web Insight AI] Summary content script loaded');

    chrome.runtime.onMessage.addListener((message) => {
      if (message.type === 'AI_SUMMARY_REQUEST') {
        triggerSummary();
      }
    });

    async function triggerSummary() {
      const { ReadabilityService } = await import('@/services/readability');
      const { AIService } = await import('@/services/ai-service');
      const { showSummaryStreamPanel, showSummaryPanel } = await import('@/components/SummaryPanel/render');

      const content = ReadabilityService.extract(document);
      if (!content) {
        console.warn('[Web Insight AI] Could not extract page content');
        return;
      }

      const { onChunk, onComplete } = showSummaryStreamPanel(content.title);
      const ai = new AIService();

      try {
        await ai.summarizeStream(content, onChunk);
        onComplete();
      } catch {
        // fallback to non-streaming
        try {
          const result = await ai.summarize(content);
          showSummaryPanel({ title: content.title, summary: result });
        } catch (err) {
          console.error('[Web Insight AI] Summary error:', err);
        }
      }
    }
  },
});