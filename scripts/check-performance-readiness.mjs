/**
 * Optional release gate for the frontend deployment.
 * Usage: npm run check:performance-readiness
 * Set PERFORMANCE_READINESS_URL to the backend /api/performance/readiness URL.
 */
const url = process.env.PERFORMANCE_READINESS_URL || 'http://localhost:3000/api/performance/readiness';
try {
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.ready !== true) {
    console.error(`Performance readiness failed (${response.status}):`, body.failures || body);
    process.exitCode = 1;
  } else {
    console.log(`Performance readiness passed: ${url}`);
  }
} catch (error) {
  console.error(`Performance readiness request failed (${url}): ${error.message}`);
  process.exitCode = 1;
}