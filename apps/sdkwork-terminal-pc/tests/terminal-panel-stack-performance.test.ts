import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const terminalPanelStackPath = path.join(
  rootDir,
  "packages",
  "sdkwork-terminal-shell",
  "src",
  "terminal-panel-stack.tsx",
);
const terminalPanelStackMemoPath = path.join(
  rootDir,
  "packages",
  "sdkwork-terminal-shell",
  "src",
  "terminal-panel-stack-memo.ts",
);
const terminalTabStripPath = path.join(
  rootDir,
  "packages",
  "sdkwork-terminal-shell",
  "src",
  "terminal-tab-strip.tsx",
);
const terminalTabStripMemoPath = path.join(
  rootDir,
  "packages",
  "sdkwork-terminal-shell",
  "src",
  "terminal-tab-strip-memo.ts",
);
const shellOverlayStatePath = path.join(
  rootDir,
  "packages",
  "sdkwork-terminal-shell",
  "src",
  "shell-overlay-state.ts",
);

test("terminal panel stack memoization ignores runtime cursor churn for xterm-backed tabs", () => {
  assert.equal(
    fs.existsSync(terminalPanelStackMemoPath),
    true,
    "terminal panel stack memoization must live in a testable pure helper",
  );

  const panelStackSource = fs.readFileSync(terminalPanelStackPath, "utf8");
  const memoSource = fs.readFileSync(terminalPanelStackMemoPath, "utf8");

  assert.match(panelStackSource, /shouldReuseTerminalStageRender/);
  assert.match(
    panelStackSource,
    /memo\(function TerminalStage[\s\S]*shouldReuseTerminalStageRender\)/,
  );
  assert.doesNotMatch(panelStackSource, /previousProps\.tab === nextProps\.tab/);
  assert.match(memoSource, /function areRuntimeTerminalStageInputsEqual/);
  assert.match(
    memoSource,
    /previousTab\.runtimeStreamStarted === nextTab\.runtimeStreamStarted/,
  );
  assert.doesNotMatch(
    memoSource,
    /previousTab\.runtimeCursor === nextTab\.runtimeCursor/,
  );
});

test("terminal panel stage comparator reuses runtime stage renders for cursor-only updates", async () => {
  const { shouldReuseTerminalStageRender } = await import(
    pathToFileURL(terminalPanelStackMemoPath).href
  );
  const runtimeController = {};
  const runtimeClient = {};
  const pendingQueue: unknown[] = [];
  const runtimeBootstrap = {
    kind: "local-process",
    request: {
      command: ["codex", "--no-alt-screen"],
    },
  };
  const createTab = (overrides: Record<string, unknown> = {}) => ({
    id: "tab-runtime-0001",
    title: "Codex",
    targetLabel: "codex / local cli",
    searchQuery: "",
    runtimeBootstrap,
    runtimeSessionId: "session-runtime-0001",
    runtimeAttachmentId: "attachment-runtime-0001",
    runtimeCursor: "100",
    runtimeState: "running",
    runtimeStreamStarted: true,
    runtimeBootstrapAttempts: 1,
    runtimeBootstrapLastError: null,
    runtimePendingInput: "",
    runtimePendingInputQueue: pendingQueue,
    lastExitCode: null,
    snapshot: {
      viewport: {
        cols: 120,
        rows: 32,
      },
    },
    ...overrides,
  });
  const createProps = (tabOverrides: Record<string, unknown> = {}) => ({
    mode: "desktop",
    tabId: "tab-runtime-0001",
    active: true,
    clipboardProvider: undefined,
    runtimeController,
    runtimeClient,
    tab: createTab(tabOverrides),
  });

  assert.equal(
    shouldReuseTerminalStageRender(
      createProps({ runtimeCursor: "100" }),
      createProps({ runtimeCursor: "101" }),
    ),
    true,
  );
  assert.equal(
    shouldReuseTerminalStageRender(
      createProps({ runtimeStreamStarted: false }),
      createProps({ runtimeStreamStarted: true }),
    ),
    false,
  );
  assert.equal(
    shouldReuseTerminalStageRender(
      createProps({ runtimeCursor: "101" }),
      createProps({
        runtimeCursor: "102",
        snapshot: {
          viewport: {
            cols: 132,
            rows: 32,
          },
        },
      }),
    ),
    false,
  );
});

