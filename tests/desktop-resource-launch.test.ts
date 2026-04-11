import test from "node:test";
import assert from "node:assert/strict";

import { createResourceCenterSnapshot } from "../packages/sdkwork-terminal-resources/src/model.ts";

test("desktop connector menu entries expose launchable targets for shell chrome", async () => {
  const connectorShell = await import(
    "../apps/desktop/src/connector-shell.ts"
  ).catch(() => null);

  assert.ok(connectorShell);
  assert.equal(typeof connectorShell.createDesktopConnectorMenuEntries, "function");

  const entries = connectorShell.createDesktopConnectorMenuEntries(createResourceCenterSnapshot());

  assert.deepEqual(entries, [
    {
      targetId: "target-ssh-bastion",
      label: "SSH",
      subtitle: "ops@prod-bastion",
      accent: "#38bdf8",
    },
    {
      targetId: "target-docker-dev",
      label: "Docker",
      subtitle: "docker://workspace-dev",
      accent: "#34d399",
    },
    {
      targetId: "target-k8s-prod",
      label: "Kubernetes",
      subtitle: "k8s://prod/web-0",
      accent: "#60a5fa",
    },
  ]);
});

test("desktop resource center snapshot loader maps bridge execution targets into shell-ready connector entries", async () => {
  const resourceCenter = await import(
    "../apps/desktop/src/resource-center.ts"
  ).catch(() => null);

  assert.ok(resourceCenter);
  assert.equal(typeof resourceCenter.loadDesktopResourceCenterSnapshot, "function");

  const snapshot = await resourceCenter.loadDesktopResourceCenterSnapshot({
    async executionTargets() {
      return [
        {
          targetId: "target-ssh-custom",
          workspaceId: "workspace-custom",
          kind: "ssh",
          label: "SSH",
          authority: "dev@edge-node",
          connector: {
            connectorId: "system-ssh",
            label: "System SSH",
            transport: "system-cli",
            diagnosticsHint: "Check ssh binary",
          },
          health: {
            status: "ready",
            summary: "SSH ready",
            lastCheckedAt: "2026-04-10T12:00:00.000Z",
          },
          sessionLaunchable: true,
          tags: ["remote", "system-ssh"],
        },
        {
          targetId: "target-ssh-stage",
          workspaceId: "workspace-custom",
          kind: "ssh",
          label: "SSH",
          authority: "stage@edge-node",
          connector: {
            connectorId: "system-ssh",
            label: "System SSH",
            transport: "system-cli",
            diagnosticsHint: "Check ssh binary",
          },
          health: {
            status: "ready",
            summary: "SSH ready",
            lastCheckedAt: "2026-04-10T12:00:00.000Z",
          },
          sessionLaunchable: true,
          tags: ["remote", "system-ssh"],
        },
        {
          targetId: "target-docker-api",
          workspaceId: "workspace-custom",
          kind: "docker-exec",
          label: "Docker Exec",
          authority: "docker://workspace-api",
          connector: {
            connectorId: "system-docker",
            label: "Docker CLI",
            transport: "system-cli",
            diagnosticsHint: "Check docker binary",
          },
          health: {
            status: "ready",
            summary: "Docker ready",
            lastCheckedAt: "2026-04-10T12:00:00.000Z",
          },
          sessionLaunchable: true,
          tags: ["container", "docker"],
        },
        {
          targetId: "target-remote-runtime",
          workspaceId: "workspace-custom",
          kind: "remote-runtime",
          label: "Remote Runtime",
          authority: "runtime://edge-node-a",
          connector: {
            connectorId: "runtime-node-api",
            label: "Runtime Node API",
            transport: "remote-api",
            diagnosticsHint: "Register runtime node",
          },
          health: {
            status: "unavailable",
            summary: "Pending registration",
            lastCheckedAt: "2026-04-10T12:00:00.000Z",
          },
          sessionLaunchable: false,
          tags: ["server", "planned"],
        },
      ];
    },
  });

  assert.equal(snapshot.counts.totalTargets, 4);
  assert.equal(snapshot.counts.sessionReadyTargets, 3);
  assert.equal(snapshot.counts.blockedTargets, 1);
  assert.deepEqual(snapshot.targets.map((target) => target.targetId), [
    "target-ssh-custom",
    "target-ssh-stage",
    "target-docker-api",
    "target-remote-runtime",
  ]);

  const connectorShell = await import(
    "../apps/desktop/src/connector-shell.ts"
  ).catch(() => null);

  assert.ok(connectorShell);
  assert.deepEqual(
    connectorShell.createDesktopConnectorMenuEntries(snapshot),
    [
      {
        targetId: "target-ssh-custom",
        label: "SSH",
        subtitle: "dev@edge-node",
        accent: "#38bdf8",
      },
      {
        targetId: "target-ssh-stage",
        label: "SSH",
        subtitle: "stage@edge-node",
        accent: "#38bdf8",
      },
      {
        targetId: "target-docker-api",
        label: "Docker",
        subtitle: "docker://workspace-api",
        accent: "#34d399",
      },
    ],
  );
  assert.equal(
    connectorShell.findDesktopConnectorTargetById("target-ssh-custom", snapshot)?.authority,
    "dev@edge-node",
  );
});

