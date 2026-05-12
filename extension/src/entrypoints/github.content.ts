export default defineContentScript({
  matches: ['https://github.com/*'],
  main() {
    console.log('[Web Insight AI] Content script loaded for GitHub');

    const init = () => {
      if (window.__webInsightAIInjected) return;
      window.__webInsightAIInjected = true;

      import('@/services/github-extractor').then(({ GitHubExtractor }) => {
        const extractor = new GitHubExtractor();
        const data = extractor.extract();
        if (data) {
          console.log('[Web Insight AI] GitHub data extracted:', data);
          import('@/services/ai-service').then(({ AIService }) => {
            const ai = new AIService();
            ai.analyzeGitHub(data).then((result) => {
              import('@/components/GitHubCard/render').then(({ renderGitHubCard }) => {
                renderGitHubCard(result);
              });
            });
          });
        }
      });
    };

    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }

    document.addEventListener('turbo:load', () => {
      window.__webInsightAIInjected = false;
      init();
    });

    document.addEventListener('turbolinks:load', () => {
      window.__webInsightAIInjected = false;
      init();
    });
  },
});