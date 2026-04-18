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

  assert.match(source, /import \{ useEffect, useRef \} from "react";/);
  assert.match(source, /export function useLatestRef<T>\(value: T\)/);
  assert.match(source, /const valueRef = useRef\(value\);/);
  assert.match(source, /useEffect\(\(\) => \{\s*valueRef\.current = value;\s*\}, \[value\]\);/);
  assert.match(source, /return valueRef;/);
  assert.match(source, /type StableCallback = \(\.\.\.args: any\[\]\) => any;/);
  assert.match(source, /export function useStableCallback<T extends StableCallback>\(callback: T\): T/);
  assert.match(source, /const latestCallbackRef = useLatestRef\(callback\);/);
  assert.match(source, /const stableCallbackRef = useRef<T \| null>\(null\);/);
  assert.match(source, /stableCallbackRef\.current = \(\(\(\.\.\.args: Parameters<T>\): ReturnType<T> =>[\s\S]*latestCallbackRef\.current\(\.\.\.args\)\) as T\);/);
  assert.match(source, /return stableCallbackRef\.current;/);
});
