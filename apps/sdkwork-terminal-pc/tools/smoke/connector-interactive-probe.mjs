import fs from "node:fs/promises";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const PLATFORM_PRESETS = {
  "windows-desktop": {
    platform: "windows-desktop",
    shell: "powershell",
  },
  "ubuntu-desktop": {
    platform: "ubuntu-desktop",
    shell: "bash",
  },
  "macos-desktop": {
    platform: "macos-desktop",
    shell: "zsh",
  },
};

const TARGET_PRESETS = {
  ssh: {
    id: "ssh",
    label: "SSH",
    authorityExample: "ops@prod-bastion",
    connectCommand: "ssh -G ops@prod-bastion",
    interactiveCommand: "ssh ops@prod-bastion",
    diagnosticsCommand: "ssh -v ops@prod-bastion",
  },
  "docker-exec": {
    id: "docker-exec",
    label: "Docker Exec",
    authorityExample: "docker://workspace-dev",
    connectCommand: "docker inspect --format '{{.State.Running}}' workspace-dev",
    interactiveCommand: "docker exec -it workspace-dev /bin/sh",
    diagnosticsCommand: "docker inspect workspace-dev",
  },
  "kubernetes-exec": {
    id: "kubernetes-exec",
    label: "Kubernetes Exec",
    authorityExample: "k8s://prod/web-0",
    connectCommand: "kubectl get pod web-0 -n prod",
    interactiveCommand: "kubectl exec -it web-0 -n prod -- /bin/sh",
    diagnosticsCommand: "kubectl describe pod web-0 -n prod",
  },
};

const execFileAsync = promisify(execFile);

function readFlagValue(argv, flag) {
  const index = argv.indexOf(flag);
  if (index < 0) {
    return null;
  }

  return argv[index + 1] ?? null;
}

function readFlagEnabled(argv, flag) {
  return argv.includes(flag);
}

function normalizeOption(value, fallback) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : fallback;
}

function resolvePlatformPreset(options = {}) {
  const defaultPlatform = process.platform === "win32" ? "windows-desktop" : "ubuntu-desktop";
  const platform = normalizeOption(options.platform, defaultPlatform);
  const preset = PLATFORM_PRESETS[platform] ?? PLATFORM_PRESETS[defaultPlatform];

  return {
    ...preset,
    platform,
    shell: normalizeOption(options.shell, preset.shell),
  };
}

function resolveTargetPreset(target) {
  return TARGET_PRESETS[normalizeOption(target, "docker-exec")] ?? TARGET_PRESETS["docker-exec"];
}

function resolvePlatformPresets(options = {}) {
  if (typeof options.platform === "string" && options.platform.trim().length > 0) {
    return [resolvePlatformPreset(options)];
  }

  return Object.values(PLATFORM_PRESETS);
}

function resolveTargetPresets(options = {}) {
  if (typeof options.target === "string" && options.target.trim().length > 0) {
    return [resolveTargetPreset(options.target)];
  }

  return Object.values(TARGET_PRESETS);
}

function normalizeCandidateList(values) {
  const normalized = [];
  const seen = new Set();

  for (const value of values) {
    if (typeof value !== "string") {
      continue;
    }

    const trimmed = value.trim();
    if (trimmed.length === 0 || seen.has(trimmed)) {
      continue;
    }

    seen.add(trimmed);
    normalized.push(trimmed);
  }

  return normalized;
}

