import {
  clearTerminalSession,
  commitTerminalSession,
  getTerminalSessionSnapshot,
  type TerminalSessionSnapshot,
} from './session';

export interface PcReactRuntimeSession {
  accessToken?: string;
  authToken?: string;
  refreshToken?: string;
}

function normalizeToken(value: unknown): string | undefined {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized.replace(/^Bearer\s+/i, '') || undefined;
}

function toPcReactRuntimeSession(
  snapshot: TerminalSessionSnapshot,
): PcReactRuntimeSession {
  return {
    accessToken: normalizeToken(snapshot.accessToken),
    authToken: normalizeToken(snapshot.authToken),
    refreshToken: normalizeToken(snapshot.refreshToken),
  };
}

export function readPcReactRuntimeSession(): PcReactRuntimeSession {
  return toPcReactRuntimeSession(getTerminalSessionSnapshot());
}

export function persistPcReactRuntimeSession(
  tokens: PcReactRuntimeSession,
): PcReactRuntimeSession {
  const current = getTerminalSessionSnapshot();
  const next = {
    accessToken:
      tokens.accessToken !== undefined
        ? normalizeToken(tokens.accessToken)
        : current.accessToken,
    authToken:
      tokens.authToken !== undefined ? normalizeToken(tokens.authToken) : current.authToken,
    refreshToken:
      tokens.refreshToken !== undefined
        ? normalizeToken(tokens.refreshToken)
        : current.refreshToken,
  };

  commitTerminalSession(next);
  return toPcReactRuntimeSession(next);
}

export function clearPcReactRuntimeSession(): void {
  clearTerminalSession();
}

export function resolveAppClientAccessToken(): string {
  return normalizeToken(getTerminalSessionSnapshot().accessToken) ?? '';
}

export function getAppClientWithSession(): never {
  throw new Error(
    'SDKWork Terminal does not expose a generic app client. Use getIamRuntime() instead.',
  );
}
