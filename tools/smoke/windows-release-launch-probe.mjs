import fs from "node:fs";
import path from "node:path";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";

const execFileAsync = promisify(execFile);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "../..");

const DEFAULT_RELEASE_EXECUTABLE = path.join(
  rootDir,
  "target",
  "release",
  "sdkwork-terminal-desktop-host.exe",
);

function normalizeWindowsTarget(value) {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : "";
}

export function listWindowsReleaseExecutableCandidates(options = {}, workspaceRoot = rootDir) {
  const target = normalizeWindowsTarget(options.target);
  const executableName = "sdkwork-terminal-desktop-host.exe";
  const candidates = [];

  if (target) {
    candidates.push(
      path.join(workspaceRoot, "target", target, "release", executableName),
      path.join(workspaceRoot, "src-tauri", "target", target, "release", executableName),
    );
  }

  candidates.push(
    path.join(workspaceRoot, "target", "release", executableName),
    path.join(workspaceRoot, "src-tauri", "target", "release", executableName),
  );

  return [...new Set(candidates.map((candidate) => path.resolve(candidate)))];
}

export function buildWindowsReleaseLaunchProbePlan() {
  return {
    kind: "windows-release-launch-smoke-plan",
    title: "sdkwork windows release launch probe",
    platform: "windows",
    executable: path.relative(rootDir, DEFAULT_RELEASE_EXECUTABLE).split(path.sep).join("/"),
    checks: [
      {
        id: "gui-subsystem",
        label: "release desktop host uses the Windows GUI subsystem",
      },
      {
        id: "no-external-terminal-window",
        label: "release launch does not spawn Windows Terminal or wt.exe",
      },
      {
        id: "headless-conhost",
        label: "release launch keeps conhost headless when a PTY-backed shell is active",
      },
      {
        id: "process-tree-capture",
        label: "release launch captures the main process and direct child processes for review",
      },
    ],
  };
}

export function buildWindowsReleaseLaunchReportTemplate(options = {}) {
  const target = normalizeWindowsTarget(options.target);
  return {
    kind: "windows-release-launch-smoke-report",
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    platform: "windows",
    executablePath: resolveWindowsReleaseExecutablePath({
      executablePath: options.executablePath,
      target,
    }),
    ...(target ? { target } : {}),
    startupDelayMs: normalizeStartupDelay(options.startupDelayMs),
    commands: [
      "pnpm tauri:build",
      target
        ? `pnpm smoke:windows-release-launch -- --target ${target}`
        : "pnpm smoke:windows-release-launch",
      target
        ? `node tools/smoke/windows-release-launch-probe.mjs --review-template --target ${target}`
        : "node tools/smoke/windows-release-launch-probe.mjs --review-template",
    ],
    checks: buildWindowsReleaseLaunchProbePlan().checks.map((check) => ({
      id: check.id,
      label: check.label,
      status: "pending",
    })),
    notes: [],
  };
}

export function buildWindowsReleaseLaunchReviewTemplate(options = {}) {
  const report = buildWindowsReleaseLaunchReportTemplate(options);
  const lines = [
    "# Windows Release Launch Review",
    "",
    `Executable: \`${report.executablePath}\``,
    ...(report.target ? [`Target: \`${report.target}\``] : []),
    `Startup delay: \`${report.startupDelayMs}ms\``,
    "",
    "## Commands",
    ...report.commands.map((command) => `- \`${command}\``),
    "",
    "## Checklist",
    ...report.checks.map((check) => `- [ ] \`${check.id}\` - ${check.label}`),
    "",
    "## Review Notes",
    "- [ ] Confirm the PE subsystem resolves to `2` (`IMAGE_SUBSYSTEM_WINDOWS_GUI`).",
    "- [ ] Confirm no `WindowsTerminal.exe` or `wt.exe` process is spawned by release launch.",
    "- [ ] Confirm any `conhost.exe` child process includes `--headless`.",
    "- [ ] Archive the captured main process, direct child process snapshot, and observed descendant process snapshot together with this review.",
  ];

  return `${lines.join("\n")}\n`;
}

