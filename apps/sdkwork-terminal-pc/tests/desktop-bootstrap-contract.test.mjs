import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const desktopEntryPath = path.join(rootDir, "src-tauri", "src", "main.rs");
const desktopHtmlPath = path.join(rootDir, "apps", "desktop", "index.html");

test("desktop host entrypoint uses the Windows GUI subsystem for release builds", () => {
  const source = fs.readFileSync(desktopEntryPath, "utf8");

  assert.match(
    source,
    /#!\[cfg_attr\(all\(not\(debug_assertions\),\s*target_os = "windows"\),\s*windows_subsystem = "windows"\)\]/,
  );
  assert.match(source, /sdkwork_terminal_desktop_host_lib::run\(\);/);
});

test("desktop html defines an explicit dark shell bootstrap contract", () => {
  const source = fs.readFileSync(desktopHtmlPath, "utf8");

  assert.match(source, /<meta name="color-scheme" content="dark"\s*\/?>/i);
  assert.match(source, /box-sizing:\s*border-box/i);
  assert.match(source, /overscroll-behavior:\s*none/i);
  assert.match(source, /html,\s*body,\s*#root\s*\{/i);
  assert.match(source, /min-height:\s*100%/i);
});
