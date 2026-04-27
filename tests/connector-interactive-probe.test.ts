import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath, pathToFileURL } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const probePath = path.join(rootDir, "tools", "smoke", "connector-interactive-probe.mjs");
const probePs1Path = path.join(rootDir, "tools", "smoke", "connector-interactive-probe.ps1");
const smokeReadmePath = path.join(rootDir, "tools", "smoke", "README.md");

async function runProbeCli(args: string[]) {
  const module = await import(pathToFileURL(probePath).href);
  let stdout = "";

  await module.runConnectorInteractiveProbeCli(args, {
    stdout: {
      write(chunk: string) {
        stdout += String(chunk);
        return true;
      },
    },
  });

  return { stdout };
}

test("connector interactive probe exposes connector live-terminal and recovery smoke checkpoints", async () => {
  assert.equal(fs.existsSync(probePath), true);

  const module = await import(pathToFileURL(probePath).href);
  assert.equal(typeof module.buildConnectorInteractiveSmokePlan, "function");

  const plan = module.buildConnectorInteractiveSmokePlan();
  assert.equal(plan.kind, "connector-interactive-smoke-plan");
  assert.equal(plan.targets.some((item: { id: string }) => item.id === "ssh"), true);
  assert.equal(plan.targets.some((item: { id: string }) => item.id === "docker-exec"), true);
  assert.equal(plan.targets.some((item: { id: string }) => item.id === "kubernetes-exec"), true);
  assert.equal(
    plan.checkpoints.some(
      (item: { id: string }) => item.id === "cp07-3-ssh-interactive-live-terminal",
    ),
    true,
  );
  assert.equal(
    plan.checkpoints.some(
      (item: { id: string }) => item.id === "cp07-4-docker-kubernetes-interactive-live-terminal",
    ),
    true,
  );
  assert.equal(
    plan.checkpoints.some(
      (item: { id: string }) => item.id === "cp07-connector-reattach-recovery-evidence",
    ),
    true,
  );
  assert.equal(
    plan.automatedEvidence.includes(
      "cargo test --manifest-path crates/sdkwork-terminal-control-plane/Cargo.toml -- --nocapture",
    ),
    true,
  );
  assert.equal(
    plan.automatedEvidence.includes(
      "node --experimental-strip-types --test tests/desktop-session-reattach.test.ts tests/desktop-session-center.test.ts",
    ),
    true,
  );
});

test("connector interactive probe can generate a batch matrix for parallel evidence collection", async () => {
  assert.equal(fs.existsSync(probePath), true);

  const module = await import(pathToFileURL(probePath).href);
  assert.equal(typeof module.buildConnectorInteractiveBatchPlan, "function");

  const plan = module.buildConnectorInteractiveBatchPlan();
  assert.equal(plan.kind, "connector-interactive-batch-plan");
  assert.equal(plan.entries.length, 9);
  assert.equal(plan.parallelExecution.groups.length, 3);
  assert.equal(
    plan.entries.some(
      (entry: { id: string; reportCommand: string; suggestedArtifacts: { reportJson: string } }) =>
        entry.id === "windows-desktop:ssh" &&
        entry.reportCommand.includes("--report-template --platform windows-desktop --target ssh") &&
        entry.suggestedArtifacts.reportJson.includes("windows-desktop-ssh"),
    ),
    true,
  );
  assert.equal(
    plan.serialCloseout.some((item: string) => item.includes("docs/step/07")),
    true,
  );
});

