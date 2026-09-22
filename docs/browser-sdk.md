# Browser SDK and ingestion

Checkpoint 4 includes the local `@devpulse/browser` package, a real HTTP playground, authenticated ingestion, PostgreSQL persistence, and a recent-events view. The package has **not** been published to npm.

## Try the complete flow

From the DevPulse root, start these in separate terminals:

```powershell
npm.cmd run db:start
npm.cmd run backend
npm.cmd run dev
npm.cmd run demo
```

Open `http://127.0.0.1:3000`, create or open a project, and generate a key. Open `http://127.0.0.1:4174`, paste that key, and connect. Try successful, slow, 404, 500, and network-failure requests. Click **Send queued events**, then return to the project's incoming-requests table. The dashboard refreshes every five seconds.

DevPulse uses backend port **8081**, leaving **8080** available for the e-commerce backend. The default CORS configuration allows local browser origins only. Set `INGEST_ALLOWED_ORIGINS` to comma-separated approved origins for a deployed application, and expose `/v1/ingest/events` over HTTPS. CORS is a browser policy, not proof of a client's identity.

## Install in another application

Build a local distribution in DevPulse:

```powershell
npm.cmd run pack:sdk
```

Then, from the application's frontend directory (for example `C:\Learning\e-commerce\frontend`):

```powershell
npm.cmd install C:/Learning/DevPulse/.local/devpulse-browser-0.1.0.tgz
```

For a shared repository, copy the tarball into its `vendor/` directory and install the relative path. Rebuild and reinstall the tarball after SDK changes.

Add these values to that app's local Vite environment file, replacing the key placeholder:

```dotenv
VITE_DEVPULSE_KEY=YOUR_INGESTION_KEY
VITE_DEVPULSE_ENDPOINT=http://127.0.0.1:8081/v1/ingest/events
```

Initialize once in a small monitoring module imported before your application renders:

```typescript
import { DevPulse } from '@devpulse/browser';

DevPulse.init({
  apiKey: import.meta.env.VITE_DEVPULSE_KEY,
  endpoint: import.meta.env.VITE_DEVPULSE_ENDPOINT,
  environment: import.meta.env.MODE,
  release: '0.1.0',
  beforeSend(event) {
    // Paths can contain identifying data. Normalize application-specific routes here.
    event.http.url = event.http.url.replace(/\/customers\/[^/]+/g, '/customers/:id');
    return event; // Return null to exclude a request entirely.
  },
});

if (import.meta.hot) import.meta.hot.dispose(() => DevPulse.close());
```

`init` returns false for invalid configuration, an SSR environment, or another active SDK instance. Repeated initialization of the same instance is harmless. `close()` restores its fetch wrapper and removes timers/listeners; queued events are discarded. Call `await DevPulse.flush()` before `close()` when an explicit flush is needed. Use `getStats()` to inspect local queued/sent/dropped counters; sent counts submitted events, including server-deduplicated retries.

Browser ingestion keys are public, write-only credentials. They never allow reading events or authenticating dashboard requests. A lost key cannot be recovered: create a new one and revoke the old one.

## Axios, including the e-commerce frontend

Automatic capture covers `window.fetch`. Axios's XHR transport needs an interceptor on the application's Axios instance. Register this **once**, immediately after `axios.create`, and do not switch Axios to fetch while these interceptors are installed (that would capture twice).

```typescript
import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { DevPulse } from '@devpulse/browser';

export function instrumentApi(api: AxiosInstance) {
  const started = new WeakMap<InternalAxiosRequestConfig, number>();
  const requestId = api.interceptors.request.use((config) => {
    started.set(config, performance.now());
    return config;
  });

  function record(
    config: InternalAxiosRequestConfig | undefined,
    statusCode: number,
    aborted = false,
  ) {
    if (!config) return;
    const start = started.get(config);
    if (start === undefined) return;
    started.delete(config);
    try {
      DevPulse.trackRequest({
        url: api.getUri(config),
        method: config.method?.toUpperCase(),
        statusCode,
        durationMs: performance.now() - start,
        outcome: statusCode ? 'HTTP_RESPONSE' : aborted ? 'ABORTED' : 'NETWORK_ERROR',
      });
    } catch {
      /* Monitoring must not interrupt a store request. */
    }
  }

  const responseId = api.interceptors.response.use(
    (response) => {
      record(response.config, response.status);
      return response;
    },
    (error) => {
      if (axios.isAxiosError(error))
        record(error.config, error.response?.status ?? 0, axios.isCancel(error));
      return Promise.reject(error);
    },
  );
  return () => {
    api.interceptors.request.eject(requestId);
    api.interceptors.response.eject(responseId);
  };
}
```

In `src/api/catalogApi.ts`, call `const stopMonitoring = instrumentApi(api)` after creating the existing Axios instance. For Vite hot reload, call `stopMonitoring()` from `import.meta.hot.dispose`. Import the SDK initialization module from `src/main.tsx` before rendering. Restart Vite after changing environment variables. The e-commerce files are not modified by the DevPulse checkpoint itself.

## Data and delivery contract

- Captures method, URL **path only**, HTTP status, duration, outcome, page path, environment, and optional release. No request/response bodies, headers, cookies, query strings, fragments, or URL credentials are sent. Sanitization runs before and after `beforeSend`, and again on the server. Additional JSON fields are never persisted.
- Fetch duration ends when the response becomes available; it is not a server-only latency or full response-body download measurement. Axios timing ends when its response interceptor runs. HTTP 4xx/5xx responses and network errors are separate outcomes. Opaque fetch responses have status 0 and are classified as network errors in this first version.
- The queue is memory-only and holds at most 200 waiting events. Batches contain at most 20 events and 48,000 UTF-8 bytes. Flushes run every five seconds or at 20 queued events.
- A send times out after eight seconds. Network errors, 429, and 5xx responses get at most two retries with exponential backoff; `Retry-After` is honored up to 60 seconds. IDs and payloads stay unchanged across retries. Other 4xx responses are dropped immediately.
- Page hiding triggers a best-effort, single-batch fetch with `keepalive` and no retry. Closing a tab, network loss, queue limits, or redaction errors may drop events. Delivery is not guaranteed and the SDK never blocks navigation.
- Ingestion sends `Authorization: Bearer …` and `credentials: 'omit'`; its own fetch calls bypass capture. This first version targets modern browsers providing `crypto.randomUUID`, `structuredClone`, `AbortSignal.timeout`, and `AbortSignal.any`.
- Server maximums: 64 KiB body (including streamed requests), 50 events/batch, 60 requests/key/minute, 120 requests/source IP/minute, and 100,000 submitted events/project/UTC day (configurable with `INGEST_DAILY_EVENT_LIMIT`). Retries count toward quota. The minute limiter is bounded, in-memory, and per server; a multi-instance/public deployment needs shared limits and a trusted proxy strategy.
- Events older than 14 days or more than five minutes in the future are rejected. Raw events expire 14 days after receipt; cleanup starts after ten minutes and runs every six hours. Duplicate prevention lasts while the original event remains retained.

## Verify the database

Connect your SQL client using the local credentials described in [setup](setup.md), then run:

```sql
SELECT project_id, event_id, http_method, http_path, http_status,
       outcome, duration_ms, environment, received_at
FROM telemetry_events
ORDER BY received_at DESC
LIMIT 20;

SELECT project_id, event_id, count(*)
FROM telemetry_events
GROUP BY project_id, event_id
HAVING count(*) > 1;
```

The duplicate query should return no rows. The unique `(project_id, event_id)` constraint enforces this even under concurrent deliveries.
