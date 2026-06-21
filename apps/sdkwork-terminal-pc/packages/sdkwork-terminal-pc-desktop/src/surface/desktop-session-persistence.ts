import { invoke } from "@tauri-apps/api/core";
import {
  registerTerminalSessionPersistence,
  type TerminalSessionPersistenceAdapter,
  type TerminalSessionSnapshot,
} from "@sdkwork/terminal-pc-core/bootstrap";

function parseSnapshot(raw: string | null | undefined): TerminalSessionSnapshot | null {
  if (!raw?.trim()) {
    return null;
  }

  try {
    return JSON.parse(raw) as TerminalSessionSnapshot;
  } catch {
    return null;
  }
}

export function createDesktopSecureSessionPersistenceAdapter(): TerminalSessionPersistenceAdapter {
  return {
    kind: "desktop-secure-store",
    async load() {
      const raw = await invoke<string | null>("desktop_secure_session_read");
      return parseSnapshot(raw);
    },
    async save(snapshot) {
      await invoke("desktop_secure_session_write", {
        payload: JSON.stringify(snapshot),
      });
    },
    async clear() {
      await invoke("desktop_secure_session_clear");
    },
  };
}

export function registerDesktopSecureSessionPersistence(): void {
  registerTerminalSessionPersistence(createDesktopSecureSessionPersistenceAdapter());
}
