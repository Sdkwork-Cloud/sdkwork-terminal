import { type ComponentType, type ReactNode, useMemo } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { SdkworkSessionAuthBrowserRoot } from '@sdkwork/auth-pc-react';

import { TerminalAuthRoutes } from './TerminalAuthRoutes';
import './terminal-auth.css';
import { isTerminalIamEnforced, TerminalAuthGate } from './terminalAuthGate';
import { terminalSessionStore } from './terminalSessionStore';

interface AuthGateProps {
  children: React.ReactNode;
}

// The workspace can resolve React Router's peer types from a sibling package.
// Its runtime contract is compatible with React 18, so keep the boundary local.
const TerminalMemoryRouter = MemoryRouter as unknown as ComponentType<{
  children: ReactNode;
}>;

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
    <TerminalMemoryRouter>
      <SdkworkSessionAuthBrowserRoot>
        <AuthGate>
          <App />
        </AuthGate>
      </SdkworkSessionAuthBrowserRoot>
    </TerminalMemoryRouter>
  );
}

export { isTerminalIamEnforced };
