export interface TerminalSessionSnapshot {
  accessToken?: string;
  authToken?: string;
  refreshToken?: string;
  sessionId?: string;
}

const STORAGE_KEY = 'sdkwork-terminal.iam.session';
const listeners = new Set<() => void>();

function emitSessionChange() {
  for (const listener of listeners) {
    listener();
  }
}

function readRaw(): TerminalSessionSnapshot | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as TerminalSessionSnapshot;
  } catch {
    return null;
  }
}

export function readTerminalSession(): TerminalSessionSnapshot | null {
  const snapshot = readRaw();
  if (!snapshot?.authToken && !snapshot?.accessToken) {
    return null;
  }
  return snapshot;
}

export function getTerminalSessionSnapshot(): TerminalSessionSnapshot {
  return readRaw() ?? {};
}

export function hasTerminalIamSession(snapshot: TerminalSessionSnapshot | null | undefined): boolean {
  return Boolean(snapshot?.authToken && snapshot?.accessToken);
}

export function commitTerminalSession(snapshot: TerminalSessionSnapshot): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  emitSessionChange();
}

export function clearTerminalSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(STORAGE_KEY);
  emitSessionChange();
}

export function refreshTerminalSession(): TerminalSessionSnapshot {
  return getTerminalSessionSnapshot();
}

export function subscribeTerminalSession(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
