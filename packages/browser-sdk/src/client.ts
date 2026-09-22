import { instrumentFetch } from './fetch-integration.js';
import { sanitizeEvent } from './privacy.js';
import { EventTransport } from './transport.js';
import type { DevPulseOptions, HttpEvent, TrackedRequest } from './types.js';

const ownerSymbol = Symbol.for('devpulse.browser.owner');
type InstrumentedWindow = Window & { [ownerSymbol]?: object };

export function createDevPulse() {
  let transport: EventTransport | undefined;
  let config: DevPulseOptions | undefined;
  let cleanup: (() => void) | undefined;
  const owner = {};

  function trackRequest(request: TrackedRequest): void {
    if (!transport || !config) return;
    try {
      const event: HttpEvent = {
        eventId: crypto.randomUUID(),
        type: 'HTTP_REQUEST',
        timestamp: new Date().toISOString(),
        environment: config.environment || 'development',
        release: config.release,
        http: {
          method: request.method || 'GET',
          url: request.url,
          statusCode: request.statusCode,
          durationMs: request.durationMs,
          outcome:
            request.outcome || (request.statusCode === 0 ? 'NETWORK_ERROR' : 'HTTP_RESPONSE'),
        },
        page: { url: window.location.href },
      };
      const sanitized = sanitizeEvent(event, window.location.href);
      const transformed = config.beforeSend ? config.beforeSend(sanitized) : sanitized;
      if (transformed)
        transport.enqueue(
          sanitizeEvent(
            { ...transformed, eventId: event.eventId, timestamp: event.timestamp },
            window.location.href,
          ),
        );
    } catch {
      /* Bad metadata or a failed redaction hook drops only this event. */
    }
  }

  function close() {
    cleanup?.();
    cleanup = undefined;
    transport?.stop();
    transport = undefined;
    config = undefined;
  }

  return {
    init(options: DevPulseOptions): boolean {
      if (transport) return true;
      if (typeof window === 'undefined') return false;
      const target = window as InstrumentedWindow;
      if (target[ownerSymbol]) return false;
      try {
        const url = new URL(options.endpoint);
        if (
          !/^dp_ingest_[A-Za-z0-9_-]{43}$/.test(options.apiKey) ||
          !['http:', 'https:'].includes(url.protocol) ||
          url.username ||
          url.password ||
          url.search ||
          url.hash
        )
          return false;
        if (!/^[a-zA-Z0-9_-]{1,32}$/.test(options.environment || 'development')) return false;
        config = { ...options, endpoint: url.href };
        const original = target.fetch.bind(target);
        transport = new EventTransport(url.href, options.apiKey, original);
        const restoreFetch = instrumentFetch(target, url.href, trackRequest);
        const pagehide = () => {
          void transport?.flush(true);
        };
        const visibility = () => {
          if (document.visibilityState === 'hidden') pagehide();
        };
        target.addEventListener('pagehide', pagehide);
        document.addEventListener('visibilitychange', visibility);
        target[ownerSymbol] = owner;
        cleanup = () => {
          restoreFetch();
          target.removeEventListener('pagehide', pagehide);
          document.removeEventListener('visibilitychange', visibility);
          if (target[ownerSymbol] === owner) delete target[ownerSymbol];
        };
        transport.start();
        return true;
      } catch {
        close();
        return false;
      }
    },
    trackRequest,
    flush: () => transport?.flush() || Promise.resolve(),
    close,
    getStats: () => transport?.stats() || { queued: 0, sent: 0, dropped: 0 },
  };
}
