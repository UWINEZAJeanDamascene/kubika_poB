console.log('[main.tsx] Entry point loading');

import { createRoot } from 'react-dom/client';
import App from './app/App';
import { initializeClientPerformanceMonitoring, markApplicationShellReady } from './lib/clientPerformance';
import './i18n'; // initialise i18next before rendering
import './styles/index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('[main.tsx] ERROR: Root element not found!');
  document.body.innerHTML = '<div style="padding: 20px; color: red;">Error: Root element not found. Please check index.html</div>';
} else {
  console.log('[main.tsx] Root element found, rendering app...');
  initializeClientPerformanceMonitoring();
  
  try {
    createRoot(rootElement).render(<App />);
    window.requestAnimationFrame(markApplicationShellReady);
    console.log('[main.tsx] Render called successfully');
  } catch (err) {
    console.error('[main.tsx] RENDER ERROR:', err);
    rootElement.innerHTML = `<div style="padding: 20px; color: red;">Error: ${err}</div>`;
  }
}

// Global error handlers
window.addEventListener('error', (event) => {
  console.error('[Global error]', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled rejection]', event.reason);
});
