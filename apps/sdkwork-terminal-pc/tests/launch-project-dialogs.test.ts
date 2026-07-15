import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function readShellSource(fileName: string) {
  return fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-pc-shell",
      "src",
      fileName,
    ),
    "utf8",
  );
}

test("launch project dialogs keep keyboard focus scoped and restore the prior connected element", () => {
  const dialogSource = readShellSource("launch-project-dialogs.tsx");
  const focusSource = readShellSource("launch-project-dialog-focus.ts");

  assert.match(dialogSource, /useLaunchProjectDialogFocus\(\{\s*dialogRef,\s*initialFocusRef: cancelButtonRef,/);
  assert.match(dialogSource, /useLaunchProjectDialogFocus\(\{\s*dialogRef,\s*initialFocusRef: searchInputRef,/);
  assert.match(dialogSource, /tabIndex=\{-1\}/);
  assert.equal((dialogSource.match(/onKeyDown=\{handleDialogKeyDown\}/g) ?? []).length, 2);
  assert.equal((dialogSource.match(/event\.stopPropagation\(\);\s*props\.on(?:Cancel|Close)\(\);/g) ?? []).length, 2);
  assert.doesNotMatch(dialogSource, /window\.addEventListener\("keydown"/);

  assert.match(focusSource, /export function useLaunchProjectDialogFocus/);
  assert.match(focusSource, /document\.activeElement instanceof HTMLElement/);
  assert.match(focusSource, /previousFocusedElement\?\.isConnected/);
  assert.match(focusSource, /export function trapLaunchProjectDialogFocus/);
  assert.match(focusSource, /event\.key !== "Tab"/);
  assert.match(focusSource, /event\.shiftKey/);
});
