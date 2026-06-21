export interface TerminalSessionSnapshot {
  accessToken?: string;
  authToken?: string;
  refreshToken?: string;
  sessionId?: string;
}

export type TerminalSessionPersistenceKind =
  | 'web-session-storage'
  | 'desktop-secure-store';

export interface TerminalSessionPersistenceAdapter {
  readonly kind: TerminalSessionPersistenceKind;
  load(): Promise<TerminalSessionSnapshot | null>;
  save(snapshot: TerminalSessionSnapshot): Promise<void>;
  clear(): Promise<void>;
}

const STORAGE_KEY = 'sdkwork-terminal.iam.session';

function readWebSessionStorage(): TerminalSessionSnapshot | null {
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

function writeWebSessionStorage(snapshot: TerminalSessionSnapshot): void {
  if (typeof window === 'undefined') {
    return;
  }

  if (!snapshot.authToken && !snapshot.accessToken && !snapshot.refreshToken) {
    window.sessionStorage.removeItem(STORAGE_KEY);
    return;
  }

  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
}

function clearWebSessionStorage(): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.sessionStorage.removeItem(STORAGE_KEY);
}

const webSessionStorageAdapter: TerminalSessionPersistenceAdapter = {
  kind: 'web-session-storage',
  async load() {
    return readWebSessionStorage();
  },
  async save(snapshot) {
    writeWebSessionStorage(snapshot);
  },
  async clear() {
    clearWebSessionStorage();
  },
};

let activeAdapter: TerminalSessionPersistenceAdapter = webSessionStorageAdapter;

export function getTerminalSessionPersistenceKind(): TerminalSessionPersistenceKind {
  return activeAdapter.kind;
}

export function registerTerminalSessionPersistence(
  adapter: TerminalSessionPersistenceAdapter,
): void {
  activeAdapter = adapter;
}

export function createWebSessionStoragePersistenceAdapter(): TerminalSessionPersistenceAdapter {
  return webSessionStorageAdapter;
}

export async function loadPersistedTerminalSession(): Promise<TerminalSessionSnapshot | null> {
  return activeAdapter.load();
}

export async function persistTerminalSessionSnapshot(
  snapshot: TerminalSessionSnapshot,
): Promise<void> {
  await activeAdapter.save(snapshot);
  if (activeAdapter.kind === 'desktop-secure-store') {
    clearWebSessionStorage();
  }
}

export async function clearPersistedTerminalSession(): Promise<void> {
  await activeAdapter.clear();
  clearWebSessionStorage();
}

export function readLegacyWebSessionStorage(): TerminalSessionSnapshot | null {
  return readWebSessionStorage();
}

export function clearLegacyWebSessionStorage(): void {
  clearWebSessionStorage();
}
