import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  webRuntimeUnavailableMessagesEnUS,
  webRuntimeUnavailableMessagesZhCN,
} from "../packages/sdkwork-terminal-pc-shell/src/i18n/index.ts";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("Browser unavailable catalogs provide complete safe English and Chinese copy", () => {
  const catalogs = [
    webRuntimeUnavailableMessagesEnUS,
    webRuntimeUnavailableMessagesZhCN,
  ] as const;

  for (const catalog of catalogs) {
    assert.equal(catalog.title.trim().length > 0, true);
    assert.equal(catalog.detail.trim().length > 0, true);
  }

  assert.doesNotMatch(webRuntimeUnavailableMessagesEnUS.detail, /token|endpoint|path/i);
  assert.doesNotMatch(webRuntimeUnavailableMessagesZhCN.detail, /token|endpoint|path/i);
});

test("Browser unavailable stage consumes injected messages without rendering runtime diagnostics", () => {
  const stageSource = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-pc-shell",
      "src",
      "web-runtime-unavailable-stage.tsx",
    ),
    "utf8",
  );
  const webIntegrationSource = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-pc-shell",
      "src",
      "web-integration.tsx",
    ),
    "utf8",
  );
  const webAppSource = fs.readFileSync(
    path.join(rootDir, "src", "surfaces", "web-app.tsx"),
    "utf8",
  );

  assert.match(stageSource, /props\.messages \?\? webRuntimeUnavailableMessagesEnUS/);
  assert.match(stageSource, /<h1 style=\{unavailableTitleStyle\}>\{messages\.title\}<\/h1>/);
  assert.match(stageSource, /\{props\.message \?\? messages\.detail\}/);
  assert.doesNotMatch(stageSource, /Remote terminal unavailable/);
  assert.match(webIntegrationSource, /messages=\{props\.webRuntimeUnavailableMessages\}/);
  assert.match(webAppSource, /navigator\.languages/);
  assert.match(
    webAppSource,
    /webRuntimeUnavailableMessages=\{webRuntimeUnavailableMessages\}/,
  );
  assert.doesNotMatch(webAppSource, /webRuntimeConfiguration\.diagnostic/);
});
