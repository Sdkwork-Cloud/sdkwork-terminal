export interface TerminalSessionSnapshot {
  accessToken?: string;
  authToken?: string;
  refreshToken?: string;
  sessionId?: string;
}

const STORAGE_KEY = 'sdkwork-terminal.iam.session';

function readRaw(): TerminalSessionSnapshot | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const legacyRaw = window.sessionStorage.getItem(STORAGE_KEY);
  const raw = window.localStorage.getItem(STORAGE_KEY) ?? legacyRaw;
  if (legacyRaw && !window.localStorage.getItem(STORAGE_KEY)) {
    window.localStorage.setItem(STORAGE_KEY, legacyRaw);
    window.sessionStorage.removeItem(STORAGE_KEY);
  }
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

export function commitTerminalSession(snapshot: TerminalSessionSnapshot): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  window.sessionStorage.removeItem(STORAGE_KEY);
}

export function clearTerminalSession(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(STORAGE_KEY);
  window.localStorage.removeItem(STORAGE_KEY);
}
