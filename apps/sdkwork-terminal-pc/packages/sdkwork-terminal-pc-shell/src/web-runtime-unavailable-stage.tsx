import type { CSSProperties } from "react";
import { webRuntimeUnavailableMessagesEnUS } from "./i18n/index";
import { rootStyle, shellStyle } from "./shell-layout";

export const DEFAULT_WEB_RUNTIME_UNAVAILABLE_MESSAGE =
  webRuntimeUnavailableMessagesEnUS.detail;

export interface WebRuntimeUnavailableMessages {
  title: string;
  detail: string;
}

const unavailableStageStyle: CSSProperties = {
  flex: 1,
  minHeight: 0,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 24,
  background: "#050607",
};

const unavailableContentStyle: CSSProperties = {
  width: "min(100%, 560px)",
  borderLeft: "3px solid #f59e0b",
  padding: "18px 20px",
  color: "#d4d4d8",
};

const unavailableTitleStyle: CSSProperties = {
  margin: 0,
  color: "#fafafa",
  fontSize: 15,
  fontWeight: 600,
  lineHeight: 1.4,
};

const unavailableDetailStyle: CSSProperties = {
  margin: "8px 0 0",
  color: "#a1a1aa",
  fontSize: 13,
  lineHeight: 1.55,
};

export interface WebRuntimeUnavailableStageProps {
  message?: string;
  messages?: WebRuntimeUnavailableMessages;
}

export function WebRuntimeUnavailableStage(
  props: WebRuntimeUnavailableStageProps,
) {
  const messages = props.messages ?? webRuntimeUnavailableMessagesEnUS;

  return (
    <main data-shell-layout="terminal-runtime-unavailable" style={rootStyle}>
      <section
        aria-live="polite"
        data-slot="web-runtime-unavailable"
        role="status"
        style={{ ...shellStyle, ...unavailableStageStyle }}
      >
        <div style={unavailableContentStyle}>
          <h1 style={unavailableTitleStyle}>{messages.title}</h1>
          <p style={unavailableDetailStyle}>
            {props.message ?? messages.detail}
          </p>
        </div>
      </section>
    </main>
  );
}
