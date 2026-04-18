import type {
  RuntimeSessionReplaySnapshot,
  TerminalViewportInput,
} from "@sdkwork/terminal-infrastructure";
import {
  useEffect,
  useRef,
} from "react";
import type {
  SharedRuntimeClient,
} from "./terminal-stage-shared";
import { useLatestRef, useStableCallback } from "./terminal-react-stability.ts";
import type {
  RuntimeTabController,
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
    nextCursor: string;
    entries: RuntimeSessionReplaySnapshot["entries"];
  }) => void;
  onRuntimeError?: (message: string) => void;
}

export function useRuntimeTerminalSessionBinding(
  args: UseRuntimeTerminalSessionBindingArgs,
) {
  const latestInputHandlerRef = useLatestRef(args.onViewportInput);
  const latestTitleHandlerRef = useLatestRef(args.onViewportTitleChange);
  const latestReplayAppliedHandlerRef = useLatestRef(args.onRuntimeReplayApplied);
  const latestRuntimeErrorHandlerRef = useLatestRef(args.onRuntimeError);
  const boundSessionKeyRef = useRef<string | null>(null);

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
      onRuntimeError: (message) => {
        latestRuntimeErrorHandlerRef.current?.(message);
      },
    });
  }, [args.controller]);

  useEffect(() => {
    if (!args.runtimeClient || !args.runtimeSessionId) {
      boundSessionKeyRef.current = null;
      void args.controller.clearSession();
      return;
    }

    const bindingKey = [
      args.runtimeSessionId,
      args.runtimeAttachmentId ?? "",
    ].join("\u001f");
    if (boundSessionKeyRef.current === bindingKey) {
      return;
    }

    boundSessionKeyRef.current = bindingKey;
    void args.controller.bindSession({
      sessionId: args.runtimeSessionId,
      cursor: args.runtimeCursor,
      attachmentId: args.runtimeAttachmentId,
      client: args.runtimeClient,
      acknowledgeAttachment: args.runtimeClient.acknowledgeSessionAttachment,
      hydrateFromReplay: true,
      subscribeToStream: true,
    });
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
  });

  return {
    handleRuntimeHostAttachFailure,
    resetRuntimeSessionBinding,
  };
}
