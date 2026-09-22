import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizePath, sanitizeEvent } from '../dist/privacy.js';
import { EventTransport } from '../dist/transport.js';
import { DevPulse } from '../dist/index.js';

function event() {
  return {
    eventId: crypto.randomUUID(),
    type: 'HTTP_REQUEST',
    timestamp: new Date().toISOString(),
    environment: 'test',
    http: {
      method: 'GET',
      url: '/products',
      statusCode: 200,
      durationMs: 12,
      outcome: 'HTTP_RESPONSE',
    },
    page: { url: '/' },
  };
}

test('URL sanitation strips credentials, queries, fragments and unexpected fields', () => {
  assert.equal(
    sanitizePath('https://user:password@example.com/products?token=secret#private'),
    '/products',
  );
  const value = event();
  value.http.url = 'https://shop.test/items?email=private';
  value.page.url = '/cart?session=secret';
  value.http.headers = { Authorization: 'secret' };
  const safe = sanitizeEvent(value, 'http://shop.test');
  assert.equal(safe.http.url, '/items');
  assert.equal(safe.page.url, '/cart');
  assert.ok(!JSON.stringify(safe).includes('secret'));
  assert.throws(() => sanitizePath('data:text/plain,private'));
});
test('SSR import and initialization are safe', () =>
  assert.equal(DevPulse.init({ apiKey: 'test', endpoint: 'http://localhost' }), false));
test('retry uses identical event IDs, serializes sends and omits cookies', async () => {
  const bodies = [];
  const transport = new EventTransport(
    'http://ingest.test',
    'public-key',
    async (_url, options) => {
      bodies.push(options.body);
      assert.equal(options.credentials, 'omit');
      return new Response('', { status: bodies.length === 1 ? 503 : 202 });
    },
    async () => {},
  );
  transport.enqueue(event());
  await Promise.all([transport.flush(), transport.flush()]);
  assert.equal(bodies.length, 2);
  assert.equal(bodies[0], bodies[1]);
  assert.equal(transport.stats().sent, 1);
  transport.stop();
});
test('invalid or revoked key is not retried', async () => {
  let calls = 0;
  const transport = new EventTransport(
    'http://ingest.test',
    'key',
    async () => {
      calls++;
      return new Response('', { status: 401 });
    },
    async () => {},
  );
  transport.enqueue(event());
  await transport.flush();
  assert.equal(calls, 1);
  assert.equal(transport.stats().dropped, 1);
  transport.stop();
});
test('buffer is bounded while a send is in flight', async () => {
  let finish;
  const wait = new Promise((resolve) => (finish = resolve));
  const transport = new EventTransport(
    'http://ingest.test',
    'key',
    async () => {
      await wait;
      return new Response('', { status: 202 });
    },
    async () => {},
  );
  for (let i = 0; i < 1000; i++) transport.enqueue(event());
  assert.equal(transport.stats().queued, 200);
  assert.ok(transport.stats().dropped > 0);
  transport.stop();
  finish();
  await transport.flush();
  assert.equal(transport.stats().queued, 0);
});
test('retry exhaustion drops only telemetry; no rejection escapes', async () => {
  let calls = 0;
  const transport = new EventTransport(
    'http://ingest.test',
    'key',
    async () => {
      calls++;
      throw new Error('offline');
    },
    async () => {},
  );
  transport.enqueue(event());
  await transport.flush();
  assert.equal(calls, 3);
  assert.equal(transport.stats().dropped, 1);
  transport.stop();
});
test('batches respect the keepalive byte budget', async () => {
  const sizes = [];
  const transport = new EventTransport('http://ingest.test', 'key', async (_url, options) => {
    sizes.push(new TextEncoder().encode(options.body).length);
    return new Response('', { status: 202 });
  });
  for (let i = 0; i < 45; i++) {
    const value = event();
    value.http.url = '/' + 'x'.repeat(2000);
    value.page.url = '/' + 'y'.repeat(2000);
    transport.enqueue(value);
  }
  await transport.flush();
  assert.ok(sizes.every((bytes) => bytes <= 48000));
  assert.equal(transport.stats().sent, 45);
  transport.stop();
});
