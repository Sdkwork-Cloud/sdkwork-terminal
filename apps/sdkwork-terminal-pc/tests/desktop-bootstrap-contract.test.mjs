import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const desktopEntryPath = path.join(rootDir, "packages", "sdkwork-terminal-pc-desktop", "src-tauri", "src", "main.rs");
const desktopHtmlPath = path.join(rootDir, "index.desktop.html");

test("desktop host entrypoint uses the Windows GUI subsystem for release builds", () => {
  const source = fs.readFileSync(desktopEntryPath, "utf8");

  assert.match(
    source,
    /#!\[cfg_attr\(\s*all\(not\(debug_assertions\),\s*target_os = "windows"\),\s*windows_subsystem = "windows"\s*\)\s*\]/s,
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

test("desktop tauri host exposes secure session keyring commands", () => {
  const libSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-pc-desktop", "src-tauri", "src", "lib.rs"),
    "utf8",
  );
  const secureSource = fs.readFileSync(
    path.join(rootDir, "packages", "sdkwork-terminal-pc-desktop", "src-tauri", "src", "secure_session.rs"),
    "utf8",
  );

  assert.match(libSource, /desktop_secure_session_read/);
  assert.match(libSource, /desktop_secure_session_write/);
  assert.match(libSource, /desktop_secure_session_clear/);
  assert.match(secureSource, /keyring::Entry/);
});