test("terminal panel stage comparator treats cloned runtime bootstraps as stable inputs", async () => {
  const { shouldReuseTerminalStageRender } = await import(
    pathToFileURL(terminalPanelStackMemoPath).href
  );
  const runtimeController = {};
  const runtimeClient = {};
  const pendingQueue: unknown[] = [];
  const createRuntimeBootstrap = (
    overrides: Record<string, unknown> = {},
  ) => ({
    kind: "local-process",
    request: {
      command: ["codex", "--no-alt-screen"],
      workingDirectory: "D:\\workspace\\sdkwork-terminal",
      title: "Codex",
      profileId: "codex",
      ...overrides,
    },
  });
  const createTab = (overrides: Record<string, unknown> = {}) => ({
    id: "tab-runtime-0001",
    title: "Codex",
    targetLabel: "codex / local cli",
    searchQuery: "",
    runtimeBootstrap: createRuntimeBootstrap(),
    runtimeSessionId: "session-runtime-0001",
    runtimeAttachmentId: "attachment-runtime-0001",
    runtimeCursor: "100",
    runtimeState: "running",
    runtimeStreamStarted: true,
    runtimeBootstrapAttempts: 1,
    runtimeBootstrapLastError: null,
    runtimePendingInput: "",
    runtimePendingInputQueue: pendingQueue,
    lastExitCode: null,
    snapshot: {
      viewport: {
        cols: 120,
        rows: 32,
      },
    },
    ...overrides,
  });
  const createProps = (tabOverrides: Record<string, unknown> = {}) => ({
    mode: "desktop",
    tabId: "tab-runtime-0001",
    active: true,
    clipboardProvider: undefined,
    runtimeController,
    runtimeClient,
    tab: createTab(tabOverrides),
  });

  assert.notEqual(
    createRuntimeBootstrap(),
    createRuntimeBootstrap(),
    "test setup must model snapshot bootstrap clones",
  );
  assert.equal(
    shouldReuseTerminalStageRender(
      createProps({
        runtimeBootstrap: createRuntimeBootstrap(),
        runtimeCursor: "100",
      }),
      createProps({
        runtimeBootstrap: createRuntimeBootstrap(),
        runtimeCursor: "101",
      }),
    ),
    true,
  );
  assert.equal(
    shouldReuseTerminalStageRender(
      createProps({
        runtimeBootstrap: createRuntimeBootstrap(),
        runtimeCursor: "101",
      }),
      createProps({
        runtimeBootstrap: createRuntimeBootstrap({
          command: ["codex", "--dangerously-bypass-approvals-and-sandbox"],
        }),
        runtimeCursor: "102",
      }),
    ),
    false,
  );
  assert.equal(
    shouldReuseTerminalStageRender(
      createProps({
        runtimeBootstrap: createRuntimeBootstrap(),
        runtimeCursor: "102",
      }),
      createProps({
        runtimeBootstrap: createRuntimeBootstrap({
          workingDirectory: "D:\\workspace\\other-project",
        }),
        runtimeCursor: "103",
      }),
    ),
    false,
  );
});

