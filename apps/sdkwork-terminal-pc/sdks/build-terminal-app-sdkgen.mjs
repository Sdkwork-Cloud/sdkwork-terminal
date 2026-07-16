import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import YAML from 'yaml';

const appRoot = resolve(import.meta.dirname, '..');
const sourcePath = resolve(appRoot, 'apis/local-runtime/openapi.yaml');
const familyOpenapiRoot = resolve(
  appRoot,
  'sdks/sdkwork-terminal-app-sdk/openapi',
);
const authorityPath = resolve(familyOpenapiRoot, 'sdkwork-terminal-app-api.openapi.yaml');
const sdkgenPath = resolve(familyOpenapiRoot, 'sdkwork-terminal-app-api.sdkgen.yaml');

const document = YAML.parse(await readFile(sourcePath, 'utf8'));
document.info = {
  ...document.info,
  title: 'SDKWork Terminal App API',
  description: 'Authenticated Browser terminal session control API served by application.public-ingress.',
};
document.servers = [];

for (const path of ['/healthz', '/livez', '/readyz', '/metrics']) {
  delete document.paths[path];
}
const pathMappings = new Map([
  ['/terminal/api/v1/sessions', '/app/v3/api/device/terminal/sessions'],
  ['/terminal/api/v1/replays', '/app/v3/api/device/terminal/sessions/{sessionId}/replay'],
  ['/terminal/api/v1/sessions/{sessionId}/input', '/app/v3/api/device/terminal/sessions/{sessionId}/input'],
  ['/terminal/api/v1/sessions/{sessionId}/input-bytes', '/app/v3/api/device/terminal/sessions/{sessionId}/input_bytes'],
  ['/terminal/api/v1/sessions/{sessionId}/resize', '/app/v3/api/device/terminal/sessions/{sessionId}/resize'],
  ['/terminal/api/v1/sessions/{sessionId}/terminate', '/app/v3/api/device/terminal/sessions/{sessionId}/terminate'],
]);
const privateSessionEvents = document.paths['/terminal/stream/v1/attach']?.get;
const appPaths = {};
for (const [source, target] of pathMappings) {
  appPaths[target] = document.paths[source];
}
if (privateSessionEvents) {
  appPaths['/app/v3/api/device/terminal/sessions/{sessionId}/events'] = {
    get: structuredClone(privateSessionEvents),
  };
}
document.paths = appPaths;

const replayGet = document.paths['/app/v3/api/device/terminal/sessions/{sessionId}/replay'].get;
replayGet.parameters = replayGet.parameters.map((parameter) =>
  parameter.$ref === '#/components/parameters/SessionIdQuery'
    ? { $ref: '#/components/parameters/SessionIdPath' }
    : parameter,
);
const sessionEventsGet = document.paths['/app/v3/api/device/terminal/sessions/{sessionId}/events']?.get;
if (sessionEventsGet) {
  sessionEventsGet.parameters = sessionEventsGet.parameters.map((parameter) =>
    parameter.$ref === '#/components/parameters/SessionIdQuery'
      ? { $ref: '#/components/parameters/SessionIdPath' }
      : parameter,
  );
}

const operationIds = new Map([
  ['terminalLocalRuntime_listSessions', 'device.terminal.sessions.list'],
  ['terminalLocalRuntime_createSession', 'device.terminal.sessions.create'],
  ['terminalLocalRuntime_readReplay', 'device.terminal.sessions.replay.list'],
  ['terminalLocalRuntime_writeSessionInput', 'device.terminal.sessions.input'],
  ['terminalLocalRuntime_writeSessionInputBytes', 'device.terminal.sessions.inputBytes'],
  ['terminalLocalRuntime_resizeSession', 'device.terminal.sessions.resize'],
  ['terminalLocalRuntime_terminateSession', 'device.terminal.sessions.terminate'],
  ['terminalLocalRuntime_attachSessionStream', 'device.terminal.sessions.events.stream'],
]);

const componentResponses = document.components?.responses ?? {};
for (const pathItem of Object.values(document.paths)) {
  for (const operation of Object.values(pathItem)) {
    if (!operation || typeof operation !== 'object' || !operation.operationId) continue;
    const sourceOperationId = operation.operationId;
    operation.operationId = operationIds.get(sourceOperationId) ?? sourceOperationId;
    operation.tags = ['deviceTerminal'];
    if (sourceOperationId === 'terminalLocalRuntime_createSession' && operation.responses?.['200']) {
      operation.responses['201'] = operation.responses['200'];
      delete operation.responses['200'];
    }
    operation.security = [{ AuthToken: [], AccessToken: [] }];
    operation['x-sdkwork-api-surface'] = 'app-api';
    operation['x-sdkwork-request-context'] = 'WebRequestContext';
    operation['x-sdkwork-auth-mode'] = 'dual-token';
    for (const [status, response] of Object.entries(operation.responses ?? {})) {
      const reference = response?.$ref;
      if (typeof reference !== 'string') continue;
      const name = reference.split('/').at(-1);
      if (name && componentResponses[name]) {
        operation.responses[status] = structuredClone(componentResponses[name]);
      }
    }
  }
}