function splitLines(value) {
  if (typeof value !== "string") {
    return [];
  }

  return value
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function summarizeCommandDetail(result) {
  const parts = [result.stdout, result.stderr]
    .flatMap((value) => splitLines(value))
    .slice(0, 3);

  if (parts.length > 0) {
    return parts.join(" | ");
  }

  if (typeof result.error === "string" && result.error.length > 0) {
    return result.error;
  }

  return "no output";
}

async function defaultCommandRunner(command, args) {
  return execFileAsync(command, args, {
    windowsHide: true,
    encoding: "utf8",
  });
}

async function runOptionalCommand(commandRunner, command, args) {
  try {
    const result = await commandRunner(command, args);
    return {
      status: "available",
      command,
      args,
      exitCode: 0,
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
      error: "",
    };
  } catch (error) {
    const errorCode =
      typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : "";
    const exitCode =
      typeof error === "object" && error !== null && "code" in error && typeof error.code === "number"
        ? error.code
        : 1;

    if (errorCode === "ENOENT") {
      return {
        status: "missing",
        command,
        args,
        exitCode: null,
        stdout: "",
        stderr: "",
        error: `${command} command not found`,
      };
    }

    return {
      status: "error",
      command,
      args,
      exitCode,
      stdout:
        typeof error === "object" && error !== null && "stdout" in error
          ? String(error.stdout ?? "")
          : "",
      stderr:
        typeof error === "object" && error !== null && "stderr" in error
          ? String(error.stderr ?? "")
          : "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function readEnvironmentValue(environment, key) {
  const value = environment[key];
  return typeof value === "string" ? value.trim() : "";
}

async function discoverSshAuthorityCandidates(environment, fileReader) {
  const candidates = [];
  const explicitAuthority = readEnvironmentValue(environment, "SDKWORK_TERMINAL_SSH_AUTHORITY");

  if (explicitAuthority.length > 0) {
    candidates.push(explicitAuthority);
  }

  const homeDirectory = readEnvironmentValue(environment, "USERPROFILE") || readEnvironmentValue(environment, "HOME");
  if (homeDirectory.length === 0) {
    return normalizeCandidateList(candidates);
  }

  const sshConfigPath = path.join(homeDirectory, ".ssh", "config");
  try {
    const source = await fileReader(sshConfigPath, "utf8");
    for (const line of source.split(/\r?\n/u)) {
      const match = line.match(/^\s*Host\s+(.+)$/u);
      if (!match) {
        continue;
      }

      for (const host of match[1].split(/\s+/u)) {
        if (
          host.length === 0 ||
          host.includes("*") ||
          host.includes("?") ||
          host.startsWith("!")
        ) {
          continue;
        }

        candidates.push(host);
      }
    }
  } catch {
    return normalizeCandidateList(candidates);
  }

  return normalizeCandidateList(candidates);
}

function discoverDockerAuthorityCandidates(environment, dockerPsResult) {
  const candidates = [];
  const explicitAuthority = readEnvironmentValue(environment, "SDKWORK_TERMINAL_DOCKER_AUTHORITY");

  if (explicitAuthority.length > 0) {
    candidates.push(explicitAuthority);
  }

  if (dockerPsResult.status === "available") {
    candidates.push(...splitLines(dockerPsResult.stdout));
  }

  return normalizeCandidateList(candidates);
}

function discoverKubernetesAuthorityCandidates(environment, kubectlPodsResult) {
  const candidates = [];
  const explicitAuthority = readEnvironmentValue(environment, "SDKWORK_TERMINAL_KUBERNETES_AUTHORITY");

  if (explicitAuthority.length > 0) {
    candidates.push(explicitAuthority);
  }

  if (kubectlPodsResult?.status === "available") {
    candidates.push(...splitLines(kubectlPodsResult.stdout));
  }

  return normalizeCandidateList(candidates);
}

function classifyTargetPreflight(target, probes) {
  const tool = probes[target.id];
  const candidateCount = tool.authorityCandidates.length;

  if (tool.command.status === "missing") {
    return {
      status: "blocked",
      reason: `${target.id} tooling is missing`,
      blockers: [tool.command.error],
    };
  }

  if (tool.command.status === "error") {
    return {
      status: "blocked",
      reason: `${target.id} tooling is present but not ready`,
      blockers: [summarizeCommandDetail(tool.command)],
    };
  }

  if (candidateCount === 0) {
    return {
      status: "tool-only",
      reason: `${target.id} tooling is ready but no authority candidate was discovered`,
      blockers: ["no authority candidate discovered"],
    };
  }

  return {
    status: "ready",
    reason: `${target.id} tooling and authority candidates are available`,
    blockers: [],
  };
}

export async function buildConnectorInteractivePreflightReport(
  options = {},
  dependencies = {},
) {
  const commandRunner = dependencies.commandRunner ?? defaultCommandRunner;
  const fileReader = dependencies.fileReader ?? fs.readFile;
  const environment = dependencies.environment ?? process.env;
  const platform = resolvePlatformPreset(options);
  const targets = resolveTargetPresets(options);

  const sshProbe = await runOptionalCommand(commandRunner, "ssh", ["-V"]);
  const dockerPsProbe = await runOptionalCommand(commandRunner, "docker", [
    "ps",
    "--format",
    "{{.Names}}",
  ]);
  const kubectlContextProbe = await runOptionalCommand(commandRunner, "kubectl", [
    "config",
    "current-context",
  ]);
  const kubectlPodsProbe =
    kubectlContextProbe.status === "available"
      ? await runOptionalCommand(commandRunner, "kubectl", [
          "get",
          "pods",
          "--all-namespaces",
          "-o",
          "name",
        ])
      : {
          status: "skipped",
          command: "kubectl",
          args: ["get", "pods", "--all-namespaces", "-o", "name"],
          exitCode: null,
          stdout: "",
          stderr: "",
          error: "skipped because current-context is unavailable",
        };

  const toolFacts = {
    ssh: {
      command: sshProbe,
      authorityCandidates: await discoverSshAuthorityCandidates(environment, fileReader),
    },
    "docker-exec": {
      command: dockerPsProbe,
      authorityCandidates: discoverDockerAuthorityCandidates(environment, dockerPsProbe),
    },
    "kubernetes-exec": {
      command:
        kubectlContextProbe.status === "available" ? kubectlPodsProbe : kubectlContextProbe,
      context: kubectlContextProbe,
      authorityCandidates: discoverKubernetesAuthorityCandidates(environment, kubectlPodsProbe),
    },
  };

  const targetReports = targets.map((target) => {
    const readiness = classifyTargetPreflight(target, toolFacts);
    const facts = toolFacts[target.id];

    return {
      id: target.id,
      label: target.label,
      status: readiness.status,
      reason: readiness.reason,
      blockers: readiness.blockers,
      authorityCandidates: facts.authorityCandidates,
      command: {
        status: facts.command.status,
        exitCode: facts.command.exitCode,
        detail: summarizeCommandDetail(facts.command),
      },
      context:
        target.id === "kubernetes-exec"
          ? {
              status: kubectlContextProbe.status,
              detail: summarizeCommandDetail(kubectlContextProbe),
            }
          : null,
    };
  });

  return {
    kind: "connector-interactive-preflight-report",
    generatedAt: new Date().toISOString(),
    requestedPlatform: platform.platform,
    runtimePlatform: process.platform,
    targets: targetReports,
    summary: {
      readyTargets: targetReports.filter((target) => target.status === "ready").map((target) => target.id),
      blockedTargets: targetReports.filter((target) => target.status === "blocked").map((target) => target.id),
      toolOnlyTargets: targetReports.filter((target) => target.status === "tool-only").map((target) => target.id),
    },
    constraints: [
      "Preflight is a host-readiness report only; it does not replace real live-terminal smoke execution.",
      "A ready target still requires live product verification and archived report/review artifacts.",
      "Blocked targets should not enter the real-machine smoke wave until their host/tooling issue is cleared.",
    ],
  };
}

function buildConnectorInteractiveCommands(platform, target) {
  const commands = [];

  if (platform === "windows-desktop") {
    commands.push(
      `powershell -ExecutionPolicy Bypass -File tools/smoke/connector-interactive-probe.ps1 ${target.id}`,
    );
  }

  commands.push(
    "cargo test --manifest-path crates/sdkwork-terminal-control-plane/Cargo.toml -- --nocapture",
    "cargo check --manifest-path src-tauri/Cargo.toml",
    "pnpm typecheck",
    "pnpm build",
    "node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resource-center.test.ts tests/shell-app-render.test.ts",
    "node --experimental-strip-types --test tests/desktop-session-reattach.test.ts tests/desktop-session-center.test.ts",
    "node tools/smoke/connector-interactive-probe.mjs --print-plan",
    `node tools/smoke/connector-interactive-probe.mjs --report-template --platform ${platform} --target ${target.id}`,
    `node tools/smoke/connector-interactive-probe.mjs --review-template --platform ${platform} --target ${target.id}`,
  );

  return commands;
}

function buildConnectorInteractiveChecks(target) {
  return [
    {
      id: "connector-discovery",
      label: `${target.label} target is visible from the top Connectors menu`,
      kind: "manual",
      status: "pending",
    },
    {
      id: "interactive-create",
      label: `${target.label} live terminal tab can be created from the product entry`,
      kind: "mixed",
      status: "pending",
    },
    {
      id: "live-input-echo",
      label: `${target.label} live input reaches the remote process and produces visible terminal output`,
      kind: "manual",
      status: "pending",
    },
    {
      id: "resize-sync",
      label: `${target.label} viewport resize keeps the interactive session usable`,
      kind: "manual",
      status: "pending",
    },
    {
      id: "replay-and-exit",
      label: `${target.label} replay and exit evidence are recorded after interactive close`,
      kind: "mixed",
      status: "pending",
    },
    {
      id: "session-center-reattach",
      label: `${target.label} detached session can be reattached from Session Center into a writable live terminal tab`,
      kind: "mixed",
      status: "pending",
    },
    {
      id: "restart-and-recover",
      label: `${target.label} session remains recoverable through reattach or replay after desktop host restart`,
      kind: "manual",
      status: "pending",
    },
    {
      id: "multi-tab-repeat-launch",
      label: `Repeated ${target.label} launches from the same menu entry can open multiple tabs`,
      kind: "mixed",
      status: "pending",
    },
  ];
}

export function buildConnectorInteractiveSmokePlan() {
  return {
    kind: "connector-interactive-smoke-plan",
    title: "sdkwork connector interactive probe",
    checkpoints: [
      {
        id: "cp07-3-ssh-interactive-live-terminal",
        label: "SSH interactive live-terminal evidence",
      },
      {
        id: "cp07-4-docker-kubernetes-interactive-live-terminal",
        label: "Docker and Kubernetes interactive live-terminal evidence",
      },
      {
        id: "cp07-connector-reattach-recovery-evidence",
        label: "Connector Session Center reattach and restart/recovery evidence",
      },
    ],
    platforms: Object.values(PLATFORM_PRESETS).map((preset) => ({
      id: preset.platform,
      shell: preset.shell,
    })),
    targets: Object.values(TARGET_PRESETS).map((target) => ({
      id: target.id,
      label: target.label,
      authorityExample: target.authorityExample,
    })),
    automatedEvidence: [
      "cargo test --manifest-path crates/sdkwork-terminal-control-plane/Cargo.toml -- --nocapture",
      "cargo check --manifest-path src-tauri/Cargo.toml",
      "pnpm typecheck",
      "pnpm build",
      "node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resource-center.test.ts tests/shell-app-render.test.ts",
      "node --experimental-strip-types --test tests/desktop-session-reattach.test.ts tests/desktop-session-center.test.ts",
    ],
    constraints: [
      "Do not claim CP07-4 complete from narrative notes alone; archive a repository-owned report and review template result for each target.",
      "Do not claim connector reattach/recovery complete from launch-only notes; archive Session Center reattach and restart/recover observations together with each report.",
      "This probe validates live terminal product truth, not only bounded launch/probe read models.",
    ],
  };
}

function buildConnectorInteractiveArtifactStem(platform, target) {
  const date = new Date().toISOString().slice(0, 10);
  return `${date}-step07-${platform}-${target}-connector-interactive-smoke`;
}

export function buildConnectorInteractiveBatchPlan(options = {}) {
  const platforms = resolvePlatformPresets(options);
  const targets = resolveTargetPresets(options);
  const automatedEvidence = buildConnectorInteractiveSmokePlan().automatedEvidence;
  const entries = [];

  for (const platform of platforms) {
    for (const target of targets) {
      const artifactStem = buildConnectorInteractiveArtifactStem(platform.platform, target.id);
      entries.push({
        id: `${platform.platform}:${target.id}`,
        platform: platform.platform,
        shell: platform.shell,
        target: target.id,
        targetLabel: target.label,
        authorityExample: target.authorityExample,
        parallelGroup: `host:${platform.platform}`,
        reportCommand:
          `node tools/smoke/connector-interactive-probe.mjs --report-template --platform ${platform.platform} --target ${target.id} --shell ${platform.shell}`,
        reviewCommand:
          `node tools/smoke/connector-interactive-probe.mjs --review-template --platform ${platform.platform} --target ${target.id} --shell ${platform.shell}`,
        suggestedArtifacts: {
          reportJson: `docs/review/${artifactStem}.report.json`,
          reviewMarkdown: `docs/review/${artifactStem}验证.md`,
        },
        checks: buildConnectorInteractiveChecks(target),
      });
    }
  }

  return {
    kind: "connector-interactive-batch-plan",
    title: "sdkwork connector interactive batch probe",
    generatedAt: new Date().toISOString(),
    scope: {
      platforms: platforms.map((platform) => ({
        id: platform.platform,
        shell: platform.shell,
      })),
      targets: targets.map((target) => ({
        id: target.id,
        label: target.label,
        authorityExample: target.authorityExample,
      })),
    },
    entries,
    automatedEvidence,
    parallelExecution: {
      summary:
        "Platform-target evidence jobs can run in parallel when each job owns an independent host and connector target.",
      groups: platforms.map((platform) => ({
        id: `host:${platform.platform}`,
        label: `${platform.platform} host lane`,
        entries: entries
          .filter((entry) => entry.platform === platform.platform)
          .map((entry) => entry.id),
      })),
    },
    serialCloseout: [
      "Archive the completed JSON report and markdown review for each platform-target entry.",
      "Update docs/step/07, docs/release/CHANGELOG.md, and the same-day release/review notes only after the collected evidence is reviewed.",
      "Keep shared contracts / protocol / events / session model changes out of the parallel smoke collection wave.",
    ],
    constraints: [
      "This batch plan accelerates evidence collection only; it does not replace real-machine execution.",
      "Each platform-target entry still needs a real report and review artifact before Step 07 connector recovery can be claimed complete.",
      "Parallel evidence collection is allowed, but Step/release closeout must remain serial.",
    ],
  };
}

function buildMissingPreflightTarget(target) {
  return {
    id: target.id,
    label: target.label,
    status: "blocked",
    reason: `${target.id} preflight data is missing`,
    blockers: ["preflight target data is missing"],
    authorityCandidates: [],
    command: {
      status: "missing",
      exitCode: null,
      detail: "preflight target data is missing",
    },
    context: null,
  };
}

export async function buildConnectorInteractiveExecutionPlan(
  options = {},
  dependencies = {},
) {
  const platform = resolvePlatformPreset(options);
  const batchPlan = buildConnectorInteractiveBatchPlan({
    ...options,
    platform: platform.platform,
    shell: normalizeOption(options.shell, platform.shell),
  });
  const preflight = await buildConnectorInteractivePreflightReport(
    {
      ...options,
      platform: platform.platform,
      shell: normalizeOption(options.shell, platform.shell),
    },
    dependencies,
  );
  const readinessByTargetId = new Map(
    preflight.targets.map((target) => [target.id, target]),
  );
  const entries = batchPlan.entries.map((entry) => {
    const readiness =
      readinessByTargetId.get(entry.target) ??
      buildMissingPreflightTarget({
        id: entry.target,
        label: entry.targetLabel,
      });
    const executableNow = readiness.status === "ready";

    return {
      ...entry,
      readiness,
      executableNow,
      skipReason: executableNow ? null : `${readiness.status}: ${readiness.reason}`,
    };
  });

  return {
    kind: "connector-interactive-execution-plan",
    generatedAt: new Date().toISOString(),
    requestedPlatform: platform.platform,
    runtimePlatform: process.platform,
    scope: batchPlan.scope,
    automatedEvidence: batchPlan.automatedEvidence,
    parallelExecution: batchPlan.parallelExecution,
    serialCloseout: batchPlan.serialCloseout,
    preflight,
    entries,
    summary: {
      executableEntries: entries.filter((entry) => entry.executableNow).map((entry) => entry.id),
      blockedEntries: entries
        .filter((entry) => entry.readiness.status === "blocked")
        .map((entry) => entry.id),
      toolOnlyEntries: entries
        .filter((entry) => entry.readiness.status === "tool-only")
        .map((entry) => entry.id),
      skippedEntries: entries.filter((entry) => !entry.executableNow).map((entry) => entry.id),
    },
    operatorFlow: [
      `Run node tools/smoke/connector-interactive-probe.mjs --print-preflight --platform ${platform.platform} first and clear blocked targets before field smoke.`,
      "Use executable entries for live terminal smoke on this host; skip blocked and tool-only entries until the environment is ready.",
      "Use --write-batch-templates --ready-only when you only want report/review skeletons for targets that are executable now.",
      "Keep Step and release closeout serial after real-machine evidence is archived.",
    ],
    constraints: [
      "Execution plan is a merged operator view of preflight plus batch-plan; it does not replace either artifact.",
      "Non-ready entries are environment blockers or incomplete host setup, not proof that the product path is complete or broken.",
      "Step 07 remains open until real-machine report/review artifacts exist for the required connector targets and recovery checks.",
    ],
  };
}

function normalizeReadyOnly(value) {
  return value === true;
}

export async function writeConnectorInteractiveBatchTemplates(
  outputDir,
  options = {},
  dependencies = {},
) {
  if (typeof outputDir !== "string" || outputDir.trim().length === 0) {
    throw new Error("outputDir is required");
  }

  const resolvedOutputDir = path.resolve(outputDir);
  await fs.mkdir(resolvedOutputDir, { recursive: true });
  const readyOnly = normalizeReadyOnly(options.readyOnly);
  const batchPlan = buildConnectorInteractiveBatchPlan(options);
  let entries = batchPlan.entries;
  let skippedEntries = [];

  if (readyOnly) {
    const executionPlan = await buildConnectorInteractiveExecutionPlan(options, dependencies);
    entries = executionPlan.entries.filter((entry) => entry.executableNow);
    skippedEntries = executionPlan.entries
      .filter((entry) => !entry.executableNow)
      .map((entry) => ({
        id: entry.id,
        platform: entry.platform,
        target: entry.target,
        readiness: entry.readiness,
        skipReason: entry.skipReason,
      }));
  }

  const artifacts = [];

  for (const entry of entries) {
    const reportTemplate = buildConnectorInteractiveReportTemplate({
      platform: entry.platform,
      target: entry.target,
      shell: entry.shell,
    });
    const reviewTemplate = buildConnectorInteractiveReviewTemplate({
      platform: entry.platform,
      target: entry.target,
      shell: entry.shell,
    });
    const reportFilename = path.basename(entry.suggestedArtifacts.reportJson);
    const reviewFilename = path.basename(entry.suggestedArtifacts.reviewMarkdown);
    const reportPath = path.join(resolvedOutputDir, reportFilename);
    const reviewPath = path.join(resolvedOutputDir, reviewFilename);

    await fs.writeFile(reportPath, `${JSON.stringify(reportTemplate, null, 2)}\n`, "utf8");
    await fs.writeFile(reviewPath, reviewTemplate, "utf8");

    artifacts.push({
      id: entry.id,
      platform: entry.platform,
      target: entry.target,
      reportPath,
      reviewPath,
    });
  }

  return {
    kind: "connector-interactive-batch-template-output",
    outputDir: resolvedOutputDir,
    selection: {
      readyOnly,
      selectedEntryCount: artifacts.length,
      skippedEntryCount: skippedEntries.length,
    },
    artifacts,
    skippedEntries,
  };
}

export function buildConnectorInteractiveReportTemplate(options = {}) {
  const platform = resolvePlatformPreset(options);
  const target = resolveTargetPreset(options.target);

  return {
    kind: "connector-interactive-smoke-report",
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    platform: platform.platform,
    target: target.id,
    shell: platform.shell,
    targetLabel: target.label,
    authorityExample: target.authorityExample,
    commands: buildConnectorInteractiveCommands(platform.platform, target),
    connectorCommands: {
      connect: target.connectCommand,
      interactive: target.interactiveCommand,
      diagnostics: target.diagnosticsCommand,
    },
    checks: buildConnectorInteractiveChecks(target),
    notes: [],
  };
}

export function buildConnectorInteractiveReviewTemplate(options = {}) {
  const report = buildConnectorInteractiveReportTemplate(options);
  const lines = [
    "# Connector Interactive Smoke Review",
    "",
    `Platform: \`${report.platform}\``,
    `Target: \`${report.target}\``,
    `Shell: \`${report.shell}\``,
    `Authority example: \`${report.authorityExample}\``,
    "",
    "## Commands",
    ...report.commands.map((command) => `- \`${command}\``),
    "",
    "## Connector Commands",
    `- Connect: \`${report.connectorCommands.connect}\``,
    `- Interactive: \`${report.connectorCommands.interactive}\``,
    `- Diagnostics: \`${report.connectorCommands.diagnostics}\``,
    "",
    "## Checklist",
    ...report.checks.map((check) => `- [ ] \`${check.id}\` - ${check.label}`),
    "",
    "## Review Notes",
    "- [ ] Confirm the tab is a real live terminal, not a launch/probe summary surface.",
    "- [ ] Confirm interactive create, live input echo, resize, replay, exit, Session Center reattach, and restart/recover evidence all align with the selected connector target.",
    "- [ ] Confirm Session Center reattach restores a writable live terminal tab instead of a fake snapshot-only surface.",
    "- [ ] Confirm restart and recover evidence records whether the session returned through reattach, replay-only recovery, or both.",
    "- [ ] Archive completed markdown together with the structured JSON report when smoke finishes.",
  ];

  return `${lines.join("\n")}\n`;
}

function printJson(value, stdout = process.stdout) {
  stdout.write(`${JSON.stringify(value, null, 2)}\n`);
}

export async function runConnectorInteractiveProbeCli(argv, dependencies = {}) {
  const stdout = dependencies.stdout ?? process.stdout;
  const options = {
    platform: readFlagValue(argv, "--platform"),
    target: readFlagValue(argv, "--target"),
    shell: readFlagValue(argv, "--shell"),
    readyOnly: readFlagEnabled(argv, "--ready-only"),
  };

  if (argv.includes("--print-batch-plan")) {
    printJson(buildConnectorInteractiveBatchPlan(options), stdout);
    return;
  }

  if (argv.includes("--print-execution-plan")) {
    printJson(await buildConnectorInteractiveExecutionPlan(options), stdout);
    return;
  }

  if (argv.includes("--print-preflight")) {
    printJson(await buildConnectorInteractivePreflightReport(options), stdout);
    return;
  }

  if (argv.includes("--write-batch-templates")) {
    const outputDir = readFlagValue(argv, "--output-dir");
    printJson(await writeConnectorInteractiveBatchTemplates(outputDir ?? "", options), stdout);
    return;
  }

  if (argv.includes("--print-plan") || argv.length === 0) {
    printJson(buildConnectorInteractiveSmokePlan(), stdout);
    return;
  }

  if (argv.includes("--report-template")) {
    printJson(buildConnectorInteractiveReportTemplate(options), stdout);
    return;
  }

  if (argv.includes("--review-template")) {
    stdout.write(buildConnectorInteractiveReviewTemplate(options));
    return;
  }

  throw new Error("unsupported connector interactive probe arguments");
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  runConnectorInteractiveProbeCli(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
