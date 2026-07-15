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

export const BROWSER_REMOTE_CONTROL_PLANE_UNAVAILABLE_DIAGNOSTIC =
  "Browser remote terminal is unavailable until the approved SDKWork device Internal API control plane is available.";

export const LEGACY_BROWSER_RUNTIME_CONFIGURATION_BLOCKED_DIAGNOSTIC =
  "Browser remote terminal is unavailable because legacy VITE_*TERMINAL_RUNTIME* configuration is not permitted. Deploy the approved SDKWork device Internal API control plane instead.";

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
    diagnostic: hasLegacyWebRuntimeConfiguration(environment)
      ? LEGACY_BROWSER_RUNTIME_CONFIGURATION_BLOCKED_DIAGNOSTIC
      : BROWSER_REMOTE_CONTROL_PLANE_UNAVAILABLE_DIAGNOSTIC,
  };
}

export function createWebRuntimeTargetFromEnvironment(
  environment: WebRuntimeEnvironment,
): WebRuntimeTarget | undefined {
  return resolveWebRuntimeTargetFromEnvironment(environment).target;
}
