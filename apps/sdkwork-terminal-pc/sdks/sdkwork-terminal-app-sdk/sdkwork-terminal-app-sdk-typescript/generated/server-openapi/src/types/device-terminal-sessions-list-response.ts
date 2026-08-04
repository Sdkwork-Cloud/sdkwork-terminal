import type { ProjectTerminalSessionIndexSnapshot } from './project-terminal-session-index-snapshot';

export interface DeviceTerminalSessionsListResponse {
  code: 0;
  data: unknown & { item: ProjectTerminalSessionIndexSnapshot; };
  /** Server-owned request correlation id. */
  traceId: string;
}
