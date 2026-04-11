import { fileURLToPath } from "node:url";

const PLATFORM_PRESETS = {
  "windows-desktop": {
    platform: "windows-desktop",
    hostMode: "desktop",
    cpuArch: "x64",
    shell: "powershell",
    storageSurface: "session-runtime.sqlite3",
  },
  "ubuntu-desktop": {
    platform: "ubuntu-desktop",
    hostMode: "desktop",
    cpuArch: "x64",
    shell: "bash",
    storageSurface: "session-runtime.sqlite3",
  },
  "macos-desktop": {
    platform: "macos-desktop",
    hostMode: "desktop",
    cpuArch: "arm64",
    shell: "zsh",
    storageSurface: "session-runtime.sqlite3",
  },
  "ubuntu-server": {
    platform: "ubuntu-server",
    hostMode: "server",
    cpuArch: "x64",
    shell: "bash",
    storageSurface: "session-runtime.sqlite3 under runtime-node persistence root",
  },
};

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
  const defaultPlatform = process.platform === "win32" ? "windows-desktop" : "ubuntu-desktop";
  const platform = normalizeOption(options.platform, defaultPlatform);
  const preset = PLATFORM_PRESETS[platform] ?? PLATFORM_PRESETS[defaultPlatform];

  return {
    ...preset,
    platform,
    hostMode: normalizeOption(options.hostMode, preset.hostMode),
    cpuArch: normalizeOption(options.cpuArch, preset.cpuArch),
    shell: normalizeOption(options.shell, preset.shell),
  };
}

function buildSessionRecoveryCommands(preset) {
  const commands = [
    "cargo test --manifest-path crates/sdkwork-terminal-control-plane/Cargo.toml -- --nocapture",
    "cargo test --manifest-path crates/sdkwork-terminal-session-runtime/Cargo.toml -- --nocapture",
    "node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-session-center.test.ts tests/desktop-session-reattach.test.ts tests/shell-tabs.test.ts tests/shell-app-render.test.ts tests/terminal-fidelity-probe.test.ts",
    "pnpm typecheck",
    "node tools/smoke/session-recovery-probe.mjs --print-plan",
  ];

  if (preset.hostMode === "desktop") {
    commands.splice(2, 0, "cargo check --manifest-path src-tauri/Cargo.toml");
    if (preset.platform === "windows-desktop") {
      commands.unshift(
        "powershell -ExecutionPolicy Bypass -File tools/smoke/session-recovery-probe.ps1",
      );
    }
  } else {
    commands.splice(
      2,
      0,
      "cargo test --manifest-path crates/sdkwork-terminal-runtime-node/Cargo.toml -- --nocapture",
    );
  }

  return commands;
}

function buildRecoveryChecks(preset) {
  const reattachLabel =
    preset.hostMode === "desktop"
      ? "desktop restart keeps session recoverable through reattach or replay"
      : "server restart keeps session recoverable from persisted index and replay";

  return [
    {
      id: "persisted-index",
      label: "persisted session index survives process restart",
      kind: "automated",
      status: "pending",
    },
    {
      id: "replay-recovery",
      label: "replay transcript can be read back after restart",
      kind: "automated",
      status: "pending",
    },
    {
      id: "reattach-or-recover",
      label: reattachLabel,
      kind: preset.hostMode === "desktop" ? "manual" : "mixed",
      status: "pending",
    },
    {
      id: "attachment-ack-truth",
      label: "ack and cursor truth stay aligned with recovered session state",
      kind: "mixed",
      status: "pending",
    },
    {
      id: "platform-diagnostics",
      label: "platformFamily, cpuArch, hostMode, and recovery evidence are recorded",
      kind: "manual",
      status: "pending",
    },
  ];
}

