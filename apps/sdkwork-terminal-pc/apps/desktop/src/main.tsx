import ReactDOM from "react-dom/client";import "@sdkwork/terminal-pc-shell/styles.css";
import { renderTerminalApp } from "../../../src/bootstrap/renderApp";
import { App } from "./App";

ReactDOM.createRoot(document.getElementById("root")!).render(
  renderTerminalApp(App),
);
