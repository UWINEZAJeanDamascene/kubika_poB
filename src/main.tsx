console.log('[main.tsx] Entry point loading');

import { createRoot } from 'react-dom/client';
import App from './app/App';
import { LanguageProvider } from './contexts/LanguageContext';
import { initializeClientPerformanceMonitoring, markApplicationShellReady } from './lib/clientPerformance';
import './i18n'; // initialise i18next before rendering
import './styles/index.css';

const rootElement = document.getElementById('root');

if (!rootElement) {
  console.error('[main.tsx] ERROR: Root element not found!');
  document.body.innerHTML = '<div style="padding: 20px; color: red;">Error: Root element not found. Please check index.html</div>';
} else {
  const staticMarketingPaths = new Set(['/operations', '/platform', '/trust']);
  const shouldKeepPrerenderedPage = staticMarketingPaths.has(window.location.pathname.replace(/\/+$/, '') || '/');
  if (shouldKeepPrerenderedPage) {
    // These routes are emitted as complete static marketing pages at build time.
    // Keep their crawlable page content in place instead of replacing it with the app's home fallback.
    markApplicationShellReady();
  } else {
    console.log('[main.tsx] Root element found, rendering app...');
    initializeClientPerformanceMonitoring();

    try {
      createRoot(rootElement).render(
        <LanguageProvider>
          <App />
        </LanguageProvider>,
      );
      window.requestAnimationFrame(markApplicationShellReady);
      console.log('[main.tsx] Render called successfully');
    } catch (err) {
      console.error('[main.tsx] RENDER ERROR:', err);
      rootElement.innerHTML = `<div style="padding: 20px; color: red;">Error: ${err}</div>`;
    }
  }
}

// Global error handlers
window.addEventListener('vite:preloadError', (event) => {
  event.preventDefault();
  const payload = (event as CustomEvent<unknown>).detail ?? (event as CustomEvent<unknown>).payload;
  const errorKey = `vite-preload-reload:${window.location.pathname}:${String(payload)}`;

  try {
    if (sessionStorage.getItem(errorKey)) return;
    sessionStorage.setItem(errorKey, '1');
  } catch {
    return;
  }

  window.location.reload();
});

window.addEventListener('error', (event) => {
  console.error('[Global error]', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled rejection]', event.reason);
});
