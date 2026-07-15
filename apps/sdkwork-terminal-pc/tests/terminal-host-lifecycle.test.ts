import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createTerminalViewportMeasurementCoordinator } from "../packages/sdkwork-terminal-pc-shell/src/terminal-host-lifecycle.ts";

test("terminal viewport measurement coordinator retains only the latest trailing layout request", async () => {
  const coordinator = createTerminalViewportMeasurementCoordinator();
  const operationLog: string[] = [];
  let releaseInitialMeasurement: (() => void) | null = null;
  const initialMeasurementGate = new Promise<void>((resolve) => {
    releaseInitialMeasurement = resolve;
  });

  const initialMeasurement = coordinator.run(async () => {
    operationLog.push("initial");
    await initialMeasurementGate;
    return true;
  });
  coordinator.run(async () => {
    operationLog.push("superseded");
    return true;
  });
  coordinator.run(async () => {
    operationLog.push("latest");
    return true;
  });

  releaseInitialMeasurement?.();
  assert.equal(await initialMeasurement, true);
  assert.deepEqual(operationLog, ["initial", "latest"]);
});

test("terminal viewport measurement coordinator cancels a pending trailing measurement on reset", async () => {
  const coordinator = createTerminalViewportMeasurementCoordinator();
  const operationLog: string[] = [];
  let releaseInitialMeasurement: (() => void) | null = null;
  const initialMeasurementGate = new Promise<void>((resolve) => {
    releaseInitialMeasurement = resolve;
  });

  const initialMeasurement = coordinator.run(async () => {
    operationLog.push("initial");
    await initialMeasurementGate;
    return true;
  });
  coordinator.run(async () => {
    operationLog.push("stale-trailing");
    return true;
  });
  coordinator.reset();
  releaseInitialMeasurement?.();

  assert.equal(await initialMeasurement, true);
  assert.deepEqual(operationLog, ["initial"]);
});

test("terminal viewport measurement coordinator keeps a new lifecycle trailing request after stale work settles", async () => {
  const coordinator = createTerminalViewportMeasurementCoordinator();
  const operationLog: string[] = [];
  let releaseOldMeasurement: (() => void) | null = null;
  let releaseNewMeasurement: (() => void) | null = null;
  const oldMeasurementGate = new Promise<void>((resolve) => {
    releaseOldMeasurement = resolve;
  });
  const newMeasurementGate = new Promise<void>((resolve) => {
    releaseNewMeasurement = resolve;
  });

  const oldMeasurement = coordinator.run(async () => {
    operationLog.push("old");
    await oldMeasurementGate;
    return true;
  });
  coordinator.run(async () => {
    operationLog.push("old-trailing");
    return true;
  });
  coordinator.reset();

  const newMeasurement = coordinator.run(async () => {
    operationLog.push("new");
    await newMeasurementGate;
    return true;
  });
  coordinator.run(async () => {
    operationLog.push("new-trailing");
    return true;
  });

  releaseOldMeasurement?.();
  assert.equal(await oldMeasurement, true);
  assert.deepEqual(operationLog, ["old", "new"]);

  releaseNewMeasurement?.();
  assert.equal(await newMeasurement, true);
  assert.deepEqual(operationLog, ["old", "new", "new-trailing"]);
});

test("terminal viewport measurement coordinator queues the latest request during a trailing measurement", async () => {
  const coordinator = createTerminalViewportMeasurementCoordinator();
  const operationLog: string[] = [];
  let releaseInitialMeasurement: (() => void) | null = null;
  let releaseTrailingMeasurement: (() => void) | null = null;
  let markTrailingMeasurementStarted: (() => void) | null = null;
  const initialMeasurementGate = new Promise<void>((resolve) => {
    releaseInitialMeasurement = resolve;
  });
  const trailingMeasurementGate = new Promise<void>((resolve) => {
    releaseTrailingMeasurement = resolve;
  });
  const trailingMeasurementStarted = new Promise<void>((resolve) => {
    markTrailingMeasurementStarted = resolve;
  });

  const measurement = coordinator.run(async () => {
    operationLog.push("initial");
    await initialMeasurementGate;
    return true;
  });
  coordinator.run(async () => {
    operationLog.push("trailing");
    markTrailingMeasurementStarted?.();
    await trailingMeasurementGate;
    return true;
  });

  releaseInitialMeasurement?.();
  await trailingMeasurementStarted;
  coordinator.run(async () => {
    operationLog.push("latest-during-trailing");
    return true;
  });
  releaseTrailingMeasurement?.();

  assert.equal(await measurement, true);
  assert.deepEqual(operationLog, ["initial", "trailing", "latest-during-trailing"]);
});

