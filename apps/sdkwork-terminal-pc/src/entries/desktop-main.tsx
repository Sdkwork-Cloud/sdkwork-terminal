import ReactDOM from "react-dom/client";
import "@sdkwork/terminal-pc-shell/styles.css";
import { renderTerminalApp } from "@sdkwork/terminal-pc-core/bootstrap";
import { registerDesktopSecureSessionPersistence } from "@sdkwork/terminal-pc-desktop";
import { App } from "@sdkwork/terminal-pc-desktop/surface";

async function bootstrapDesktopSurface() {
  registerDesktopSecureSessionPersistence();

  ReactDOM.createRoot(document.getElementById("root")!).render(
    renderTerminalApp(App),
  );
}

void bootstrapDesktopSurface();
