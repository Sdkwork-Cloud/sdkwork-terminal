import {
  clearTerminalSession,
  commitTerminalSession,
  getTerminalSessionSnapshot,
  subscribeTerminalSession,
  type TerminalSessionSnapshot,
} from './session';

export type TerminalAuthSessionSnapshot = TerminalSessionSnapshot;

export interface TerminalSessionStore {
  clearSession(): void;
  getSnapshot(): TerminalAuthSessionSnapshot;
  refreshSession(): TerminalAuthSessionSnapshot;
  setSession(nextSession: TerminalAuthSessionSnapshot): void;
  subscribe(listener: (snapshot: TerminalAuthSessionSnapshot) => void): () => void;
}

export const terminalSessionStore: TerminalSessionStore = {
  getSnapshot() {
    return getTerminalSessionSnapshot();
  },
  refreshSession() {
    return getTerminalSessionSnapshot();
  },
  setSession(nextSession) {
    commitTerminalSession(nextSession);
  },
  clearSession() {
    clearTerminalSession();
  },
  subscribe(listener) {
    return subscribeTerminalSession(() => {
      listener(getTerminalSessionSnapshot());
    });
  },
};
