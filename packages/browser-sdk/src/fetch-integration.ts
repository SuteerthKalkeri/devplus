import type { TrackedRequest } from './types.js';

export function instrumentFetch(
  target: Window,
  endpoint: string,
  capture: (request: TrackedRequest) => void,
) {
  const original = target.fetch;
  let enabled = true;
  const wrapped: typeof fetch = function (input, init) {
    const start = performance.now();
    function record(statusCode: number, outcome: TrackedRequest['outcome']) {
      if (!enabled) return;
      try {
        const url = input instanceof Request ? input.url : String(input);
        const resolved = new URL(url, target.location.href);
        const ingest = new URL(endpoint);
        if (resolved.origin === ingest.origin && resolved.pathname.startsWith('/v1/ingest/'))
          return;
        capture({
          url,
          method: init?.method || (input instanceof Request ? input.method : 'GET'),
          statusCode,
          durationMs: performance.now() - start,
          outcome,
        });
      } catch {
        /* Invalid request metadata must not alter the fetch result. */
      }
    }
    return original.call(target, input, init).then(
      (response) => {
        record(response.status, response.status === 0 ? 'NETWORK_ERROR' : 'HTTP_RESPONSE');
        return response;
      },
      (error) => {
        record(0, error?.name === 'AbortError' ? 'ABORTED' : 'NETWORK_ERROR');
        throw error;
      },
    );
  };
  target.fetch = wrapped;
  return () => {
    enabled = false;
    if (target.fetch === wrapped) target.fetch = original;
  };
}
