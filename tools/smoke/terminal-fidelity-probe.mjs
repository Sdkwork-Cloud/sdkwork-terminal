import path from "node:path";
import { pathToFileURL } from "node:url";

export function buildTerminalFidelityProbePlan() {
  const title = "sdkwork terminal fidelity probe";

  return {
    title,
    titleSequence: `\u001b]0;${title}\u0007\u001b]2;${title}\u0007`,
    alternateScreen: {
      enter: "\u001b[?1049h",
      exit: "\u001b[?1049l",
    },
    bracketedPaste: {
      enable: "\u001b[?2004h",
      disable: "\u001b[?2004l",
    },
    mouseReporting: {
      enable: "\u001b[?1000h\u001b[?1006h",
      disable: "\u001b[?1000l\u001b[?1006l",
    },
    cjkSample:
      "CJK sample: \u4e2d\u6587\u8f93\u5165 / \u65e5\u672c\u8a9e / \ud55c\uad6d\uc5b4 / emoji \ud83d\ude00 / width check \u8868 terminal",
  };
}

function normalizeOption(value, fallback) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : fallback;
}

function readFlagValue(argv, flag) {
  const index = argv.indexOf(flag);
  if (index < 0) {
    return null;
  }

  return argv[index + 1] ?? null;
}

function buildTerminalFidelityCommands(platform) {
  const commands = [];

  if (platform === "windows") {
    commands.push(
      "powershell -ExecutionPolicy Bypass -File tools/smoke/terminal-fidelity-probe.ps1",
    );
  }

  commands.push(
    "node tools/smoke/terminal-fidelity-probe.mjs",
    "node tools/smoke/terminal-fidelity-probe.mjs --print-plan",
    "node tools/smoke/terminal-fidelity-probe.mjs --sample-analysis",
  );

  return commands;
}

export function buildTerminalFidelityReportTemplate(options = {}) {
  const platform = normalizeOption(
    options.platform,
    process.platform === "win32" ? "windows" : "unknown",
  );
  const shell = normalizeOption(
    options.shell,
    process.platform === "win32" ? "powershell" : "bash",
  );

  return {
    kind: "terminal-fidelity-smoke-report",
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    platform,
    shell,
    appHost: "sdkwork-terminal desktop",
    commands: buildTerminalFidelityCommands(platform),
    checks: [
      {
        id: "osc-title",
        label: "OSC title updates top tabs",
        kind: "probe",
        status: "pending",
      },
      {
        id: "alternate-screen",
        label: "alternate screen enter and exit restore the shell viewport",
        kind: "probe",
        status: "pending",
      },
      {
        id: "bracketed-paste",
        label: "bracketed paste markers are observed without breaking terminal input",
        kind: "probe",
        status: "pending",
      },
      {
        id: "mouse-reporting",
        label: "mouse reporting events are captured from the real viewport",
        kind: "probe",
        status: "pending",
      },
      {
        id: "cjk-rendering",
        label: "CJK and wide-character sample renders without obvious width corruption",
        kind: "probe",
        status: "pending",
      },
      {
        id: "ime-input",
        label: "IME composition can commit text into the active terminal viewport",
        kind: "manual",
        status: "pending",
      },
      {
        id: "tab-focus-and-resize",
        label: "tab switch, focus restore, and viewport resize remain usable during the smoke run",
        kind: "manual",
        status: "pending",
      },
    ],
    notes: [],
  };
}

export function buildTerminalFidelityReviewTemplate(options = {}) {
  const report = buildTerminalFidelityReportTemplate(options);
  const lines = [
    "# Terminal Fidelity Smoke Review",
    "",
    `Platform: \`${report.platform}\``,
    `Shell: \`${report.shell}\``,
    `Host: \`${report.appHost}\``,
    "",
    "## Commands",
    ...report.commands.map((command) => `- \`${command}\``),
    "",
    "## Checklist",
    ...report.checks.map((check) => `- [ ] \`${check.id}\` - ${check.label}`),
    "",
    "## Review Notes",
    "- [ ] Capture anomalies for OSC title, alternate screen, bracketed paste, mouse-reporting, CJK, and IME input.",
    "- [ ] Archive completed markdown together with the structured JSON report when platform smoke finishes.",
  ];

  return `${lines.join("\n")}\n`;
}

function toInputText(input) {
  if (Array.isArray(input)) {
    return String.fromCharCode(...input.map((value) => value & 0xff));
  }
  return input;
}

