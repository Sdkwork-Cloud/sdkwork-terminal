import { type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';

import type { IamRuntime } from './bootstrap/iamRuntime';

interface AuthGateProps {
  children: ReactNode;
  tokenManager: IamRuntime['tokenManager'];
}

export function isIamRequired(): boolean {
  const flag = import.meta.env.VITE_SDKWORK_TERMINAL_IAM_REQUIRED?.trim().toLowerCase();
  if (flag === 'true' || flag === '1') {
    return true;
  }
  if (flag === 'false' || flag === '0') {
    return false;
  }
  return import.meta.env.PROD;
}

export function AuthGate({ children, tokenManager }: AuthGateProps) {
  if (!isIamRequired()) {
    return <>{children}</>;
  }

  if (!tokenManager.hasAuthToken() && !tokenManager.hasAccessToken()) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
