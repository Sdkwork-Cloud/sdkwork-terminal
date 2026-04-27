import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("shared terminal react stability hooks centralize latest-ref and stable-callback patterns", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-shell",
      "src",
      "terminal-react-stability.ts",
    ),
    "utf8",
  );

  assert.match(source, /import \{ useRef \} from "react";/);
  assert.match(source, /export function useLatestRef<T>\(value: T\)/);
  assert.match(source, /const valueRef = useRef\(value\);/);
  assert.match(source, /valueRef\.current = value;/);
  assert.doesNotMatch(source, /useEffect\(/);
  assert.match(source, /return valueRef;/);
  assert.doesNotMatch(source, /\bany\b/);
  assert.match(
    source,
    /type StableCallback<Args extends unknown\[\] = never\[\], Result = unknown> = \(\s*\.\.\.args: Args\s*\) => Result;/,
  );
  assert.match(
    source,
    /export function useStableCallback<Args extends unknown\[\], Result>\(\s*callback: StableCallback<Args, Result>,\s*\): StableCallback<Args, Result>/,
  );
  assert.match(source, /const latestCallbackRef = useLatestRef\(callback\);/);
  assert.match(source, /const stableCallbackRef = useRef<StableCallback<Args, Result> \| null>\(null\);/);
  assert.match(source, /stableCallbackRef\.current = \(\.\.\.args: Args\): Result =>\s*latestCallbackRef\.current\(\.\.\.args\);/);
  assert.doesNotMatch(source, / as T/);
  assert.match(source, /return stableCallbackRef\.current;/);
});
