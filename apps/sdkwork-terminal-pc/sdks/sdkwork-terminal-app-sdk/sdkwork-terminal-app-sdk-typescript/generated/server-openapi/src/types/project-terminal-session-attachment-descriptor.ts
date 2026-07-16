export interface ProjectTerminalSessionAttachmentDescriptor {
  attachmentId: string;
  sessionId: string;
  cursor: string;
  lastAckSequence: number;
  writable: boolean;
}
