import test from "node:test";
import assert from "node:assert/strict";

import { buildRuntimeContractSnapshot } from "../packages/sdkwork-terminal-contracts/src/index.ts";

test("runtime contracts expose execution target descriptor metadata for resource center", () => {
  const snapshot = buildRuntimeContractSnapshot() as Record<string, unknown>;

  assert.deepEqual(snapshot.executionTargetDescriptorFields, [
    "targetId",
    "workspaceId",
    "kind",
    "label",
    "authority",
    "connector",
    "health",
    "sessionLaunchable",
    "tags",
  ]);
  assert.deepEqual(snapshot.connectorHealthStatuses, [
    "ready",
    "degraded",
    "unavailable",
  ]);
  assert.deepEqual(snapshot.connectorTransports, [
    "builtin",
    "system-cli",
    "remote-api",
  ]);
});

test("resource center snapshot derives ready, attention and blocked targets", async () => {
  const resourceModel = await import(
    "../packages/sdkwork-terminal-resources/src/model.ts"
  ).catch(() => null);

  assert.ok(resourceModel);
  assert.equal(typeof resourceModel.createResourceCenterSnapshot, "function");

  const snapshot = resourceModel.createResourceCenterSnapshot();

  assert.equal(snapshot.counts.totalTargets, 5);
  assert.equal(snapshot.counts.sessionReadyTargets, 4);
  assert.equal(snapshot.counts.attentionTargets, 1);
  assert.equal(snapshot.counts.blockedTargets, 1);
  assert.equal(snapshot.targets[1]?.launchState, "needs-attention");
  assert.equal(snapshot.targets[4]?.launchState, "blocked");
  assert.match(resourceModel.summarizeResourceCenter(snapshot), /4 session ready/);
});

test("resource center exposes session create drafts only for launchable targets", async () => {
  const resourceModel = await import(
    "../packages/sdkwork-terminal-resources/src/model.ts"
  ).catch(() => null);

  assert.ok(resourceModel);
  assert.equal(typeof resourceModel.createResourceSessionDraft, "function");

  const snapshot = resourceModel.createResourceCenterSnapshot();
  const sshDraft = resourceModel.createResourceSessionDraft(snapshot.targets[1]);
  const remoteDraft = resourceModel.createResourceSessionDraft(snapshot.targets[4]);

  assert.deepEqual(sshDraft, {
    workspaceId: "workspace-demo",
    target: "ssh",
    modeTags: ["cli-native"],
    tags: [
      "remote",
      "system-ssh",
      "resource:ssh",
      "connector:system-ssh",
      "target:target-ssh-bastion",
    ],
  });
  assert.equal(remoteDraft, null);
});

test("resource center exposes connector launch requests only for system-cli targets", async () => {
  const resourceModel = await import(
    "../packages/sdkwork-terminal-resources/src/model.ts"
  ).catch(() => null);

  assert.ok(resourceModel);
  assert.equal(typeof resourceModel.createConnectorSessionLaunchRequest, "function");

  const snapshot = resourceModel.createResourceCenterSnapshot();
  const localRequest = resourceModel.createConnectorSessionLaunchRequest(snapshot.targets[0]);
  const sshRequest = resourceModel.createConnectorSessionLaunchRequest(snapshot.targets[1]);
  const dockerRequest = resourceModel.createConnectorSessionLaunchRequest(snapshot.targets[2]);
  const kubernetesRequest = resourceModel.createConnectorSessionLaunchRequest(snapshot.targets[3]);
  const remoteRequest = resourceModel.createConnectorSessionLaunchRequest(snapshot.targets[4]);

  assert.equal(localRequest, null);
  assert.deepEqual(sshRequest, {
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
  });
  assert.deepEqual(dockerRequest, {
    workspaceId: "workspace-demo",
    target: "docker-exec",
    authority: "docker://workspace-dev",
    command: ["/bin/sh"],
    modeTags: ["cli-native"],
    tags: [
      "container",
      "docker",
      "resource:docker-exec",
      "connector:system-docker",
      "target:target-docker-dev",
    ],
  });
  assert.deepEqual(kubernetesRequest, {
    workspaceId: "workspace-demo",
    target: "kubernetes-exec",
    authority: "k8s://prod/web-0",
    command: ["/bin/sh"],
    modeTags: ["cli-native"],
    tags: [
      "cluster",
      "kubernetes",
      "resource:kubernetes-exec",
      "connector:system-kubectl",
      "target:target-k8s-prod",
    ],
  });
  assert.equal(remoteRequest, null);
});

test("resource center exposes dedicated remote runtime session create requests for remote-api targets", async () => {
  const resourceModel = await import(
    "../packages/sdkwork-terminal-resources/src/model.ts"
  ).catch(() => null);

  assert.ok(resourceModel);
  assert.equal(typeof resourceModel.createRemoteRuntimeSessionCreateRequest, "function");

  const snapshot = resourceModel.createResourceCenterSnapshot({
    targets: [
      {
        targetId: "target-remote-runtime-ready",
        workspaceId: "workspace-runtime",
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
          status: "ready",
          summary: "Runtime node is ready",
          lastCheckedAt: "2026-04-10T16:20:00.000Z",
        },
        sessionLaunchable: true,
        tags: ["server", "managed"],
      },
    ],
  });
  const remoteTarget = snapshot.targets[0];

  assert.ok(remoteTarget);
  assert.equal(resourceModel.createConnectorSessionLaunchRequest(remoteTarget), null);
  assert.deepEqual(
    resourceModel.createRemoteRuntimeSessionCreateRequest(remoteTarget),
    {
      workspaceId: "workspace-runtime",
      target: "remote-runtime",
      authority: "runtime://edge-node-a",
      command: ["/bin/sh"],
      modeTags: ["cli-native"],
      tags: [
        "server",
        "managed",
        "resource:remote-runtime",
        "connector:runtime-node-api",
        "target:target-remote-runtime-ready",
      ],
    },
  );
});

test("resource center summarizes successful connector launch evidence for UI projection", async () => {
  const resourceModel = await import(
    "../packages/sdkwork-terminal-resources/src/model.ts"
  ).catch(() => null);

  assert.ok(resourceModel);
  assert.equal(typeof resourceModel.createResourceLaunchSummary, "function");

  const snapshot = resourceModel.createResourceCenterSnapshot();
  const sshTarget = snapshot.targets[1];
  const summary = resourceModel.createResourceLaunchSummary(sshTarget, {
    sessionId: "session-0001",
    workspaceId: "workspace-demo",
    target: "ssh",
    state: "Running",
    createdAt: "2026-04-09T00:00:20.000Z",
    lastActiveAt: "2026-04-09T00:00:20.000Z",
    replayEntry: {
      sequence: 1,
      kind: "state",
      payload: "{\"state\":\"running\",\"phase\":\"connect\"}",
      occurredAt: "2026-04-09T00:00:20.000Z",
    },
  });

  assert.deepEqual(summary, {
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
  });
});