const problemResponse = (description) => ({
  description,
  content: {
    "application/problem+json": {
      schema: { $ref: "#/components/schemas/ProblemDetail" },
    },
  },
});

const resourceResponse = (schemaName, description) => ({
  description,
  content: {
    "application/json": {
      schema: {
        allOf: [
          { $ref: "#/components/schemas/SdkWorkApiResponse" },
          {
            type: "object",
            required: ["data"],
            properties: {
              data: {
                type: "object",
                required: ["item"],
                properties: {
                  item: { $ref: `#/components/schemas/${schemaName}` },
                },
              },
            },
          },
        ],
      },
    },
  },
});

// The private runtime protocol permits a local runtime owner to select its
// own directory. The public app-api is intentionally narrower: a caller can
// only name a project and one explicit, target-bound runtime location. The
// mounted route resolves the encrypted root after authorization and never
// serializes it back through the API or generated SDK.
const publicSchemas = document.components.schemas;
publicSchemas.CreateProjectTerminalSessionRequest = {
  type: "object",
  additionalProperties: false,
  required: ["projectId", "runtimeLocationId", "command"],
  properties: {
    projectId: {
      type: "string",
      minLength: 1,
      maxLength: 160,
      pattern: "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._:-]*$",
    },
    runtimeLocationId: {
      type: "string",
      minLength: 1,
      maxLength: 160,
      pattern: "^(?!.*\\.\\.)[A-Za-z0-9][A-Za-z0-9._:-]*$",
    },
    command: {
      type: "array",
      minItems: 1,
      maxItems: 32,
      items: { type: "string", minLength: 1, maxLength: 2048 },
    },
    cols: { type: "integer", minimum: 1, maximum: 500 },
    rows: { type: "integer", minimum: 1, maximum: 500 },
    modeTags: {
      type: "array",
      maxItems: 32,
      items: { type: "string", minLength: 1, maxLength: 128 },
    },
    tags: {
      type: "array",
      maxItems: 32,
      items: { type: "string", minLength: 1, maxLength: 128 },
    },
  },
};

publicSchemas.ProjectTerminalReplayEntry = {
  type: "object",
  additionalProperties: false,
  required: ["sequence", "kind", "payload", "occurredAt"],
  properties: {
    sequence: { type: "integer", minimum: 0 },
    kind: { type: "string" },
    payload: {
      type: "string",
      description: "Replay data. Project runtime metadata excludes the resolved root.",
    },
    occurredAt: { type: "string" },
  },
};

publicSchemas.ProjectTerminalSessionCreatePayload = {
  type: "object",
  additionalProperties: false,
  required: [
    "sessionId",
    "projectId",
    "runtimeLocationId",
    "target",
    "state",
    "createdAt",
    "lastActiveAt",
    "modeTags",
    "tags",
    "attachmentId",
    "cursor",
    "lastAckSequence",
    "writable",
    "invokedProgram",
    "invokedArgs",
    "replayEntry",
  ],
  properties: {
    sessionId: { type: "string" },
    projectId: { type: "string" },
    runtimeLocationId: { type: "string" },
    target: { type: "string", const: "server-runtime-node" },
    state: { type: "string" },
    createdAt: { type: "string" },
    lastActiveAt: { type: "string" },
    modeTags: { type: "array", items: { type: "string" } },
    tags: { type: "array", items: { type: "string" } },
    attachmentId: { type: "string" },
    cursor: { type: "string" },
    lastAckSequence: { type: "integer", minimum: 0 },
    writable: { type: "boolean" },
    invokedProgram: { type: "string" },
    invokedArgs: { type: "array", items: { type: "string" } },
    replayEntry: { $ref: "#/components/schemas/ProjectTerminalReplayEntry" },
  },
};

publicSchemas.ProjectTerminalSessionDescriptor = {
  type: "object",
  additionalProperties: false,
  required: [
    "sessionId",
    "workspaceId",
    "target",
    "state",
    "createdAt",
    "lastActiveAt",
    "modeTags",
    "tags",
    "lastAckSequence",
    "exitCode",
  ],
  properties: {
    sessionId: { type: "string" },
    workspaceId: { type: "string" },
    target: { type: "string" },
    state: { type: "string" },
    createdAt: { type: "string" },
    lastActiveAt: { type: "string" },
    modeTags: { type: "array", items: { type: "string" } },
    tags: { type: "array", items: { type: "string" } },
    lastAckSequence: { type: "integer", minimum: 0 },
    exitCode: { type: ["integer", "null"] },
  },
};

