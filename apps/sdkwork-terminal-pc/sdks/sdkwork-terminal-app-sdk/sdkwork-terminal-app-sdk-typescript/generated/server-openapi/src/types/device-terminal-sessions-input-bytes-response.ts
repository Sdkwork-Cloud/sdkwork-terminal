import type { RuntimeNodeSessionInputSnapshot } from './runtime-node-session-input-snapshot';

export interface DeviceTerminalSessionsInputBytesResponse {
  code: 0;
  data: unknown & { item: RuntimeNodeSessionInputSnapshot; };
  /** Server-owned request correlation id. */
  traceId: string;
}
