import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("desktop working directory picker waits with a bounded timeout instead of blocking forever", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(rootDir, "src-tauri", "src", "lib.rs"),
    "utf8",
  );

  assert.match(source, /use std::\{[\s\S]*time::\{[\s\S]*Duration[\s\S]*SystemTime[\s\S]*UNIX_EPOCH[\s\S]*\},/);
  assert.match(source, /receiver\s*\.\s*recv_timeout\(Duration::from_secs\(\d+\)\)/);
  assert.match(source, /working directory picker timed out waiting for a response/);
});
