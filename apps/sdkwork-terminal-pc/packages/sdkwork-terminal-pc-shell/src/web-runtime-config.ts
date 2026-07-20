import type { WebRuntimeTarget } from "./shell-contract.ts";

export interface WebRuntimeEnvironment {
  readonly [key: string]: unknown;
}

export interface WebRuntimeTargetResolution {
  target?: WebRuntimeTarget;
  diagnostic: string;
}

const LEGACY_WEB_RUNTIME_ENVIRONMENT_KEY =
  /^VITE_(?:[A-Z0-9]+_)*TERMINAL_RUNTIME(?:_|$)/;

export const BROWSER_TERMINAL_APP_API_READY_DIAGNOSTIC =
  "Browser terminal requires an explicit project runtime location target.";

export const LEGACY_BROWSER_RUNTIME_CONFIGURATION_IGNORED_DIAGNOSTIC =
  "Legacy VITE_*TERMINAL_RUNTIME* configuration is ignored; Browser terminal uses the authenticated Terminal App API.";

function hasLegacyWebRuntimeConfiguration(
  environment: WebRuntimeEnvironment,
) {
  return Object.keys(environment).some((key) =>
    LEGACY_WEB_RUNTIME_ENVIRONMENT_KEY.test(key),
  );
}

export function resolveWebRuntimeTargetFromEnvironment(
  environment: WebRuntimeEnvironment,
): WebRuntimeTargetResolution {
  return {
    target: undefined,
    diagnostic: hasLegacyWebRuntimeConfiguration(environment)
      ? LEGACY_BROWSER_RUNTIME_CONFIGURATION_IGNORED_DIAGNOSTIC
      : BROWSER_TERMINAL_APP_API_READY_DIAGNOSTIC,
  };
}

export function createWebRuntimeTargetFromEnvironment(
  environment: WebRuntimeEnvironment,
): WebRuntimeTarget | undefined {
  return resolveWebRuntimeTargetFromEnvironment(environment).target;
}
