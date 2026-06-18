import { customApiPath } from './paths';
import type { HttpClient } from '../http/client';

import type { RemoteRuntimeSessionCreateRequest, RuntimeInputBody, RuntimeInputBytesBody, RuntimeNodeInteractiveSessionCreateSnapshot, RuntimeNodeSessionIndexSnapshot, RuntimeNodeSessionInputSnapshot, RuntimeNodeSessionReplaySnapshot, RuntimeNodeSessionResizeSnapshot, RuntimeNodeSessionTerminateSnapshot, RuntimeResizeBody } from '../types';


export interface TerminalLocalRuntimeReadReplayParams {
  sessionId: string;
  fromCursor?: string;
  limit?: number;
}

export interface TerminalLocalRuntimeAttachSessionStreamParams {
  sessionId: string;
}

export class TerminalLocalRuntimeApi {
  private client: HttpClient;

  constructor(client: HttpClient) {
    this.client = client;
  }

/** List active runtime sessions */
  async listSessions(): Promise<RuntimeNodeSessionIndexSnapshot> {
    return this.client.get<RuntimeNodeSessionIndexSnapshot>(customApiPath(`/terminal/api/v1/sessions`));
  }

/** Create an interactive runtime session */
  async createSession(body: RemoteRuntimeSessionCreateRequest): Promise<RuntimeNodeInteractiveSessionCreateSnapshot> {
    return this.client.post<RuntimeNodeInteractiveSessionCreateSnapshot>(customApiPath(`/terminal/api/v1/sessions`), body, undefined, undefined, 'application/json');
  }

/** Read bounded replay transcript for a session */
  async readReplay(params: TerminalLocalRuntimeReadReplayParams): Promise<RuntimeNodeSessionReplaySnapshot> {
    const query = buildQueryString([
      { name: 'sessionId', value: params.sessionId, style: 'form', explode: true, allowReserved: false },
      { name: 'fromCursor', value: params.fromCursor, style: 'form', explode: true, allowReserved: false },
      { name: 'limit', value: params.limit, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.get<RuntimeNodeSessionReplaySnapshot>(appendQueryString(customApiPath(`/terminal/api/v1/replays`), query));
  }

/** Write UTF-8 terminal input to a session */
  async writeSessionInput(sessionId: string, body: RuntimeInputBody): Promise<RuntimeNodeSessionInputSnapshot> {
    return this.client.post<RuntimeNodeSessionInputSnapshot>(customApiPath(`/terminal/api/v1/sessions/${serializePathParameter(sessionId, { name: 'sessionId', style: 'simple', explode: false })}/input`), body, undefined, undefined, 'application/json');
  }

/** Write raw terminal input bytes to a session */
  async writeSessionInputBytes(sessionId: string, body: RuntimeInputBytesBody): Promise<RuntimeNodeSessionInputSnapshot> {
    return this.client.post<RuntimeNodeSessionInputSnapshot>(customApiPath(`/terminal/api/v1/sessions/${serializePathParameter(sessionId, { name: 'sessionId', style: 'simple', explode: false })}/input-bytes`), body, undefined, undefined, 'application/json');
  }

/** Resize terminal viewport for a session */
  async resizeSession(sessionId: string, body: RuntimeResizeBody): Promise<RuntimeNodeSessionResizeSnapshot> {
    return this.client.post<RuntimeNodeSessionResizeSnapshot>(customApiPath(`/terminal/api/v1/sessions/${serializePathParameter(sessionId, { name: 'sessionId', style: 'simple', explode: false })}/resize`), body, undefined, undefined, 'application/json');
  }

/** Terminate a runtime session */
  async terminateSession(sessionId: string): Promise<RuntimeNodeSessionTerminateSnapshot> {
    return this.client.post<RuntimeNodeSessionTerminateSnapshot>(customApiPath(`/terminal/api/v1/sessions/${serializePathParameter(sessionId, { name: 'sessionId', style: 'simple', explode: false })}/terminate`));
  }

/** Attach to a session event stream (SSE) */
  async attachSessionStream(params: TerminalLocalRuntimeAttachSessionStreamParams): Promise<AsyncIterable<string>> {
    const query = buildQueryString([
      { name: 'sessionId', value: params.sessionId, style: 'form', explode: true, allowReserved: false },
    ]);
    return this.client.streamJson<string>(appendQueryString(customApiPath(`/terminal/stream/v1/attach`), query), { method: 'GET' as any });
  }
}

export function createTerminalLocalRuntimeApi(client: HttpClient): TerminalLocalRuntimeApi {
  return new TerminalLocalRuntimeApi(client);
}

function appendQueryString(path: string, rawQueryString: string): string {
  const query = rawQueryString.replace(/^\?+/, '');
  if (!query) {
    return path;
  }
  return path.includes('?') ? `${path}&${query}` : `${path}?${query}`;
}

interface PathParameterSpec {
  name: string;
  style: string;
  explode: boolean;
}

function serializePathParameter(value: unknown, spec: PathParameterSpec): string {
  if (value === undefined || value === null) {
    return '';
  }

  const style = spec.style || 'simple';
  if (Array.isArray(value)) {
    return serializePathArray(spec.name, value, style, spec.explode);
  }
  if (typeof value === 'object') {
    return serializePathObject(spec.name, value as Record<string, unknown>, style, spec.explode);
  }
  return pathPrefix(spec.name, style, false) + encodePathValue(serializePathPrimitive(value));
}

function serializePathArray(name: string, values: unknown[], style: string, explode: boolean): string {
  const serialized = values
    .filter((item) => item !== undefined && item !== null)
    .map((item) => encodePathValue(serializePathPrimitive(item)));
  if (serialized.length === 0) {
    return pathPrefix(name, style, false);
  }
  if (style === 'matrix') {
    return explode
      ? serialized.map((item) => `;${name}=${item}`).join('')
      : `;${name}=${serialized.join(',')}`;
  }
  return pathPrefix(name, style, false) + serialized.join(explode ? '.' : ',');
}

function serializePathObject(name: string, value: Record<string, unknown>, style: string, explode: boolean): string {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);
  if (entries.length === 0) {
    return pathPrefix(name, style, true);
  }
  if (style === 'matrix') {
    return explode
      ? entries.map(([key, entryValue]) => `;${encodePathValue(key)}=${encodePathValue(serializePathPrimitive(entryValue))}`).join('')
      : `;${name}=${entries.flatMap(([key, entryValue]) => [encodePathValue(key), encodePathValue(serializePathPrimitive(entryValue))]).join(',')}`;
  }
  const serialized = explode
    ? entries.map(([key, entryValue]) => `${encodePathValue(key)}=${encodePathValue(serializePathPrimitive(entryValue))}`).join(style === 'label' ? '.' : ',')
    : entries.flatMap(([key, entryValue]) => [encodePathValue(key), encodePathValue(serializePathPrimitive(entryValue))]).join(',');
  return pathPrefix(name, style, true) + serialized;
}

function pathPrefix(name: string, style: string, _objectValue: boolean): string {
  if (style === 'label') return '.';
  if (style === 'matrix') return `;${name}`;
  return '';
}

function encodePathValue(value: string): string {
  return encodeURIComponent(value);
}

function serializePathPrimitive(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}
interface QueryParameterSpec {
  name: string;
  value: unknown;
  style: string;
  explode: boolean;
  allowReserved: boolean;
  contentType?: string;
}

function buildQueryString(parameters: QueryParameterSpec[]): string {
  const pairs: string[] = [];
  for (const parameter of parameters) {
    appendSerializedParameter(pairs, parameter);
  }
  return pairs.join('&');
}

function appendSerializedParameter(pairs: string[], parameter: QueryParameterSpec): void {
  if (parameter.value === undefined || parameter.value === null) {
    return;
  }

  if (parameter.contentType) {
    pairs.push(`${encodeQueryComponent(parameter.name)}=${encodeQueryValue(JSON.stringify(parameter.value), parameter.allowReserved)}`);
    return;
  }

  const style = parameter.style || 'form';
  if (style === 'deepObject') {
    appendDeepObjectParameter(pairs, parameter.name, parameter.value, parameter.allowReserved);
    return;
  }

  if (Array.isArray(parameter.value)) {
    appendArrayParameter(pairs, parameter.name, parameter.value, style, parameter.explode, parameter.allowReserved);
    return;
  }

  if (typeof parameter.value === 'object') {
    appendObjectParameter(pairs, parameter.name, parameter.value as Record<string, unknown>, style, parameter.explode, parameter.allowReserved);
    return;
  }

  pairs.push(`${encodeQueryComponent(parameter.name)}=${encodeQueryValue(serializePrimitive(parameter.value), parameter.allowReserved)}`);
}

function appendArrayParameter(
  pairs: string[],
  name: string,
  value: unknown[],
  style: string,
  explode: boolean,
  allowReserved: boolean,
): void {
  const values = value
    .filter((item) => item !== undefined && item !== null)
    .map((item) => serializePrimitive(item));
  if (values.length === 0) {
    return;
  }

  if (style === 'form' && explode) {
    for (const item of values) {
      pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(item, allowReserved)}`);
    }
    return;
  }

  pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(values.join(','), allowReserved)}`);
}

function appendObjectParameter(
  pairs: string[],
  name: string,
  value: Record<string, unknown>,
  style: string,
  explode: boolean,
  allowReserved: boolean,
): void {
  const entries = Object.entries(value).filter(([, entryValue]) => entryValue !== undefined && entryValue !== null);
  if (entries.length === 0) {
    return;
  }

  if (style === 'form' && explode) {
    for (const [key, entryValue] of entries) {
      pairs.push(`${encodeQueryComponent(key)}=${encodeQueryValue(serializePrimitive(entryValue), allowReserved)}`);
    }
    return;
  }

  const serialized = entries.flatMap(([key, entryValue]) => [key, serializePrimitive(entryValue)]).join(',');
  pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(serialized, allowReserved)}`);
}

function appendDeepObjectParameter(
  pairs: string[],
  name: string,
  value: unknown,
  allowReserved: boolean,
): void {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    pairs.push(`${encodeQueryComponent(name)}=${encodeQueryValue(serializePrimitive(value), allowReserved)}`);
    return;
  }

  for (const [key, entryValue] of Object.entries(value as Record<string, unknown>)) {
    if (entryValue === undefined || entryValue === null) {
      continue;
    }
    pairs.push(`${encodeQueryComponent(`${name}[${key}]`)}=${encodeQueryValue(serializePrimitive(entryValue), allowReserved)}`);
  }
}

function serializePrimitive(value: unknown): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function encodeQueryComponent(value: string): string {
  return encodeURIComponent(value);
}

function encodeQueryValue(value: string, allowReserved: boolean): string {
  const encoded = encodeURIComponent(value);
  if (!allowReserved) {
    return encoded;
  }
  return encoded.replace(/%3A/gi, ':')
    .replace(/%2F/gi, '/')
    .replace(/%3F/gi, '?')
    .replace(/%23/gi, '#')
    .replace(/%5B/gi, '[')
    .replace(/%5D/gi, ']')
    .replace(/%40/gi, '@')
    .replace(/%21/gi, '!')
    .replace(/%24/gi, '$')
    .replace(/%26/gi, '&')
    .replace(/%27/gi, "'")
    .replace(/%28/gi, '(')
    .replace(/%29/gi, ')')
    .replace(/%2A/gi, '*')
    .replace(/%2B/gi, '+')
    .replace(/%2C/gi, ',')
    .replace(/%3B/gi, ';')
    .replace(/%3D/gi, '=');
}