export function readWindowsPortableExecutableSubsystem(executableBuffer) {
  if (!(executableBuffer instanceof Uint8Array) || executableBuffer.byteLength < 0x40) {
    throw new Error("portable executable buffer is too small");
  }

  const peOffset = executableBuffer.readUInt32LE(0x3c);
  const subsystemOffset = peOffset + 0x5c;
  if (subsystemOffset + 2 > executableBuffer.byteLength) {
    throw new Error("portable executable buffer is missing the subsystem field");
  }

  return executableBuffer.readUInt16LE(subsystemOffset);
}

export function resolveWindowsReleaseExecutablePath(options = {}, workspaceRoot = rootDir) {
  const explicitPath =
    typeof options.executablePath === "string" && options.executablePath.trim().length > 0
      ? options.executablePath.trim()
      : "";
  if (explicitPath) {
    return path.resolve(workspaceRoot, explicitPath);
  }

  const candidates = listWindowsReleaseExecutableCandidates(options, workspaceRoot);
  return candidates.find((candidate) => fs.existsSync(candidate))
    ?? candidates[0]
    ?? DEFAULT_RELEASE_EXECUTABLE;
}

function normalizeStartupDelay(value) {
  const parsed = Number.parseInt(String(value ?? ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 6000;
}

function resolveObservationInterval(startupDelayMs) {
  if (startupDelayMs <= 1500) {
    return 250;
  }

  if (startupDelayMs <= 4000) {
    return 500;
  }

  return 1000;
}

export function assertWindowsReleaseLaunchChecksPassed(report) {
  const failedChecks = Array.isArray(report?.checks)
    ? report.checks.filter((check) => check?.status !== "passed")
    : [];
  if (failedChecks.length === 0) {
    return;
  }

  const failedSummary = failedChecks
    .map((check) => `${check.id}: ${check.detail ?? check.label ?? "failed"}`)
    .join("; ");
  throw new Error(`Windows release launch smoke failed: ${failedSummary}`);
}

async function queryWindowsProcessById(processId) {
  const script = [
    `$ProcessId = ${Number(processId)}`,
    "Get-CimInstance Win32_Process -Filter \"ProcessId = $ProcessId\" |",
    "  Select-Object ProcessId, ParentProcessId, Name, CommandLine |",
    "  ConvertTo-Json -Depth 4 -Compress",
  ].join("\n");
  const { stdout } = await execFileAsync("powershell.exe", [
    "-NoProfile",
    "-Command",
    script,
  ], {
    cwd: rootDir,
    windowsHide: true,
  });

  const trimmed = stdout.trim();
  return trimmed.length > 0 ? JSON.parse(trimmed) : null;
}

async function queryWindowsChildProcesses(parentProcessId) {
  const script = [
    `$ParentProcessId = ${Number(parentProcessId)}`,
    "Get-CimInstance Win32_Process -Filter \"ParentProcessId = $ParentProcessId\" |",
    "  Select-Object ProcessId, ParentProcessId, Name, CommandLine |",
    "  ConvertTo-Json -Depth 4 -Compress",
  ].join("\n");
  const { stdout } = await execFileAsync("powershell.exe", [
    "-NoProfile",
    "-Command",
    script,
  ], {
    cwd: rootDir,
    windowsHide: true,
  });

  const trimmed = stdout.trim();
  if (trimmed.length === 0) {
    return [];
  }

  const parsed = JSON.parse(trimmed);
  return Array.isArray(parsed) ? parsed : [parsed];
}

async function terminateWindowsProcessTree(processId) {
  await execFileAsync("taskkill.exe", ["/PID", String(processId), "/T", "/F"], {
    cwd: rootDir,
    windowsHide: true,
  }).catch(() => undefined);
}

async function queryWindowsDescendantProcesses(rootProcessId, maxDepth = 6) {
  const discoveredProcesses = [];
  const visitedProcessIds = new Set([Number(rootProcessId)]);
  const pendingParents = [{ processId: Number(rootProcessId), depth: 0 }];

  while (pendingParents.length > 0) {
    const nextParent = pendingParents.shift();
    if (!nextParent) {
      break;
    }

    if (nextParent.depth >= maxDepth) {
      continue;
    }

    const childProcesses = await queryWindowsChildProcesses(nextParent.processId);
    for (const childProcess of childProcesses) {
      const childProcessId = Number(childProcess.ProcessId);
      if (!Number.isFinite(childProcessId) || visitedProcessIds.has(childProcessId)) {
        continue;
      }

      visitedProcessIds.add(childProcessId);
      discoveredProcesses.push(childProcess);
      pendingParents.push({
        processId: childProcessId,
        depth: nextParent.depth + 1,
      });
    }
  }

  return discoveredProcesses;
}

async function collectWindowsLaunchObservation({
  childPid,
  startupDelayMs,
}) {
  const deadline = Date.now() + startupDelayMs;
  const intervalMs = resolveObservationInterval(startupDelayMs);
  let capturedMainProcess = null;
  let capturedChildProcesses = [];
  const observedDescendantProcessesById = new Map();

  while (true) {
    const [mainProcess, childProcesses, descendantProcesses] = await Promise.all([
      queryWindowsProcessById(childPid),
      queryWindowsChildProcesses(childPid),
      queryWindowsDescendantProcesses(childPid),
    ]);

    if (mainProcess) {
      capturedMainProcess = mainProcess;
      capturedChildProcesses = childProcesses;
      for (const processEntry of descendantProcesses) {
        const processId = Number(processEntry.ProcessId);
        if (!Number.isFinite(processId)) {
          continue;
        }

        observedDescendantProcessesById.set(processId, processEntry);
      }
    }

    const remainingMs = deadline - Date.now();
    if (remainingMs <= 0) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, Math.min(intervalMs, remainingMs)));
  }

  return {
    mainProcess: capturedMainProcess,
    childProcesses: capturedChildProcesses,
    observedDescendantProcesses: [...observedDescendantProcessesById.values()],
  };
}

