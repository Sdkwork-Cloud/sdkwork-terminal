import { createTerminalAppViteConfig } from "./tools/vite/create-terminal-app-vite-config.mjs";

export default createTerminalAppViteConfig({
  server: {
    host: "127.0.0.1",
    port: 1420,
  },
});
