import { API_BASE_URL } from './apiBase';

type ClientMetricUnit = 'ms' | 'score';

interface ClientMetric {
  name: string;
  value: number;
  unit: ClientMetricUnit;
}

const MAX_PENDING_METRICS = 20;
const REPORT_DELAY_MS = 1_000;
const TELEMETRY_DISABLED_VALUES = new Set(['false', '0', 'no']);

let initialized = false;
let reportTimer: number | null = null;
let pendingMetrics: ClientMetric[] = [];
let largestContentfulPaint = 0;
let cumulativeLayoutShift = 0;
let longestTask = 0;
let finalMetricsRecorded = false;

function isEnabled() {
  const configured = String(import.meta.env.VITE_PERFORMANCE_TELEMETRY ?? '').trim().toLowerCase();
  return !TELEMETRY_DISABLED_VALUES.has(configured);
}

function currentRoute() {
  return typeof window === 'undefined' ? undefined : window.location.pathname.slice(0, 120);
}

function enqueueMetric(name: string, value: number, unit: ClientMetricUnit = 'ms') {
  if (!Number.isFinite(value) || value < 0 || pendingMetrics.length >= MAX_PENDING_METRICS) return;
  pendingMetrics.push({
    name,
    value: Math.round(value * 100) / 100,
    unit,
  });
  scheduleReport();
}

function scheduleReport() {
  if (reportTimer !== null || typeof window === 'undefined') return;
  reportTimer = window.setTimeout(() => {
    reportTimer = null;
    void flushMetrics();
  }, REPORT_DELAY_MS);
}

async function flushMetrics() {
  if (!pendingMetrics.length || typeof window === 'undefined') return;

  const metrics = pendingMetrics.splice(0, MAX_PENDING_METRICS);
  try {
    await fetch(`${API_BASE_URL}/performance/client`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        route: currentRoute(),
        captured_at: new Date().toISOString(),
        metrics,
      }),
      keepalive: true,
    });
  } catch {
    // Performance telemetry is best-effort and must never affect the app.
  }

  if (pendingMetrics.length) scheduleReport();
}

function collectNavigationMetrics() {
  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
  if (navigation) {
    if (navigation.domContentLoadedEventEnd > 0) {
      enqueueMetric('navigation_dom_content_loaded', navigation.domContentLoadedEventEnd);
    }
    if (navigation.loadEventEnd > 0) {
      enqueueMetric('navigation_load', navigation.loadEventEnd);
    }
  }

  for (const entry of performance.getEntriesByType('paint')) {
    if (entry.name === 'first-paint' || entry.name === 'first-contentful-paint') {
      enqueueMetric(`navigation_${entry.name.replaceAll('-', '_')}`, entry.startTime);
    }
  }
}

function installLargestContentfulPaintObserver() {
  if (typeof PerformanceObserver === 'undefined') return;
  try {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const latest = entries[entries.length - 1];
      if (latest) largestContentfulPaint = Math.max(largestContentfulPaint, latest.startTime);
      if (largestContentfulPaint > 0) enqueueMetric('largest_contentful_paint', largestContentfulPaint);
    });
    observer.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {
    // The metric is not supported in every browser.
  }
}

function installLongTaskObserver() {
  if (typeof PerformanceObserver === 'undefined') return;
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        longestTask = Math.max(longestTask, entry.duration);
      }
      if (longestTask > 0) enqueueMetric('long_task_max', longestTask);
    });
    observer.observe({ type: 'longtask', buffered: true });
  } catch {
    // Long Task timing is not supported in every browser.
  }
}

function installLayoutShiftObserver() {
  if (typeof PerformanceObserver === 'undefined') return;
  try {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        const shift = entry as PerformanceEntry & { value?: number; hadRecentInput?: boolean };
        if (!shift.hadRecentInput && typeof shift.value === 'number') {
          cumulativeLayoutShift += shift.value;
        }
      }
    });
    observer.observe({ type: 'layout-shift', buffered: true });
  } catch {
    // Layout shift timing is not supported in every browser.
  }
}

function recordFinalMetrics() {
  if (finalMetricsRecorded) return;
  finalMetricsRecorded = true;
  if (largestContentfulPaint > 0) enqueueMetric('largest_contentful_paint', largestContentfulPaint);
  if (longestTask > 0) enqueueMetric('long_task_max', longestTask);
  if (cumulativeLayoutShift > 0) enqueueMetric('cumulative_layout_shift', cumulativeLayoutShift, 'score');
  void flushMetrics();
}

/**
 * Start browser-side Phase 0 timing collection once per document.
 * This is intentionally independent of React Query and does not block render.
 */
export function initializeClientPerformanceMonitoring() {
  if (initialized || !isEnabled() || typeof window === 'undefined' || typeof performance === 'undefined') return;
  initialized = true;

  const collect = () => {
    collectNavigationMetrics();
    installLargestContentfulPaintObserver();
    installLongTaskObserver();
    installLayoutShiftObserver();
  };

  if (document.readyState === 'complete') collect();
  else window.addEventListener('load', collect, { once: true });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') recordFinalMetrics();
  });
  window.addEventListener('pagehide', recordFinalMetrics, { once: true });
}

/** Record the time at which the React application shell becomes usable. */
export function markApplicationShellReady() {
  if (!initialized || typeof performance === 'undefined') return;
  enqueueMetric('application_shell_ready', performance.now());
}
