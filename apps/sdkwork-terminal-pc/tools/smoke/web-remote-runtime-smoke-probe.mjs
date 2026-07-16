import { fileURLToPath } from "node:url";

import {
  DESKTOP_TAURI_MANIFEST,
  RUNTIME_NODE_MANIFEST,
} from "./smoke-contract.mjs";

function readFlagValue(argv, flag) {
  const index = argv.indexOf(flag);
  return index < 0 ? null : argv[index + 1] ?? null;
}

function normalizePlatform(value) {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  return normalized || "ubuntu-server";
}

function resolvePreset(options = {}) {
  return {
    platform: normalizePlatform(options.platform),
    hostMode: "browser",
    browserTerminalStatus: "ready-for-smoke",
  };
}

function buildAutomatedEvidence() {
  return [
    "node --experimental-strip-types --test tests/web-runtime-config.test.ts tests/web-runtime-bridge.test.ts",
    "node --experimental-test-isolation=none --test tests/browser-runtime-surface-safety.test.mjs tests/web-remote-runtime-smoke-probe.test.ts",
    "cargo test -p sdkwork-routes-terminal-app-api",
    `cargo test --manifest-path ${RUNTIME_NODE_MANIFEST} -- --nocapture`,
    `cargo check --manifest-path ${DESKTOP_TAURI_MANIFEST}`,
    "pnpm typecheck",
  ];
}

function buildBrowserAppApiChecks() {
  return [
    {
      id: "terminal-app-sdk",
      label: "Browser lifecycle requests use @sdkwork/terminal-app-sdk and /app/v3/api/device/terminal/**.",
      kind: "automated",
      status: "pending",
    },
    {
      id: "dual-token-context",
      label: "JSON and SSE requests carry Authorization and Access-Token from the global TokenManager.",
      kind: "automated",
      status: "pending",
    },
    {
      id: "gateway-route-classification",
      label: "Application ingress classifies Terminal routes as protected dual-token app-api operations.",
      kind: "automated",
      status: "pending",
    },
    {
      id: "legacy-runtime-private",
      label: "Legacy /terminal/api/v1 and /terminal/stream/v1 protocols remain private runtime-node boundaries.",
      kind: "boundary",
      status: "pending",
    },
    {
      id: "interactive-browser-lifecycle",
      label: "Authenticated Browser create, output, input, resize, replay, and terminate all succeed.",
      kind: "human-review",
      status: "pending",
    },
  ];
}

export function buildWebRemoteRuntimeSmokePlan() {
  return {
    kind: "browser-terminal-app-api-smoke-plan",
    title: "SDKWork Browser Terminal App API smoke plan",
    checkpoints: [
      {
        id: "protected-app-api",
        label: "Browser terminal reaches the protected public Terminal App API.",
      },
      {
        id: "interactive-terminal",
        label: "The xterm surface completes a real interactive session lifecycle.",
      },
    ],
    runtimeTargets: ["server-runtime-node"],
    automatedEvidence: buildAutomatedEvidence(),
    constraints: [
      "Browser ignores legacy VITE_*TERMINAL_RUNTIME* configuration.",
      "Browser network requests use only /app/v3/api/device/terminal/** for Terminal control and events.",
      "Product-local runtime-node routes remain private and are never a Browser fallback.",
    ],
  };
}

export function buildWebRemoteRuntimeReportTemplate(options = {}) {
  const preset = resolvePreset(options);
  return {
    kind: "browser-terminal-app-api-smoke-report",
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    platform: preset.platform,
    hostMode: preset.hostMode,
    browserTerminalStatus: preset.browserTerminalStatus,
    commands: buildAutomatedEvidence(),
    checks: buildBrowserAppApiChecks(),
    topologyKeys: ["VITE_SDKWORK_TERMINAL_APPLICATION_PUBLIC_HTTP_URL"],
    notes: [
      "Use an authenticated Browser session with both SDKWork tokens.",
      "Reject any Browser request to legacy product-local Terminal routes.",
    ],
  };
}

export function buildWebRemoteRuntimeReviewTemplate(options = {}) {
  const report = buildWebRemoteRuntimeReportTemplate(options);
  const lines = [
    "# Browser Terminal App API Smoke Review",
    "",
    `Platform: \`${report.platform}\``,
    `Host mode: \`${report.hostMode}\``,
    `Browser terminal status: \`${report.browserTerminalStatus}\``,
    "",
    "## Commands",
    ...report.commands.map((command) => `- \`${command}\``),
    "",
    "## Expected State",
    "- [ ] Browser creates a session through the protected Terminal App API.",
    "- [ ] Terminal output renders in xterm and input reaches the PTY.",
    "- [ ] Resize, replay, reconnect, and terminate complete successfully.",
    "- [ ] Network traffic contains no /terminal/api/v1 or /terminal/stream/v1 Browser requests.",
    "",
    "## Checklist",
    ...report.checks.map((check) => `- [ ] \`${check.id}\` - ${check.label}`),
  ];
  return `${lines.join("\n")}\n`;
}

function printJson(value, stdout = process.stdout) {
  stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export async function runWebRemoteRuntimeProbeCli(argv, dependencies = {}) {
  const stdout = dependencies.stdout ?? process.stdout;
  if (argv.includes("--print-plan") || argv.length === 0) {
    printJson(buildWebRemoteRuntimeSmokePlan(), stdout);
    return;
  }

  const options = { platform: readFlagValue(argv, "--platform") };
  if (argv.includes("--report-template")) {
    printJson(buildWebRemoteRuntimeReportTemplate(options), stdout);
    return;
  }
  if (argv.includes("--review-template")) {
    stdout.write(buildWebRemoteRuntimeReviewTemplate(options));
    return;
  }
  throw new Error("unsupported Browser Terminal App API smoke arguments");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runWebRemoteRuntimeProbeCli(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
