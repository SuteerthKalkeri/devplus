# @devpulse/browser

Local, framework-independent browser HTTP monitoring for DevPulse. This package is not published to npm.

```typescript
import { DevPulse } from '@devpulse/browser';

DevPulse.init({
  apiKey: 'YOUR_INGESTION_KEY',
  endpoint: 'http://127.0.0.1:8081/v1/ingest/events',
  environment: 'development',
  release: '0.1.0',
});
```

Initialize before application requests. Captures `window.fetch`, strips URL query/fragment/credentials, batches events, and retries transient delivery failures. No bodies, headers, or cookies are collected. Browser keys are public and only permit submitting events.

Use `beforeSend(event)` to normalize sensitive paths or return `null` to discard an event. Use `trackRequest({url, method, statusCode, durationMs, outcome})` for clients such as Axios/XHR. `flush()` explicitly sends pending events; `close()` uninstalls instrumentation and discards the queue. `getStats()` returns local transport counters. Delivery is best-effort and memory-only.

See `docs/browser-sdk.md` in the DevPulse repository for the complete Axios adapter, limits, browser requirements, and local demo. Build with `npm run build:sdk` and package with `npm run pack:sdk` at the repository root.
