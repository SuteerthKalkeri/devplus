import { useEffect, useState } from 'react';
import { api } from '../api';

export interface TelemetryStatus {
  summary: { receivedEvents: number; lastReceivedAt: string | null };
  recentEvents: {
    eventId: string;
    receivedAt: string;
    environment: string;
    release: string | null;
    httpMethod: string;
    httpPath: string;
    httpStatus: number;
    outcome: string;
    durationMs: number;
  }[];
}

export function useTelemetry(projectId: string) {
  const [status, setStatus] = useState<TelemetryStatus | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const data = await api<TelemetryStatus>(`/projects/${projectId}/telemetry`, {
          signal: controller.signal,
        });
        if (!controller.signal.aborted) {
          setStatus(data);
          setError('');
        }
      } catch (failure) {
        if (!controller.signal.aborted)
          setError(failure instanceof Error ? failure.message : 'Could not load events.');
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(refresh, 5000);
      }
    }
    void refresh();
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [projectId]);
  return { status, error };
}
