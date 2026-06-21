import {
  clearPersistedTerminalSession,
  loadPersistedTerminalSession,
  persistTerminalSessionSnapshot,
  readLegacyWebSessionStorage,
  type TerminalSessionSnapshot,
} from './session-persistence';

export type { TerminalSessionSnapshot } from './session-persistence';

const listeners = new Set<() => void>();
let hydrated = false;
let memorySession: TerminalSessionSnapshot | null = null;

function emitSessionChange() {
  for (const listener of listeners) {
    listener();
  }
}

function normalizeSnapshot(
  snapshot: TerminalSessionSnapshot | null | undefined,
): TerminalSessionSnapshot | null {
  if (!snapshot) {
    return null;
  }

  if (!snapshot.authToken && !snapshot.accessToken && !snapshot.refreshToken) {
    return null;
  }

  return snapshot;
}

function readRaw(): TerminalSessionSnapshot | null {
  if (hydrated) {
    return memorySession;
  }

  return readLegacyWebSessionStorage();
}

export async function hydrateTerminalSessionFromPersistence(): Promise<void> {
  if (hydrated) {
    return;
  }

  const persisted = normalizeSnapshot(await loadPersistedTerminalSession());
  if (persisted) {
    memorySession = persisted;
    hydrated = true;
    return;
  }

  const legacyWebSnapshot = normalizeSnapshot(readLegacyWebSessionStorage());
  memorySession = legacyWebSnapshot;
  hydrated = true;

  if (legacyWebSnapshot) {
    await persistTerminalSessionSnapshot(legacyWebSnapshot);
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
  const normalized = normalizeSnapshot(snapshot);
  memorySession = normalized;
  hydrated = true;

  void persistTerminalSessionSnapshot(snapshot).catch((error) => {
    console.error(
      '[terminal:session] Failed to persist IAM session snapshot:',
      error instanceof Error ? error.message : String(error),
    );
  });

  emitSessionChange();
}

export function clearTerminalSession(): void {
  memorySession = null;
  hydrated = true;

  void clearPersistedTerminalSession().catch((error) => {
    console.error(
      '[terminal:session] Failed to clear IAM session snapshot:',
      error instanceof Error ? error.message : String(error),
    );
  });

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