function stripAnsiForPreview(value) {
  return value
    .replace(/\u001b\][^\u0007]*(?:\u0007|\u001b\\)/g, "")
    .replace(/\u001b\[[0-9;?<>]*[ -/]*[@-~]/g, "")
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function analyzeTerminalFidelityInput(input) {
  const text = toInputText(input);
  const mouseReports = Array.from(
    text.matchAll(/\u001b\[<\d+;\d+;\d+[mM]/g),
    (match) => match[0],
  );
  const bracketedPasteStarts = text.match(/\u001b\[200~/g) ?? [];
  const bracketedPasteEnds = text.match(/\u001b\[201~/g) ?? [];

  return {
    rawText: text,
    mouseReports,
    bracketedPaste: {
      startCount: bracketedPasteStarts.length,
      endCount: bracketedPasteEnds.length,
    },
    printablePreview: stripAnsiForPreview(text),
    exitRequested: text.includes("\u0003") || text.includes("q") || text.includes("Q"),
  };
}

function renderProbeScreen(state) {
  const plan = buildTerminalFidelityProbePlan();
  const lines = [
    "sdkwork terminal fidelity probe",
    "",
    "Checks: OSC title, alternate screen, bracketed paste, mouse-reporting, CJK.",
    "Actions:",
    "  1. Paste one line of text.",
    "  2. Click or drag in the stage.",
    "  3. Confirm title/tab text changed to the probe title.",
    "  4. Press q or Ctrl+C to exit and restore the shell.",
    "",
    plan.cjkSample,
    "",
    `Chunks captured: ${state.chunkCount}`,
    `Bracketed paste: start=${state.bracketedPaste.startCount} end=${state.bracketedPaste.endCount}`,
    `Mouse reports: ${state.mouseReports.length}`,
    `Last preview: ${state.lastPreview || "(none yet)"}`,
  ];

  return `\u001b[H\u001b[2J${lines.join("\r\n")}\r\n`;
}

async function runInteractiveProbe() {
  const plan = buildTerminalFidelityProbePlan();
  const stdin = process.stdin;
  const stdout = process.stdout;

  if (!stdin.isTTY || !stdout.isTTY) {
    throw new Error("terminal fidelity probe requires a TTY terminal");
  }

  const state = {
    chunkCount: 0,
    mouseReports: [],
    bracketedPaste: {
      startCount: 0,
      endCount: 0,
    },
    lastPreview: "",
  };

  const restore = () => {
    stdout.write(
      `${plan.bracketedPaste.disable}${plan.mouseReporting.disable}${plan.alternateScreen.exit}`,
    );
    if (typeof stdin.setRawMode === "function") {
      stdin.setRawMode(false);
    }
    stdin.pause();
  };

  const updateState = (chunk) => {
    const analysis = analyzeTerminalFidelityInput(chunk);
    state.chunkCount += 1;
    state.mouseReports.push(...analysis.mouseReports);
    state.bracketedPaste.startCount += analysis.bracketedPaste.startCount;
    state.bracketedPaste.endCount += analysis.bracketedPaste.endCount;
    if (analysis.printablePreview.length > 0) {
      state.lastPreview = analysis.printablePreview;
    }
    return analysis;
  };

  await new Promise((resolve, reject) => {
    const onData = (chunk) => {
      const analysis = updateState(chunk);
      stdout.write(renderProbeScreen(state));

      if (analysis.exitRequested) {
        resolve();
      }
    };

    const onError = (error) => {
      reject(error);
    };

    process.once("SIGINT", resolve);
    stdin.once("error", onError);
    stdin.on("data", onData);

    stdout.write(plan.titleSequence);
    stdout.write(
      `${plan.alternateScreen.enter}${plan.bracketedPaste.enable}${plan.mouseReporting.enable}`,
    );
    stdout.write(renderProbeScreen(state));

    if (typeof stdin.setRawMode === "function") {
      stdin.setRawMode(true);
    }
    stdin.resume();
  }).finally(() => {
    restore();
  });
}

async function runCli(argv) {
  if (argv.includes("--report-template")) {
    process.stdout.write(
      `${JSON.stringify(
        buildTerminalFidelityReportTemplate({
          platform: readFlagValue(argv, "--platform") ?? undefined,
          shell: readFlagValue(argv, "--shell") ?? undefined,
        }),
        null,
        2,
      )}\n`,
    );
    return;
  }

  if (argv.includes("--review-template")) {
    process.stdout.write(
      buildTerminalFidelityReviewTemplate({
        platform: readFlagValue(argv, "--platform") ?? undefined,
        shell: readFlagValue(argv, "--shell") ?? undefined,
      }),
    );
    return;
  }

  if (argv.includes("--print-plan")) {
    process.stdout.write(`${JSON.stringify(buildTerminalFidelityProbePlan(), null, 2)}\n`);
    return;
  }

  if (argv.includes("--sample-analysis")) {
    const sample = "\u001b[200~sample\u001b[201~\u001b[<0;12;8M";
    process.stdout.write(
      `${JSON.stringify(analyzeTerminalFidelityInput(sample), null, 2)}\n`,
    );
    return;
  }

  await runInteractiveProbe();
}

const entryArg = process.argv[1] ? path.resolve(process.argv[1]) : null;
const isCliEntry =
  entryArg !== null && pathToFileURL(entryArg).href === import.meta.url;

if (isCliEntry) {
  runCli(process.argv.slice(2)).catch((error) => {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    process.exitCode = 1;
  });
}
