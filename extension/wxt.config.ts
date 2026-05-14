import { defineConfig } from 'wxt';

export default defineConfig({
  modules: ['@wxt-dev/module-react'],
  srcDir: 'src',
  manifest: {
    name: 'Web Insight AI',
    description: 'AI-powered browsing enhancement layer for developers',
    version: '0.1.0',
    permissions: [
      'activeTab',
      'storage',
      'sidePanel',
      'contextMenus',
    ],
    host_permissions: [
      'https://github.com/*',
      'https://www.google.com/*',
      'https://www.bing.com/*',
      'https://www.baidu.com/*',
      'http://localhost:11434/*',
      'http://localhost:8080/*',
    ],
    commands: {
      'ai-summary': {
        suggested_key: { default: 'Ctrl+Shift+S', mac: 'MacCtrl+Shift+S' },
        description: 'AI summary of current page',
      },
    },
  },
  runner: {
    disabled: true,
  },
});