test("desktop connector session intent maps a launchable resource target into shell bootstrap intent", async () => {
  const connectorShell = await import(
    "../apps/desktop/src/connector-shell.ts"
  ).catch(() => null);

  assert.ok(connectorShell);
  assert.equal(typeof connectorShell.createDesktopConnectorSessionIntent, "function");

  const snapshot = createResourceCenterSnapshot();
  const sshTarget = snapshot.targets[1];
  const intent = connectorShell.createDesktopConnectorSessionIntent(sshTarget, {
    requestId: "connector-intent-0001",
  });

  assert.deepEqual(intent, {
    requestId: "connector-intent-0001",
    profile: "bash",
    title: "SSH",
    targetLabel: "ssh / ops@prod-bastion",
    request: {
      workspaceId: "workspace-demo",
      target: "ssh",
      authority: "ops@prod-bastion",
      command: ["bash", "-l"],
      modeTags: ["cli-native"],
      tags: [
        "remote",
        "system-ssh",
        "resource:ssh",
        "connector:system-ssh",
        "target:target-ssh-bastion",
      ],
    },
  });
});

test("desktop connector session intent generates a fresh requestId for repeated launches of the same target", async () => {
  const connectorShell = await import(
    "../apps/desktop/src/connector-shell.ts"
  ).catch(() => null);

  assert.ok(connectorShell);
  assert.equal(typeof connectorShell.createDesktopConnectorSessionIntent, "function");

  const snapshot = createResourceCenterSnapshot();
  const dockerTarget = snapshot.targets.find((target) => target.kind === "docker-exec");

  assert.ok(dockerTarget);

  const firstIntent = connectorShell.createDesktopConnectorSessionIntent(dockerTarget);
  const secondIntent = connectorShell.createDesktopConnectorSessionIntent(dockerTarget);

  assert.notEqual(firstIntent.requestId, secondIntent.requestId);
  assert.equal(firstIntent.request.target, "docker-exec");
  assert.equal(secondIntent.request.target, "docker-exec");
  assert.equal(firstIntent.request.authority, "docker://workspace-dev");
  assert.equal(secondIntent.request.authority, "docker://workspace-dev");
});

test("desktop resource launch bridges a launchable target to desktop connector IPC", async () => {
  const { launchDesktopResourceTarget } = await import(
    "../apps/desktop/src/resource-launch.ts"
  ).catch(() => null);

  assert.ok(launchDesktopResourceTarget);

  const snapshot = createResourceCenterSnapshot();
  const sshTarget = snapshot.targets[1];
  const calls: Array<Record<string, unknown>> = [];

  const result = await launchDesktopResourceTarget(sshTarget, {
    async launchConnectorSession(request) {
      calls.push(request as unknown as Record<string, unknown>);

      return {
        sessionId: "session-0001",
        workspaceId: "workspace-demo",
        target: "ssh",
        state: "Running",
        createdAt: "2026-04-09T00:00:20.000Z",
        lastActiveAt: "2026-04-09T00:00:20.000Z",
        modeTags: ["cli-native"],
        tags: ["resource:ssh"],
        replayEntry: {
          sequence: 1,
          kind: "state",
          payload: "{\"state\":\"running\",\"phase\":\"connect\"}",
          occurredAt: "2026-04-09T00:00:20.000Z",
        },
      };
    },
  });

  assert.deepEqual(calls, [
    {
      workspaceId: "workspace-demo",
      target: "ssh",
      authority: "ops@prod-bastion",
      command: ["bash", "-l"],
      modeTags: ["cli-native"],
      tags: [
        "remote",
        "system-ssh",
        "resource:ssh",
        "connector:system-ssh",
        "target:target-ssh-bastion",
      ],
    },
  ]);
  assert.deepEqual(result, {
    action: "launch",
    phase: "succeeded",
    targetId: "target-ssh-bastion",
    summary: {
      targetId: "target-ssh-bastion",
      tone: "success",
      title: "SSH launch running",
      detail: "System SSH -> Running (session-0001)",
      evidence: [
        "workspace=workspace-demo",
        "authority=ops@prod-bastion",
        "replay=state",
        "payload={\"state\":\"running\",\"phase\":\"connect\"}",
      ],
    },
  });
});

