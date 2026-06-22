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

function normalizeOption(value, fallback) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : fallback;
}

function resolvePreset(options = {}) {
  return {
    platform: normalizeOption(options.platform, "ubuntu-server"),
    hostMode: "server",
    runtimeTarget: normalizeOption(options.runtimeTarget, "remote-runtime"),
  };
}

function buildAutomatedEvidence() {
  return [
    "node --experimental-strip-types --test tests/web-runtime-bridge.test.ts",
    "node --experimental-strip-types --test tests/runtime-tab-controller.test.ts",
    "node --experimental-strip-types --test tests/shell-tabs.test.ts",
    `cargo test --manifest-path ${RUNTIME_NODE_MANIFEST} -- --nocapture`,
    `cargo check --manifest-path ${DESKTOP_TAURI_MANIFEST}`,
    "pnpm typecheck",
  ];
}

function buildRemoteRuntimeChecks(preset) {
  return [
    {
      id: "web-bridge-lifecycle",
      label: "web runtime bridge routes remote-runtime session create/replay/input/resize/terminate",
      kind: "automated",
      status: "pending",
    },
    {
      id: "sse-stream-warning",
      label: "runtimeStream emits structured warning entries on disconnect",
      kind: "automated",
      status: "pending",
    },
    {
      id: "shell-stream-resync",
      label: "runtime tab controller replays and resubscribes after stream disconnect warnings",
      kind: "automated",
      status: "pending",
    },
    {
      id: "runtime-node-host",
      label: "runtime-node host creates remote-runtime sessions and fans out stream events",
      kind: "automated",
      status: "pending",
    },
    {
      id: "manual-web-smoke",
      label: `manual web shell smoke against ${preset.runtimeTarget} with topology runtime env keys`,
      kind: "manual",
      status: "pending",
    },
  ];
}

export function buildWebRemoteRuntimeSmokePlan() {
  return {
    kind: "web-remote-runtime-smoke-plan",
    title: "sdkwork web remote-runtime smoke probe",
    checkpoints: [
      {
        id: "cp07-5-web-bridge",
        label: "web runtime bridge session-first lifecycle",
      },
      {
        id: "cp07-5-stream-recovery",
        label: "SSE disconnect warning + replay resync baseline",
      },
    ],
    runtimeTargets: ["remote-runtime", "server-runtime-node"],
    automatedEvidence: buildAutomatedEvidence(),
    constraints: [
      "remote-runtime uses remote-api requests; do not route through desktop system-cli connector launch plans.",
      "desktop catalog keeps remote-runtime read-only until interactive attach ships.",
      "Use VITE_SDKWORK_TERMINAL_RUNTIME_* topology keys for web shell runtime target wiring.",
    ],
  };
}

export function buildWebRemoteRuntimeReportTemplate(options = {}) {
  const preset = resolvePreset(options);

  return {
    kind: "web-remote-runtime-smoke-report",
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    platform: preset.platform,
    hostMode: preset.hostMode,
    runtimeTarget: preset.runtimeTarget,
    commands: buildAutomatedEvidence(),
    checks: buildRemoteRuntimeChecks(preset),
    topologyKeys: [
      "VITE_SDKWORK_TERMINAL_RUNTIME_WORKSPACE_ID",
      "VITE_SDKWORK_TERMINAL_RUNTIME_AUTHORITY",
      "VITE_SDKWORK_TERMINAL_RUNTIME_TARGET",
      "VITE_SDKWORK_TERMINAL_RUNTIME_WORKING_DIRECTORY",
      "SDKWORK_RUNTIME_NODE_REQUIRE_AUTH",
    ],
    notes: [],
  };
}

export function buildWebRemoteRuntimeReviewTemplate(options = {}) {
  const report = buildWebRemoteRuntimeReportTemplate(options);
  const lines = [
    "# Web Remote Runtime Smoke Review",
    "",
    `Platform: \`${report.platform}\``,
    `Host mode: \`${report.hostMode}\``,
    `Runtime target: \`${report.runtimeTarget}\``,
    "",
    "## Commands",
    ...report.commands.map((command) => `- \`${command}\``),
    "",
    "## Topology keys",
    ...report.topologyKeys.map((key) => `- \`${key}\``),
    "",
    "## Checklist",
    ...report.checks.map((check) => `- [ ] \`${check.id}\` - ${check.label}`),
    "",
    "## Review Notes",
    "- [ ] Confirm web shell can create a remote-runtime tab through WebShellApp.",
    "- [ ] Confirm SSE disconnect produces warning entries and replay resync restores output.",
    "- [ ] Confirm runtime-node auth is enforced when SDKWORK_RUNTIME_NODE_REQUIRE_AUTH=true.",
    "- [ ] Record any environment blocker separately from bridge behavior.",
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
    runtimeTarget: readFlagValue(argv, "--runtime-target"),
  };

  if (argv.includes("--report-template")) {
    printJson(buildWebRemoteRuntimeReportTemplate(options), stdout);
    return;
  }

  if (argv.includes("--review-template")) {
    stdout.write(buildWebRemoteRuntimeReviewTemplate(options));
    return;
  }

  throw new Error("unsupported web remote-runtime probe arguments");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runWebRemoteRuntimeProbeCli(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
