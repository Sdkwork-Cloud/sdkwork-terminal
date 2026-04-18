import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("shared runtime terminal session binding hook centralizes callback wiring and session attach state", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-shell",
      "src",
      "terminal-runtime-session-binding.ts",
    ),
    "utf8",
  );

  assert.match(source, /export interface UseRuntimeTerminalSessionBindingArgs/);
  assert.match(source, /import \{ useLatestRef, useStableCallback \} from "\.\/terminal-react-stability\.ts";/);
  assert.match(source, /controller: RuntimeTabController;/);
  assert.match(source, /runtimeClient: SharedRuntimeClient \| null;/);
  assert.match(source, /runtimeSessionId: string \| null;/);
  assert.match(source, /runtimeCursor: string \| null;/);
  assert.match(source, /runtimeAttachmentId: string \| null;/);
  assert.match(source, /onViewportInput: \(input: TerminalViewportInput\) => void;/);
  assert.match(source, /onViewportTitleChange: \(title: string\) => void;/);
  assert.match(source, /onRuntimeReplayApplied\?: \(replay: \{/);
  assert.match(source, /onRuntimeError\?: \(message: string\) => void;/);
  assert.match(source, /export function useRuntimeTerminalSessionBinding/);
  assert.match(source, /const latestInputHandlerRef = useLatestRef\(args\.onViewportInput\);/);
  assert.match(source, /const latestTitleHandlerRef = useLatestRef\(args\.onViewportTitleChange\);/);
  assert.match(source, /const latestReplayAppliedHandlerRef = useLatestRef\(args\.onRuntimeReplayApplied\);/);
  assert.match(source, /const latestRuntimeErrorHandlerRef = useLatestRef\(args\.onRuntimeError\);/);
  assert.match(source, /const boundSessionKeyRef = useRef<string \| null>\(null\);/);
  assert.match(source, /args\.controller\.setCallbacks\(\{/);
  assert.match(source, /onBufferedInput: \(input: TerminalViewportInput\) => \{/);
  assert.match(source, /onReplayApplied: \(replay\) => \{/);
  assert.match(source, /onRuntimeError: \(message\) => \{/);
  assert.match(source, /void args\.controller\.clearSession\(\);/);
  assert.match(source, /void args\.controller\.bindSession\(\{/);
  assert.match(source, /hydrateFromReplay:\s*true,/);
  assert.match(source, /subscribeToStream:\s*true,/);
  assert.match(source, /const handleRuntimeHostAttachFailure = useStableCallback\(\(message: string\) => \{/);
  assert.match(source, /const resetRuntimeSessionBinding = useStableCallback\(\(\) => \{/);
  assert.match(source, /resetRuntimeSessionBinding,/);
});
