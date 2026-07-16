import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import YAML from 'yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pcRoot = path.resolve(__dirname, '..');
const openapiPath = path.join(
  pcRoot,
  'sdks/sdkwork-terminal-app-sdk/openapi/sdkwork-terminal-app-api.openapi.yaml',
);
const sdkgenPath = path.join(
  pcRoot,
  'sdks/sdkwork-terminal-app-sdk/openapi/sdkwork-terminal-app-api.sdkgen.yaml',
);
const composedFacadePath = path.join(
  pcRoot,
  'sdks/sdkwork-terminal-app-sdk/sdkwork-terminal-app-sdk-typescript/src/index.ts',
);

test('public terminal create is project-runtime-location bound and path-free', () => {
  const source = fs.readFileSync(openapiPath, 'utf8');
  const document = YAML.parse(source);
  const sdkgenDocument = YAML.parse(fs.readFileSync(sdkgenPath, 'utf8'));
  const sessions = document.paths['/app/v3/api/device/terminal/sessions'];
  const events = document.paths['/app/v3/api/device/terminal/sessions/{sessionId}/events'];
  const create = sessions.post;
  const requestRef = create.requestBody.content['application/json'].schema.$ref;
  const createRequest = document.components.schemas.CreateProjectTerminalSessionRequest;
  const createPayload = document.components.schemas.ProjectTerminalSessionCreatePayload;
  const replay = document.components.schemas.ProjectTerminalSessionReplaySnapshot;
  const createItemRef = create.responses['201'].content['application/json']
    .schema.allOf[1].properties.data.properties.item.$ref;

  assert.equal(requestRef, '#/components/schemas/CreateProjectTerminalSessionRequest');
  assert.deepEqual(createRequest.required, [
    'projectId',
    'runtimeLocationId',
    'command',
  ]);
  assert.equal(createRequest.additionalProperties, false);
  assert.equal(createRequest.properties.workingDirectory, undefined);
  assert.equal(createRequest.properties.authority, undefined);
  assert.equal(createItemRef, '#/components/schemas/ProjectTerminalSessionCreatePayload');
  assert.equal(createPayload.properties.workingDirectory, undefined);
  assert.equal(createPayload.properties.authority, undefined);
  assert.equal(replay.properties.workingDirectory, undefined);
  assert.equal(
    document.components.schemas.RemoteRuntimeSessionCreateRequest,
    undefined,
  );
  assert.equal(
    document.components.schemas.RuntimeNodeInteractiveSessionCreateSnapshot,
    undefined,
  );
  assert.ok(create.responses['503']);
  assert.equal(events.get.operationId, 'device.terminal.sessions.events.stream');
  assert.deepEqual(events.get.parameters, [
    { $ref: '#/components/parameters/SessionIdPath' },
  ]);
  assert.equal(
    sdkgenDocument.paths['/app/v3/api/device/terminal/sessions/{sessionId}/events'],
    undefined,
  );
  assert.doesNotMatch(source, /workingDirectory/);
});

test('composed terminal SDK facade owns generated transport exposure', () => {
  const facade = fs.readFileSync(composedFacadePath, 'utf8');

  assert.match(facade, /export \* from '\.\.\/generated\/server-openapi\/dist\/index\.js'/);
  assert.doesNotMatch(facade, /generated\/server-openapi\/src/);
});
