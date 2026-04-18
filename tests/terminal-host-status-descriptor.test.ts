import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("shared terminal host status descriptor centralizes startup and failure messaging", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-shell",
      "src",
      "terminal-host-status.ts",
    ),
    "utf8",
  );

  assert.match(source, /export interface CreateTerminalHostStatusDescriptorArgs/);
  assert.match(source, /lifecycleState: TerminalHostLifecycleState;/);
  assert.match(source, /hostLifecycleError: string \| null;/);
  assert.match(source, /hostViewportMeasured: boolean;/);
  assert.match(source, /readyDetail: string;/);
  assert.match(source, /export interface TerminalHostStatusDescriptor/);
  assert.match(source, /show: boolean;/);
  assert.match(source, /title: string;/);
  assert.match(source, /detail: string;/);
  assert.match(source, /warning: boolean;/);
  assert.match(source, /export interface CreateTerminalHostStatusViewModelArgs/);
  assert.match(source, /descriptor: TerminalHostStatusDescriptor;/);
  assert.match(source, /onRetry\?: \(\) => void;/);
  assert.match(source, /export function createTerminalHostStatusViewModel/);
  assert.match(source, /export function createTerminalHostStatusDescriptor/);
  assert.match(source, /const show =/);
  assert.match(source, /Waiting for terminal layout/);
  assert.match(source, /Terminal surface failed/);
  assert.match(source, /Initializing terminal surface/);
  assert.match(source, /Waiting for a measurable viewport before clearing startup status/);
  assert.doesNotMatch(source, /loaded fonts before clearing startup status/);
  assert.match(source, /return \{/);
});
