import type { RuntimeNodeSessionResizeSnapshot } from './runtime-node-session-resize-snapshot';

export interface DeviceTerminalSessionsResizeResponse {
  code: 0;
  data: unknown & { item: RuntimeNodeSessionResizeSnapshot; };
  /** Server-owned request correlation id. */
  traceId: string;
}
