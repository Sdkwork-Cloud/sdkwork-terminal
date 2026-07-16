import type { ProjectTerminalSessionReplaySnapshot } from './project-terminal-session-replay-snapshot';

export interface DeviceTerminalSessionsReplayListResponse {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
