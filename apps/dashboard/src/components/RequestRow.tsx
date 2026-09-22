import type { TelemetryStatus } from '../hooks/use-telemetry';

type RequestEvent = TelemetryStatus['recentEvents'][number];

function requestAppearance(event: RequestEvent) {
  if (event.outcome === 'ABORTED') return { tone: 'neutral', label: 'Aborted' };
  if (!event.httpStatus) return { tone: 'error', label: 'Network error' };
  if (event.httpStatus >= 500) return { tone: 'error', label: 'Server error' };
  if (event.httpStatus >= 400) return { tone: 'warning', label: 'Client error' };
  if (event.httpStatus >= 300) return { tone: 'redirect', label: 'Redirect' };
  if (event.httpStatus >= 200) return { tone: 'success', label: 'Success' };
  return { tone: 'neutral', label: 'Informational' };
}

export function RequestRow({ event }: { event: RequestEvent }) {
  const { tone, label } = requestAppearance(event);
  return (
    <tr className={`request-row request-${tone}`}>
      <td>
        <code>
          <span className="request-method">{event.httpMethod}</span> {event.httpPath}
        </code>
      </td>
      <td>
        <span className="request-status">
          <span className="request-status-dot" aria-hidden="true" />
          {event.httpStatus || label}
        </span>
        {event.httpStatus > 0 && <span className="request-outcome">{label}</span>}
      </td>
      <td className="request-duration">{event.durationMs.toFixed(1)} ms</td>
      <td>
        <span className="request-environment">{event.environment}</span>
      </td>
      <td>
        <time dateTime={event.receivedAt}>{new Date(event.receivedAt).toLocaleTimeString()}</time>
      </td>
    </tr>
  );
}