test("connector interactive probe can merge preflight readiness into an execution plan", async () => {
  const module = await import(pathToFileURL(probePath).href);
  assert.equal(typeof module.buildConnectorInteractiveExecutionPlan, "function");

  const commandRunner = async (command: string, args: string[]) => {
    if (command === "ssh") {
      return {
        stdout: "",
        stderr: "OpenSSH_9.5p1",
      };
    }

    if (command === "docker") {
      const error = new Error("docker daemon unavailable") as Error & {
        code?: number;
        stdout?: string;
        stderr?: string;
      };
      error.code = 1;
      error.stderr = "error during connect";
      throw error;
    }

    if (command === "kubectl" && args.join(" ") === "config current-context") {
      return {
        stdout: "prod-cluster\n",
        stderr: "",
      };
    }

    if (command === "kubectl" && args.join(" ") === "get pods --all-namespaces -o name") {
      return {
        stdout: "",
        stderr: "",
      };
    }

    throw new Error(`unexpected command ${command} ${args.join(" ")}`);
  };

  const plan = await module.buildConnectorInteractiveExecutionPlan(
    {
      platform: "windows-desktop",
    },
    {
      commandRunner,
      fileReader: async () => "Host prod-bastion\n  HostName 10.0.0.10\n",
      environment: {
        HOME: "/tmp/test-home",
      },
    },
  );

  assert.equal(plan.kind, "connector-interactive-execution-plan");
  assert.equal(plan.entries.length, 3);
  assert.equal(
    plan.entries.some(
      (entry: { id: string; readiness: { status: string }; executableNow: boolean }) =>
        entry.id === "windows-desktop:ssh" &&
        entry.readiness.status === "ready" &&
        entry.executableNow === true,
    ),
    true,
  );
  assert.equal(
    plan.entries.some(
      (entry: { id: string; readiness: { status: string }; executableNow: boolean }) =>
        entry.id === "windows-desktop:docker-exec" &&
        entry.readiness.status === "blocked" &&
        entry.executableNow === false,
    ),
    true,
  );
  assert.equal(
    plan.entries.some(
      (entry: { id: string; readiness: { status: string }; executableNow: boolean }) =>
        entry.id === "windows-desktop:kubernetes-exec" &&
        entry.readiness.status === "tool-only" &&
        entry.executableNow === false,
    ),
    true,
  );
  assert.deepEqual(plan.summary.executableEntries, ["windows-desktop:ssh"]);
  assert.deepEqual(plan.summary.blockedEntries, ["windows-desktop:docker-exec"]);
  assert.deepEqual(plan.summary.toolOnlyEntries, ["windows-desktop:kubernetes-exec"]);
});

test("connector interactive probe can summarize host preflight readiness", async () => {
  const module = await import(pathToFileURL(probePath).href);
  assert.equal(typeof module.buildConnectorInteractivePreflightReport, "function");

  const commandRunner = async (command: string, args: string[]) => {
    if (command === "ssh") {
      return {
        stdout: "",
        stderr: "OpenSSH_9.5p1",
      };
    }

    if (command === "docker") {
      return {
        stdout: "workspace-dev\n",
        stderr: "",
      };
    }

    if (command === "kubectl" && args.join(" ") === "config current-context") {
      return {
        stdout: "prod-cluster\n",
        stderr: "",
      };
    }

    if (command === "kubectl" && args.join(" ") === "get pods --all-namespaces -o name") {
      return {
        stdout: "pod/prod-web-0\n",
        stderr: "",
      };
    }

    throw new Error(`unexpected command ${command} ${args.join(" ")}`);
  };

  const fileReader = async () => "Host prod-bastion\n  HostName 10.0.0.10\n";
  const report = await module.buildConnectorInteractivePreflightReport(
    {
      platform: "ubuntu-desktop",
    },
    {
      commandRunner,
      fileReader,
      environment: {
        HOME: "/tmp/test-home",
      },
    },
  );

  assert.equal(report.kind, "connector-interactive-preflight-report");
  assert.deepEqual(report.summary.blockedTargets, []);
  assert.deepEqual(report.summary.toolOnlyTargets, []);
  assert.equal(report.summary.readyTargets.length, 3);
  assert.equal(
    report.targets.some(
      (target: { id: string; authorityCandidates: string[]; status: string }) =>
        target.id === "ssh" &&
        target.status === "ready" &&
        target.authorityCandidates.includes("prod-bastion"),
    ),
    true,
  );
});