test("terminal viewport measurement coordinator recovers after a measurement rejection", async () => {
  const coordinator = createTerminalViewportMeasurementCoordinator();
  const failure = new Error("expected measurement failure");

  await assert.rejects(
    coordinator.run(async () => {
      throw failure;
    }),
    failure,
  );

  let recoveryMeasurementCount = 0;
  assert.equal(
    await coordinator.run(async () => {
      recoveryMeasurementCount += 1;
      return true;
    }),
    true,
  );
  assert.equal(recoveryMeasurementCount, 1);
});

test("shared terminal host lifecycle hook centralizes attach, measurement, retry, and disposal orchestration", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-pc-shell",
      "src",
      "terminal-host-lifecycle.ts",
    ),
    "utf8",
  );

  assert.match(source, /export type TerminalHostLifecycleState = "idle" \| "attaching" \| "ready" \| "failed";/);
  assert.match(source, /import \{ runTerminalTaskBestEffort \} from "\.\/terminal-async-boundary\.ts";/);
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
  assert.match(source, /const latestResizeHandlerRef = useLatestRef\(args\.onViewportResize\);/);
  assert.match(source, /const latestActiveRef = useLatestRef\(args\.active\);/);
  assert.match(source, /const latestMeasureViewportRef = useLatestRef\(args\.measureViewport\);/);
  assert.match(source, /const latestAttachHostRef = useLatestRef\(args\.attachHost\);/);
  assert.match(source, /const latestDisposeHostRef = useLatestRef\(args\.disposeHost\);/);
  assert.match(source, /const latestFocusViewportRef = useLatestRef\(args\.focusViewport\);/);
  assert.match(source, /const latestAttachFailureRef = useLatestRef\(args\.onAttachFailure\);/);
  assert.match(source, /export function createTerminalViewportMeasurementCoordinator\(\): TerminalViewportMeasurementCoordinator/);
  assert.match(source, /interface ActiveTerminalViewportMeasurement/);
  assert.match(source, /interface PendingTerminalViewportMeasurement/);
  assert.match(source, /let activeMeasurement: ActiveTerminalViewportMeasurement \| null = null;/);
  assert.match(source, /let trailingMeasurement: PendingTerminalViewportMeasurement \| null = null;/);
  assert.match(source, /function startMeasurement\(/);
  assert.match(source, /if \(activeMeasurement\?\.revision === revision\)/);
  assert.match(source, /if \(trailingMeasurement\?\.revision === revision\)/);
  assert.match(source, /const viewportLifecycleRevisionRef = useRef\(0\);/);
  assert.match(source, /const viewportMeasurementCoordinatorRef = useRef<TerminalViewportMeasurementCoordinator \| null>\(/);
  assert.match(source, /viewportMeasurementCoordinatorRef\.current = createTerminalViewportMeasurementCoordinator\(\);/);
  assert.match(
    source,
    /function runViewportMeasurement\(operation: TerminalViewportMeasurementOperation\) \{/,
  );
  assert.match(source, /return viewportMeasurementCoordinatorRef\.current!\.run\(operation\);/);
  assert.match(source, /const measureViewportNow = useStableCallback\(async \(\): Promise<boolean> => \{/);
  assert.match(source, /return runViewportMeasurement\(async \(\): Promise<boolean> => \{/);
  assert.match(source, /const retryAttachViewport = useStableCallback\(\(\) => \{\s*runTerminalTaskBestEffort\(\(\) => attachViewportRef\.current\?\.\(\)\);\s*\}\);/);
  assert.match(source, /const ensureViewportMeasured = async \(\): Promise<boolean> => \{/);
  assert.match(source, /return runViewportMeasurement\(async \(\): Promise<boolean> => \{/);
  assert.match(source, /viewportMeasurementCoordinatorRef\.current\?\.reset\(\);/);
  assert.match(source, /new ResizeObserver/);
  assert.match(source, /runTerminalTaskBestEffort\(latestDisposeHostRef\.current\);/);
  assert.match(source, /latestAttachFailureRef\.current\?\.\(message\);/);
  assert.match(source, /return \{/);
  assert.match(source, /triggerViewportMeasurement,/);
  assert.doesNotMatch(source, /const latestTriggerViewportMeasurementRef = useRef/);
});


