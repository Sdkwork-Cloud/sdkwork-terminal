import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const rootDir = process.cwd();
const sourcePath = path.join(
  rootDir,
  'packages',
  'sdkwork-terminal-infrastructure',
  'src',
  'index.ts',
);
const source = fs.readFileSync(sourcePath, 'utf8');

assert.match(
  source,
  /function createLocalRuntimeEventName\(eventType: RuntimeStreamEventType\)/,
  'terminal infrastructure must keep a dedicated local runtime event-name formatter.',
);
assert.doesNotMatch(
  source,
  /\.replaceAll\(/,
  'terminal infrastructure event-name formatting must not depend on String.prototype.replaceAll.',
);

console.log('runtime event name contract passed.');
