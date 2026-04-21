export function cx(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

export function extractErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function isIgnorableTauriCallbackLifecycleErrorMessage(message: string) {
  return (
    message.includes("Couldn't find callback id") ||
    message.includes("app is reloaded while Rust is running an asynchronous operation")
  );
}

export function isIgnorableAttachmentLifecycleErrorMessage(message: string) {
  return /^attachment not found:/i.test(message) || /^session not found:/i.test(message);
}

export function isIgnorableTerminalLifecycleErrorMessage(message: string) {
  return (
    isIgnorableTauriCallbackLifecycleErrorMessage(message) ||
    isIgnorableAttachmentLifecycleErrorMessage(message)
  );
}
