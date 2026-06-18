import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pcRoot = path.resolve(__dirname, '..');
const openapiPath = path.join(pcRoot, 'apis/local-runtime/openapi.yaml');
const httpSourcePath = path.join(pcRoot, 'crates/sdkwork-terminal-runtime-node/src/http.rs');

const expectedOpenApiPaths = [
  '/healthz',
  '/terminal/api/v1/sessions',
  '/terminal/api/v1/replays',
  '/terminal/api/v1/sessions/{sessionId}/input',
  '/terminal/api/v1/sessions/{sessionId}/input-bytes',
  '/terminal/api/v1/sessions/{sessionId}/resize',
  '/terminal/api/v1/sessions/{sessionId}/terminate',
  '/terminal/stream/v1/attach',
];

function parseOpenApiPaths(yaml) {
  const paths = [];
  for (const line of yaml.split(/\r?\n/)) {
    const match = line.match(/^  (\/[^\s:]+):\s*$/);
    if (match) {
      paths.push(match[1]);
    }
  }
  return paths;
}

function parseRustRoutePaths(source) {
  const paths = new Set(['/healthz']);
  const routePattern = /"(\/[^"]+)"/g;
  for (const match of source.matchAll(routePattern)) {
    const route = match[1].replace(':session_id', '{sessionId}');
    paths.add(route);
  }
  return [...paths].sort();
}

test('local runtime openapi exists and matches runtime-node routes', () => {
  const openapi = fs.readFileSync(openapiPath, 'utf8');
  const declaredPaths = parseOpenApiPaths(openapi).sort();
  const rustPaths = parseRustRoutePaths(fs.readFileSync(httpSourcePath, 'utf8')).sort();

  assert.deepEqual(declaredPaths, expectedOpenApiPaths.sort());
  assert.deepEqual(rustPaths, expectedOpenApiPaths.sort());
  assert.match(openapi, /openapi: 3\.1\.0/);
  assert.match(openapi, /operationId: terminalLocalRuntime_/);
});

test('runtime contract snapshot prefixes align with local runtime openapi', () => {
  const fixture = JSON.parse(
    fs.readFileSync(path.join(pcRoot, 'tests/fixtures/runtime-contract.snapshot.json'), 'utf8'),
  );

  assert.equal(fixture.surfaces.publicApi.prefix, '/terminal/api/v1');
  assert.equal(fixture.surfaces.runtimeStream.prefix, '/terminal/stream/v1');
  assert.deepEqual(fixture.errorFields, ['code', 'message', 'traceId', 'retryable', 'details']);
});
