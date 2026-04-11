import type { DesktopRuntimeBridgeClient } from "../../../packages/sdkwork-terminal-infrastructure/src/index.ts";
import { createSessionCenterSnapshot } from "../../../packages/sdkwork-terminal-sessions/src/model.ts";

function getErrorMessage(error: unknown) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (typeof error === "string" && error) {
    return error;
  }

  return "unknown replay load failure";
}

export interface LoadDesktopSessionCenterSnapshotOptions {
  observedAt?: string;
}

export async function loadDesktopSessionCenterSnapshot(
  client: Pick<DesktopRuntimeBridgeClient, "sessionIndex" | "sessionReplay">,
  options: LoadDesktopSessionCenterSnapshotOptions = {},
) {
  const sessionIndex = await client.sessionIndex();
  const replayResults = await Promise.all(
    sessionIndex.sessions.map(async (session) => {
      try {
        return {
          replay: await client.sessionReplay(session.sessionId, { limit: 8 }),
          failure: null,
        };
      } catch (error) {
        return {
          replay: null,
          failure: {
            sessionId: session.sessionId,
            error: getErrorMessage(error),
          },
        };
      }
    }),
  );
  const replays = replayResults.flatMap((result) => (result.replay ? [result.replay] : []));
  const replayFailures = replayResults.flatMap((result) =>
    result.failure ? [result.failure] : []
  );

  return createSessionCenterSnapshot({
    ...sessionIndex,
    replays,
    replayFailures,
    observedAt: options.observedAt ?? new Date().toISOString(),
  });
}