test("terminal panel stage comparator treats cloned pending input queues as stable inputs", async () => {
  const { shouldReuseTerminalStageRender } = await import(
    pathToFileURL(terminalPanelStackMemoPath).href
  );
  const runtimeController = {};
  const runtimeClient = {};
  const runtimeBootstrap = {
    kind: "local-process",
    request: {
      command: ["codex"],
    },
  };
  const createPendingQueue = (
    text = "npm test\r",
    bytes = [3],
  ) => [
    {
      kind: "text",
      data: text,
    },
    {
      kind: "binary",
      inputBytes: bytes,
    },
  ];
  const createTab = (overrides: Record<string, unknown> = {}) => ({
    id: "tab-runtime-0001",
    title: "Codex",
    targetLabel: "codex / local cli",
    searchQuery: "",
    runtimeBootstrap,
    runtimeSessionId: "session-runtime-0001",
    runtimeAttachmentId: "attachment-runtime-0001",
    runtimeCursor: "100",
    runtimeState: "running",
    runtimeStreamStarted: true,
    runtimeBootstrapAttempts: 1,
    runtimeBootstrapLastError: null,
    runtimePendingInput: "",
    runtimePendingInputQueue: createPendingQueue(),
    lastExitCode: null,
    snapshot: {
      viewport: {
        cols: 120,
        rows: 32,
      },
    },
    ...overrides,
  });
  const createProps = (tabOverrides: Record<string, unknown> = {}) => ({
    mode: "desktop",
    tabId: "tab-runtime-0001",
    active: true,
    clipboardProvider: undefined,
    runtimeController,
    runtimeClient,
    tab: createTab(tabOverrides),
  });

  assert.notEqual(
    createPendingQueue(),
    createPendingQueue(),
    "test setup must model snapshot pending queue clones",
  );
  assert.equal(
    shouldReuseTerminalStageRender(
      createProps({
        runtimeCursor: "100",
        runtimePendingInputQueue: createPendingQueue(),
      }),
      createProps({
        runtimeCursor: "101",
        runtimePendingInputQueue: createPendingQueue(),
      }),
    ),
    true,
  );
  assert.equal(
    shouldReuseTerminalStageRender(
      createProps({
        runtimeCursor: "101",
        runtimePendingInputQueue: createPendingQueue(),
      }),
      createProps({
        runtimeCursor: "102",
        runtimePendingInputQueue: createPendingQueue("pnpm verify\r"),
      }),
    ),
    false,
  );
  assert.equal(
    shouldReuseTerminalStageRender(
      createProps({
        runtimeCursor: "102",
        runtimePendingInputQueue: createPendingQueue(),
      }),
      createProps({
        runtimeCursor: "103",
        runtimePendingInputQueue: createPendingQueue("npm test\r", [4]),
      }),
    ),
    false,
  );
});

test("terminal panel stack keeps memoized stage callbacks wired to latest parent handlers", () => {
  const panelStackSource = fs.readFileSync(terminalPanelStackPath, "utf8");

  assert.match(
    panelStackSource,
    /import \{ useLatestRef \} from "\.\/terminal-react-stability\.ts";/,
  );
  assert.match(
    panelStackSource,
    /const latestPanelStackPropsRef = useLatestRef\(props\);/,
  );
  assert.match(
    panelStackSource,
    /latestPanelStackPropsRef\.current\.onViewportInput\(tab\.id,\s*input\)/,
  );
  assert.match(
    panelStackSource,
    /latestPanelStackPropsRef\.current\.onRuntimeReplayApplied\(tab\.id,\s*replay\)/,
  );
  assert.match(
    panelStackSource,
    /latestPanelStackPropsRef\.current\.onRestartRuntime\(tab\.id\)/,
  );
  assert.doesNotMatch(
    panelStackSource,
    /props\.onViewportInput\(tab\.id,\s*input\)/,
  );
  assert.doesNotMatch(
    panelStackSource,
    /props\.onRuntimeReplayApplied\(tab\.id,\s*replay\)/,
  );
});

test("shell runtime bridge syncs runtime controllers only when tab ids change", () => {
  const shellRuntimeBridgeSource = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-shell",
      "src",
      "shell-runtime-bridge.ts",
    ),
    "utf8",
  );
  const runtimeDerivedStateSource = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-shell",
      "src",
      "runtime-derived-state.ts",
    ),
    "utf8",
  );

  assert.match(runtimeDerivedStateSource, /tabIdsEffectKey: string;/);
  assert.match(runtimeDerivedStateSource, /tabIds: string\[\];/);
  assert.match(shellRuntimeBridgeSource, /args\.runtimeDerivedState\.tabIds/);
  assert.match(
    shellRuntimeBridgeSource,
    /\[args\.runtimeDerivedState\.tabIdsEffectKey\]/,
  );
  assert.match(
    shellRuntimeBridgeSource,
    /runTerminalTaskBestEffort\(\s*\(\) =>\s*resizeActiveRuntimeSessionController\(\{/,
  );
  assert.match(
    shellRuntimeBridgeSource,
    /console\.error\("\[sdkwork-terminal\] failed to resize active runtime session", error\);/,
  );
  assert.doesNotMatch(shellRuntimeBridgeSource, /\[args\.snapshot\.tabs\]/);
  assert.doesNotMatch(shellRuntimeBridgeSource, /void resizeActiveRuntimeSessionController\(/);
});

test("shell global shortcuts keep one document listener across runtime cursor churn", () => {
  const shellGlobalShortcutsSource = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-shell",
      "src",
      "shell-global-shortcuts.ts",
    ),
    "utf8",
  );

  assert.match(shellGlobalShortcutsSource, /shouldIgnoreTerminalGlobalShortcutTarget/);
  assert.match(shellGlobalShortcutsSource, /const latestShortcutArgsRef = useRef\(args\);/);
  assert.match(shellGlobalShortcutsSource, /latestShortcutArgsRef\.current = args;/);
  assert.match(shellGlobalShortcutsSource, /const shortcutArgs = latestShortcutArgsRef\.current;/);
  assert.match(
    shellGlobalShortcutsSource,
    /document\.addEventListener\("keydown", handleGlobalKeyDown\);/,
  );
  assert.match(shellGlobalShortcutsSource, /\}, \[\]\);/);
  assert.doesNotMatch(shellGlobalShortcutsSource, /args\.snapshotTabs,\s*\n/);
  assert.doesNotMatch(shellGlobalShortcutsSource, /args\.activeTab\.snapshot\.viewport,\s*\n/);
});

