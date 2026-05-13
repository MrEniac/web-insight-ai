import '@/assets/main.css';
import { createRoot } from 'react-dom/client';
import App from '@/components/Settings/App';

const container = document.getElementById('root');
if (container) {
  createRoot(container).render(<App />);
}