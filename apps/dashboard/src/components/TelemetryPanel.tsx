import { Radio } from 'lucide-react';
import { RequestRow } from './RequestRow';
import { useTelemetry } from '../hooks/use-telemetry';
import { ErrorMessage } from './ErrorMessage';

export function TelemetryPanel({ projectId }: { projectId: string }) {
  const { status, error } = useTelemetry(projectId);
  return (
    <section className="telemetry-panel">
      <ErrorMessage message={error} />
      {!status ? (
        <p className="muted">Loading telemetry…</p>
      ) : status.summary.receivedEvents === 0 ? (
        <div className="telemetry-empty">
          <span className="signal-symbol">
            <Radio size={32} />
          </span>
          <span className="pill">WAITING FOR YOUR FIRST EVENT</span>
          <h2>Your first signal starts here.</h2>
          <p>
            Create an ingestion key below, then connect the browser SDK.
            <br />
            Your requests will appear here as they arrive.
          </p>
        </div>
      ) : (
        <>
          <div className="section-heading">
            <h2>Incoming requests</h2>
            <span className="pill">RECEIVING TELEMETRY</span>
          </div>
          <p className="section-description">
            <strong>{status.summary.receivedEvents.toLocaleString()} events retained</strong> · Last
            received {new Date(status.summary.lastReceivedAt!).toLocaleString()}. Refreshes every 5
            seconds; events expire after 14 days.
          </p>
          <div className="table-wrap">
            <table className="requests-table" aria-label="Incoming API requests">
              <thead>
                <tr>
                  <th>REQUEST</th>
                  <th>STATUS</th>
                  <th>DURATION</th>
                  <th>ENVIRONMENT</th>
                  <th>RECEIVED</th>
                </tr>
              </thead>
              <tbody>
                {status.recentEvents.map((event) => (
                  <RequestRow key={event.eventId} event={event} />
                ))}
              </tbody>
            </table>
          </div>
          <p className="section-description">
            Showing the latest 20 events. Aggregated metrics and filtering arrive in the next
            checkpoint.
          </p>
        </>
      )}
      <details className="sdk-instructions">
        <summary>Connect your application</summary>
        <p>
          Build the local SDK with <code>npm run pack:sdk</code> in DevPulse. In your app, install
          the generated package:
        </p>
        <pre>
          <code>npm install C:/Learning/DevPulse/.local/devpulse-browser-0.1.0.tgz</code>
        </pre>
        <p>
          Initialize once, before your application makes requests. Replace the placeholder with a
          newly generated key.
        </p>
        <pre>
          <code>{`import { DevPulse } from '@devpulse/browser';

DevPulse.init({
  apiKey: 'YOUR_INGESTION_KEY',
  endpoint: 'http://127.0.0.1:8081/v1/ingest/events',
  environment: 'development',
  release: '0.1.0',
});`}</code>
        </pre>
        <p>
          The SDK captures browser fetch requests. Axios applications can use the interceptor
          adapter documented in <code>docs/browser-sdk.md</code>. Browser keys permit ingestion only
          and are visible to visitors.
        </p>
        <p>
          For a quick check, run <code>npm run demo</code>, open <code>http://localhost:4174</code>,
          paste this project’s key, and send sample requests.
        </p>
      </details>
    </section>
  );
}
