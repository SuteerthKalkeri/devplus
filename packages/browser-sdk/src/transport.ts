import type { HttpEvent, TransportStats } from './types.js';

const MAX_QUEUE_EVENTS = 200;
const MAX_BATCH_EVENTS = 20;
const MAX_BATCH_BYTES = 48_000;
const MAX_RETRIES = 2;
const encoder = new TextEncoder();

function delay(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) {
      resolve();
      return;
    }
    const finish = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', finish);
      resolve();
    };
    const timer = setTimeout(finish, milliseconds);
    signal.addEventListener('abort', finish, { once: true });
  });
}

export class EventTransport {
  private queue: HttpEvent[] = [];
  private pending: Promise<void> | undefined;
  private timer: ReturnType<typeof setInterval> | undefined;
  private lifetime = new AbortController();
  private sent = 0;
  private dropped = 0;

  constructor(
    private endpoint: string,
    private apiKey: string,
    private send: typeof fetch,
    private sleep = delay,
  ) {}

  start() {
    this.timer = setInterval(() => {
      void this.flush();
    }, 5_000);
  }

  enqueue(event: HttpEvent) {
    if (this.lifetime.signal.aborted) return;
    if (this.queue.length >= MAX_QUEUE_EVENTS) {
      this.dropped++;
      return;
    }
    // A hook cannot mutate an event after it enters the queue.
    this.queue.push(structuredClone(event));
    if (this.queue.length >= MAX_BATCH_EVENTS) void this.flush();
  }

  stats(): TransportStats {
    return { queued: this.queue.length, sent: this.sent, dropped: this.dropped };
  }

  flush(keepalive = false): Promise<void> {
    if (this.pending) return this.pending;
    if (this.lifetime.signal.aborted) return Promise.resolve();
    this.pending = this.drain(keepalive)
      .catch(() => {
        /* Telemetry never rejects into customer code. */
      })
      .finally(() => {
        this.pending = undefined;
      });
    return this.pending;
  }

  stop() {
    clearInterval(this.timer);
    this.lifetime.abort();
    this.dropped += this.queue.length;
    this.queue = [];
  }

  private batch(): HttpEvent[] {
    const result: HttpEvent[] = [];
    while (this.queue.length && result.length < MAX_BATCH_EVENTS) {
      const candidate = this.queue[0];
      const bytes = encoder.encode(
        JSON.stringify({ schemaVersion: 1, events: [...result, candidate] }),
      ).byteLength;
      if (bytes > MAX_BATCH_BYTES) {
        if (result.length) break;
        this.queue.shift();
        this.dropped++;
        continue;
      }
      result.push(this.queue.shift()!);
    }
    return result;
  }

  private async drain(keepalive: boolean) {
    // Bound work even if the application continuously produces events while sending.
    let budget = MAX_QUEUE_EVENTS;
    while (this.queue.length && budget > 0 && !this.lifetime.signal.aborted) {
      const events = this.batch();
      if (!events.length) break;
      budget -= events.length;
      const body = JSON.stringify({ schemaVersion: 1, events });
      let delivered = false;
      for (let attempt = 0; attempt <= MAX_RETRIES && !this.lifetime.signal.aborted; attempt++) {
        let retryAfter = 0;
        try {
          const response = await this.send(this.endpoint, {
            method: 'POST',
            credentials: 'omit',
            mode: 'cors',
            keepalive,
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${this.apiKey}` },
            body,
            signal: AbortSignal.any([this.lifetime.signal, AbortSignal.timeout(8_000)]),
          });
          if (response.ok) {
            delivered = true;
            break;
          }
          if (response.status !== 429 && response.status < 500) break;
          retryAfter =
            Math.min(60, Math.max(0, Number(response.headers.get('Retry-After')) || 0)) * 1000;
        } catch {
          /* Network failure: use the same event IDs for bounded retries. */
        }
        if (keepalive || attempt === MAX_RETRIES) break;
        await this.sleep(Math.max(retryAfter, 1000 * 2 ** attempt), this.lifetime.signal);
      }
      if (delivered) this.sent += events.length;
      else this.dropped += events.length;
      // Page-hide delivery is best effort and must stay below the shared keepalive byte budget.
      if (keepalive) break;
    }
  }
}
