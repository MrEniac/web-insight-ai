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
        if (!data) {
          console.warn('[Web Insight AI] Could not extract GitHub data');
          return;
        }

        console.log('[Web Insight AI] GitHub data extracted:', data);

        import('@/components/GitHubCard/render').then(
          ({ renderGitHubCardLoading, renderGitHubCardStream, renderGitHubCardError }) => {
            renderGitHubCardLoading();

            import('@/services/ai-service').then(({ AIService }) => {
              const ai = new AIService();
              const { onChunk, onComplete } = renderGitHubCardStream();

              ai.analyzeGitHubStream(data, onChunk)
                .then(() => {
                  onComplete();
                })
                .catch((err: Error) => {
                  renderGitHubCardError(err.message);
                });
            });
          },
        );
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