test("latest shell snapshot ref updates during render instead of a cursor-churn effect", () => {
  const shellAppStateSource = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-shell",
      "src",
      "shell-app-state.ts",
    ),
    "utf8",
  );
  const shellRuntimeBridgeSource = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-shell",
      "src",
      "shell-runtime-bridge.ts",
    ),
    "utf8",
  );

  assert.match(shellAppStateSource, /latestSnapshotRef\.current = snapshot;/);
  assert.doesNotMatch(
    shellRuntimeBridgeSource,
    /args\.latestSnapshotRef\.current = args\.snapshot;/,
  );
});

test("runtime client refs update during render instead of bridge effects", () => {
  const shellRuntimeResourcesSource = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-shell",
      "src",
      "shell-runtime-resources.ts",
    ),
    "utf8",
  );
  const shellRuntimeBridgeSource = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-shell",
      "src",
      "shell-runtime-bridge.ts",
    ),
    "utf8",
  );

  assert.match(
    shellRuntimeResourcesSource,
    /desktopRuntimeClientRef\.current = args\.desktopRuntimeClient;/,
  );
  assert.match(
    shellRuntimeResourcesSource,
    /webRuntimeClientRef\.current = args\.webRuntimeClient;/,
  );
  assert.doesNotMatch(
    shellRuntimeBridgeSource,
    /args\.desktopRuntimeClientRef\.current = args\.desktopRuntimeClient;/,
  );
  assert.doesNotMatch(
    shellRuntimeBridgeSource,
    /args\.webRuntimeClientRef\.current = args\.webRuntimeClient;/,
  );
});

test("desktop launch intent effects depend on viewport dimensions instead of snapshot object identity", () => {
  const shellRuntimeBridgeSource = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-shell",
      "src",
      "shell-runtime-bridge.ts",
    ),
    "utf8",
  );

  assert.match(
    shellRuntimeBridgeSource,
    /const activeViewportCols = args\.activeTab\.snapshot\.viewport\.cols;/,
  );
  assert.match(
    shellRuntimeBridgeSource,
    /const activeViewportRows = args\.activeTab\.snapshot\.viewport\.rows;/,
  );
  assert.doesNotMatch(
    shellRuntimeBridgeSource,
    /\[args\.activeTab\.snapshot\.viewport,\s*args\.desktopSessionReattachIntent,\s*args\.mode\]/,
  );
  assert.doesNotMatch(
    shellRuntimeBridgeSource,
    /\[args\.activeTab\.snapshot\.viewport,\s*args\.desktopConnectorSessionIntent,\s*args\.mode\]/,
  );
  assert.match(
    shellRuntimeBridgeSource,
    /\[\s*activeViewportCols,\s*activeViewportRows,\s*args\.desktopSessionReattachIntent,\s*args\.mode,\s*\]/,
  );
  assert.match(
    shellRuntimeBridgeSource,
    /\[\s*activeViewportCols,\s*activeViewportRows,\s*args\.desktopConnectorSessionIntent,\s*args\.mode,\s*\]/,
  );
});