test("connector interactive probe preflight reports blocked targets when host tooling is unavailable", async () => {
  const module = await import(pathToFileURL(probePath).href);

  const commandRunner = async (command: string, args: string[]) => {
    if (command === "ssh") {
      const error = new Error("spawn ssh ENOENT") as Error & { code?: string };
      error.code = "ENOENT";
      throw error;
    }

    if (command === "docker") {
      const error = new Error("docker daemon unavailable") as Error & {
        code?: number;
        stdout?: string;
        stderr?: string;
      };
      error.code = 1;
      error.stderr = "error during connect";
      throw error;
    }

    if (command === "kubectl") {
      const error = new Error("current-context is not set") as Error & {
        code?: number;
        stdout?: string;
        stderr?: string;
      };
      error.code = 1;
      error.stderr = "error: current-context is not set";
      throw error;
    }

    throw new Error(`unexpected command ${command} ${args.join(" ")}`);
  };

  const report = await module.buildConnectorInteractivePreflightReport(
    {
      platform: "windows-desktop",
    },
    {
      commandRunner,
      fileReader: async () => "",
      environment: {},
    },
  );

  assert.equal(report.summary.blockedTargets.includes("ssh"), true);
  assert.equal(report.summary.blockedTargets.includes("docker-exec"), true);
  assert.equal(report.summary.blockedTargets.includes("kubernetes-exec"), true);
});

test("connector interactive probe can generate a structured smoke report template", async () => {
  assert.equal(fs.existsSync(probePath), true);

  const module = await import(pathToFileURL(probePath).href);
  assert.equal(typeof module.buildConnectorInteractiveReportTemplate, "function");

  const report = module.buildConnectorInteractiveReportTemplate({
    platform: "ubuntu-desktop",
    target: "docker-exec",
    shell: "bash",
  });

  assert.equal(report.kind, "connector-interactive-smoke-report");
  assert.equal(report.platform, "ubuntu-desktop");
  assert.equal(report.target, "docker-exec");
  assert.equal(report.shell, "bash");
  assert.equal(report.checks.length >= 7, true);
  assert.equal(
    report.checks.some((check: { id: string }) => check.id === "interactive-create"),
    true,
  );
  assert.equal(
    report.checks.some((check: { id: string }) => check.id === "live-input-echo"),
    true,
  );
  assert.equal(
    report.checks.some((check: { id: string }) => check.id === "replay-and-exit"),
    true,
  );
  assert.equal(
    report.checks.some((check: { id: string }) => check.id === "session-center-reattach"),
    true,
  );
  assert.equal(
    report.checks.some((check: { id: string }) => check.id === "restart-and-recover"),
    true,
  );
  assert.equal(report.checks.every((check: { status: string }) => check.status === "pending"), true);
  assert.equal(
    report.commands.includes(
      "node --experimental-strip-types --test tests/desktop-runtime-bridge.test.ts tests/desktop-resource-launch.test.ts tests/resource-center.test.ts tests/shell-app-render.test.ts",
    ),
    true,
  );
  assert.equal(
    report.commands.includes(
      "node --experimental-strip-types --test tests/desktop-session-reattach.test.ts tests/desktop-session-center.test.ts",
    ),
    true,
  );
});

test("connector interactive probe CLI can print a report template", async () => {
  const result = await runProbeCli([
    "--report-template",
    "--platform",
    "windows-desktop",
    "--target",
    "kubernetes-exec",
    "--shell",
    "powershell",
  ]);

  const report = JSON.parse(result.stdout);
  assert.equal(report.kind, "connector-interactive-smoke-report");
  assert.equal(report.platform, "windows-desktop");
  assert.equal(report.target, "kubernetes-exec");
  assert.equal(report.shell, "powershell");
  assert.equal(
    report.commands.includes(
      "powershell -ExecutionPolicy Bypass -File tools/smoke/connector-interactive-probe.ps1 kubernetes-exec",
    ),
    true,
  );
});