publicSchemas.ProjectTerminalSessionAttachmentDescriptor = {
  type: "object",
  additionalProperties: false,
  required: ["attachmentId", "sessionId", "cursor", "lastAckSequence", "writable"],
  properties: {
    attachmentId: { type: "string" },
    sessionId: { type: "string" },
    cursor: { type: "string" },
    lastAckSequence: { type: "integer", minimum: 0 },
    writable: { type: "boolean" },
  },
};

publicSchemas.ProjectTerminalSessionIndexSnapshot = {
  type: "object",
  additionalProperties: false,
  required: ["sessions", "attachments"],
  properties: {
    sessions: {
      type: "array",
      items: { $ref: "#/components/schemas/ProjectTerminalSessionDescriptor" },
    },
    attachments: {
      type: "array",
      items: { $ref: "#/components/schemas/ProjectTerminalSessionAttachmentDescriptor" },
    },
  },
};

publicSchemas.ProjectTerminalSessionReplaySnapshot = {
  type: "object",
  additionalProperties: false,
  required: ["sessionId", "nextCursor", "hasMore", "entries"],
  properties: {
    sessionId: { type: "string" },
    fromCursor: { type: ["string", "null"] },
    nextCursor: { type: "string" },
    hasMore: { type: "boolean" },
    entries: {
      type: "array",
      items: { $ref: "#/components/schemas/ProjectTerminalReplayEntry" },
    },
  },
};

const sessionsPath = "/app/v3/api/device/terminal/sessions";
const createProjectTerminalSession = document.paths[sessionsPath]?.post;
if (!createProjectTerminalSession) {
  throw new Error(`Missing public terminal create operation at ${sessionsPath}`);
}
createProjectTerminalSession.summary = "Create an interactive project terminal session";
createProjectTerminalSession.description =
  "The server resolves the selected project runtime location after authentication. Client paths and execution authorities are not accepted.";
createProjectTerminalSession.requestBody = {
  required: true,
  content: {
    "application/json": {
      schema: { $ref: "#/components/schemas/CreateProjectTerminalSessionRequest" },
    },
  },
};
createProjectTerminalSession.responses = {
  ...createProjectTerminalSession.responses,
  "201": resourceResponse(
    "ProjectTerminalSessionCreatePayload",
    "Created path-free project terminal session snapshot",
  ),
  "403": problemResponse("Caller is not authorized to execute in this project"),
  "404": problemResponse("Project or project runtime location was not found"),
  "503": problemResponse("Selected project runtime location is unavailable for terminal execution"),
};

const listProjectTerminalSessions = document.paths[sessionsPath]?.get;
if (listProjectTerminalSessions?.responses?.["200"]) {
  listProjectTerminalSessions.responses["200"] = resourceResponse(
    "ProjectTerminalSessionIndexSnapshot",
    "Caller-owned path-free terminal session index",
  );
}

const projectTerminalReplayPath =
  "/app/v3/api/device/terminal/sessions/{sessionId}/replay";
const readProjectTerminalReplay = document.paths[projectTerminalReplayPath]?.get;
if (readProjectTerminalReplay?.responses?.["200"]) {
  readProjectTerminalReplay.responses["200"] = resourceResponse(
    "ProjectTerminalSessionReplaySnapshot",
    "Caller-owned path-redacted terminal replay snapshot",
  );
}

// These private-runtime schemas must not remain available as alternate public
// create or projection contracts after the project-bound replacements above.
delete publicSchemas.RemoteRuntimeSessionCreateRequest;
delete publicSchemas.RuntimeNodeInteractiveSessionCreateSnapshot;
delete publicSchemas.RuntimeNodeSessionIndexSnapshot;
delete publicSchemas.RuntimeNodeSessionReplaySnapshot;

document.components.securitySchemes = {
  AuthToken: {
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
  },
  AccessToken: {
    type: 'apiKey',
    in: 'header',
    name: 'Access-Token',
  },
};

const sdkgenDocument = structuredClone(document);
// SSE is part of the owner OpenAPI authority and route manifest, but SDKWork's
// JSON SDK generator intentionally rejects stream-only 2xx representations.
// The composed terminal infrastructure owns this documented manual transport.
delete sdkgenDocument.paths['/app/v3/api/device/terminal/sessions/{sessionId}/events'];

const authorityYaml = YAML.stringify(document, { lineWidth: 0 });
const sdkgenYaml = YAML.stringify(sdkgenDocument, { lineWidth: 0 });
for (const [output, yaml] of [
  [authorityPath, authorityYaml],
  [sdkgenPath, sdkgenYaml],
]) {
  await mkdir(dirname(output), { recursive: true });
  await writeFile(output, yaml, 'utf8');
}

console.log(`materialized ${authorityPath}`);
console.log(`materialized ${sdkgenPath}`);
