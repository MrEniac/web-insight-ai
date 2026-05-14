export default defineBackground(() => {
  console.log('[Web Insight AI] Background service worker started');

  chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: 'ai-summary',
      title: 'AI Summary',
      contexts: ['page', 'selection'],
    });

    chrome.contextMenus.create({
      id: 'ai-chat',
      title: 'Open AI Chat',
      contexts: ['page'],
    });

    chrome.storage.local.set({
      modelMode: 'local',
      ollamaUrl: 'http://localhost:11434',
      backendUrl: 'http://localhost:8080',
      selectedModel: 'qwen3.5:2b',
    });
  });

  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'ai-summary' && tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'AI_SUMMARY_REQUEST' });
    }

    if (info.menuItemId === 'ai-chat' && tab?.id) {
      chrome.sidePanel.open({ tabId: tab.id }).catch(() => {});
    }
  });

  chrome.commands.onCommand.addListener((command, tab) => {
    if (command === 'ai-summary' && tab?.id) {
      chrome.tabs.sendMessage(tab.id, { type: 'AI_SUMMARY_REQUEST' });
    }
  });
});