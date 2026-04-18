import test from "node:test";
import assert from "node:assert/strict";

import {
  createDesktopRuntimeBridgeClient,
  loadDesktopRuntimeReadiness,
} from "../packages/sdkwork-terminal-infrastructure/src/index.ts";

test("desktop runtime bridge client routes daemon lifecycle commands through invoke", async () => {
  const calls: string[] = [];
  const client = createDesktopRuntimeBridgeClient(async (command) => {
    calls.push(command);

    switch (command) {
      case "desktop_host_status":
        return {
          hostLabel: "sdkwork-terminal thin host ready",
          contractVersion: "v1",
          controlPlaneKind: "tauri-ipc",
          controlPlaneNamespace: "sdkwork-terminal.desktop.v1",
          dataPlaneKind: "local-runtime-channel",
          dataPlaneNamespace: "sdkwork-terminal.runtime.v1",
        };
      case "desktop_daemon_health":
      case "desktop_daemon_start":
      case "desktop_daemon_reconnect":
        return {
          phase: "running",
          healthy: true,
          startCount: 1,
          reconnectCount: command === "desktop_daemon_reconnect" ? 1 : 0,
          stopCount: 0,
          lastError: null,
          runtimeSummary: "sdkwork-terminal-session-runtime",
          observabilitySummary: "sdkwork-terminal-observability",
        };
      case "desktop_daemon_stop":
        return {
          phase: "stopped",
          healthy: false,
          startCount: 1,
          reconnectCount: 1,
          stopCount: 1,
          lastError: null,
          runtimeSummary: "sdkwork-terminal-session-runtime",
          observabilitySummary: "sdkwork-terminal-observability",
        };
      default:
        throw new Error(`Unexpected command ${command}`);
    }
  });

  await client.hostStatus();
  await client.daemonHealth();
  await client.startDaemon();
  await client.reconnectDaemon();
  await client.stopDaemon();

  assert.deepEqual(calls, [
    "desktop_host_status",
    "desktop_daemon_health",
    "desktop_daemon_start",
    "desktop_daemon_reconnect",
    "desktop_daemon_stop",
  ]);
});

test("desktop runtime bridge client routes clipboard commands through invoke", async () => {
  const calls: Array<{ command: string; args: Record<string, unknown> | undefined }> = [];
  const client = createDesktopRuntimeBridgeClient(async (command, args) => {
    calls.push({ command, args });

    switch (command) {
      case "desktop_clipboard_read_text":
        return "Get-Location\r\n";
      case "desktop_clipboard_write_text":
        return undefined;
      default:
        throw new Error(`Unexpected command ${command}`);
    }
  });

  const text = await client.readClipboardText();
  await client.writeClipboardText("echo sdkwork-terminal\r");

  assert.equal(text, "Get-Location\r\n");
  assert.deepEqual(calls, [
    {
      command: "desktop_clipboard_read_text",
      args: undefined,
    },
    {
      command: "desktop_clipboard_write_text",
      args: {
        text: "echo sdkwork-terminal\r",
      },
    },
  ]);
});

test("desktop runtime readiness is derived from host and daemon health", async () => {
  const client = createDesktopRuntimeBridgeClient(async (command) => {
    if (command === "desktop_host_status") {
      return {
        hostLabel: "sdkwork-terminal thin host ready",
        contractVersion: "v1",
        controlPlaneKind: "tauri-ipc",
        controlPlaneNamespace: "sdkwork-terminal.desktop.v1",
        dataPlaneKind: "local-runtime-channel",
        dataPlaneNamespace: "sdkwork-terminal.runtime.v1",
      };
    }

    return {
      phase: "running",
      healthy: true,
      startCount: 1,
      reconnectCount: 0,
      stopCount: 0,
      lastError: null,
      runtimeSummary: "sdkwork-terminal-session-runtime",
      observabilitySummary: "sdkwork-terminal-observability",
    };
  });

  const readiness = await loadDesktopRuntimeReadiness(client);

  assert.equal(readiness.bridge.ready, true);
  assert.equal(readiness.bridge.state, "ready");
  assert.equal(readiness.host.controlPlaneNamespace, "sdkwork-terminal.desktop.v1");
  assert.equal(readiness.daemon.phase, "running");
});

