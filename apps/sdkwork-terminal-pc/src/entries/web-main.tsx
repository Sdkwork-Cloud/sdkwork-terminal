import ReactDOM from "react-dom/client";
import "@sdkwork/terminal-pc-shell/styles.css";
import { renderTerminalApp } from "@sdkwork/terminal-pc-core/bootstrap";
import { App } from "../surfaces/web-app";

ReactDOM.createRoot(document.getElementById("root")!).render(
  renderTerminalApp(App),
);
