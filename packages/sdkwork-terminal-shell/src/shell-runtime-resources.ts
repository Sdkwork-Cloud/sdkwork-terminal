import { useRef } from "react";
import { createRuntimeTabControllerStore } from "./runtime-tab-controller-store.ts";

interface MutableRefObjectLike<T> {
  current: T;
}

export interface ShellRuntimeResources<TDesktopRuntimeClient, TWebRuntimeClient> {
  bootstrappingRuntimeTabIdsRef: MutableRefObjectLike<Set<string>>;
  runtimeBootstrapRetryTimersRef: MutableRefObjectLike<Map<string, number>>;
  viewportCopyHandlersRef: MutableRefObjectLike<Map<string, () => Promise<void>>>;
  viewportPasteHandlersRef: MutableRefObjectLike<Map<string, (text: string) => Promise<void>>>;
  flushingRuntimeInputTabIdsRef: MutableRefObjectLike<Set<string>>;
  mountedRef: MutableRefObjectLike<boolean>;
  desktopRuntimeClientRef: MutableRefObjectLike<TDesktopRuntimeClient>;
  webRuntimeClientRef: MutableRefObjectLike<TWebRuntimeClient>;
  handledDesktopSessionReattachIntentIdRef: MutableRefObjectLike<string | null>;
  handledDesktopConnectorSessionIntentIdRef: MutableRefObjectLike<string | null>;
  runtimeInputWriteChainsRef: MutableRefObjectLike<Map<string, Promise<void>>>;
  runtimeControllerStoreRef: MutableRefObjectLike<ReturnType<typeof createRuntimeTabControllerStore>>;
  runtimeControllerStore: ReturnType<typeof createRuntimeTabControllerStore>;
  registerViewportCopyHandler: (tabId: string, handler: (() => Promise<void>) | null) => void;
  registerViewportPasteHandler: (
    tabId: string,
    handler: ((text: string) => Promise<void>) | null,
  ) => void;
}

export function useShellRuntimeResources<TDesktopRuntimeClient, TWebRuntimeClient>(args: {
  desktopRuntimeClient: TDesktopRuntimeClient;
  webRuntimeClient: TWebRuntimeClient;
}): ShellRuntimeResources<TDesktopRuntimeClient, TWebRuntimeClient> {
  const bootstrappingRuntimeTabIdsRef = useRef<Set<string>>(new Set());
  const runtimeBootstrapRetryTimersRef = useRef<Map<string, number>>(new Map());
  const viewportCopyHandlersRef = useRef<Map<string, () => Promise<void>>>(new Map());
  const viewportPasteHandlersRef = useRef<Map<string, (text: string) => Promise<void>>>(
    new Map(),
  );
  const flushingRuntimeInputTabIdsRef = useRef<Set<string>>(new Set());
  const mountedRef = useRef(true);
  const desktopRuntimeClientRef = useRef(args.desktopRuntimeClient);
  const webRuntimeClientRef = useRef(args.webRuntimeClient);
  const handledDesktopSessionReattachIntentIdRef = useRef<string | null>(null);
  const handledDesktopConnectorSessionIntentIdRef = useRef<string | null>(null);
  const runtimeInputWriteChainsRef = useRef<Map<string, Promise<void>>>(new Map());
  const runtimeControllerStoreRef = useRef(createRuntimeTabControllerStore());

  function registerViewportCopyHandler(
    tabId: string,
    handler: (() => Promise<void>) | null,
  ) {
    if (handler) {
      viewportCopyHandlersRef.current.set(tabId, handler);
      return;
    }

    viewportCopyHandlersRef.current.delete(tabId);
  }

  function registerViewportPasteHandler(
    tabId: string,
    handler: ((text: string) => Promise<void>) | null,
  ) {
    if (handler) {
      viewportPasteHandlersRef.current.set(tabId, handler);
      return;
    }

    viewportPasteHandlersRef.current.delete(tabId);
  }

  return {
    bootstrappingRuntimeTabIdsRef,
    runtimeBootstrapRetryTimersRef,
    viewportCopyHandlersRef,
    viewportPasteHandlersRef,
    flushingRuntimeInputTabIdsRef,
    mountedRef,
    desktopRuntimeClientRef,
    webRuntimeClientRef,
    handledDesktopSessionReattachIntentIdRef,
    handledDesktopConnectorSessionIntentIdRef,
    runtimeInputWriteChainsRef,
    runtimeControllerStoreRef,
    runtimeControllerStore: runtimeControllerStoreRef.current,
    registerViewportCopyHandler,
    registerViewportPasteHandler,
  };
}