test("desktop runtime bridge client routes connector launch through invoke", async () => {
  const calls: Array<{ command: string; args: Record<string, unknown> | undefined }> = [];
  const client = createDesktopRuntimeBridgeClient(async (command, args) => {
    calls.push({ command, args });

    if (command !== "desktop_connector_launch") {
      throw new Error(`Unexpected command ${command}`);
    }

    return {
      sessionId: "session-0001",
      workspaceId: "workspace-remote",
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
  });

  const request = {
    workspaceId: "workspace-remote",
    target: "ssh",
    authority: "ops@prod-bastion",
    command: ["bash", "-l"],
    modeTags: ["cli-native"],
    tags: ["resource:ssh"],
  } as const;
  const result = await client.launchConnectorSession(request);

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    command: "desktop_connector_launch",
    args: { request },
  });
  assert.equal(result.sessionId, "session-0001");
  assert.equal(result.state, "Running");
  assert.equal(result.replayEntry.kind, "state");
});

test("desktop runtime bridge client routes connector exec probe through invoke", async () => {
  const calls: Array<{ command: string; args: Record<string, unknown> | undefined }> = [];
  const client = createDesktopRuntimeBridgeClient(async (command, args) => {
    calls.push({ command, args });

    if (command !== "desktop_connector_exec_probe") {
      throw new Error(`Unexpected command ${command}`);
    }

    return {
      sessionId: "session-0002",
      workspaceId: "workspace-remote",
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
  });

  const request = {
    workspaceId: "workspace-remote",
    target: "ssh",
    authority: "ops@prod-bastion",
    command: ["/bin/sh", "-lc", "pwd"],
    modeTags: ["cli-native"],
    tags: ["resource:ssh"],
  } as const;
  const result = await client.probeConnectorExecSession(request);

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    command: "desktop_connector_exec_probe",
    args: { request },
  });
  assert.equal(result.sessionId, "session-0002");
  assert.equal(result.state, "Exited");
  assert.equal(result.exitCode, 0);
  assert.deepEqual(
    result.replayEntries.map((entry) => entry.kind),
    ["state", "output", "exit"],
  );
});

test("desktop runtime bridge client routes interactive connector session create through invoke", async () => {
  const calls: Array<{ command: string; args: Record<string, unknown> | undefined }> = [];
  const client = createDesktopRuntimeBridgeClient(async (command, args) => {
    calls.push({ command, args });

    if (command !== "desktop_connector_session_create") {
      throw new Error(`Unexpected command ${command}`);
    }

    return {
      sessionId: "session-0201",
      workspaceId: "workspace-remote",
      target: "ssh",
      state: "Running",
      createdAt: "2026-04-10T12:00:00.000Z",
      lastActiveAt: "2026-04-10T12:00:00.000Z",
      modeTags: ["cli-native"],
      tags: ["resource:ssh"],
      attachmentId: "attachment-0201",
      cursor: "1",
      lastAckSequence: 0,
      writable: true,
      authority: "ops@prod-bastion",
      invokedProgram: "ssh",
      invokedArgs: ["-tt", "ops@prod-bastion", "--", "bash", "-l"],
      workingDirectory: "D:\\javasource\\spring-ai-plus\\spring-ai-plus-business\\apps\\sdkwork-terminal",
      replayEntry: {
        sequence: 1,
        kind: "state",
        payload: "{\"state\":\"running\",\"phase\":\"connect\"}",
        occurredAt: "2026-04-10T12:00:00.000Z",
      },
    };
  });

  const request = {
    workspaceId: "workspace-remote",
    target: "ssh",
    authority: "ops@prod-bastion",
    command: ["bash", "-l"],
    modeTags: ["cli-native"],
    tags: ["resource:ssh"],
    cols: 132,
    rows: 40,
  } as const;
  const result = await client.createConnectorInteractiveSession(request);

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    command: "desktop_connector_session_create",
    args: { request },
  });
  assert.equal(result.sessionId, "session-0201");
  assert.equal(result.attachmentId, "attachment-0201");
  assert.equal(result.invokedProgram, "ssh");
  assert.deepEqual(result.invokedArgs, ["-tt", "ops@prod-bastion", "--", "bash", "-l"]);
});

