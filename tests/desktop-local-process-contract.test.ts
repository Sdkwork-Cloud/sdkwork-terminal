import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readFile(relativePath: string) {
  return fs.readFileSync(path.join(rootDir, relativePath), "utf8");
}

test("desktop tauri bridge preserves native CLI metadata for local process sessions", () => {
  const source = readFile("src-tauri/src/lib.rs");

  assert.match(
    source,
    /pub struct DesktopLocalProcessSessionCreateRequest \{[\s\S]*pub title: Option<String>,[\s\S]*pub profile_id: Option<String>,[\s\S]*pub workspace_id: Option<String>,[\s\S]*pub project_id: Option<String>,[\s\S]*\}/,
  );
  assert.match(
    source,
    /let target = normalize_metadata_value\(profile_id\.as_deref\(\)\)\s*\.unwrap_or_else\(\|\| program_target\.clone\(\)\);/,
  );
  assert.match(
    source,
    /let resolved_workspace_id = normalize_metadata_value\(workspace_id\.as_deref\(\)\)\s*\.unwrap_or_else\(\|\| "workspace-local"\.to_string\(\)\);/,
  );
  assert.match(source, /tags.push\(format!\("profile:\{profile_tag\}"\)\);/);
  assert.match(source, /tags.push\(format!\("project:\{project_tag\}"\)\);/);
});

test("desktop tauri bridge accepts extended local shell metadata fields", () => {
  const source = readFile("src-tauri/src/lib.rs");

  assert.match(
    source,
    /pub struct DesktopLocalShellSessionCreateRequest \{[\s\S]*pub title: Option<String>,[\s\S]*pub profile_id: Option<String>,[\s\S]*pub workspace_id: Option<String>,[\s\S]*pub project_id: Option<String>,[\s\S]*\}/,
  );
  assert.match(
    source,
    /let resolved_profile_tag = normalize_metadata_value\(profile_id\.as_deref\(\)\)\s*\.unwrap_or_else\(\|\| profile\.trim\(\)\.to_lowercase\(\)\);/,
  );
  assert.match(source, /tags.push\(format!\("project:\{project_tag\}"\)\);/);
});
