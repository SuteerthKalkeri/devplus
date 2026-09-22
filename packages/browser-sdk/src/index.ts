import { createDevPulse } from './client.js';

export const DevPulse = createDevPulse();
export { createDevPulse };
export type {
  DevPulseOptions,
  HttpEvent,
  TrackedRequest,
  RequestOutcome,
  TransportStats,
} from './types.js';
