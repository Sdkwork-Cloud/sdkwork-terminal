const SESSION_STORAGE_KEY = 'sdkwork-terminal.iam.session';

export interface PcReactRuntimeSession {
  accessToken?: string;
  authToken?: string;
  refreshToken?: string;
}

function normalizeToken(value: unknown): string | undefined {
  const normalized = typeof value === 'string' ? value.trim() : '';
  return normalized.replace(/^Bearer\s+/i, '') || undefined;
}

function readStoredSession(): PcReactRuntimeSession {
  if (typeof window === 'undefined') {
    return {};
  }

  try {
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as PcReactRuntimeSession;
    return {
      accessToken: normalizeToken(parsed.accessToken),
      authToken: normalizeToken(parsed.authToken),
      refreshToken: normalizeToken(parsed.refreshToken),
    };
  } catch {
    return {};
  }
}

export function readPcReactRuntimeSession(): PcReactRuntimeSession {
  return readStoredSession();
}

export function persistPcReactRuntimeSession(
  tokens: PcReactRuntimeSession,
): PcReactRuntimeSession {
  const current = readStoredSession();
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

  if (typeof window !== 'undefined') {
    if (!next.accessToken && !next.authToken && !next.refreshToken) {
      window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } else {
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(next));
    }
  }

  return next;
}

export function clearPcReactRuntimeSession(): void {
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(SESSION_STORAGE_KEY);
  }
}

export function resolveAppClientAccessToken(): string {
  return normalizeToken(readStoredSession().accessToken) ?? '';
}

export function getAppClientWithSession(): never {
  throw new Error(
    'SDKWork Terminal does not expose a generic app client. Use getIamRuntime() instead.',
  );
}
