import type { HttpEvent } from './types.js';

export function sanitizePath(value: string, base = 'http://relative.invalid/'): string {
  const url = new URL(value, base);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Unsupported URL scheme');
  return url.pathname.slice(0, 2048) || '/';
}

/** Rebuild the allowlisted shape after hooks; never serialize arbitrary application objects. */
export function sanitizeEvent(event: HttpEvent, base: string): HttpEvent {
  const method = event.http.method.toUpperCase();
  if (!/^(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|CONNECT|TRACE)$/.test(method))
    throw new Error('Invalid method');
  if (
    !Number.isFinite(event.http.durationMs) ||
    event.http.durationMs < 0 ||
    event.http.durationMs > 3_600_000
  )
    throw new Error('Invalid duration');
  if (!/^[a-zA-Z0-9_-]{1,32}$/.test(event.environment)) throw new Error('Invalid environment');
  const outcome = event.http.outcome;
  const status = event.http.statusCode;
  if (
    !['HTTP_RESPONSE', 'NETWORK_ERROR', 'ABORTED'].includes(outcome) ||
    !Number.isInteger(status) ||
    (outcome === 'HTTP_RESPONSE' ? status < 100 || status > 599 : status !== 0)
  )
    throw new Error('Invalid status');
  return {
    eventId: event.eventId,
    type: 'HTTP_REQUEST',
    timestamp: event.timestamp,
    environment: event.environment,
    release: event.release?.slice(0, 100),
    http: {
      method,
      url: sanitizePath(event.http.url, base),
      statusCode: status,
      durationMs: Math.round(event.http.durationMs * 100) / 100,
      outcome,
    },
    page: { url: sanitizePath(event.page.url, base) },
  };
}
