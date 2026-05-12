export default defineBackground(() => {
  console.log('[Web Insight AI] Background service worker started');

  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: 'ai-summary',
      title: 'AI Summary',
      contexts: ['page', 'selection'],
    });

    chrome.storage.local.set({
      modelMode: 'local',
      ollamaUrl: 'http://localhost:11434',
      backendUrl: 'http://localhost:8080',
      selectedModel: '',
    });
  });

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'ai-summary' && tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'AI_SUMMARY_REQUEST' });
    }
  });
});