export async function inspectWindowsReleaseLaunch(options = {}) {
  if (process.platform !== "win32") {
    throw new Error("windows release launch probe only runs on Windows hosts");
  }

  const executablePath = resolveWindowsReleaseExecutablePath(options);
  const startupDelayMs = normalizeStartupDelay(options.startupDelayMs);
  const executableBuffer = await import("node:fs/promises").then((fs) => fs.readFile(executablePath));
  const subsystem = readWindowsPortableExecutableSubsystem(executableBuffer);
  const child = spawn(executablePath, [], {
    cwd: path.dirname(executablePath),
    detached: false,
    stdio: "ignore",
    windowsHide: true,
  });

  const {
    mainProcess,
    childProcesses,
    observedDescendantProcesses,
  } = await collectWindowsLaunchObservation({
    childPid: child.pid,
    startupDelayMs,
  });

  await terminateWindowsProcessTree(child.pid);

  const observedTerminalProcesses = observedDescendantProcesses.filter((entry) =>
    ["WindowsTerminal.exe", "wt.exe", "cmd.exe", "powershell.exe", "pwsh.exe", "conhost.exe"]
      .includes(entry.Name)
  );
  const windowsTerminalProcesses = observedTerminalProcesses.filter((entry) =>
    entry.Name === "WindowsTerminal.exe" || entry.Name === "wt.exe"
  );
  const conhostChildren = observedTerminalProcesses.filter((entry) => entry.Name === "conhost.exe");
  const nonHeadlessConhostChildren = conhostChildren.filter((entry) =>
    !String(entry.CommandLine ?? "").includes("--headless")
  );

  return {
    kind: "windows-release-launch-smoke-report",
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    platform: "windows",
    executablePath,
    startupDelayMs,
    subsystem,
    mainProcess,
    childProcesses,
    observedDescendantProcesses,
    recentTerminalProcesses: observedTerminalProcesses,
    checks: [
      {
        id: "gui-subsystem",
        label: "release desktop host uses the Windows GUI subsystem",
        status: subsystem === 2 ? "passed" : "failed",
        detail:
          subsystem === 2
            ? "PE subsystem is 2 (IMAGE_SUBSYSTEM_WINDOWS_GUI)."
            : `Unexpected PE subsystem ${subsystem}.`,
      },
      {
        id: "no-external-terminal-window",
        label: "release launch does not spawn Windows Terminal or wt.exe",
        status: windowsTerminalProcesses.length === 0 ? "passed" : "failed",
        detail:
          windowsTerminalProcesses.length === 0
            ? "No WindowsTerminal.exe or wt.exe process was observed during launch."
            : `Observed ${windowsTerminalProcesses.length} Windows Terminal process(es).`,
      },
      {
        id: "headless-conhost",
        label: "release launch keeps conhost headless when a PTY-backed shell is active",
        status: nonHeadlessConhostChildren.length === 0 ? "passed" : "failed",
        detail:
          nonHeadlessConhostChildren.length === 0
            ? "All conhost child processes were headless."
            : "Detected conhost child processes without --headless.",
      },
      {
        id: "process-tree-capture",
        label: "release launch captures the main process and direct child processes for review",
        status: mainProcess ? "passed" : "failed",
        detail: mainProcess
          ? `Captured ${childProcesses.length} direct child process(es).`
          : "Main process snapshot was not available.",
      },
    ],
  };
}

