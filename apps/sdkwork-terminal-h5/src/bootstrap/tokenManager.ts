export interface TokenManager {
  getToken(): string | null;
  setToken(token: string): void;
  clearToken(): void;
}

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
