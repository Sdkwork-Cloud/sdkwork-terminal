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

