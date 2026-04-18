import {
  terminalHostStatusStyle,
  terminalRuntimeStatusActionButtonStyle,
  terminalRuntimeStatusActionRowStyle,
  terminalRuntimeStatusDetailStyle,
  terminalRuntimeStatusTitleStyle,
  terminalRuntimeStatusTitleWarningStyle,
} from "./terminal-stage-shared";

export interface TerminalHostStatusOverlayProps {
  title: string;
  detail: string;
  warning?: boolean;
  onRetry?: () => void;
}

export function TerminalHostStatusOverlay(props: TerminalHostStatusOverlayProps) {
  return (
    <div data-slot="terminal-host-status" style={terminalHostStatusStyle}>
      <div style={
        props.warning
          ? terminalRuntimeStatusTitleWarningStyle
          : terminalRuntimeStatusTitleStyle
      }>{props.title}</div>
      <div style={terminalRuntimeStatusDetailStyle}>{props.detail}</div>
      {props.onRetry ? (
        <div style={terminalRuntimeStatusActionRowStyle}>
          <button
            type="button"
            aria-label="Retry terminal surface"
            title="Retry terminal surface"
            onClick={props.onRetry}
            style={terminalRuntimeStatusActionButtonStyle}
          >
            Retry terminal surface
          </button>
        </div>
      ) : null}
    </div>
  );
}