test("desktop resource launch returns a failure summary for non-launchable targets", async () => {
  const { launchDesktopResourceTarget } = await import(
    "../apps/desktop/src/resource-launch.ts"
  ).catch(() => null);

  assert.ok(launchDesktopResourceTarget);

  const snapshot = createResourceCenterSnapshot();
  const localTarget = snapshot.targets[0];
  let launchCalls = 0;

  const result = await launchDesktopResourceTarget(localTarget, {
    async launchConnectorSession() {
      launchCalls += 1;
      throw new Error("should not execute");
    },
  });

  assert.equal(launchCalls, 0);
  assert.deepEqual(result, {
    action: "launch",
    phase: "failed",
    targetId: "target-local-shell",
    summary: {
      targetId: "target-local-shell",
      tone: "danger",
      title: "Local Shell launch failed",
      detail: "target is not eligible for desktop connector launch",
      evidence: [
        "connector=builtin-local-shell",
        "transport=builtin",
        "authority=localhost",
      ],
    },
  });
});

test("desktop resource exec probe bridges a launchable target to desktop connector exec IPC", async () => {
  const { probeDesktopResourceTarget } = await import(
    "../apps/desktop/src/resource-launch.ts"
  ).catch(() => null);

  assert.ok(probeDesktopResourceTarget);

  const snapshot = createResourceCenterSnapshot();
  const sshTarget = snapshot.targets[1];
  const calls: Array<Record<string, unknown>> = [];

  const result = await probeDesktopResourceTarget(sshTarget, {
    async probeConnectorExecSession(request) {
      calls.push(request as unknown as Record<string, unknown>);

      return {
        sessionId: "session-0002",
        workspaceId: "workspace-demo",
        target: "ssh",
        state: "Exited",
        createdAt: "2026-04-09T00:01:20.000Z",
        lastActiveAt: "2026-04-09T00:01:20.000Z",
        modeTags: ["cli-native"],
        tags: ["resource:ssh"],
        exitCode: 0,
        replayEntries: [
          {
            sequence: 1,
            kind: "state",
            payload: "{\"state\":\"running\",\"phase\":\"connect\"}",
            occurredAt: "2026-04-09T00:01:20.000Z",
          },
          {
            sequence: 2,
            kind: "output",
            payload: "/workspace",
            occurredAt: "2026-04-09T00:01:20.000Z",
          },
          {
            sequence: 3,
            kind: "exit",
            payload: "{\"exitCode\":0}",
            occurredAt: "2026-04-09T00:01:20.000Z",
          },
        ],
      };
    },
  });

  assert.deepEqual(calls, [
    {
      workspaceId: "workspace-demo",
      target: "ssh",
      authority: "ops@prod-bastion",
      command: ["/bin/sh", "-lc", "pwd"],
      modeTags: ["cli-native"],
      tags: [
        "remote",
        "system-ssh",
        "resource:ssh",
        "connector:system-ssh",
        "target:target-ssh-bastion",
      ],
    },
  ]);
  assert.deepEqual(result, {
    action: "exec-probe",
    phase: "succeeded",
    targetId: "target-ssh-bastion",
    summary: {
      targetId: "target-ssh-bastion",
      tone: "success",
      title: "SSH exec probe exited",
      detail: "System SSH -> exit 0 (/workspace)",
      evidence: [
        "workspace=workspace-demo",
        "authority=ops@prod-bastion",
        "replay=output",
        "exitCode=0",
      ],
    },
  });
});

test("desktop resource exec probe returns a failed summary after command failure", async () => {
  const { probeDesktopResourceTarget } = await import(
    "../apps/desktop/src/resource-launch.ts"
  ).catch(() => null);

  assert.ok(probeDesktopResourceTarget);

  const snapshot = createResourceCenterSnapshot();
  const sshTarget = snapshot.targets[1];

  const result = await probeDesktopResourceTarget(sshTarget, {
    async probeConnectorExecSession() {
      return {
        sessionId: "session-0003",
        workspaceId: "workspace-demo",
        target: "ssh",
        state: "Exited",
        createdAt: "2026-04-09T00:01:40.000Z",
        lastActiveAt: "2026-04-09T00:01:40.000Z",
        modeTags: ["cli-native"],
        tags: ["resource:ssh"],
        exitCode: 126,
        replayEntries: [
          {
            sequence: 1,
            kind: "state",
            payload: "{\"state\":\"running\",\"phase\":\"connect\"}",
            occurredAt: "2026-04-09T00:01:40.000Z",
          },
          {
            sequence: 2,
            kind: "warning",
            payload: "permission denied",
            occurredAt: "2026-04-09T00:01:40.000Z",
          },
          {
            sequence: 3,
            kind: "exit",
            payload: "{\"exitCode\":126}",
            occurredAt: "2026-04-09T00:01:40.000Z",
          },
        ],
      };
    },
  });

  assert.deepEqual(result, {
    action: "exec-probe",
    phase: "failed",
    targetId: "target-ssh-bastion",
    summary: {
      targetId: "target-ssh-bastion",
      tone: "danger",
      title: "SSH exec probe exited",
      detail: "System SSH -> exit 126 (permission denied)",
      evidence: [
        "workspace=workspace-demo",
        "authority=ops@prod-bastion",
        "replay=warning",
        "exitCode=126",
      ],
    },
  });
});
