import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("desktop package typecheck uses the root desktop surface configuration", () => {
  const packageJson = JSON.parse(
    fs.readFileSync(
      path.join(
        rootDir,
        "packages",
        "sdkwork-terminal-pc-desktop",
        "package.json",
      ),
      "utf8",
    ),
  );

  assert.equal(
    packageJson.scripts?.typecheck,
    "node ../../tools/scripts/run-typescript-cli.mjs --project tsconfig.desktop.json --noEmit",
  );
});
