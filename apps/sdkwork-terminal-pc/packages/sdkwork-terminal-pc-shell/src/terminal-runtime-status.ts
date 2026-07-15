import {
  describePendingRuntimeInput,
  previewRuntimePendingInput,
  type TerminalStageTab,
} from "./terminal-stage-shared.ts";

const DEFAULT_RUNTIME_BOOTSTRAP_AUTO_RETRY_LIMIT = 1;

export type TerminalRuntimeStatusTab = Pick<
  TerminalStageTab,
  | "title"
  | "targetLabel"
  | "runtimeState"
  | "runtimeBootstrapAttempts"
  | "runtimeBootstrapLastError"
  | "runtimePendingInput"
  | "runtimePendingInputQueue"
  | "lastExitCode"
  | "runtimeConnectionState"
>;

export interface TerminalBootstrapStatusDescriptor {
  title: string;
  detail: string;
}

export interface TerminalRuntimeOverlayStatusDescriptor {
  title: string;
  detail: string;
  pendingPreview: string | null;
  warning: boolean;
  canRestart: boolean;
}

export interface TerminalRuntimeStatusViewModel {
  bootstrap: TerminalBootstrapStatusDescriptor;
  runtime: TerminalRuntimeOverlayStatusDescriptor | null;
}

export interface CreateTerminalRuntimeStatusViewModelArgs {
  tab: TerminalRuntimeStatusTab;
  showBootstrapOverlay: boolean;
  autoRetryLimit?: number;
}

function ensureTerminalSentence(text: string) {
  return /[.!?]$/.test(text) ? text : `${text}.`;
}

function formatRuntimeFailureDetail(args: {
  message: string | null;
  exhausted: boolean;
}) {
  const restartHint = "Restart shell to try again.";
  if (args.exhausted) {
    if (args.message) {
      return `${ensureTerminalSentence(`Automatic retry was exhausted: ${args.message}`)} ${restartHint}`;
    }
    return `Automatic retry was exhausted. ${restartHint}`;
  }

  if (args.message) {
    return `${ensureTerminalSentence(args.message)} ${restartHint}`;
  }

  return `Session failed to start. ${restartHint}`;
}

export function createTerminalRuntimeStatusViewModel(
  args: CreateTerminalRuntimeStatusViewModelArgs,
): TerminalRuntimeStatusViewModel {
  const autoRetryLimit =
    args.autoRetryLimit ?? DEFAULT_RUNTIME_BOOTSTRAP_AUTO_RETRY_LIMIT;
  const hasPendingInput =
    args.tab.runtimePendingInput.length > 0 ||
    args.tab.runtimePendingInputQueue.length > 0;
  const runtimeStatusIsRetrying =
    args.tab.runtimeState === "retrying" ||
    (args.tab.runtimeState === "binding" &&
      args.tab.runtimeBootstrapAttempts > 1);
  const runtimeAutoRetryExhausted =
    args.tab.runtimeState === "failed" &&
    args.tab.runtimeBootstrapAttempts > autoRetryLimit;
  const runtimeOutputIsReconnecting =
    args.tab.runtimeConnectionState === "reconnecting";
  const runtimeOutputIsDegraded =
    args.tab.runtimeConnectionState === "degraded";
  const showRuntimeStatus =
    args.tab.runtimeState === "retrying" ||
    args.tab.runtimeState === "exited" ||
    args.tab.runtimeState === "failed" ||
    runtimeOutputIsReconnecting ||
    runtimeOutputIsDegraded ||
    ((!args.showBootstrapOverlay) &&
      (args.tab.runtimeState === "binding" || hasPendingInput));
  const runtimeTitle =
    args.tab.runtimeState === "exited" ? "Shell exited" :
    args.tab.runtimeState === "failed" ? "Shell failed" :
    runtimeOutputIsReconnecting ? "Reconnecting output" :
    runtimeOutputIsDegraded ? "Output connection degraded" :
    runtimeStatusIsRetrying ? "Retrying shell" :
    (args.tab.runtimeState === "binding" || args.showBootstrapOverlay) ? "Starting shell" :
    "Input queued";
  const runtimeDetail =
    args.tab.runtimeState === "exited"
      ? `Process exited${args.tab.lastExitCode != null ? ` with code ${args.tab.lastExitCode}` : ""}. Close this tab or open a new one.`
      : args.tab.runtimeState === "failed"
        ? formatRuntimeFailureDetail({
            message: args.tab.runtimeBootstrapLastError,
            exhausted: runtimeAutoRetryExhausted,
          })
        : runtimeOutputIsReconnecting
          ? "The session stays active while live output reconnects."
          : runtimeOutputIsDegraded
            ? "Replay continues repairing output while the live stream reconnects."
            : runtimeStatusIsRetrying
      ? args.tab.runtimeBootstrapLastError
        ? `Previous launch failed: ${args.tab.runtimeBootstrapLastError}. Retrying automatically.`
        : "Previous launch failed. Retrying automatically."
      : args.tab.runtimeState === "binding"
        ? `${args.tab.title} attached to ${args.tab.targetLabel}`
        : `${describePendingRuntimeInput(
            args.tab.runtimePendingInputQueue,
            args.tab.runtimePendingInput,
          )} waiting for PTY write`;

  return {
    bootstrap: {
      title:
        runtimeOutputIsReconnecting ? "Reconnecting output" :
        runtimeOutputIsDegraded ? "Output connection degraded" :
        runtimeStatusIsRetrying ? "Retrying shell" :
        (args.tab.runtimeState === "binding" || args.showBootstrapOverlay) ? "Starting shell" :
        "Preparing shell",
      detail:
        runtimeOutputIsReconnecting || runtimeOutputIsDegraded || runtimeStatusIsRetrying
        ? runtimeDetail
        : `${args.tab.title} attached to ${args.tab.targetLabel}`,
    },
    runtime: showRuntimeStatus
      ? {
          title: runtimeTitle,
          detail: runtimeDetail,
          pendingPreview: hasPendingInput
            ? previewRuntimePendingInput(
                args.tab.runtimePendingInputQueue,
                args.tab.runtimePendingInput,
              )
            : null,
          warning:
            args.tab.runtimeState === "exited" ||
            args.tab.runtimeState === "failed",
          canRestart:
            args.tab.runtimeState === "exited" ||
            args.tab.runtimeState === "failed",
        }
      : null,
  };
}

