import {
  type DesktopLocalProcessSessionCreateRequest,
  type DesktopLocalShellSessionCreateRequest,
} from "@sdkwork/terminal-infrastructure";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { TerminalShellProfile } from "./model";
import { TERMINAL_SURFACE_BACKGROUND } from "./terminal-header.tsx";

interface DesktopTerminalRuntimeSessionSnapshotLike {
  sessionId: string;
  attachmentId?: string | null;
  cursor?: string | null;
}

interface DesktopTerminalSurfaceRuntimeClientLike {
  createLocalProcessSession: (
    request: DesktopLocalProcessSessionCreateRequest,
  ) => Promise<DesktopTerminalRuntimeSessionSnapshotLike>;
  createLocalShellSession: (
    request: DesktopLocalShellSessionCreateRequest,
  ) => Promise<DesktopTerminalRuntimeSessionSnapshotLike>;
}

export interface DesktopTerminalSurfaceLaunchBridgePlan {
  kind: "local-shell" | "local-process";
  profile: TerminalShellProfile;
  title: string;
  targetLabel: string;
  localShellRequest?: DesktopLocalShellSessionCreateRequest;
  localProcessRequest?: DesktopLocalProcessSessionCreateRequest;
}

export interface DesktopTerminalSessionReattachIntentLike {
  requestId: string;
  sessionId: string;
  attachmentId: string;
  cursor: string;
  profile: TerminalShellProfile;
  title: string;
  targetLabel: string;
}

export interface DesktopTerminalSurfaceLaunchBridgeProps<TLaunchRequest> {
  launchRequest?: TLaunchRequest | null;
  launchRequestKey?: string | number | null;
  desktopRuntimeClient?: DesktopTerminalSurfaceRuntimeClientLike;
  desktopRuntimeAvailable?: boolean;
  resolveLaunchPlan: (
    launchRequest: TLaunchRequest,
  ) =>
    | Promise<DesktopTerminalSurfaceLaunchBridgePlan | null | undefined>
    | DesktopTerminalSurfaceLaunchBridgePlan
    | null
    | undefined;
  onRuntimeUnavailable?: () => void;
  onLaunchError?: (message: string) => void;
}

export interface DesktopTerminalSurfaceLaunchBridgeState {
  desktopRuntimeAvailable: boolean;
  desktopSessionReattachIntent: DesktopTerminalSessionReattachIntentLike | null;
}

export const desktopTerminalSurfaceContainerStyle: CSSProperties = {
  height: "100%",
  width: "100%",
  minWidth: 0,
  overflow: "hidden",
  background: TERMINAL_SURFACE_BACKGROUND,
};

export function useDesktopTerminalSurfaceLaunchBridge<TLaunchRequest>(
  props: DesktopTerminalSurfaceLaunchBridgeProps<TLaunchRequest>,
): DesktopTerminalSurfaceLaunchBridgeState {
  const handledLaunchRequestKeyRef = useRef<string | number | null>(null);
  const runtimeUnavailableLaunchRequestKeyRef = useRef<string | number | null>(null);
  const requestSequenceRef = useRef(0);
  const [desktopSessionReattachIntent, setDesktopSessionReattachIntent] =
    useState<DesktopTerminalSessionReattachIntentLike | null>(null);

  const desktopRuntimeAvailable =
    props.desktopRuntimeAvailable ?? Boolean(props.desktopRuntimeClient);

  useEffect(() => {
    const launchRequest = props.launchRequest;
    const launchRequestKey = props.launchRequestKey ?? null;
    const desktopRuntimeClient = props.desktopRuntimeClient;
    if (!launchRequest || launchRequestKey === null) {
      return;
    }

    if (handledLaunchRequestKeyRef.current === launchRequestKey) {
      return;
    }

    if (!desktopRuntimeClient) {
      if (runtimeUnavailableLaunchRequestKeyRef.current !== launchRequestKey) {
        runtimeUnavailableLaunchRequestKeyRef.current = launchRequestKey;
        props.onRuntimeUnavailable?.();
      }
      return;
    }

    runtimeUnavailableLaunchRequestKeyRef.current = null;
    handledLaunchRequestKeyRef.current = launchRequestKey;

    let cancelled = false;

    void (async () => {
      try {
        const launchPlan = await props.resolveLaunchPlan(launchRequest);
        if (!launchPlan) {
          return;
        }

        const session =
          launchPlan.kind === "local-process"
            ? await desktopRuntimeClient.createLocalProcessSession(
                launchPlan.localProcessRequest!,
              )
            : await desktopRuntimeClient.createLocalShellSession(
                launchPlan.localShellRequest!,
              );

        if (cancelled) {
          return;
        }

        requestSequenceRef.current += 1;
        setDesktopSessionReattachIntent({
          requestId: `terminal-request:${String(launchRequestKey)}:${requestSequenceRef.current}`,
          sessionId: session.sessionId,
          attachmentId: session.attachmentId ?? "",
          cursor: session.cursor ?? "0",
          profile: launchPlan.profile,
          title: launchPlan.title,
          targetLabel: launchPlan.targetLabel,
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        const message = error instanceof Error ? error.message : String(error);
        props.onLaunchError?.(message || "Failed to launch terminal session.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    props.desktopRuntimeClient,
    props.launchRequest,
    props.launchRequestKey,
    props.onLaunchError,
    props.onRuntimeUnavailable,
    props.resolveLaunchPlan,
  ]);

  return {
    desktopRuntimeAvailable,
    desktopSessionReattachIntent,
  };
}
