import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("fallback terminal hidden input stays fully offscreen to avoid top-left caret leaks", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-shell",
      "src",
      "terminal-stage-shared.ts",
    ),
    "utf8",
  );

  assert.match(source, /export const hiddenInputStyle: CSSProperties = \{/);
  assert.match(source, /position:\s*"absolute"/);
  assert.match(source, /left:\s*"-9999em"/);
  assert.match(source, /top:\s*0/);
  assert.match(source, /width:\s*0/);
  assert.match(source, /height:\s*0/);
  assert.match(source, /opacity:\s*0/);
  assert.match(source, /caretColor:\s*"transparent"/);
  assert.match(source, /pointerEvents:\s*"none"/);
  assert.match(source, /whiteSpace:\s*"pre"/);
});
