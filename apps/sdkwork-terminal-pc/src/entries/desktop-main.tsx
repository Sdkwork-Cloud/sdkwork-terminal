import ReactDOM from "react-dom/client";
import "@sdkwork/terminal-pc-shell/styles.css";
import { renderTerminalApp } from "@sdkwork/terminal-pc-core/bootstrap";
import {
  registerDesktopSecureSessionPersistence,
  registerDesktopWindowControlListener,
} from "@sdkwork/terminal-pc-desktop";
import { App } from "@sdkwork/terminal-pc-desktop/surface";

async function bootstrapDesktopSurface() {
  registerDesktopSecureSessionPersistence();
  const unregisterDesktopWindowControlListener =
    registerDesktopWindowControlListener();

  if (import.meta.hot) {
    import.meta.hot.dispose(unregisterDesktopWindowControlListener);
  }

  ReactDOM.createRoot(document.getElementById("root")!).render(
    renderTerminalApp(App),
  );
}

void bootstrapDesktopSurface();
