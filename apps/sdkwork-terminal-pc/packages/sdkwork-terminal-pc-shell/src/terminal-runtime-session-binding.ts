import type {
  RuntimeSessionReplaySnapshot,
  TerminalViewportInput,
} from "@sdkwork/terminal-pc-infrastructure";
import {
  useEffect,
  useRef,
} from "react";
import type {
  SharedRuntimeClient,
} from "./terminal-stage-shared";
import { runTerminalTaskBestEffort } from "./terminal-async-boundary.ts";
import { useLatestRef, useStableCallback } from "./terminal-react-stability.ts";
import type {
  RuntimeTabController,
  RuntimeTabControllerConnectionState,
} from "./runtime-tab-controller.ts";

export interface UseRuntimeTerminalSessionBindingArgs {
  controller: RuntimeTabController;
  runtimeClient: SharedRuntimeClient | null;
  runtimeSessionId: string | null;
  runtimeCursor: string | null;
  runtimeAttachmentId: string | null;
  onViewportInput: (input: TerminalViewportInput) => void;
  onViewportTitleChange: (title: string) => void;
  onRuntimeReplayApplied?: (replay: {
    sessionId: string;
    nextCursor: string;
    entries: RuntimeSessionReplaySnapshot["entries"];
  }) => void;
  onRuntimeConnectionStateChange?: (args: {
    sessionId: string;
    state: RuntimeTabControllerConnectionState;
  }) => void;
  onRuntimeError?: (message: string) => void;
}

export function useRuntimeTerminalSessionBinding(
  args: UseRuntimeTerminalSessionBindingArgs,
) {
  const latestInputHandlerRef = useLatestRef(args.onViewportInput);
  const latestTitleHandlerRef = useLatestRef(args.onViewportTitleChange);
  const latestReplayAppliedHandlerRef = useLatestRef(args.onRuntimeReplayApplied);
  const latestRuntimeConnectionStateHandlerRef = useLatestRef(
    args.onRuntimeConnectionStateChange,
  );
  const latestRuntimeErrorHandlerRef = useLatestRef(args.onRuntimeError);
  const boundSessionKeyRef = useRef<string | null>(null);
  const boundRuntimeClientRef = useRef<SharedRuntimeClient | null>(null);

  function reportRuntimeSessionBindingTaskError(cause: unknown) {
    const message = cause instanceof Error ? cause.message : String(cause);
    latestRuntimeErrorHandlerRef.current?.(message);
  }

  useEffect(() => {
    args.controller.setCallbacks({
      onBufferedInput: (input: TerminalViewportInput) => {
        latestInputHandlerRef.current(input);
      },
      onReplayApplied: (replay) => {
        latestReplayAppliedHandlerRef.current?.(replay);
      },
      onTitleChange: (title) => {
        latestTitleHandlerRef.current(title);
      },
      onRuntimeConnectionStateChange: (connection) => {
        latestRuntimeConnectionStateHandlerRef.current?.(connection);
      },
      onRuntimeError: (message) => {
        latestRuntimeErrorHandlerRef.current?.(message);
      },
    });
  }, [args.controller]);

  useEffect(() => {
    if (!args.runtimeClient || !args.runtimeSessionId) {
      boundSessionKeyRef.current = null;
      boundRuntimeClientRef.current = null;
      runTerminalTaskBestEffort(
        () => args.controller.clearSession(),
        reportRuntimeSessionBindingTaskError,
      );
      return;
    }

    const bindingKey = [
      args.runtimeSessionId,
      args.runtimeAttachmentId ?? "",
    ].join("\u001f");
    if (
      boundSessionKeyRef.current === bindingKey &&
      boundRuntimeClientRef.current === args.runtimeClient
    ) {
      return;
    }

    boundSessionKeyRef.current = bindingKey;
    boundRuntimeClientRef.current = args.runtimeClient;
    const runtimeClient = args.runtimeClient;
    const runtimeSessionId = args.runtimeSessionId;
    const runtimeCursor = args.runtimeCursor;
    const runtimeAttachmentId = args.runtimeAttachmentId;
    runTerminalTaskBestEffort(
      () =>
        args.controller.bindSession({
          sessionId: runtimeSessionId,
          cursor: runtimeCursor,
          attachmentId: runtimeAttachmentId,
          client: runtimeClient,
          acknowledgeAttachment: runtimeClient.acknowledgeSessionAttachment,
          hydrateFromReplay: true,
          subscribeToStream: true,
        }),
      reportRuntimeSessionBindingTaskError,
    );
  }, [
    args.controller,
    args.runtimeAttachmentId,
    args.runtimeClient,
    args.runtimeCursor,
    args.runtimeSessionId,
  ]);

  const handleRuntimeHostAttachFailure = useStableCallback((message: string) => {
    latestRuntimeErrorHandlerRef.current?.(`terminal host attach failed: ${message}`);
  });
  const resetRuntimeSessionBinding = useStableCallback(() => {
    boundSessionKeyRef.current = null;
    boundRuntimeClientRef.current = null;
  });

  return {
    handleRuntimeHostAttachFailure,
    resetRuntimeSessionBinding,
  };
}

