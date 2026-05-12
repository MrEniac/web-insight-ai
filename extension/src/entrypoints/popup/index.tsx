import '@/assets/main.css';
import { createRoot } from 'react-dom/client';
import App from '@/components/Settings/App';

export default definePopup(() => {
  const container = document.getElementById('root');
  if (!container) throw new Error('Root element not found');
  createRoot(container).render(<App />);
});