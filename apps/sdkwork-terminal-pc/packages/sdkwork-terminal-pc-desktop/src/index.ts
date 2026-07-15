export const DESKTOP_PACKAGE_ID = "sdkwork-terminal-pc-desktop";

export type {
  DesktopHostAdapter,
  DesktopPlatform,
  DesktopWindowConfig,
  OpenFileDialogOptions,
  DirectoryDialogOptions,
  SaveFileDialogOptions,
  FileFilter,
} from "./host/index.js";

export {
  detectDesktopPlatform,
  isDesktopEnvironment,
  createDesktopHostAdapter,
} from "./host/index.js";

export {
  App,
  DesktopTerminalApp,
  type DesktopTerminalAppProps,
} from "./surface/App.tsx";

export {
  desktopSessionCenterMessagesEnUS,
  desktopSessionCenterMessagesZhCN,
} from "./i18n/index.ts";

export type {
  DesktopSessionCenterError,
  DesktopSessionCenterErrorKind,
  DesktopSessionCenterMessages,
} from "./surface/session-center-errors.ts";

export { registerDesktopSecureSessionPersistence } from "./surface/desktop-session-persistence.ts";
export { registerDesktopWindowControlListener } from "./surface/desktop-tauri-host-bridge.ts";
