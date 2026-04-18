import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("shared terminal host lifecycle hook centralizes attach, measurement, retry, and disposal orchestration", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-shell",
      "src",
      "terminal-host-lifecycle.ts",
    ),
    "utf8",
  );

  assert.match(source, /export type TerminalHostLifecycleState = "idle" \| "attaching" \| "ready" \| "failed";/);
  assert.match(source, /import \{ useLatestRef, useStableCallback \} from "\.\/terminal-react-stability\.ts";/);
  assert.match(source, /export interface UseTerminalHostLifecycleArgs/);
  assert.match(source, /lifecycleKey: unknown;/);
  assert.match(source, /activateKey: string;/);
  assert.match(source, /measureViewport: \(\) => Promise<TerminalViewport \| null>;/);
  assert.match(source, /attachHost: \(host: HTMLDivElement\) => Promise<void>;/);
  assert.match(source, /disposeHost: \(\) => Promise<void> \| void;/);
  assert.match(source, /focusViewport: \(\) => Promise<void> \| void;/);
  assert.match(source, /onAttachFailure\?: \(message: string\) => void;/);
  assert.match(source, /export function useTerminalHostLifecycle/);
  assert.match(source, /const VIEWPORT_MEASURE_RETRY_LIMIT = 6;/);
  assert.match(source, /const VIEWPORT_MEASURE_RETRY_DELAY_MS = 32;/);
  assert.match(source, /const \[hostLifecycleState, setHostLifecycleState\] = useState<TerminalHostLifecycleState>\("idle"\);/);
  assert.match(source, /const \[hostLifecycleError, setHostLifecycleError\] = useState<string \| null>\(null\);/);
  assert.match(source, /const \[hostViewportMeasured, setHostViewportMeasured\] = useState\(false\);/);
  assert.match(source, /const latestViewportRef = useLatestRef\(args\.viewport\);/);
  assert.match(source, /const latestResizeHandlerRef = useLatestRef\(args\.onViewportResize\);/);
  assert.match(source, /const latestActiveRef = useLatestRef\(args\.active\);/);
  assert.match(source, /const latestMeasureViewportRef = useLatestRef\(args\.measureViewport\);/);
  assert.match(source, /const latestAttachHostRef = useLatestRef\(args\.attachHost\);/);
  assert.match(source, /const latestDisposeHostRef = useLatestRef\(args\.disposeHost\);/);
  assert.match(source, /const latestFocusViewportRef = useLatestRef\(args\.focusViewport\);/);
  assert.match(source, /const latestAttachFailureRef = useLatestRef\(args\.onAttachFailure\);/);
  assert.match(source, /const viewportMeasurementPromiseRef = useRef<Promise<boolean> \| null>\(null\);/);
  assert.match(source, /function runViewportMeasurement\(operation: \(\) => Promise<boolean>\) \{/);
  assert.match(source, /let measurementPromise: Promise<boolean>;/);
  assert.match(source, /measurementPromise = operation\(\)\.finally\(\(\) => \{/);
  assert.match(source, /const measureViewportNow = useStableCallback\(async \(\): Promise<boolean> => \{/);
  assert.match(source, /return runViewportMeasurement\(async \(\): Promise<boolean> => \{/);
  assert.match(source, /const retryAttachViewport = useStableCallback\(\(\) => \{\s*void attachViewportRef\.current\?\.\(\);\s*\}\);/);
  assert.match(source, /const ensureViewportMeasured = async \(\): Promise<boolean> => \{/);
  assert.match(source, /return runViewportMeasurement\(async \(\): Promise<boolean> => \{/);
  assert.match(source, /if \(viewportMeasurementPromiseRef\.current === measurementPromise\) \{\s*viewportMeasurementPromiseRef\.current = null;\s*\}/);
  assert.match(source, /new ResizeObserver/);
  assert.match(source, /viewportMeasurementPromiseRef\.current = null;/);
  assert.match(source, /void latestDisposeHostRef\.current\(\);/);
  assert.match(source, /latestAttachFailureRef\.current\?\.\(message\);/);
  assert.match(source, /return \{/);
  assert.match(source, /triggerViewportMeasurement,/);
  assert.doesNotMatch(source, /const latestTriggerViewportMeasurementRef = useRef/);
});
