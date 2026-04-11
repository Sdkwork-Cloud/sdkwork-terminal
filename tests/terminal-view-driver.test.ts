import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

test("xterm viewport driver stays visually aligned with the terminal stage", () => {
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const source = fs.readFileSync(
    path.join(
      rootDir,
      "packages",
      "sdkwork-terminal-infrastructure",
      "src",
      "index.ts",
    ),
    "utf8",
  );

  assert.match(source, /fontFamily:\s*"\\\"Cascadia Code\\\"/);
  assert.match(source, /fontSize:\s*14/);
  assert.match(source, /lineHeight:\s*1\.25/);
  assert.match(source, /letterSpacing:\s*0\.15/);
  assert.match(source, /convertEol:\s*false/);
  assert.match(source, /allowTransparency:\s*true/);
  assert.match(source, /scrollback:\s*5000/);
  assert.match(source, /background:\s*"#050607"/);
  assert.match(source, /foreground:\s*"#d4d4d8"/);
  assert.match(source, /const resolveTheme = \(visible: boolean\) => \(\{/);
  assert.match(source, /theme:\s*resolveTheme\(cursorVisible\)/);
  assert.match(source, /async function waitForNextAnimationFrame\(\)/);
  assert.match(source, /async function measureRuntimeViewport\(nextRuntime: Runtime\)/);
  assert.match(source, /const MAX_VIEWPORT_MEASURE_ATTEMPTS = 3/);
  assert.match(source, /window\.requestAnimationFrame\(\(\) => resolve\(\)\)/);
  assert.match(source, /let pendingTerminalMutation: Promise<void> = Promise\.resolve\(\);/);
  assert.match(source, /function enqueueTerminalMutation\(operation: \(\) => Promise<void>\)/);
  assert.match(source, /pendingTerminalMutation = queuedOperation\.catch\(\(\) => undefined\);/);
  assert.match(source, /async function writeTerminalContent\(nextRuntime: Runtime, content: string\)/);
  assert.match(source, /writeRaw:\s*async \(content, reset = false\)/);
  assert.match(source, /async render\(snapshot\) \{[\s\S]*return enqueueTerminalMutation\(async \(\) => \{/);
  assert.match(source, /async reset\(\) \{[\s\S]*return enqueueTerminalMutation\(async \(\) => \{/);
  assert.match(source, /writeRaw:\s*async \(content, reset = false\) => \{[\s\S]*return enqueueTerminalMutation\(async \(\) => \{/);
  assert.match(source, /terminal\.write\(content,/);
  assert.match(source, /await writeTerminalContent\(nextRuntime, renderPlan\.content\);/);
  assert.match(source, /await writeTerminalContent\(nextRuntime, content\);/);
  assert.match(source, /search:\s*async \(query\)/);
  assert.match(source, /searchAddon\.findNext\(query/);
  assert.match(source, /getSelection:\s*async \(\)/);
  assert.match(source, /terminal\.getSelection\(\)/);
  assert.match(source, /selectAll:\s*\(\) => Promise<void>/);
  assert.match(source, /selectAll:\s*async \(\)/);
  assert.match(source, /terminal\.selectAll\(\)/);
  assert.match(source, /paste:\s*\(text: string\) => Promise<void>/);
  assert.match(source, /paste:\s*async \(text\)/);
  assert.match(source, /terminal\.paste\(text\)/);
  assert.match(source, /function binaryStringToBytes\(data: string\)/);
  assert.match(source, /terminal\.onBinary\(\(data: string\) => \{/);
  assert.match(source, /kind:\s*"binary"/);
  assert.match(source, /inputBytes:\s*binaryStringToBytes\(data\)/);
  assert.match(source, /setTitleListener:\s*\(\s*listener:\s*\(\(title: string\) => void\) \| null,\s*\) => Promise<void>;/);
  assert.match(source, /terminal\.onTitleChange\(\(title: string\) => \{/);
  assert.match(source, /setCursorVisible:\s*\(visible: boolean\) => void;/);
  assert.match(source, /runtime\.terminal\.options\.theme = resolveTheme\(visible\);/);
  assert.match(source, /await waitForNextAnimationFrame\(\);\s*nextRuntime\.fitAddon\.fit\(\);/);
  assert.doesNotMatch(
    source,
    /if \(container && !opened\) \{\s*resolvedRuntime\.terminal\.open\(container\);/,
  );
  assert.match(
    source,
    /async attach\(nextContainer\) \{[\s\S]*const nextRuntime = await ensureRuntime\(\);[\s\S]*nextRuntime\.terminal\.open\(nextContainer\);[\s\S]*await waitForNextAnimationFrame\(\);\s*nextRuntime\.fitAddon\.fit\(\);\s*bindInputDisposables\(nextRuntime\);[\s\S]*opened = true;/,
  );
  assert.match(source, /measureViewport\(\)\s*\{[\s\S]*return measureRuntimeViewport\(nextRuntime\);[\s\S]*\}/);
});