test("desktop runtime bridge client routes session index through invoke", async () => {
  const calls: Array<{ command: string; args: Record<string, unknown> | undefined }> = [];
  const client = createDesktopRuntimeBridgeClient(async (command, args) => {
    calls.push({ command, args });

    if (command !== "desktop_session_index") {
      throw new Error(`Unexpected command ${command}`);
    }

    return {
      sessions: [
        {
          sessionId: "session-0001",
          workspaceId: "workspace-demo",
          target: "ssh",
          state: "Running",
          createdAt: "2026-04-09T00:00:20.000Z",
          lastActiveAt: "2026-04-09T00:00:20.000Z",
          modeTags: ["cli-native"],
          tags: ["resource:ssh"],
        },
      ],
      attachments: [
        {
          attachmentId: "attachment-0001",
          sessionId: "session-0001",
          cursor: "3",
          lastAckSequence: 3,
          writable: true,
        },
      ],
    };
  });

  const result = await client.sessionIndex();

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    command: "desktop_session_index",
    args: undefined,
  });
  assert.equal(result.sessions.length, 1);
  assert.equal(result.sessions[0]?.state, "Running");
  assert.deepEqual(result.sessions[0]?.tags, ["resource:ssh"]);
  assert.equal(result.attachments[0]?.attachmentId, "attachment-0001");
});

test("desktop runtime bridge client routes execution target catalog through invoke", async () => {
  const calls: Array<{ command: string; args: Record<string, unknown> | undefined }> = [];
  const client = createDesktopRuntimeBridgeClient(async (command, args) => {
    calls.push({ command, args });

    if (command !== "desktop_execution_target_catalog") {
      throw new Error(`Unexpected command ${command}`);
    }

    return [
      {
        targetId: "target-ssh-bastion",
        workspaceId: "workspace-demo",
        kind: "ssh",
        label: "SSH",
        authority: "ops@prod-bastion",
        connector: {
          connectorId: "system-ssh",
          label: "System SSH",
          transport: "system-cli",
          diagnosticsHint: "Check ssh binary, config and host-key trust chain.",
        },
        health: {
          status: "degraded",
          summary: "Host-key confirmation required before the next launch.",
          lastCheckedAt: "2026-04-09T00:00:00.000Z",
        },
        sessionLaunchable: true,
        tags: ["remote", "system-ssh"],
      },
    ];
  });

  const result = await client.executionTargets();

  assert.deepEqual(calls, [
    {
      command: "desktop_execution_target_catalog",
      args: undefined,
    },
  ]);
  assert.equal(result.length, 1);
  assert.equal(result[0]?.kind, "ssh");
  assert.equal(result[0]?.connector.transport, "system-cli");
});

