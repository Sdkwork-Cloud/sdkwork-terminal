export interface CreateProjectTerminalSessionRequest {
  projectId: string;
  runtimeLocationId: string;
  command: string[];
  cols?: number;
  rows?: number;
  modeTags?: string[];
  tags?: string[];
}
