export interface DesktopHostAdapter {
  readonly platform: DesktopPlatform;
  readonly isDesktop: boolean;
  getWindowLabel(): Promise<string | null>;
  setWindowTitle(title: string): Promise<void>;
  minimizeWindow(): Promise<void>;
  maximizeWindow(): Promise<void>;
  toggleMaximize(): Promise<void>;
  closeWindow(): Promise<void>;
  hideWindow(): Promise<void>;
  showWindow(): Promise<void>;
  centerWindow(): Promise<void>;
  setFullscreen(fullscreen: boolean): Promise<void>;
  isFullscreen(): Promise<boolean>;
  readClipboardText(): Promise<string>;
  writeClipboardText(text: string): Promise<void>;
  readClipboardImage(): Promise<Uint8Array | null>;
  writeClipboardImage(data: Uint8Array): Promise<void>;
  openFileDialog(options?: OpenFileDialogOptions): Promise<string | null>;
  openMultipleFilesDialog(options?: OpenFileDialogOptions): Promise<string[] | null>;
  openDirectoryDialog(options?: DirectoryDialogOptions): Promise<string | null>;
  saveFileDialog(options?: SaveFileDialogOptions): Promise<string | null>;
  getAppVersion(): string;
  getAppName(): string;
  getDataDir(): Promise<string>;
  getConfigDir(): Promise<string>;
  getCacheDir(): Promise<string>;
  getLogDir(): Promise<string>;
  getTempDir(): Promise<string>;
  getHomeDir(): Promise<string>;
  getDesktopDir(): Promise<string>;
  getDocumentsDir(): Promise<string>;
  getDownloadsDir(): Promise<string>;
  exitApp(exitCode?: number): Promise<void>;
  relaunchApp(): Promise<void>;
}

export type DesktopPlatform = "windows" | "macos" | "linux";

export interface OpenFileDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: FileFilter[];
  multiple?: boolean;
  directory?: boolean;
}

export interface DirectoryDialogOptions {
  title?: string;
  defaultPath?: string;
}

export interface SaveFileDialogOptions {
  title?: string;
  defaultPath?: string;
  filters?: FileFilter[];
}

export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface DesktopWindowConfig {
  label: string;
  title: string;
  width: number;
  height: number;
  minWidth?: number;
  minHeight?: number;
  maxWidth?: number;
  maxHeight?: number;
  resizable?: boolean;
  fullscreen?: boolean;
  decorations?: boolean;
  transparent?: boolean;
  alwaysOnTop?: boolean;
  center?: boolean;
}

export function detectDesktopPlatform(): DesktopPlatform {
  const platform = navigator.platform.toLowerCase();
  if (platform.includes("win")) return "windows";
  if (platform.includes("mac")) return "macos";
  return "linux";
}

export function isDesktopEnvironment(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window;
}

export function createDesktopHostAdapter(): DesktopHostAdapter | null {
  if (!isDesktopEnvironment()) {
    return null;
  }

  const tauri = (window as any).__TAURI__;
  if (!tauri) {
    return null;
  }

  return {
    platform: detectDesktopPlatform(),
    isDesktop: true,

    async getWindowLabel() {
      try {
        const label = await tauri.window.getCurrentWindow().label;
        return label ?? null;
      } catch {
        return null;
      }
    },

    async setWindowTitle(title: string) {
      await tauri.window.getCurrentWindow().setTitle(title);
    },

    async minimizeWindow() {
      await tauri.window.getCurrentWindow().minimize();
    },

    async maximizeWindow() {
      await tauri.window.getCurrentWindow().maximize();
    },

    async toggleMaximize() {
      await tauri.window.getCurrentWindow().toggleMaximize();
    },

    async closeWindow() {
      await tauri.window.getCurrentWindow().close();
    },

    async hideWindow() {
      await tauri.window.getCurrentWindow().hide();
    },

    async showWindow() {
      await tauri.window.getCurrentWindow().show();
    },

    async centerWindow() {
      await tauri.window.getCurrentWindow().center();
    },

    async setFullscreen(fullscreen: boolean) {
      await tauri.window.getCurrentWindow().setFullscreen(fullscreen);
    },

    async isFullscreen() {
      return await tauri.window.getCurrentWindow().isFullscreen();
    },

    async readClipboardText() {
      return await tauri.core.invoke("desktop_clipboard_read_text");
    },

    async writeClipboardText(text: string) {
      await tauri.core.invoke("desktop_clipboard_write_text", { text });
    },

    async readClipboardImage() {
      try {
        return await tauri.core.invoke("desktop_clipboard_read_image");
      } catch {
        return null;
      }
    },

    async writeClipboardImage(data: Uint8Array) {
      await tauri.core.invoke("desktop_clipboard_write_image", { data });
    },

    async openFileDialog(options?: OpenFileDialogOptions) {
      return await tauri.core.invoke("desktop_open_file_dialog", { options });
    },

    async openMultipleFilesDialog(options?: OpenFileDialogOptions) {
      return await tauri.core.invoke("desktop_open_multiple_files_dialog", { options });
    },

    async openDirectoryDialog(options?: DirectoryDialogOptions) {
      return await tauri.core.invoke("desktop_open_directory_dialog", { options });
    },

    async saveFileDialog(options?: SaveFileDialogOptions) {
      return await tauri.core.invoke("desktop_save_file_dialog", { options });
    },

    getAppVersion() {
      return tauri.app?.getVersion?.() ?? "0.0.0";
    },

    getAppName() {
      return tauri.app?.getName?.() ?? "sdkwork-terminal";
    },

    async getDataDir() {
      return await tauri.core.invoke("desktop_get_data_dir");
    },

    async getConfigDir() {
      return await tauri.core.invoke("desktop_get_config_dir");
    },

    async getCacheDir() {
      return await tauri.core.invoke("desktop_get_cache_dir");
    },

    async getLogDir() {
      return await tauri.core.invoke("desktop_get_log_dir");
    },

    async getTempDir() {
      return await tauri.core.invoke("desktop_get_temp_dir");
    },

    async getHomeDir() {
      return await tauri.core.invoke("desktop_get_home_dir");
    },

    async getDesktopDir() {
      return await tauri.core.invoke("desktop_get_desktop_dir");
    },

    async getDocumentsDir() {
      return await tauri.core.invoke("desktop_get_documents_dir");
    },

    async getDownloadsDir() {
      return await tauri.core.invoke("desktop_get_downloads_dir");
    },

    async exitApp(exitCode?: number) {
      await tauri.core.invoke("desktop_exit_app", { exitCode: exitCode ?? 0 });
    },

    async relaunchApp() {
      await tauri.core.invoke("desktop_relaunch_app");
    },
  };
}

