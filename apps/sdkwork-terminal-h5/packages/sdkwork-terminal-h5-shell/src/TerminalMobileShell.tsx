import "./terminal-mobile-shell.css";

export interface TerminalMobileShellProps {
  environmentLabel: string;
  hostingLabel?: string;
  onSignOut?: () => void;
}

export function TerminalMobileShell({
  environmentLabel,
  hostingLabel = "H5",
  onSignOut,
}: TerminalMobileShellProps) {
  return (
    <div className="terminal-mobile-shell">
      <header className="terminal-mobile-shell__header">
        <h1 className="terminal-mobile-shell__title">SDKWork Terminal</h1>
        <p className="terminal-mobile-shell__subtitle">
          Phone-first mobile companion shell
        </p>
      </header>

      <main className="terminal-mobile-shell__main">
        <section className="terminal-mobile-shell__card" aria-labelledby="sessions-heading">
          <h2 id="sessions-heading">Sessions</h2>
          <p>
            No active mobile sessions yet. Full interactive terminal sessions are
            available on the desktop host and browser web shell. This H5 surface
            keeps IAM, topology, and session storage aligned with the PC client.
          </p>
          <dl className="terminal-mobile-shell__meta">
            <div>
              <dt>Runtime</dt>
              <dd>{hostingLabel}</dd>
            </div>
            <div>
              <dt>Environment</dt>
              <dd>{environmentLabel}</dd>
            </div>
          </dl>
        </section>

        <section className="terminal-mobile-shell__card" aria-labelledby="next-steps-heading">
          <h2 id="next-steps-heading">Next steps</h2>
          <p>
            Open the desktop or web terminal to launch local shell, connector, or
            remote-runtime sessions. Mobile session streaming will attach here once
            Step 08 mobile execution surfaces are complete.
          </p>
          <div className="terminal-mobile-shell__actions">
            {onSignOut ? (
              <button
                type="button"
                className="terminal-mobile-shell__button"
                onClick={onSignOut}
              >
                Sign out
              </button>
            ) : null}
          </div>
        </section>
      </main>
    </div>
  );
}
