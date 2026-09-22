export type RequestOutcome = 'HTTP_RESPONSE' | 'NETWORK_ERROR' | 'ABORTED';

export interface HttpEvent {
  eventId: string;
  type: 'HTTP_REQUEST';
  timestamp: string;
  environment: string;
  release?: string;
  http: {
    method: string;
    url: string;
    statusCode: number;
    durationMs: number;
    outcome: RequestOutcome;
  };
  page: { url: string };
}

export interface TrackedRequest {
  url: string;
  method?: string;
  statusCode: number;
  durationMs: number;
  outcome?: RequestOutcome;
}

export interface DevPulseOptions {
  apiKey: string;
  /** Full ingestion URL, e.g. http://127.0.0.1:8081/v1/ingest/events. */
  endpoint: string;
  environment?: string;
  release?: string;
  /** Return null to drop an event. Paths can contain personal data: redact those here. */
  beforeSend?: (event: HttpEvent) => HttpEvent | null;
}

export interface TransportStats {
  queued: number;
  sent: number;
  dropped: number;
}
