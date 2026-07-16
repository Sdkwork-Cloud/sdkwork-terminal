import type { ProjectTerminalSessionAttachmentDescriptor } from './project-terminal-session-attachment-descriptor';
import type { ProjectTerminalSessionDescriptor } from './project-terminal-session-descriptor';

export interface ProjectTerminalSessionIndexSnapshot {
  sessions: ProjectTerminalSessionDescriptor[];
  attachments: ProjectTerminalSessionAttachmentDescriptor[];
}