test("desktop runtime bridge client routes session replay slice through invoke", async () => {
  const calls: Array<{ command: string; args: Record<string, unknown> | undefined }> = [];
  const client = createDesktopRuntimeBridgeClient(async (command, args) => {
    calls.push({ command, args });

    if (command !== "desktop_session_replay_slice") {
      throw new Error(`Unexpected command ${command}`);
    }

    return {
      sessionId: "session-0002",
      fromCursor: null,
      nextCursor: "3",
      hasMore: false,
      entries: [
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
          occurredAt: "2026-04-09T00:01:21.000Z",
        },
        {
          sequence: 3,
          kind: "exit",
          payload: "{\"exitCode\":0}",
          occurredAt: "2026-04-09T00:01:22.000Z",
        },
      ],
    };
  });

  const result = await client.sessionReplay("session-0002", { limit: 8 });

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    command: "desktop_session_replay_slice",
    args: {
      sessionId: "session-0002",
      fromCursor: undefined,
      limit: 8,
    },
  });
  assert.equal(result.sessionId, "session-0002");
  assert.equal(result.nextCursor, "3");
  assert.deepEqual(
    result.entries.map((entry) => entry.kind),
    ["state", "output", "exit"],
  );
});

test("desktop runtime bridge client routes local shell exec through invoke", async () => {
  const calls: Array<{ command: string; args: Record<string, unknown> | undefined }> = [];
  const client = createDesktopRuntimeBridgeClient(async (command, args) => {
    calls.push({ command, args });

    if (command !== "desktop_local_shell_exec") {
      throw new Error(`Unexpected command ${command}`);
    }

    return {
      profile: "powershell",
      commandText: "echo sdkwork-terminal",
      workingDirectory: "D:\\javasource\\spring-ai-plus\\spring-ai-plus-business\\apps\\sdkwork-terminal",
      invokedProgram: "powershell",
      exitCode: 0,
      stdout: "sdkwork-terminal",
      stderr: "",
    };
  });

  const request = {
    profile: "powershell",
    commandText: "echo sdkwork-terminal",
  } as const;
  const result = await client.executeLocalShellCommand(request);

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    command: "desktop_local_shell_exec",
    args: { request },
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.stdout, "sdkwork-terminal");
  assert.equal(result.invokedProgram, "powershell");
});

test("desktop runtime bridge client routes session lifecycle write commands through invoke", async () => {
  const calls: Array<{ command: string; args: Record<string, unknown> | undefined }> = [];
  const client = createDesktopRuntimeBridgeClient(async (command, args) => {
    calls.push({ command, args });

    switch (command) {
      case "desktop_local_shell_session_create":
        return {
          sessionId: "session-0100",
          workspaceId: "workspace-local",
          target: "local-shell",
          state: "Running",
          createdAt: "2026-04-09T10:00:00.000Z",
          lastActiveAt: "2026-04-09T10:00:00.000Z",
          modeTags: ["cli-native"],
          tags: ["profile:powershell"],
          attachmentId: "attachment-0100",
          cursor: "0",
          lastAckSequence: 0,
          writable: true,
          profile: "powershell",
          workingDirectory: "D:\\javasource\\spring-ai-plus\\spring-ai-plus-business\\apps\\sdkwork-terminal",
          invokedProgram: "pwsh",
        };
      case "desktop_session_input":
        return {
          sessionId: "session-0100",
          acceptedBytes: 12,
        };
      case "desktop_session_resize":
        return {
          sessionId: "session-0100",
          cols: 132,
          rows: 32,
        };
      case "desktop_session_terminate":
        return {
          sessionId: "session-0100",
          state: "Stopping",
        };
      default:
        throw new Error(`Unexpected command ${command}`);
    }
  });

  const created = await client.createLocalShellSession({
    profile: "powershell",
    cols: 132,
    rows: 32,
  });
  const input = await client.writeSessionInput({
    sessionId: created.sessionId,
    input: "echo sdkwork\r",
  });
  const resized = await client.resizeSession({
    sessionId: created.sessionId,
    cols: 132,
    rows: 32,
  });
  const terminated = await client.terminateSession(created.sessionId);

  assert.deepEqual(calls, [
    {
      command: "desktop_local_shell_session_create",
      args: {
        request: {
          profile: "powershell",
          cols: 132,
          rows: 32,
        },
      },
    },
    {
      command: "desktop_session_input",
      args: {
        request: {
          sessionId: "session-0100",
          input: "echo sdkwork\r",
        },
      },
    },
    {
      command: "desktop_session_resize",
      args: {
        request: {
          sessionId: "session-0100",
          cols: 132,
          rows: 32,
        },
      },
    },
    {
      command: "desktop_session_terminate",
      args: {
        sessionId: "session-0100",
      },
    },
  ]);
  assert.equal(created.sessionId, "session-0100");
  assert.equal(created.attachmentId, "attachment-0100");
  assert.equal(input.acceptedBytes, 12);
  assert.equal(resized.cols, 132);
  assert.equal(terminated.state, "Stopping");
});

