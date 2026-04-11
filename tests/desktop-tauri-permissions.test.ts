import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const DESKTOP_BRIDGE_COMMANDS = [
  "desktop_host_status",
  "desktop_daemon_health",
  "desktop_daemon_start",
  "desktop_daemon_stop",
  "desktop_daemon_reconnect",
  "desktop_execution_target_catalog",
  "desktop_session_index",
  "desktop_session_replay_slice",
  "desktop_session_attach",
  "desktop_session_detach",
  "desktop_session_reattach",
  "desktop_connector_launch",
  "desktop_connector_session_create",
  "desktop_connector_exec_probe",
  "desktop_local_shell_exec",
  "desktop_local_shell_session_create",
  "desktop_session_input",
  "desktop_session_input_bytes",
  "desktop_local_shell_session_input",
  "desktop_local_shell_session_input_bytes",
  "desktop_session_attachment_acknowledge",
  "desktop_session_resize",
  "desktop_session_terminate",
  "desktop_local_shell_session_resize",
  "desktop_local_shell_session_terminate",
] as const;

function resolveRootDir() {
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
}

test("desktop tauri capability grants snake_case bridge commands through app-owned permission set", () => {
  const rootDir = resolveRootDir();
  const capability = JSON.parse(
    fs.readFileSync(
      path.join(rootDir, "src-tauri", "capabilities", "default.json"),
      "utf8",
    ),
  );
  const permissions = capability.permissions ?? [];
  const permissionToml = fs.readFileSync(
    path.join(rootDir, "src-tauri", "permissions", "desktop-host.toml"),
    "utf8",
  );

  assert.ok(
    permissions.includes("desktop-host-commands"),
    "default capability must include the desktop-host-commands permission set",
  );

  for (const command of DESKTOP_BRIDGE_COMMANDS) {
    assert.match(
      permissionToml,
      new RegExp(`"${command}"`),
      `desktop-host.toml must allow ${command}`,
    );
  }
});
