import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readSource(...segments: string[]) {
  return fs.readFileSync(path.join(rootDir, ...segments), "utf8");
}

test("xterm search navigation supports directional requests and reports a match result", () => {
  const source = readSource(
    "packages",
    "sdkwork-terminal-pc-infrastructure",
    "src",
    "index.ts",
  );

  assert.match(source, /export type TerminalSearchDirection = "next" \| "previous";/);
  assert.match(source, /export interface TerminalSearchRequest \{/);
  assert.match(source, /search: \(\s*query: string,\s*request\?: TerminalSearchRequest,\s*\) => Promise<boolean \| null>;/);
  assert.match(source, /findPrevious: \(query: string\) => boolean;/);
  assert.match(source, /if \(request\.direction === "previous"\) \{/);
  assert.match(source, /return nextRuntime\.searchAddon\.findPrevious\(normalizedQuery\);/);
  assert.match(source, /incremental: request\.incremental === true,/);
});

test("both terminal stages forward the shared search request without changing transport behavior", () => {
  const fallbackStageSource = readSource(
    "packages",
    "sdkwork-terminal-pc-shell",
    "src",
    "fallback-terminal-stage.tsx",
  );
  const runtimeStageSource = readSource(
    "packages",
    "sdkwork-terminal-pc-shell",
    "src",
    "runtime-terminal-stage.tsx",
  );

  assert.match(fallbackStageSource, /runSearch: async \(query, request\) => \{/);
  assert.match(fallbackStageSource, /return driver\.search\(query, request\);/);
  assert.match(runtimeStageSource, /runSearch: async \(query, request\) => \{/);
  assert.match(runtimeStageSource, /return runtimeController\.search\(query, request\);/);
});
