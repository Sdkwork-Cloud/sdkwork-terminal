import { fileURLToPath } from "node:url";

import {
  DESKTOP_TAURI_MANIFEST,
  RUNTIME_NODE_MANIFEST,
} from "./smoke-contract.mjs";

function readFlagValue(argv, flag) {
  const index = argv.indexOf(flag);
  if (index < 0) {
    return null;
  }

  return argv[index + 1] ?? null;
}

function normalizePlatform(value) {
  if (typeof value !== "string") {
    return "ubuntu-server";
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : "ubuntu-server";
}

function resolvePreset(options = {}) {
  return {
    platform: normalizePlatform(options.platform),
    hostMode: "browser",
    browserTerminalStatus: "unavailable",
  };
}

function buildAutomatedEvidence() {
  return [
    "node --experimental-strip-types --test tests/web-runtime-config.test.ts tests/shell-app-render.test.ts",
    "node --experimental-test-isolation=none --test tests/browser-runtime-surface-safety.test.mjs tests/web-remote-runtime-smoke-probe.test.ts",
    "node --experimental-strip-types --test tests/web-runtime-bridge.test.ts",
    `cargo test --manifest-path ${RUNTIME_NODE_MANIFEST} -- --nocapture`,
    `cargo check --manifest-path ${DESKTOP_TAURI_MANIFEST}`,
    "pnpm typecheck",
  ];
}

function buildBrowserControlPlaneChecks() {
  return [
    {
      id: "browser-fail-closed",
      label: "Browser rejects legacy runtime configuration and renders the unavailable terminal stage.",
      kind: "automated",
      status: "pending",
    },
    {
      id: "browser-import-graph",
      label: "Browser module graph excludes the private runtime SDK, legacy bridge, legacy routes, and manual SSE authorization.",
      kind: "automated",
      status: "pending",
    },
    {
      id: "legacy-runtime-private",
      label: "Legacy runtime-node tests remain private-worker verification and do not authorize Browser ingress.",
      kind: "boundary",
      status: "pending",
    },
    {
      id: "approved-control-plane",
      label: "Browser remote execution remains blocked pending the reviewed device Internal API, ingress-token, and private node channel.",
      kind: "human-review",
      status: "blocked",
    },
  ];
}

export function buildWebRemoteRuntimeSmokePlan() {
  return {
    kind: "browser-remote-terminal-control-plane-gate",
    title: "SDKWork Browser remote terminal control-plane gate",
    checkpoints: [
      {
        id: "browser-legacy-runtime-fail-closed",
        label: "Browser legacy runtime-node path is unavailable by design.",
      },
      {
        id: "approved-remote-control-plane",
        label: "Reviewed device Internal API control plane is required before Browser execution.",
      },
    ],
    runtimeTargets: [],
    automatedEvidence: buildAutomatedEvidence(),
    constraints: [
      "Browser ignores legacy VITE_*TERMINAL_RUNTIME* configuration.",
      "Product-local terminal routes remain loopback/private-worker protocols and are never a Browser fallback.",
      "Browser remote execution requires the approved SDKWork device Internal API control plane and its required human reviews.",
    ],
  };
}

export function buildWebRemoteRuntimeReportTemplate(options = {}) {
  const preset = resolvePreset(options);

  return {
    kind: "browser-remote-terminal-control-plane-report",
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    platform: preset.platform,
    hostMode: preset.hostMode,
    browserTerminalStatus: preset.browserTerminalStatus,
    commands: buildAutomatedEvidence(),
    checks: buildBrowserControlPlaneChecks(),
    topologyKeys: [],
    notes: [
      "The private runtime-node verification command is retained only for private-worker protocol coverage.",
      "Do not perform a Browser smoke test against product-local terminal routes.",
    ],
  };
}

export function buildWebRemoteRuntimeReviewTemplate(options = {}) {
  const report = buildWebRemoteRuntimeReportTemplate(options);
  const lines = [
    "# Browser Remote Terminal Control-Plane Gate",
    "",
    `Platform: \`${report.platform}\``,
    `Host mode: \`${report.hostMode}\``,
    `Browser terminal status: \`${report.browserTerminalStatus}\``,
    "",
    "## Commands",
    ...report.commands.map((command) => `- \`${command}\``),
    "",
    "## Expected State",
    "- [ ] Browser rejects legacy terminal runtime configuration and shows the unavailable terminal state.",
    "- [ ] Browser development configuration has no terminal-route proxy.",
    "- [ ] Private runtime-node protocol tests remain separate from Browser release evidence.",
    "",
    "## Control-Plane Gate",
    "- [ ] Confirm the device Internal API, ingress-token, target/session grants, and private node channel have approved owners before enabling Browser execution.",
    "- [ ] Confirm public ingress rejects product-local terminal routes before a Browser remote release.",
    "",
    "## Checklist",
    ...report.checks.map((check) => `- [${check.status === "blocked" ? " " : " "}] \`${check.id}\` - ${check.label}`),
    "",
    "## Review Notes",
    "- [ ] Record approved control-plane evidence separately from this fail-closed baseline.",
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

  const options = {
    platform: readFlagValue(argv, "--platform"),
  };

  if (argv.includes("--report-template")) {
    printJson(buildWebRemoteRuntimeReportTemplate(options), stdout);
    return;
  }

  if (argv.includes("--review-template")) {
    stdout.write(buildWebRemoteRuntimeReviewTemplate(options));
    return;
  }

  throw new Error("unsupported Browser remote terminal control-plane gate arguments");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runWebRemoteRuntimeProbeCli(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
