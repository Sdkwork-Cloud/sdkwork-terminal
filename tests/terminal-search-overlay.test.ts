import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("shared terminal search overlay centralizes terminal search input markup and keyboard behavior", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-shell",
      "src",
      "terminal-search-overlay.tsx",
    ),
    "utf8",
  );

  assert.match(source, /export function TerminalSearchOverlay/);
  assert.match(source, /inputRef\?: Ref<HTMLInputElement>;/);
  assert.match(source, /onQueryChange: \(query: string\) => void;/);
  assert.match(source, /onClose: \(\) => void;/);
  assert.match(source, /onSubmit: \(\) => void;/);
  assert.match(source, /data-slot="terminal-search-overlay"/);
  assert.match(source, /data-slot="terminal-search-input"/);
  assert.match(source, /aria-label="Terminal search"/);
  assert.match(source, /aria-label="Close terminal search"/);
  assert.match(source, /if \(event\.key === "Escape"\)/);
  assert.match(source, /props\.onClose\(\);/);
  assert.match(source, /if \(event\.key === "Enter"\)/);
  assert.match(source, /props\.onSubmit\(\);/);
  assert.match(source, /props\.onQueryChange\(event\.target\.value\);/);
});