test("connector interactive probe can generate a markdown review template", async () => {
  assert.equal(fs.existsSync(probePath), true);

  const module = await import(pathToFileURL(probePath).href);
  assert.equal(typeof module.buildConnectorInteractiveReviewTemplate, "function");

  const markdown = module.buildConnectorInteractiveReviewTemplate({
    platform: "macos-desktop",
    target: "docker-exec",
    shell: "zsh",
  });

  assert.match(markdown, /# Connector Interactive Smoke Review/i);
  assert.match(markdown, /Platform: `macos-desktop`/);
  assert.match(markdown, /Target: `docker-exec`/);
  assert.match(markdown, /Shell: `zsh`/);
  assert.match(markdown, /interactive create/i);
  assert.match(markdown, /live input echo/i);
  assert.match(markdown, /session center reattach/i);
  assert.match(markdown, /restart and recover/i);
  assert.match(markdown, /node tools\/smoke\/connector-interactive-probe\.mjs/);
});

test("connector interactive probe CLI can print a markdown review template", async () => {
  const result = await runProbeCli([
    "--review-template",
    "--platform",
    "ubuntu-desktop",
    "--target",
    "docker-exec",
    "--shell",
    "bash",
  ]);

  assert.match(result.stdout, /Platform: `ubuntu-desktop`/);
  assert.match(result.stdout, /Target: `docker-exec`/);
  assert.match(result.stdout, /Shell: `bash`/);
  assert.match(result.stdout, /cargo test --manifest-path crates\/sdkwork-terminal-control-plane\/Cargo\.toml -- --nocapture/);
});

test("connector interactive probe CLI can print a batch plan", async () => {
  const result = await runProbeCli([
    "--print-batch-plan",
  ]);

  const plan = JSON.parse(result.stdout);
  assert.equal(plan.kind, "connector-interactive-batch-plan");
  assert.equal(Array.isArray(plan.entries), true);
  assert.equal(plan.entries.length, 9);
  assert.equal(
    plan.entries.some((entry: { id: string }) => entry.id === "macos-desktop:kubernetes-exec"),
    true,
  );
});

test("connector interactive probe CLI can print a preflight report", async () => {
  const result = await runProbeCli([
    "--print-preflight",
    "--platform",
    "windows-desktop",
  ]);

  const report = JSON.parse(result.stdout);
  assert.equal(report.kind, "connector-interactive-preflight-report");
  assert.equal(Array.isArray(report.targets), true);
  assert.equal(report.targets.length, 3);
});

test("connector interactive probe CLI can print an execution plan", async () => {
  const result = await runProbeCli([
    "--print-execution-plan",
    "--platform",
    "windows-desktop",
  ]);

  const plan = JSON.parse(result.stdout);
  assert.equal(plan.kind, "connector-interactive-execution-plan");
  assert.equal(plan.requestedPlatform, "windows-desktop");
  assert.equal(Array.isArray(plan.entries), true);
  assert.equal(plan.entries.length, 3);
});

test("connector interactive probe can write batch templates to disk", async () => {
  const module = await import(pathToFileURL(probePath).href);
  assert.equal(typeof module.writeConnectorInteractiveBatchTemplates, "function");

  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "sdkwork-terminal-connector-batch-"));
  const result = await module.writeConnectorInteractiveBatchTemplates(outputDir, {
    platform: "ubuntu-desktop",
  });

  assert.equal(result.kind, "connector-interactive-batch-template-output");
  assert.equal(result.artifacts.length, 3);
  assert.equal(
    result.artifacts.every(
      (artifact: { reportPath: string; reviewPath: string }) =>
        fs.existsSync(artifact.reportPath) && fs.existsSync(artifact.reviewPath),
    ),
    true,
  );
});

