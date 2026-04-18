import {
  terminalRuntimeStatusActionButtonStyle,
  terminalRuntimeStatusActionRowStyle,
  terminalRuntimeStatusDetailStyle,
  terminalRuntimeStatusPendingStyle,
  terminalRuntimeStatusStyle,
  terminalRuntimeStatusTitleStyle,
  terminalRuntimeStatusTitleWarningStyle,
} from "./terminal-stage-shared.ts";
import type {
  TerminalRuntimeOverlayStatusDescriptor,
} from "./terminal-runtime-status.ts";

export interface TerminalRuntimeStatusOverlayProps {
  status: TerminalRuntimeOverlayStatusDescriptor;
  onRestart?: () => void;
}

export function TerminalRuntimeStatusOverlay(
  props: TerminalRuntimeStatusOverlayProps,
) {
  return (
    <div data-slot="terminal-runtime-status" style={terminalRuntimeStatusStyle}>
      <div style={
        props.status.warning
          ? terminalRuntimeStatusTitleWarningStyle
          : terminalRuntimeStatusTitleStyle
      }>{props.status.title}</div>
      <div style={terminalRuntimeStatusDetailStyle}>{props.status.detail}</div>
      {props.status.pendingPreview ? (
        <div style={terminalRuntimeStatusPendingStyle}>
          {`Input queued: ${props.status.pendingPreview}`}
        </div>
      ) : null}
      {props.status.canRestart && props.onRestart ? (
        <div style={terminalRuntimeStatusActionRowStyle}>
          <button
            type="button"
            data-slot="terminal-runtime-restart"
            aria-label="Restart shell"
            title="Restart shell"
            onClick={props.onRestart}
            style={terminalRuntimeStatusActionButtonStyle}
          >
            Restart shell
          </button>
        </div>
      ) : null}
    </div>
  );
}
