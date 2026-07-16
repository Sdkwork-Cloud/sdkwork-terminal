import type { ProjectTerminalReplayEntry } from './project-terminal-replay-entry';

export interface ProjectTerminalSessionReplaySnapshot {
  sessionId: string;
  fromCursor?: string | null;
  nextCursor: string;
  hasMore: boolean;
  entries: ProjectTerminalReplayEntry[];
}