function readFlagValue(argv, flag) {
  const index = argv.indexOf(flag);
  if (index < 0) {
    return null;
  }

  return argv[index + 1] ?? null;
}

export async function runWindowsReleaseLaunchProbeCli(argv, dependencies = {}) {
  const stdout = dependencies.stdout ?? process.stdout;
  const target = readFlagValue(argv, "--target") ?? undefined;

  if (argv.includes("--print-plan")) {
    stdout.write(`${JSON.stringify(buildWindowsReleaseLaunchProbePlan(), null, 2)}\n`);
    return;
  }

  if (argv.includes("--report-template")) {
    stdout.write(
      `${JSON.stringify(
        buildWindowsReleaseLaunchReportTemplate({
          executablePath: readFlagValue(argv, "--executable") ?? undefined,
          target,
          startupDelayMs: readFlagValue(argv, "--startup-delay-ms") ?? undefined,
        }),
        null,
        2,
      )}\n`,
    );
    return;
  }

  if (argv.includes("--review-template")) {
    stdout.write(
      buildWindowsReleaseLaunchReviewTemplate({
        executablePath: readFlagValue(argv, "--executable") ?? undefined,
        target,
        startupDelayMs: readFlagValue(argv, "--startup-delay-ms") ?? undefined,
      }),
    );
    return;
  }

  if (argv.includes("--inspect-launch")) {
    const report = await inspectWindowsReleaseLaunch({
      executablePath: readFlagValue(argv, "--executable") ?? undefined,
      target,
      startupDelayMs: readFlagValue(argv, "--startup-delay-ms") ?? undefined,
    });
    stdout.write(
      `${JSON.stringify(report, null, 2)}\n`,
    );
    if (argv.includes("--assert-passed")) {
      assertWindowsReleaseLaunchChecksPassed(report);
    }
    return;
  }

  stdout.write(
    `${JSON.stringify(buildWindowsReleaseLaunchProbePlan(), null, 2)}\n`,
  );
}

const entryArg = process.argv[1] ? path.resolve(process.argv[1]) : null;
const isCliEntry =
  entryArg !== null && pathToFileURL(entryArg).href === import.meta.url;

if (isCliEntry) {
  runWindowsReleaseLaunchProbeCli(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
