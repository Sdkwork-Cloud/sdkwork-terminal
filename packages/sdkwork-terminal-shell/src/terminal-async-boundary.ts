export function runTerminalTaskBestEffort(
  action: () => Promise<unknown> | unknown,
  onError?: (cause: unknown) => void,
) {
  const reportError = (cause: unknown) => {
    try {
      onError?.(cause);
    } catch {
      // Best-effort boundaries must not rethrow through lifecycle callbacks.
    }
  };

  try {
    void Promise.resolve(action()).catch((cause) => {
      reportError(cause);
    });
  } catch (cause) {
    reportError(cause);
  }
}
