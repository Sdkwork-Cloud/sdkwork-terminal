import React, { useEffect, useState, type ReactNode } from 'react';

type AuthThemeMode = 'dark' | 'light';

function isDesktopRuntime(): boolean {
  return typeof window !== 'undefined' && !!(globalThis as Record<string, unknown>).__TAURI__;
}

export function TerminalAuthShell({ children }: { children: ReactNode }) {
  const [themeMode, setThemeMode] = useState<AuthThemeMode>(() => {
    if (typeof window === 'undefined') {
      return 'dark';
    }
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  });

  const isLightMode = themeMode === 'light';
  const shouldRenderDesktopHeader = isDesktopRuntime();

  useEffect(() => {
    document.documentElement.classList.toggle('light-mode', isLightMode);
    document.documentElement.style.colorScheme = themeMode;
  }, [themeMode, isLightMode]);

  const toggleTheme = () => {
    setThemeMode((current) => (current === 'light' ? 'dark' : 'light'));
  };

  const handleMinimize = () => {
    window.dispatchEvent(
      new CustomEvent('sdkwork-terminal:window-control', { detail: { action: 'minimize' } }),
    );
  };

  const handleToggleMaximize = () => {
    window.dispatchEvent(
      new CustomEvent('sdkwork-terminal:window-control', { detail: { action: 'toggleMaximize' } }),
    );
  };

  const handleClose = () => {
    window.dispatchEvent(
      new CustomEvent('sdkwork-terminal:window-control', { detail: { action: 'close' } }),
    );
  };

  return (
    <div className="sdkwork-terminal-auth-shell">
      {shouldRenderDesktopHeader ? (
        <header className="sdkwork-terminal-auth-header drag-region">
          <div className="sdkwork-terminal-auth-header-brand">
            <span className="sdkwork-terminal-auth-header-mark">T</span>
            <span>SDKWork Terminal</span>
          </div>
          <div className="sdkwork-terminal-auth-header-center" />
          <div className="sdkwork-terminal-auth-header-actions no-drag">
            <button
              aria-label={isLightMode ? 'Switch to dark mode' : 'Switch to light mode'}
              className="sdkwork-terminal-auth-theme-button"
              onClick={toggleTheme}
              title={isLightMode ? 'Switch to dark mode' : 'Switch to light mode'}
              type="button"
            >
              {isLightMode ? 'Dark' : 'Light'}
            </button>
            <div className="sdkwork-terminal-auth-window-controls">
              <button
                aria-label="Minimize window"
                className="sdkwork-terminal-auth-window-button"
                onClick={handleMinimize}
                title="Minimize"
                type="button"
              >
                −
              </button>
              <button
                aria-label="Maximize window"
                className="sdkwork-terminal-auth-window-button"
                onClick={handleToggleMaximize}
                title="Maximize"
                type="button"
              >
                □
              </button>
              <button
                aria-label="Close window"
                className="sdkwork-terminal-auth-window-button sdkwork-terminal-auth-window-button-danger"
                onClick={handleClose}
                title="Close"
                type="button"
              >
                ×
              </button>
            </div>
          </div>
        </header>
      ) : null}
      <main className="sdkwork-terminal-auth-main">{children}</main>
    </div>
  );
}
