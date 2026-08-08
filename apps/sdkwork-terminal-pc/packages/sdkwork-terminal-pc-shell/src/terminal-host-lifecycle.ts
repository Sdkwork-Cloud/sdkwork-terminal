import type { TerminalViewport } from "@sdkwork/terminal-pc-core";
import {
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { runTerminalTaskBestEffort } from "./terminal-async-boundary";
import { useLatestRef, useStableCallback } from "./terminal-react-stability";

const VIEWPORT_MEASURE_RETRY_LIMIT = 6;
const VIEWPORT_MEASURE_RETRY_DELAY_MS = 32;

export type TerminalHostLifecycleState = "idle" | "attaching" | "ready" | "failed";

export interface UseTerminalHostLifecycleArgs {
  active: boolean;
  activateKey: string;
  lifecycleKey: unknown;
  hostRef: RefObject<HTMLDivElement | null>;
  viewport: TerminalViewport;
  onViewportResize: (viewport: TerminalViewport) => void;
  measureViewport: () => Promise<TerminalViewport | null>;
  attachHost: (host: HTMLDivElement) => Promise<void>;
  disposeHost: () => Promise<void> | void;
  focusViewport: () => Promise<void> | void;
  onAttachFailure?: (message: string) => void;
}

type TerminalViewportMeasurementOperation = () => Promise<boolean>;

interface ActiveTerminalViewportMeasurement {
  revision: number;
  promise: Promise<boolean>;
}

interface PendingTerminalViewportMeasurement {
  revision: number;
  operation: TerminalViewportMeasurementOperation;
}

export interface TerminalViewportMeasurementCoordinator {
  run: (operation: TerminalViewportMeasurementOperation) => Promise<boolean>;
  reset: () => void;
}

/**
 * Serializes layout measurements and retains only the newest request received
 * while a measurement is running, including while a trailing measurement runs.
 */
export function createTerminalViewportMeasurementCoordinator(): TerminalViewportMeasurementCoordinator {
  let activeMeasurement: ActiveTerminalViewportMeasurement | null = null;
  let trailingMeasurement: PendingTerminalViewportMeasurement | null = null;
  let lifecycleRevision = 0;

  function startMeasurement(
    operation: TerminalViewportMeasurementOperation,
    revision: number,
  ) {
    let resolveMeasurement: (result: boolean) => void = () => {};
    let rejectMeasurement: (cause: unknown) => void = () => {};
    const measurementPromise = new Promise<boolean>((resolve, reject) => {
      resolveMeasurement = resolve;
      rejectMeasurement = reject;
    });
    const active = {
      revision,
      promise: measurementPromise,
    };
    activeMeasurement = active;

    void (async () => {
      try {
        let nextOperation = operation;
        for (;;) {
          const result = await nextOperation();
          if (revision !== lifecycleRevision) {
            resolveMeasurement(result);
            return;
          }

          const trailing = trailingMeasurement;
          if (!trailing || trailing.revision !== revision) {
            resolveMeasurement(result);
            return;
          }

          trailingMeasurement = null;
          nextOperation = trailing.operation;
        }
      } catch (cause) {
        rejectMeasurement(cause);
      } finally {
        if (activeMeasurement !== active) {
          return;
        }

        activeMeasurement = null;
        if (trailingMeasurement?.revision === revision) {
          trailingMeasurement = null;
        }
      }
    })();

    return measurementPromise;
  }

  return {
    run(operation) {
      const revision = lifecycleRevision;
      if (activeMeasurement?.revision === revision) {
        trailingMeasurement = {
          revision,
          operation,
        };
        return activeMeasurement.promise;
      }

      return startMeasurement(operation, revision);
    },

    reset() {
      lifecycleRevision += 1;
      activeMeasurement = null;
      trailingMeasurement = null;
    },
  };
}

export function useTerminalHostLifecycle(args: UseTerminalHostLifecycleArgs) {
  const latestResizeHandlerRef = useLatestRef(args.onViewportResize);
  const latestActiveRef = useLatestRef(args.active);
  const latestMeasureViewportRef = useLatestRef(args.measureViewport);
  const latestAttachHostRef = useLatestRef(args.attachHost);
  const latestDisposeHostRef = useLatestRef(args.disposeHost);
  const latestFocusViewportRef = useLatestRef(args.focusViewport);
  const latestAttachFailureRef = useLatestRef(args.onAttachFailure);
  const [hostLifecycleState, setHostLifecycleState] = useState<TerminalHostLifecycleState>("idle");
  const [hostLifecycleError, setHostLifecycleError] = useState<string | null>(null);
  const [hostViewportMeasured, setHostViewportMeasured] = useState(false);
  const hasAttachedRef = useRef(false);
  const attachViewportRef = useRef<(() => Promise<void>) | null>(null);
  const attachPromiseRef = useRef<Promise<void> | null>(null);
  const viewportLifecycleRevisionRef = useRef(0);
  const viewportMeasurementCoordinatorRef = useRef<TerminalViewportMeasurementCoordinator | null>(
    null,
  );
  if (!viewportMeasurementCoordinatorRef.current) {
    viewportMeasurementCoordinatorRef.current = createTerminalViewportMeasurementCoordinator();
  }

  function runViewportMeasurement(operation: TerminalViewportMeasurementOperation) {
    return viewportMeasurementCoordinatorRef.current!.run(operation);
  }

  const measureViewportNow = useStableCallback(async (): Promise<boolean> => {
    if (!latestActiveRef.current) {
      return false;
    }

    const measurementRevision = viewportLifecycleRevisionRef.current;
    return runViewportMeasurement(async (): Promise<boolean> => {
      const measuredViewport = await latestMeasureViewportRef.current();
      if (
        measurementRevision !== viewportLifecycleRevisionRef.current ||
        !latestActiveRef.current
      ) {
        return false;
      }

      if (!measuredViewport) {
        setHostViewportMeasured(false);
        return false;
      }

      setHostViewportMeasured(true);
      latestResizeHandlerRef.current(measuredViewport);
      return true;
    });
  });

  useEffect(() => {
    const hostElement = args.hostRef.current;
    if (!hostElement) {
      return;
    }

    let cancelled = false;
    const lifecycleRevision = viewportLifecycleRevisionRef.current + 1;
    viewportLifecycleRevisionRef.current = lifecycleRevision;

    const measureViewport = async (): Promise<boolean> => {
      if (
        !latestActiveRef.current ||
        lifecycleRevision !== viewportLifecycleRevisionRef.current
      ) {
        return false;
      }

      const measuredViewport = await latestMeasureViewportRef.current();
      if (
        cancelled ||
        lifecycleRevision !== viewportLifecycleRevisionRef.current
      ) {
        return false;
      }

      if (!measuredViewport) {
        setHostViewportMeasured(false);
        return false;
      }

      setHostViewportMeasured(true);
      latestResizeHandlerRef.current(measuredViewport);
      return true;
    };

    const ensureViewportMeasured = async (): Promise<boolean> => {
      return runViewportMeasurement(async (): Promise<boolean> => {
        for (let attempt = 0; attempt < VIEWPORT_MEASURE_RETRY_LIMIT; attempt += 1) {
          if (await measureViewport()) {
            return true;
          }

          if (cancelled || !latestActiveRef.current) {
            return false;
          }

          await new Promise<void>((resolve) => {
            setTimeout(resolve, VIEWPORT_MEASURE_RETRY_DELAY_MS);
          });
        }

        return false;
      });
    };

    attachViewportRef.current = async () => {
      if (hasAttachedRef.current) {
        return;
      }

      if (attachPromiseRef.current) {
        await attachPromiseRef.current;
        return;
      }

      const attachPromise = (async () => {
        setHostLifecycleState("attaching");
        setHostLifecycleError(null);
        setHostViewportMeasured(false);
        try {
          await latestAttachHostRef.current(hostElement);
          if (cancelled) {
            return;
          }

          hasAttachedRef.current = true;
          setHostLifecycleState("ready");
          if (latestActiveRef.current) {
            await ensureViewportMeasured();
            await latestFocusViewportRef.current();
          }
        } catch (cause) {
          const message = cause instanceof Error ? cause.message : String(cause);
          hasAttachedRef.current = false;
          setHostViewportMeasured(false);
          if (cancelled) {
            return;
          }

          setHostLifecycleState("failed");
          setHostLifecycleError(message);
          latestAttachFailureRef.current?.(message);
        }
      })();

      attachPromiseRef.current = attachPromise;
      try {
        await attachPromise;
      } finally {
        if (attachPromiseRef.current === attachPromise) {
          attachPromiseRef.current = null;
        }
      }
    };

    const resizeObserver = new ResizeObserver(() => {
      runTerminalTaskBestEffort(ensureViewportMeasured);
    });
    resizeObserver.observe(hostElement);

    return () => {
      cancelled = true;
      hasAttachedRef.current = false;
      setHostViewportMeasured(false);
      attachViewportRef.current = null;
      attachPromiseRef.current = null;
      if (viewportLifecycleRevisionRef.current === lifecycleRevision) {
        viewportLifecycleRevisionRef.current += 1;
      }
      viewportMeasurementCoordinatorRef.current?.reset();
      resizeObserver.disconnect();
      runTerminalTaskBestEffort(latestDisposeHostRef.current);
    };
  }, [args.hostRef, args.lifecycleKey]);

  useEffect(() => {
    if (hasAttachedRef.current || !args.active) {
      return;
    }

    runTerminalTaskBestEffort(() => attachViewportRef.current?.());
  }, [args.active, args.activateKey]);

  const triggerViewportMeasurement = measureViewportNow;
  const retryAttachViewport = useStableCallback(() => {
    runTerminalTaskBestEffort(() => attachViewportRef.current?.());
  });

  return {
    hostLifecycleError,
    hostLifecycleState,
    hostViewportMeasured,
    retryAttachViewport,
    triggerViewportMeasurement,
  };
}

