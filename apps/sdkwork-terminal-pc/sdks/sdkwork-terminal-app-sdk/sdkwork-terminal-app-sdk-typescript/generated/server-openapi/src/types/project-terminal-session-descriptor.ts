export interface ProjectTerminalSessionDescriptor {
  sessionId: string;
  workspaceId: string;
  target: string;
  state: string;
  createdAt: string;
  lastActiveAt: string;
  modeTags: string[];
  tags: string[];
  lastAckSequence: number;
  exitCode: number | null;
}
