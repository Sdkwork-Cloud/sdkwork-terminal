export { getBundleType } from '@tauri-apps/api/app';
export { invoke } from '@tauri-apps/api/core';
export { listen } from '@tauri-apps/api/event';
export { getCurrentWebview } from '@tauri-apps/api/webview';
export { getCurrentWindow } from '@tauri-apps/api/window';

export function hasTauriRuntime(): boolean {
  return Boolean(
    typeof window !== 'undefined' &&
      (window as Window & { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__,
  );
}
