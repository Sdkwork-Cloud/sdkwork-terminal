import React, { Suspense, useMemo } from 'react';

import { getIamRuntime } from './iamRuntime';
import {
  resolveTerminalAuthAppearance,
  resolveTerminalAuthLocale,
  resolveTerminalAuthRuntimeConfig,
} from './terminalAuthConfig';
import { TerminalAuthShell } from './components/TerminalAuthShell';

const SdkworkIamAuthRoutes = React.lazy(() =>
  import('@sdkwork/auth-pc-react').then((module) => ({ default: module.SdkworkIamAuthRoutes })),
);

function TerminalAuthRoutesFallback() {
  return (
    <div
      aria-label="Loading sign-in"
      style={{
        display: 'grid',
        placeItems: 'center',
        minHeight: '100vh',
        background: 'var(--sdkwork-terminal-auth-bg, #0b1220)',
        color: 'var(--sdkwork-terminal-auth-muted-text, #9fb0c7)',
      }}
    >
      Loading sign-in...
    </div>
  );
}

export function TerminalAuthRoutes() {
  const authRouteProps = useMemo(
    () => ({
      appearance: resolveTerminalAuthAppearance(),
      basePath: '/auth',
      getRuntime: () => getIamRuntime().runtime,
      homePath: '/',
      locale: resolveTerminalAuthLocale(),
      runtimeConfig: resolveTerminalAuthRuntimeConfig(),
      viewportMode: 'fixed' as const,
    }),
    [],
  );

  return (
    <TerminalAuthShell>
      <Suspense fallback={<TerminalAuthRoutesFallback />}>
        <SdkworkIamAuthRoutes {...(authRouteProps as any)} />
      </Suspense>
    </TerminalAuthShell>
  );
}