test("terminal tab strip memoization ignores runtime cursor churn", () => {
  assert.equal(
    fs.existsSync(terminalTabStripMemoPath),
    true,
    "terminal tab strip memoization must live in a testable pure helper",
  );

  const tabStripSource = fs.readFileSync(terminalTabStripPath, "utf8");
  const memoSource = fs.readFileSync(terminalTabStripMemoPath, "utf8");

  assert.match(tabStripSource, /MemoTerminalTabList/);
  assert.match(tabStripSource, /shouldReuseTerminalTabListRender/);
  assert.match(memoSource, /function areTerminalTabListItemsEqual/);
  assert.match(memoSource, /if \(previousProfiles === nextProfiles\) \{/);
  assert.match(memoSource, /previousTab\.runtimeState === nextTab\.runtimeState/);
  assert.match(memoSource, /previousTab\.runtimeSessionId === nextTab\.runtimeSessionId/);
  assert.doesNotMatch(memoSource, /previousTab\.runtimeCursor === nextTab\.runtimeCursor/);
});

test("shell overlay launch profile arrays stay memoized across runtime cursor churn", () => {
  const shellOverlayStateSource = fs.readFileSync(shellOverlayStatePath, "utf8");

  assert.match(shellOverlayStateSource, /import \{ useMemo, useState/);
  assert.match(
    shellOverlayStateSource,
    /const launchProfiles = useMemo\([\s\S]*desktopWslLaunchProfiles[\s\S]*\[args\.mode,\s*desktopWslLaunchProfiles\]/,
  );
  assert.match(
    shellOverlayStateSource,
    /const shellLaunchProfiles = useMemo\(\s*\(\) => launchProfiles\.filter\(\(entry\) => entry\.group === "shell"\),\s*\[launchProfiles\],\s*\);/,
  );
  assert.match(
    shellOverlayStateSource,
    /const wslLaunchProfiles = useMemo\(\s*\(\) => launchProfiles\.filter\(\(entry\) => entry\.group === "wsl"\),\s*\[launchProfiles\],\s*\);/,
  );
  assert.match(
    shellOverlayStateSource,
    /const cliLaunchProfiles = useMemo\(\s*\(\) => launchProfiles\.filter\(\(entry\) => entry\.group === "cli"\),\s*\[launchProfiles\],\s*\);/,
  );
});

test("terminal tab strip comparator reuses tab list renders for cursor-only updates", async () => {
  const { shouldReuseTerminalTabListRender } = await import(
    pathToFileURL(terminalTabStripMemoPath).href
  );
  const createTab = (overrides: Record<string, unknown> = {}) => ({
    id: "tab-runtime-0001",
    title: "Codex",
    profile: "bash",
    active: true,
    closable: true,
    runtimeState: "running",
    runtimeSessionId: "session-runtime-0001",
    runtimeCursor: "100",
    ...overrides,
  });
  const createProps = (overrides: Record<string, unknown> = {}) => ({
    tabs: [createTab(overrides)],
    launchProfiles: [
      {
        id: "bash",
        label: "Bash",
        group: "shell",
        profile: "bash",
        accent: "#22c55e",
      },
    ],
    hoveredTabId: null,
    shouldDockTabActionsToTrailing: false,
    tabScrollRef: { current: null },
    setCanScrollLeft() {},
    setCanScrollRight() {},
    onOpenTabContextMenu() {},
    onActivateTab() {},
    onCloseTab() {},
    onSetHoveredTabId() {},
  });

  assert.equal(
    shouldReuseTerminalTabListRender(
      createProps({ runtimeCursor: "100" }),
      createProps({ runtimeCursor: "101" }),
    ),
    true,
  );
  assert.equal(
    shouldReuseTerminalTabListRender(
      createProps({ runtimeState: "running" }),
      createProps({ runtimeState: "exited" }),
    ),
    false,
  );
  assert.equal(
    shouldReuseTerminalTabListRender(
      createProps({ runtimeSessionId: "session-runtime-0001" }),
      createProps({ runtimeSessionId: "session-runtime-0002" }),
    ),
    false,
  );
  assert.equal(
    shouldReuseTerminalTabListRender(
      createProps({ title: "Codex" }),
      createProps({ title: "Shell" }),
    ),
    false,
  );
});
