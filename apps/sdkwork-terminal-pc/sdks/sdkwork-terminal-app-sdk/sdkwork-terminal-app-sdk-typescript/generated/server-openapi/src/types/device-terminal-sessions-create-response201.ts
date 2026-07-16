import type { ProjectTerminalSessionCreatePayload } from './project-terminal-session-create-payload';

export interface DeviceTerminalSessionsCreateResponse201 {
  code: 0;
  data: unknown & Record<string, unknown>;
  /** Server-owned request correlation id. */
  traceId: string;
}
