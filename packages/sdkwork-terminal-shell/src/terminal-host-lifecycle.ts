import type { TerminalViewport } from "@sdkwork/terminal-core";
import {
  useEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { useLatestRef, useStableCallback } from "./terminal-react-stability.ts";

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

export function useTerminalHostLifecycle(args: UseTerminalHostLifecycleArgs) {
  const latestViewportRef = useLatestRef(args.viewport);
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
  const viewportMeasurementPromiseRef = useRef<Promise<boolean> | null>(null);

  function runViewportMeasurement(operation: () => Promise<boolean>) {
    if (viewportMeasurementPromiseRef.current) {
      return viewportMeasurementPromiseRef.current;
    }

    let measurementPromise: Promise<boolean>;
    measurementPromise = operation().finally(() => {
      if (viewportMeasurementPromiseRef.current === measurementPromise) {
        viewportMeasurementPromiseRef.current = null;
      }
    });
    viewportMeasurementPromiseRef.current = measurementPromise;
    return measurementPromise;
  }

  const measureViewportNow = useStableCallback(async (): Promise<boolean> => {
    if (!latestActiveRef.current) {
      return false;
    }

    return runViewportMeasurement(async (): Promise<boolean> => {
      const measuredViewport = await latestMeasureViewportRef.current();
      if (!measuredViewport) {
        setHostViewportMeasured(false);
        return false;
      }

      setHostViewportMeasured(true);

      const currentViewport = latestViewportRef.current;
      if (
        currentViewport.cols === measuredViewport.cols &&
        currentViewport.rows === measuredViewport.rows
      ) {
        return true;
      }

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

    const measureViewport = async (): Promise<boolean> => {
      if (!latestActiveRef.current) {
        return false;
      }

      const measuredViewport = await latestMeasureViewportRef.current();
      if (cancelled) {
        return false;
      }

      if (!measuredViewport) {
        setHostViewportMeasured(false);
        return false;
      }

      setHostViewportMeasured(true);

      const currentViewport = latestViewportRef.current;
      if (
        currentViewport.cols === measuredViewport.cols &&
        currentViewport.rows === measuredViewport.rows
      ) {
        return true;
      }

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
      void ensureViewportMeasured();
    });
    resizeObserver.observe(hostElement);

    return () => {
      cancelled = true;
      hasAttachedRef.current = false;
      setHostViewportMeasured(false);
      attachViewportRef.current = null;
      attachPromiseRef.current = null;
      viewportMeasurementPromiseRef.current = null;
      resizeObserver.disconnect();
      void latestDisposeHostRef.current();
    };
  }, [args.hostRef, args.lifecycleKey]);

  useEffect(() => {
    if (hasAttachedRef.current || !args.active) {
      return;
    }

    void attachViewportRef.current?.();
  }, [args.active, args.activateKey]);

  const triggerViewportMeasurement = measureViewportNow;
  const retryAttachViewport = useStableCallback(() => {
    void attachViewportRef.current?.();
  });

  return {
    hostLifecycleError,
    hostLifecycleState,
    hostViewportMeasured,
    retryAttachViewport,
    triggerViewportMeasurement,
  };
}
