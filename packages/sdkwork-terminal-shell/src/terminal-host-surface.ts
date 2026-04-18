import {
  createTerminalHostStatusDescriptor,
  createTerminalHostStatusViewModel,
  type TerminalHostStatusViewModel,
} from "./terminal-host-status.ts";
import {
  useTerminalHostLifecycle,
  type UseTerminalHostLifecycleArgs,
} from "./terminal-host-lifecycle.ts";

export interface UseTerminalHostSurfaceArgs extends UseTerminalHostLifecycleArgs {
  readyDetail: string;
}

export function useTerminalHostSurface(
  args: UseTerminalHostSurfaceArgs,
): {
  hostStatus: TerminalHostStatusViewModel | null;
  triggerViewportMeasurement: () => Promise<boolean>;
} {
  const {
    hostLifecycleError,
    hostLifecycleState,
    hostViewportMeasured,
    retryAttachViewport,
    triggerViewportMeasurement,
  } = useTerminalHostLifecycle({
    active: args.active,
    activateKey: args.activateKey,
    lifecycleKey: args.lifecycleKey,
    hostRef: args.hostRef,
    viewport: args.viewport,
    onViewportResize: args.onViewportResize,
    measureViewport: args.measureViewport,
    attachHost: args.attachHost,
    disposeHost: args.disposeHost,
    focusViewport: args.focusViewport,
    onAttachFailure: args.onAttachFailure,
  });
  const hostStatusDescriptor = createTerminalHostStatusDescriptor({
    lifecycleState: hostLifecycleState,
    hostLifecycleError,
    hostViewportMeasured,
    readyDetail: args.readyDetail,
  });
  const hostStatus = createTerminalHostStatusViewModel({
    descriptor: hostStatusDescriptor,
    onRetry: () => {
      retryAttachViewport();
    },
  });

  return {
    hostStatus,
    triggerViewportMeasurement,
  };
}
