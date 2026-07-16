export interface ProjectTerminalReplayEntry {
  sequence: number;
  kind: string;
  /** Replay data. Project runtime metadata excludes the resolved root. */
  payload: string;
  occurredAt: string;
}
