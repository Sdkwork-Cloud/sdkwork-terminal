import type { TerminalHostLifecycleState } from "./terminal-host-lifecycle.ts";

export interface CreateTerminalHostStatusDescriptorArgs {
  lifecycleState: TerminalHostLifecycleState;
  hostLifecycleError: string | null;
  hostViewportMeasured: boolean;
  readyDetail: string;
}

export interface TerminalHostStatusDescriptor {
  show: boolean;
  title: string;
  detail: string;
  warning: boolean;
}

export interface CreateTerminalHostStatusViewModelArgs {
  descriptor: TerminalHostStatusDescriptor;
  onRetry?: () => void;
}

export interface TerminalHostStatusViewModel {
  title: string;
  detail: string;
  warning?: boolean;
  onRetry?: () => void;
}

export function createTerminalHostStatusDescriptor(
  args: CreateTerminalHostStatusDescriptorArgs,
): TerminalHostStatusDescriptor {
  const show =
    args.lifecycleState === "attaching" ||
    args.lifecycleState === "failed" ||
    !args.hostViewportMeasured;
  const warning = args.lifecycleState === "failed";
  const title =
    args.lifecycleState === "failed"
      ? "Terminal surface failed"
      : !args.hostViewportMeasured
        ? "Waiting for terminal layout"
        : "Initializing terminal surface";
  const detail =
    args.lifecycleState === "failed"
      ? args.hostLifecycleError ?? "The xterm host failed to attach. Retry terminal surface to continue."
      : !args.hostViewportMeasured
        ? "Terminal surface attached. Waiting for a measurable viewport before clearing startup status."
        : args.readyDetail;

  return {
    show,
    title,
    detail,
    warning,
  };
}

export function createTerminalHostStatusViewModel(
  args: CreateTerminalHostStatusViewModelArgs,
): TerminalHostStatusViewModel | null {
  if (!args.descriptor.show) {
    return null;
  }

  return {
    title: args.descriptor.title,
    detail: args.descriptor.detail,
    warning: args.descriptor.warning,
    onRetry: args.descriptor.warning ? args.onRetry : undefined,
  };
}
