import { type ReactNode } from 'react';

interface AuthGateProps {
  children: ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  // TODO: Implement authentication gate
  // This should check authentication state and redirect to login if needed
  return <>{children}</>;
}
