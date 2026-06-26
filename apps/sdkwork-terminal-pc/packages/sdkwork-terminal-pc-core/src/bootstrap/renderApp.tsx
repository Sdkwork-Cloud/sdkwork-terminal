import { type ComponentType, useMemo } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { SdkworkSessionAuthBrowserRoot } from '@sdkwork/auth-pc-react';

import { TerminalAuthRoutes } from './TerminalAuthRoutes';
import './terminal-auth.css';
import { isTerminalIamEnforced, TerminalAuthGate } from './terminalAuthGate';
import { terminalSessionStore } from './terminalSessionStore';

interface AuthGateProps {
  children: React.ReactNode;
}

export function AuthGate({ children }: AuthGateProps) {
  const authRoutes = useMemo(() => <TerminalAuthRoutes />, []);

  if (!isTerminalIamEnforced()) {
    return <>{children}</>;
  }

  return (
    <TerminalAuthGate authRoutes={authRoutes} session={terminalSessionStore}>
      {children}
    </TerminalAuthGate>
  );
}

export function renderTerminalApp(App: ComponentType) {
  return (
    <MemoryRouter>
      <SdkworkSessionAuthBrowserRoot>
        <AuthGate>
          <App />
        </AuthGate>
      </SdkworkSessionAuthBrowserRoot>
    </MemoryRouter>
  );
}

export { isTerminalIamEnforced };
