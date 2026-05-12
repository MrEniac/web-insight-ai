import '@/assets/main.css';

export default defineUnlistedScript(() => {
  console.log('[Web Insight AI] Summary content script loaded');

  chrome.runtime.onMessage.addListener((message) => {
    if (message.type === 'AI_SUMMARY_REQUEST') {
      triggerSummary();
    }
  });

  async function triggerSummary() {
    const { ReadabilityService } = await import('@/services/readability');
    const { AIService } = await import('@/services/ai-service');

    const content = ReadabilityService.extract(document);
    if (!content) {
      console.warn('[Web Insight AI] Could not extract page content');
      return;
    }

    const ai = new AIService();
    const summary = await ai.summarize(content);
    console.log('[Web Insight AI] Summary:', summary);
  }
});