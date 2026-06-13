import { type ReactNode } from 'react';
import type { TokenManager } from './bootstrap/iamRuntime';

interface AuthGateProps {
  children: ReactNode;
  tokenManager: TokenManager;
}

export function AuthGate({ children, tokenManager }: AuthGateProps) {
  const token = tokenManager.getToken();

  // If no token, redirect to login
  // Per IAM_LOGIN_INTEGRATION_SPEC.md, this should check authentication state
  if (!token) {
    // TODO: Implement proper login redirect
    // For now, just render children to allow development
  }

  return <>{children}</>;
}
