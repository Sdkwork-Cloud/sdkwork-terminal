import { getRuntimeConfig } from './runtime';

export interface IamRuntime {
  baseUrl: string;
  tokenManager: TokenManager;
}

export interface TokenManager {
  getToken(): string | null;
  setToken(token: string): void;
  clearToken(): void;
}

let cachedTokenManager: TokenManager | null = null;
let cachedIamRuntime: IamRuntime | null = null;

export function createTokenManager(): TokenManager {
  let currentToken: string | null = null;

  return {
    getToken() {
      return currentToken;
    },
    setToken(token: string) {
      currentToken = token;
    },
    clearToken() {
      currentToken = null;
    },
  };
}

export function getTokenManager(): TokenManager {
  if (!cachedTokenManager) {
    cachedTokenManager = createTokenManager();
  }
  return cachedTokenManager;
}

export function createIamRuntime(): IamRuntime {
  const config = getRuntimeConfig();
  const tokenManager = getTokenManager();

  return {
    baseUrl: config.baseUrl,
    tokenManager,
  };
}

export function getIamRuntime(): IamRuntime {
  if (!cachedIamRuntime) {
    cachedIamRuntime = createIamRuntime();
  }
  return cachedIamRuntime;
}
