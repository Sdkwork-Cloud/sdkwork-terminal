import type { ProjectTerminalReplayEntry } from './project-terminal-replay-entry';

export interface ProjectTerminalSessionCreatePayload {
  sessionId: string;
  projectId: string;
  runtimeLocationId: string;
  target: 'server-runtime-node';
  state: string;
  createdAt: string;
  lastActiveAt: string;
  modeTags: string[];
  tags: string[];
  attachmentId: string;
  cursor: string;
  lastAckSequence: number;
  writable: boolean;
  invokedProgram: string;
  invokedArgs: string[];
  replayEntry: ProjectTerminalReplayEntry;
}
