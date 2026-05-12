import '@/assets/main.css';
import { createRoot } from 'react-dom/client';
import App from '@/components/SidePanel/App';

export default defineContentScript({
  matches: [],
  runAt: 'document_idle',
  main(ctx) {
    const ui = await createIntegratedUiContentScript(ctx, {
      position: 'overlay',
      anchor: 'body',
      alignment: 'end',
      onMount: (container) => {
        const root = createRoot(container);
        root.render(<App />);
        return root;
      },
      onRemove: (root) => {
        root?.unmount();
      },
    });

    ui.mount();
  },
});