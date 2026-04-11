import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readSource(relPath: string) {
  return fs.readFileSync(path.join(rootDir, relPath), "utf8");
}

test("windows desktop and runtime-node hosts enable synthetic probe responses for interactive PTY shells", () => {
  const desktopHostSource = readSource("src-tauri/src/lib.rs");
  const runtimeNodeHostSource = readSource("crates/sdkwork-terminal-runtime-node/src/host.rs");

  assert.match(
    desktopHostSource,
    /if cfg!\(windows\) \{\s*LocalShellSessionRuntime::with_synthetic_probe_responses\(\)\s*\} else \{\s*LocalShellSessionRuntime::default\(\)\s*\}/,
  );
  assert.match(
    runtimeNodeHostSource,
    /if cfg!\(windows\) \{\s*LocalShellSessionRuntime::with_synthetic_probe_responses\(\)\s*\} else \{\s*LocalShellSessionRuntime::default\(\)\s*\}/,
  );
});