test("desktop runtime bridge client routes local process session create through invoke", async () => {
  const calls: Array<{ command: string; args: Record<string, unknown> | undefined }> = [];
  const client = createDesktopRuntimeBridgeClient(async (command, args) => {
    calls.push({ command, args });

    if (command !== "desktop_local_process_session_create") {
      throw new Error(`Unexpected command ${command}`);
    }

    return {
      sessionId: "session-0101",
      workspaceId: "workspace-local",
      target: "codex",
      state: "Running",
      createdAt: "2026-04-18T10:00:00.000Z",
      lastActiveAt: "2026-04-18T10:00:00.000Z",
      modeTags: ["cli-native"],
      tags: ["launcher:local-process", "program:codex"],
      attachmentId: "attachment-0101",
      cursor: "0",
      lastAckSequence: 0,
      writable: true,
      workingDirectory: "D:\\javasource\\spring-ai-plus\\spring-ai-plus-business\\apps\\sdkwork-terminal",
      invokedProgram: "codex",
      invokedArgs: [],
    };
  });

  const created = await client.createLocalProcessSession({
    command: ["codex"],
    cols: 140,
    rows: 36,
  });

  assert.deepEqual(calls, [
    {
      command: "desktop_local_process_session_create",
      args: {
        request: {
          command: ["codex"],
          cols: 140,
          rows: 36,
        },
      },
    },
  ]);
  assert.equal(created.sessionId, "session-0101");
  assert.equal(created.target, "codex");
  assert.equal(created.invokedProgram, "codex");
  assert.deepEqual(created.invokedArgs, []);
});

test("desktop runtime bridge client routes session binary input through invoke", async () => {
  const calls: Array<{ command: string; args: Record<string, unknown> | undefined }> = [];
  const client = createDesktopRuntimeBridgeClient(async (command, args) => {
    calls.push({ command, args });

    if (command !== "desktop_session_input_bytes") {
      throw new Error(`Unexpected command ${command}`);
    }

    return {
      sessionId: "session-0200",
      acceptedBytes: 6,
    };
  });

  const result = await client.writeSessionInputBytes({
    sessionId: "session-0200",
    inputBytes: [0x1b, 0x5b, 0x4d, 0x20, 0x24, 0x2a],
  });

  assert.deepEqual(calls, [
    {
      command: "desktop_session_input_bytes",
      args: {
        request: {
          sessionId: "session-0200",
          inputBytes: [0x1b, 0x5b, 0x4d, 0x20, 0x24, 0x2a],
        },
      },
    },
  ]);
  assert.equal(result.sessionId, "session-0200");
  assert.equal(result.acceptedBytes, 6);
});

