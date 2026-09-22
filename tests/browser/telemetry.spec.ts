import { expect, test, type APIRequestContext } from '@playwright/test';
import { resolve } from 'node:path';

async function mutate(request: APIRequestContext, path: string, data: unknown, method = 'POST') {
  const csrf = await (await request.get('/api/auth/csrf')).json();
  const response = await request.fetch(path, {
    method,
    data,
    headers: { [csrf.headerName]: csrf.token },
  });
  expect(response.ok()).toBeTruthy();
  return response.status() === 204 ? null : response.json();
}

test('SDK sends real fetch requests across origins and the dashboard displays sanitized events', async ({
  page,
  context,
}) => {
  const request = context.request;
  const email = `telemetry-${Date.now()}@example.com`;
  const password = 'DevPulse-browser-test-2026';
  await mutate(request, '/api/auth/register', { name: 'SDK Tester', email, password });
  const csrf = await (await request.get('/api/auth/csrf')).json();
  expect(
    (
      await request.post('/api/auth/login', {
        form: { email, password },
        headers: { [csrf.headerName]: csrf.token },
      })
    ).ok(),
  ).toBeTruthy();
  const org = await mutate(request, '/api/organizations', { name: 'SDK browser test' });
  const project = await mutate(request, `/api/organizations/${org.id}/projects`, {
    name: 'HTTP playground',
  });
  const key = await mutate(request, `/api/projects/${project.id}/api-keys`, {
    name: 'Browser test',
  });
  try {
    await page.goto('http://127.0.0.1:4174');
    await page.getByLabel('Ingestion key', { exact: true }).fill(key.apiKey);
    await page.getByRole('button', { name: 'Connect SDK' }).click();
    await expect(page.getByText('SDK connected. Send a request below.')).toBeVisible();
    for (const [button, status] of [
      ['Successful request', 200],
      ['Slow request', 200],
      ['404 response', 404],
      ['500 response', 500],
    ] as const) {
      const response = page.waitForResponse(
        (response) => response.url().includes('/api/demo/') && response.status() === status,
      );
      await page.getByRole('button', { name: button, exact: true }).click();
      await response;
    }
    await page.getByRole('button', { name: 'Network failure' }).click();
    await expect(page.locator('#result')).toContainText('request failed');
    const delivery = page.waitForResponse(
      (response) => response.url().includes('/v1/ingest/events') && response.status() === 202,
    );
    await page.getByRole('button', { name: 'Send queued events' }).click();
    await delivery;
    await expect
      .poll(
        async () =>
          (await (await request.get(`/api/projects/${project.id}/telemetry`)).json()).summary
            .receivedEvents,
      )
      .toBe(5);
    const telemetry = await (await request.get(`/api/projects/${project.id}/telemetry`)).json();
    expect(
      telemetry.recentEvents.some(
        (event: { outcome: string }) => event.outcome === 'NETWORK_ERROR',
      ),
    ).toBeTruthy();
    expect(JSON.stringify(telemetry)).not.toContain('not-collected');
    await page.goto(`/projects/${project.id}`);
    await expect(page.getByText('5 events retained')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'GET /api/demo/slow', exact: true })).toBeVisible();
    await page.screenshot({ path: '.local/telemetry-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByText('Connect your application', { exact: true }).click();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    ).toBeTruthy();
    await page.screenshot({ path: '.local/telemetry-mobile.png', fullPage: true });
  } finally {
    await mutate(request, `/api/projects/${project.id}`, undefined, 'DELETE');
  }
});

test('fetch instrumentation preserves responses and errors, ignores itself, and restores on close', async ({
  page,
}) => {
  await page.goto('http://127.0.0.1:4174');
  const moduleUrl = '/@fs/' + resolve('packages/browser-sdk/dist/index.js').replaceAll('\\', '/');
  const result = await page.evaluate(async (moduleUrl) => {
    // The served build is the same SDK used by the demo and distributed tarball.
    const { createDevPulse } = await import(/* @vite-ignore */ moduleUrl);
    const sdk = createDevPulse();
    const response = new Response('original body', { status: 201 });
    const failure = new DOMException('aborted', 'AbortError');
    const native = window.fetch;
    let fail = false;
    const original: typeof fetch = async () => {
      if (fail) throw failure;
      return response;
    };
    window.fetch = original;
    try {
      const options = {
        apiKey: 'dp_ingest_' + 'a'.repeat(43),
        endpoint: 'http://127.0.0.1:8081/v1/ingest/events',
      };
      sdk.init(options);
      const installed = window.fetch;
      sdk.init(options);
      const unchanged = installed === window.fetch;
      const other = createDevPulse();
      const duplicateRejected = other.init(options) === false;
      const actual = await fetch('/api/demo/ok');
      await fetch(options.endpoint);
      fail = true;
      let sameError = false;
      try {
        await fetch('/api/demo/slow');
      } catch (error) {
        sameError = error === failure;
      }
      const queued = sdk.getStats().queued;
      sdk.close();
      const restored = window.fetch === original;
      sdk.init({
        ...options,
        beforeSend: () => {
          throw new Error('bad hook');
        },
      });
      fail = false;
      const hookResponse = await fetch('/api/demo/ok');
      const hookDropped = sdk.getStats().queued === 0;
      sdk.close();
      return {
        unchanged,
        duplicateRejected,
        sameResponse: actual === response,
        sameError,
        queued,
        restored,
        hookSafe: hookResponse === response && hookDropped,
      };
    } finally {
      sdk.close();
      window.fetch = native;
    }
  }, moduleUrl);
  expect(result).toEqual({
    unchanged: true,
    duplicateRejected: true,
    sameResponse: true,
    sameError: true,
    queued: 2,
    restored: true,
    hookSafe: true,
  });
});
