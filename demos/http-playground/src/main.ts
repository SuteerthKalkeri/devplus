import { DevPulse } from '../../../packages/browser-sdk/dist/index.js';
import './style.css';

const element = <T extends HTMLElement>(selector: string) => document.querySelector<T>(selector)!;
element('#connect').addEventListener('submit', (event) => {
  event.preventDefault();
  DevPulse.close();
  const initialized = DevPulse.init({
    apiKey: element<HTMLInputElement>('#key').value.trim(),
    endpoint: element<HTMLInputElement>('#endpoint').value.trim(),
    environment: 'demo',
    release: '0.1.0',
  });
  element('#connection').textContent = initialized
    ? 'SDK connected. Send a request below.'
    : 'Check your key and endpoint format.';
  if (initialized) element<HTMLInputElement>('#key').value = '';
});
document.querySelectorAll<HTMLButtonElement>('[data-request]').forEach((button) => {
  button.addEventListener('click', async () => {
    const request = button.dataset.request;
    const url =
      request === 'network'
        ? 'http://127.0.0.1:1/unreachable'
        : `/api/demo/${request}?private=not-collected#not-collected`;
    try {
      const response = await fetch(url);
      element('#result').textContent = `Request completed with HTTP ${response.status}.`;
    } catch {
      element('#result').textContent =
        'The request failed; a network-error event was captured if connected.';
    }
  });
});
element('#flush').addEventListener('click', () => {
  void DevPulse.flush();
});
const interval = setInterval(() => {
  const stats = DevPulse.getStats();
  element('#stats').textContent =
    `Queued: ${stats.queued} · Sent: ${stats.sent} · Dropped: ${stats.dropped}`;
}, 500);
if (import.meta.hot)
  import.meta.hot.dispose(() => {
    clearInterval(interval);
    DevPulse.close();
  });
