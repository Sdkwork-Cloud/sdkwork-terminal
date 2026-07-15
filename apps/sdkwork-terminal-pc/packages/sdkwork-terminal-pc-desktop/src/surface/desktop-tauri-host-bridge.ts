import { isDesktopEnvironment } from "../host/index.js";
import { getCurrentWindow } from "@tauri-apps/api/window";

export { getBundleType } from '@tauri-apps/api/app';
export { invoke } from '@tauri-apps/api/core';
export { listen } from '@tauri-apps/api/event';
export { getCurrentWebview } from '@tauri-apps/api/webview';
export { getCurrentWindow };

const DESKTOP_WINDOW_CONTROL_EVENT = "sdkwork-terminal:window-control";

type DesktopWindowControlAction = "minimize" | "toggleMaximize" | "close";

function isDesktopWindowControlAction(
  value: unknown,
): value is DesktopWindowControlAction {
  return (
    value === "minimize" ||
    value === "toggleMaximize" ||
    value === "close"
  );
}

async function handleDesktopWindowControl(action: DesktopWindowControlAction) {
  const currentWindow = getCurrentWindow();
  if (action === "minimize") {
    await currentWindow.minimize();
    return;
  }

  if (action === "close") {
    await currentWindow.close();
    return;
  }

  if (await currentWindow.isMaximized()) {
    await currentWindow.unmaximize();
    return;
  }

  await currentWindow.maximize();
}

export function registerDesktopWindowControlListener() {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const listener = (event: Event) => {
    const detail = (event as CustomEvent<{ action?: unknown }>).detail;
    if (!isDesktopWindowControlAction(detail?.action)) {
      return;
    }

    void handleDesktopWindowControl(detail.action).catch(() => undefined);
  };

  window.addEventListener(DESKTOP_WINDOW_CONTROL_EVENT, listener);
  return () => {
    window.removeEventListener(DESKTOP_WINDOW_CONTROL_EVENT, listener);
  };
}

export function hasTauriRuntime(): boolean {
  return isDesktopEnvironment();
}