test("desktop runtime bridge client routes session attachment acknowledge through invoke", async () => {
  const calls: Array<{ command: string; args: Record<string, unknown> | undefined }> = [];
  const client = createDesktopRuntimeBridgeClient(async (command, args) => {
    calls.push({ command, args });

    if (command !== "desktop_session_attachment_acknowledge") {
      throw new Error(`Unexpected command ${command}`);
    }

    return {
      attachmentId: "attachment-0200",
      sessionId: "session-0200",
      cursor: "6",
      lastAckSequence: 6,
      writable: true,
    };
  });

  const result = await client.acknowledgeSessionAttachment({
    attachmentId: "attachment-0200",
    sequence: 6,
  });

  assert.deepEqual(calls, [
    {
      command: "desktop_session_attachment_acknowledge",
      args: {
        request: {
          attachmentId: "attachment-0200",
          sequence: 6,
        },
      },
    },
  ]);
  assert.equal(result.attachmentId, "attachment-0200");
  assert.equal(result.sessionId, "session-0200");
  assert.equal(result.lastAckSequence, 6);
  assert.equal(result.cursor, "6");
});

test("desktop runtime bridge client routes session attach detach and reattach through invoke", async () => {
  const calls: Array<{ command: string; args: Record<string, unknown> | undefined }> = [];
  const client = createDesktopRuntimeBridgeClient(async (command, args) => {
    calls.push({ command, args });

    switch (command) {
      case "desktop_session_attach":
        return {
          session: {
            sessionId: "session-0300",
            workspaceId: "workspace-remote",
            target: "ssh",
            state: "Running",
            createdAt: "2026-04-10T08:00:00.000Z",
            lastActiveAt: "2026-04-10T08:00:01.000Z",
            modeTags: ["cli-native"],
            tags: ["resource:ssh"],
          },
          attachment: {
            attachmentId: "attachment-0300",
            sessionId: "session-0300",
            cursor: "9",
            lastAckSequence: 9,
            writable: true,
          },
        };
      case "desktop_session_detach":
        return {
          sessionId: "session-0300",
          workspaceId: "workspace-remote",
          target: "ssh",
          state: "Detached",
          createdAt: "2026-04-10T08:00:00.000Z",
          lastActiveAt: "2026-04-10T08:00:02.000Z",
          modeTags: ["cli-native"],
          tags: ["resource:ssh"],
        };
      case "desktop_session_reattach":
        return {
          session: {
            sessionId: "session-0300",
            workspaceId: "workspace-remote",
            target: "ssh",
            state: "Running",
            createdAt: "2026-04-10T08:00:00.000Z",
            lastActiveAt: "2026-04-10T08:00:03.000Z",
            modeTags: ["cli-native"],
            tags: ["resource:ssh"],
          },
          attachment: {
            attachmentId: "attachment-0301",
            sessionId: "session-0300",
            cursor: "9",
            lastAckSequence: 9,
            writable: true,
          },
        };
      default:
        throw new Error(`Unexpected command ${command}`);
    }
  });

  const attached = await client.attachSession({
    sessionId: "session-0300",
  });
  const detached = await client.detachSessionAttachment({
    attachmentId: "attachment-0300",
  });
  const reattached = await client.reattachSession({
    sessionId: "session-0300",
  });

  assert.deepEqual(calls, [
    {
      command: "desktop_session_attach",
      args: {
        request: {
          sessionId: "session-0300",
        },
      },
    },
    {
      command: "desktop_session_detach",
      args: {
        request: {
          attachmentId: "attachment-0300",
        },
      },
    },
    {
      command: "desktop_session_reattach",
      args: {
        request: {
          sessionId: "session-0300",
        },
      },
    },
  ]);
  assert.equal(attached.session.sessionId, "session-0300");
  assert.deepEqual(attached.session.tags, ["resource:ssh"]);
  assert.equal(attached.attachment.attachmentId, "attachment-0300");
  assert.equal(detached.state, "Detached");
  assert.deepEqual(detached.tags, ["resource:ssh"]);
  assert.equal(reattached.session.state, "Running");
  assert.deepEqual(reattached.session.tags, ["resource:ssh"]);
  assert.equal(reattached.attachment.attachmentId, "attachment-0301");
});