export function buildSessionRecoverySmokePlan() {
  return {
    kind: "session-recovery-smoke-plan",
    title: "sdkwork session recovery probe",
    checkpoints: [
      {
        id: "cp06-3b-desktop-bootstrap",
        label: "desktop shared sqlite bootstrap and recovery truth loop",
      },
      {
        id: "cp06-5-platform-recovery-matrix",
        label: "windows / ubuntu / macos / ubuntu-server recovery evidence matrix",
      },
    ],
    platforms: Object.values(PLATFORM_PRESETS).map((preset) => ({
      id: preset.platform,
      hostMode: preset.hostMode,
      defaultCpuArch: preset.cpuArch,
      defaultShell: preset.shell,
      storageSurface: preset.storageSurface,
    })),
    automatedEvidence: [
      "cargo test --manifest-path crates/sdkwork-terminal-control-plane/Cargo.toml -- --nocapture",
      "cargo test --manifest-path crates/sdkwork-terminal-session-runtime/Cargo.toml -- --nocapture",
      "cargo test --manifest-path crates/sdkwork-terminal-runtime-node/Cargo.toml -- --nocapture",
      "cargo check --manifest-path src-tauri/Cargo.toml",
      "pnpm typecheck",
    ],
    constraints: [
      "src-tauri Rust unit tests may fail on the current Windows host with STATUS_ENTRYPOINT_NOT_FOUND; do not treat that host-loader failure as Step 06 business evidence.",
      "Use this probe to capture repeatable platform evidence before moving beyond Step 06 CP06-5.",
    ],
  };
}

export function buildSessionRecoveryReportTemplate(options = {}) {
  const preset = resolvePreset(options);

  return {
    kind: "session-recovery-smoke-report",
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    platform: preset.platform,
    hostMode: preset.hostMode,
    cpuArch: preset.cpuArch,
    shell: preset.shell,
    storageSurface: preset.storageSurface,
    commands: buildSessionRecoveryCommands(preset),
    checks: buildRecoveryChecks(preset),
    notes: [],
    constraints: [
      "Record host-loader failures explicitly instead of converting them into pass/fail guesses.",
      "Desktop host path is expected to use session-runtime.sqlite3 under app_local_data_dir().",
      "Server host path is expected to use session-runtime.sqlite3 under the runtime-node persistence root.",
    ],
  };
}

export function buildSessionRecoveryReviewTemplate(options = {}) {
  const report = buildSessionRecoveryReportTemplate(options);
  const lines = [
    "# Session Recovery Smoke Review",
    "",
    `Platform: \`${report.platform}\``,
    `Host mode: \`${report.hostMode}\``,
    `CPU arch: \`${report.cpuArch}\``,
    `Shell: \`${report.shell}\``,
    `Storage: \`${report.storageSurface}\``,
    "",
    "## Commands",
    ...report.commands.map((command) => `- \`${command}\``),
    "",
    "## Checklist",
    ...report.checks.map((check) => `- [ ] \`${check.id}\` - ${check.label}`),
    "",
    "## Review Notes",
    "- [ ] Confirm persisted index survives process restart.",
    "- [ ] Confirm replay recovery can reproduce terminal evidence after restart.",
    "- [ ] Confirm desktop storage uses `session-runtime.sqlite3` when host mode is desktop.",
    "- [ ] Confirm server storage uses `session-runtime.sqlite3` under the runtime-node persistence root when host mode is server.",
    "- [ ] Record any STATUS_ENTRYPOINT_NOT_FOUND host-loader blocker separately from recovery behavior.",
  ];

  return `${lines.join("\n")}\n`;
}

function printJson(value) {
  process.stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

async function main(argv) {
  if (argv.includes("--print-plan") || argv.length === 0) {
    printJson(buildSessionRecoverySmokePlan());
    return;
  }

  const options = {
    platform: readFlagValue(argv, "--platform"),
    hostMode: readFlagValue(argv, "--host-mode"),
    cpuArch: readFlagValue(argv, "--cpu-arch"),
    shell: readFlagValue(argv, "--shell"),
  };

  if (argv.includes("--report-template")) {
    printJson(buildSessionRecoveryReportTemplate(options));
    return;
  }

  if (argv.includes("--review-template")) {
    process.stdout.write(buildSessionRecoveryReviewTemplate(options));
    return;
  }

  throw new Error("unsupported session recovery probe arguments");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
