export type TerminalRuntimeConnectionState =
  | "unknown"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "degraded";

export type ActiveTerminalRuntimeConnectionState = Exclude<
  TerminalRuntimeConnectionState,
  "unknown" | "connecting"
>;