test("desktop runtime bridge client subscribes to local shell session stream events when supported", async () => {
  const listens: string[] = [];
  const unlistens: string[] = [];
  const listeners = new Map<
    string,
    (event: {
      payload: {
        sessionId: string;
        nextCursor: string;
        entry: {
          sequence: number;
          kind: "output" | "warning" | "exit";
          payload: string;
          occurredAt: string;
        };
      };
    }) => void
  >();
  const client = createDesktopRuntimeBridgeClient(
    async () => {
      throw new Error("invoke should not be called");
    },
    async (event, listener) => {
      listens.push(event);
      listeners.set(event, listener);

      return () => {
        unlistens.push(event);
        listeners.delete(event);
      };
    },
  );
  const received: Array<{
    sessionId: string;
    nextCursor: string;
    entry: {
      sequence: number;
      kind: "output" | "warning" | "exit";
      payload: string;
      occurredAt: string;
    };
  }> = [];

  assert.ok(client.subscribeSessionEvents);
  const unlisten = await client.subscribeSessionEvents!("session-0100", (event) => {
    received.push(event);
  });

  assert.deepEqual(listens, [
    "sdkwork-terminal:runtime:v1:session:output",
    "sdkwork-terminal:runtime:v1:session:warning",
    "sdkwork-terminal:runtime:v1:session:exit",
  ]);

  listeners.get("sdkwork-terminal:runtime:v1:session:output")?.({
    payload: {
      sessionId: "session-9999",
      nextCursor: "1",
      entry: {
        sequence: 1,
        kind: "output",
        payload: "ignored",
        occurredAt: "2026-04-09T10:00:00.000Z",
      },
    },
  });
  listeners.get("sdkwork-terminal:runtime:v1:session:output")?.({
    payload: {
      sessionId: "session-0100",
      nextCursor: "2",
      entry: {
        sequence: 2,
        kind: "output",
        payload: "Windows PowerShell ready",
        occurredAt: "2026-04-09T10:00:01.000Z",
      },
    },
  });
  listeners.get("sdkwork-terminal:runtime:v1:session:warning")?.({
    payload: {
      sessionId: "session-0100",
      nextCursor: "3",
      entry: {
        sequence: 3,
        kind: "warning",
        payload: "{\"message\":\"permission denied\"}",
        occurredAt: "2026-04-09T10:00:02.000Z",
      },
    },
  });
  listeners.get("sdkwork-terminal:runtime:v1:session:exit")?.({
    payload: {
      sessionId: "session-0100",
      nextCursor: "4",
      entry: {
        sequence: 4,
        kind: "exit",
        payload: "{\"exitCode\":0}",
        occurredAt: "2026-04-09T10:00:03.000Z",
      },
    },
  });

  assert.deepEqual(
    received.map((event) => ({
      sessionId: event.sessionId,
      nextCursor: event.nextCursor,
      kind: event.entry.kind,
      sequence: event.entry.sequence,
    })),
    [
      {
        sessionId: "session-0100",
        nextCursor: "2",
        kind: "output",
        sequence: 2,
      },
      {
        sessionId: "session-0100",
        nextCursor: "3",
        kind: "warning",
        sequence: 3,
      },
      {
        sessionId: "session-0100",
        nextCursor: "4",
        kind: "exit",
        sequence: 4,
      },
    ],
  );

  await unlisten();

  assert.deepEqual(unlistens, listens);
});

test("desktop runtime bridge client uses tauri-safe event names for session subscriptions", async () => {
  const listenedEvents: string[] = [];
  const client = createDesktopRuntimeBridgeClient(
    async () => {
      throw new Error("invoke should not be called");
    },
    async (event) => {
      listenedEvents.push(event);
      return () => {};
    },
  );

  assert.ok(client.subscribeSessionEvents);
  await client.subscribeSessionEvents!("session-safe-0001", () => {});

  assert.ok(listenedEvents.length > 0);
  for (const eventName of listenedEvents) {
    assert.equal(eventName.includes("."), false);
    assert.match(eventName, /^[A-Za-z0-9:_/-]+$/);
  }
});
