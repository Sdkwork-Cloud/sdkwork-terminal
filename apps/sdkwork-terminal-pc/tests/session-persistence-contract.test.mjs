import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("desktop entry registers secure session persistence before render", () => {
  const source = fs.readFileSync(
    path.join(rootDir, "src", "entries", "desktop-main.tsx"),
    "utf8",
  );

  assert.match(source, /registerDesktopSecureSessionPersistence/);
  assert.match(source, /@sdkwork\/terminal-pc-desktop\/surface/);
  assert.doesNotMatch(source, /sessionStorage/);
});

test("desktop surface exposes keyring-backed secure session commands", () => {
  const source = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-pc-desktop",
      "src",
      "surface",
      "desktop-session-persistence.ts",
    ),
    "utf8",
  );

  assert.match(source, /desktop_secure_session_read/);
  assert.match(source, /desktop_secure_session_write/);
  assert.match(source, /desktop_secure_session_clear/);
  assert.match(source, /registerTerminalSessionPersistence/);
});

test("pc-core session module supports pluggable persistence adapters", () => {
  const persistenceSource = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-pc-core",
      "src",
      "bootstrap",
      "session-persistence.ts",
    ),
    "utf8",
  );
  const sessionSource = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-pc-core",
      "src",
      "bootstrap",
      "session.ts",
    ),
    "utf8",
  );

  assert.match(persistenceSource, /registerTerminalSessionPersistence/);
  assert.match(persistenceSource, /desktop-secure-store/);
  assert.match(persistenceSource, /web-session-storage/);
  assert.match(sessionSource, /hydrateTerminalSessionFromPersistence/);
  assert.match(sessionSource, /persistTerminalSessionSnapshot/);
});
