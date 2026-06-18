import React, { useEffect, useMemo, useState } from 'react';

import { bootstrapTerminalIamSession } from './iamRuntime';
import {
  hasTerminalIamSession,
  type TerminalSessionSnapshot,
} from './session';
import type { TerminalSessionStore } from './terminalSessionStore';

export interface TerminalAuthLocationLike {
  hash?: string;
  pathname: string;
  search?: string;
}

export type TerminalAuthGateDecision =
  | { kind: 'auth-route' }
  | { kind: 'product-route' }
  | { kind: 'redirect'; replace: true; to: string };

export interface TerminalAuthGateProps {
  authRoutes?: React.ReactNode;
  children: React.ReactNode;
  homePath?: string;
  location?: TerminalAuthLocationLike;
  navigate?: (to: string, options: { replace: true }) => void;
  session: TerminalSessionStore;
}

const DEFAULT_HOME_PATH = '/';
const AUTH_BASE_PATH = '/auth';
const AUTH_LOGIN_PATH = '/auth/login';

export function isTerminalIamEnforced(): boolean {
  const flag = import.meta.env.VITE_SDKWORK_TERMINAL_IAM_REQUIRED?.trim().toLowerCase();
  if (flag === 'true' || flag === '1') {
    return true;
  }
  if (flag === 'false' || flag === '0') {
    return false;
  }
  return import.meta.env.PROD;
}

export function buildTerminalAuthLoginRedirect(location: TerminalAuthLocationLike): string {
  const returnPath = `${normalizeTerminalPathname(location.pathname)}${location.search ?? ''}${
    location.hash ?? ''
  }`;
  return `${AUTH_LOGIN_PATH}?redirect=${encodeURIComponent(returnPath)}`;
}

export function sanitizeTerminalAuthRedirect(value: string | null | undefined): string {
  if (!value) {
    return DEFAULT_HOME_PATH;
  }

  let decoded = value;
  try {
    decoded = decodeURIComponent(value);
  } catch {
    return DEFAULT_HOME_PATH;
  }

  if (!decoded.startsWith('/') || decoded.startsWith('//')) {
    return DEFAULT_HOME_PATH;
  }

  const redirectUrl = new URL(decoded, 'http://sdkwork-terminal.local');
  if (isTerminalAuthRoute(redirectUrl.pathname)) {
    return DEFAULT_HOME_PATH;
  }

  return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`;
}

export function resolveTerminalAuthGateDecision({
  hasSession,
  homePath = DEFAULT_HOME_PATH,
  location,
}: {
  hasSession: boolean;
  homePath?: string;
  location: TerminalAuthLocationLike;
}): TerminalAuthGateDecision {
  const pathname = normalizeTerminalPathname(location.pathname);
  if (isTerminalAuthRoute(pathname)) {
    if (!hasSession) {
      return { kind: 'auth-route' };
    }

    const redirect = new URLSearchParams((location.search ?? '').replace(/^\?/, '')).get(
      'redirect',
    );
    return {
      kind: 'redirect',
      replace: true,
      to: sanitizeTerminalAuthRedirect(redirect) || normalizeTerminalPathname(homePath),
    };
  }

  if (!hasSession) {
    return {
      kind: 'redirect',
      replace: true,
      to: buildTerminalAuthLoginRedirect(location),
    };
  }

  return { kind: 'product-route' };
}

export function TerminalAuthGate({
  authRoutes,
  children,
  homePath = DEFAULT_HOME_PATH,
  location,
  navigate,
  session,
}: TerminalAuthGateProps) {
  const [bootstrapping, setBootstrapping] = useState(true);
  const [snapshot, setSnapshot] = useState<TerminalSessionSnapshot>(() => session.getSnapshot());
  const currentLocation = useBrowserLocation(location);

  useEffect(() => {
    let cancelled = false;
    void bootstrapTerminalIamSession().then(() => {
      if (!cancelled) {
        setBootstrapping(false);
        setSnapshot(session.refreshSession());
      }
    });

    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    setSnapshot(session.refreshSession());
    return session.subscribe(setSnapshot);
  }, [session, currentLocation.pathname, currentLocation.search, currentLocation.hash]);

  const decision = useMemo(
    () =>
      resolveTerminalAuthGateDecision({
        hasSession: hasTerminalIamSession(snapshot),
        homePath,
        location: currentLocation,
      }),
    [currentLocation, homePath, snapshot],
  );

  useEffect(() => {
    if (decision.kind !== 'redirect') {
      return;
    }
    if (navigate) {
      navigate(decision.to, { replace: true });
      return;
    }
    if (typeof window !== 'undefined') {
      window.location.replace(decision.to);
    }
  }, [decision, navigate]);

  if (bootstrapping) {
    return React.createElement(
      'main',
      {
        style: {
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#0b1220',
          color: '#9fb0c7',
          fontFamily: 'system-ui, sans-serif',
        },
      },
      'Validating session...',
    );
  }

  if (decision.kind === 'redirect') {
    return null;
  }

  if (decision.kind === 'auth-route') {
    return React.createElement(React.Fragment, null, authRoutes);
  }

  return React.createElement(React.Fragment, null, children);
}

function isTerminalAuthRoute(pathname: string): boolean {
  return pathname === AUTH_BASE_PATH || pathname.startsWith(`${AUTH_BASE_PATH}/`);
}

function normalizeTerminalPathname(pathname: string): string {
  const normalized = pathname.trim();
  if (!normalized) {
    return DEFAULT_HOME_PATH;
  }
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function useBrowserLocation(
  location: TerminalAuthLocationLike | undefined,
): TerminalAuthLocationLike {
  const [browserLocation, setBrowserLocation] = useState<TerminalAuthLocationLike>(() =>
    location ?? readBrowserLocation(),
  );

  useEffect(() => {
    if (location) {
      setBrowserLocation(location);
      return undefined;
    }
    if (typeof window === 'undefined') {
      return undefined;
    }

    const update = () => setBrowserLocation(readBrowserLocation());
    window.addEventListener('popstate', update);
    window.addEventListener('hashchange', update);
    return () => {
      window.removeEventListener('popstate', update);
      window.removeEventListener('hashchange', update);
    };
  }, [location]);

  return browserLocation;
}

function readBrowserLocation(): TerminalAuthLocationLike {
  if (typeof window === 'undefined') {
    return { pathname: DEFAULT_HOME_PATH, search: '', hash: '' };
  }
  return {
    pathname: window.location.pathname,
    search: window.location.search,
    hash: window.location.hash,
  };
}
