export type TerminalErrorSeverity = "warning" | "error" | "critical";

export interface TerminalErrorContext {
  source?: string;
  severity?: TerminalErrorSeverity;
  recoverable?: boolean;
}

export interface TerminalErrorHandler {
  (error: unknown, context: TerminalErrorContext): void;
}

let globalErrorHandler: TerminalErrorHandler | null = null;

export function setTerminalErrorHandler(handler: TerminalErrorHandler | null) {
  globalErrorHandler = handler;
}

function extractErrorMessage(cause: unknown): string {
  if (cause instanceof Error) {
    return cause.message;
  }
  if (typeof cause === "string") {
    return cause;
  }
  return String(cause);
}

function reportTerminalError(
  cause: unknown,
  context: TerminalErrorContext,
) {
  const message = extractErrorMessage(cause);

  if (globalErrorHandler) {
    try {
      globalErrorHandler(cause, context);
    } catch {
      console.error("[terminal] Error in error handler:", message);
    }
    return;
  }

  if (context.severity === "critical") {
    console.error(`[terminal:critical] ${context.source ?? "unknown"}:`, message);
  } else if (context.severity === "error") {
    console.warn(`[terminal:error] ${context.source ?? "unknown"}:`, message);
  } else if (isDevelopmentRuntime()) {
    console.debug(`[terminal:warning] ${context.source ?? "unknown"}:`, message);
  }
}

function isDevelopmentRuntime(): boolean {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    return Boolean(import.meta.env.DEV);
  }
  return false;
}

export function runTerminalTaskBestEffort(
  action: () => Promise<unknown> | unknown,
  onError?: (cause: unknown) => void,
  context: TerminalErrorContext = {},
) {
  const reportError = (cause: unknown) => {
    try {
      onError?.(cause);
    } catch (handlerError) {
      reportTerminalError(handlerError, {
        source: "error-handler",
        severity: "error",
      });
    }

    reportTerminalError(cause, {
      severity: context.severity ?? "warning",
      source: context.source,
      recoverable: context.recoverable ?? true,
    });
  };

  try {
    void Promise.resolve(action()).catch((cause) => {
      reportError(cause);
    });
  } catch (cause) {
    reportError(cause);
  }
}

export function wrapTerminalTask<T>(
  action: () => Promise<T>,
  fallback: T,
  context: TerminalErrorContext = {},
): Promise<T> {
  return Promise.resolve(action()).catch((cause) => {
    reportTerminalError(cause, {
      severity: context.severity ?? "warning",
      source: context.source,
      recoverable: context.recoverable ?? true,
    });
    return fallback;
  });
}

export function createTerminalErrorBoundary<T>(
  action: () => T,
  fallback: T,
  context: TerminalErrorContext = {},
): T {
  try {
    return action();
  } catch (cause) {
    reportTerminalError(cause, {
      severity: context.severity ?? "warning",
      source: context.source,
      recoverable: context.recoverable ?? true,
    });
    return fallback;
  }
}
