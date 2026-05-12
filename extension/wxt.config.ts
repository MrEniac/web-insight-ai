import { defineConfig } from 'wxt';
import react from '@wxt-dev/module-react';

export default defineConfig({
  modules: [react()],
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
    ],
  },
  runner: {
    disabled: true,
  },
});