test("connector interactive probe can write ready-only batch templates", async () => {
  const module = await import(pathToFileURL(probePath).href);
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "sdkwork-terminal-connector-ready-only-"));

  const commandRunner = async (command: string, args: string[]) => {
    if (command === "ssh") {
      return {
        stdout: "",
        stderr: "OpenSSH_9.5p1",
      };
    }

    if (command === "docker") {
      const error = new Error("docker daemon unavailable") as Error & {
        code?: number;
        stdout?: string;
        stderr?: string;
      };
      error.code = 1;
      error.stderr = "error during connect";
      throw error;
    }

    if (command === "kubectl" && args.join(" ") === "config current-context") {
      return {
        stdout: "prod-cluster\n",
        stderr: "",
      };
    }

    if (command === "kubectl" && args.join(" ") === "get pods --all-namespaces -o name") {
      return {
        stdout: "",
        stderr: "",
      };
    }

    throw new Error(`unexpected command ${command} ${args.join(" ")}`);
  };

  const result = await module.writeConnectorInteractiveBatchTemplates(
    outputDir,
    {
      platform: "windows-desktop",
      readyOnly: true,
    },
    {
      commandRunner,
      fileReader: async () => "Host prod-bastion\n  HostName 10.0.0.10\n",
      environment: {
        HOME: "/tmp/test-home",
      },
    },
  );

  assert.equal(result.kind, "connector-interactive-batch-template-output");
  assert.equal(result.selection.readyOnly, true);
  assert.equal(result.artifacts.length, 1);
  assert.equal(result.artifacts[0]?.id, "windows-desktop:ssh");
  assert.equal(result.skippedEntries.length, 2);
  assert.equal(
    result.skippedEntries.some(
      (entry: { id: string; readiness: { status: string } }) =>
        entry.id === "windows-desktop:docker-exec" && entry.readiness.status === "blocked",
    ),
    true,
  );
  assert.equal(
    result.skippedEntries.some(
      (entry: { id: string; readiness: { status: string } }) =>
        entry.id === "windows-desktop:kubernetes-exec" && entry.readiness.status === "tool-only",
    ),
    true,
  );
  assert.equal(fs.existsSync(result.artifacts[0]?.reportPath), true);
  assert.equal(fs.existsSync(result.artifacts[0]?.reviewPath), true);
});

test("connector interactive probe CLI can write batch templates", async () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "sdkwork-terminal-connector-batch-cli-"));

  const result = await runProbeCli([
    "--write-batch-templates",
    "--platform",
    "windows-desktop",
    "--output-dir",
    outputDir,
  ]);

  const manifest = JSON.parse(result.stdout);
  assert.equal(manifest.kind, "connector-interactive-batch-template-output");
  assert.equal(manifest.artifacts.length, 3);
  assert.equal(
    manifest.artifacts.some(
      (artifact: { reportPath: string }) => artifact.reportPath.includes("windows-desktop-ssh"),
    ),
    true,
  );
});

test("smoke readme documents the connector interactive probe entrypoints", () => {
  assert.equal(fs.existsSync(probePs1Path), true);
  const source = fs.readFileSync(smokeReadmePath, "utf8");

  assert.match(source, /connector-interactive-probe\.mjs/);
  assert.match(source, /connector-interactive-probe\.ps1/);
  assert.match(source, /docker-exec/i);
  assert.match(source, /kubernetes-exec/i);
  assert.match(source, /ssh/i);
  assert.match(source, /live terminal/i);
  assert.match(source, /reattach/i);
  assert.match(source, /recovery/i);
  assert.match(source, /preflight/i);
  assert.match(source, /print-batch-plan/i);
  assert.match(source, /print-execution-plan/i);
  assert.match(source, /parallel|并行/i);
  assert.match(source, /write-batch-templates/i);
  assert.match(source, /ready-only/i);
  assert.match(source, /review-template/i);
});
