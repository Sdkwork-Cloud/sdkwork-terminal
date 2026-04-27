import type { TerminalSearchMatch, TerminalSnapshot, TerminalViewport } from "@sdkwork/terminal-core";
import { createXtermViewportDriver } from "@sdkwork/terminal-infrastructure";
import {
  ActionButton,
  StatusBadge,
  SurfaceCard,
  TerminalViewportFrame,
} from "@sdkwork/terminal-ui";
import { useEffect, useRef, useState } from "react";

import { createWorkbenchTerminalStage } from "./model";

function reportWorkbenchTerminalDriverError(error: unknown) {
  console.error("[sdkwork-terminal] workbench terminal driver update failed", error);
}

function runWorkbenchTerminalDriverTaskBestEffort(
  callback: () => unknown,
) {
  try {
    void Promise.resolve(callback()).catch((error) => {
      reportWorkbenchTerminalDriverError(error);
    });
  } catch (error) {
    reportWorkbenchTerminalDriverError(error);
  }
}

export function WorkbenchPanel() {
  const stageRef = useRef<ReturnType<typeof createWorkbenchTerminalStage> | null>(null);
  if (!stageRef.current) {
    stageRef.current = createWorkbenchTerminalStage();
  }
  const xtermDriverRef = useRef<ReturnType<typeof createXtermViewportDriver> | null>(null);
  if (!xtermDriverRef.current) {
    xtermDriverRef.current = createXtermViewportDriver();
  }
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const stage = stageRef.current;
  const xtermDriver = xtermDriverRef.current;

  const [snapshot, setSnapshot] = useState<TerminalSnapshot>(() =>
    stage.adapter.getSnapshot(),
  );
  const [searchQuery, setSearchQuery] = useState(stage.initialSearchQuery);
  const [commandText, setCommandText] = useState("help");
  const [copiedText, setCopiedText] = useState(snapshot.selectedText);

  function sync(nextSnapshot: TerminalSnapshot) {
    setSnapshot(nextSnapshot);
    setCopiedText(nextSnapshot.selectedText);
  }

  function renderResponse(command: string) {
    switch (command.trim()) {
      case "help":
        return "help -> search, selection, resize, scrollback";
      case "status":
        return "daemon running | bridge ready | viewport stable";
      default:
        return `executed ${command.trim() || "blank-command"}`;
    }
  }

  function runCommand() {
    const normalized = commandText.trim() || "help";

    stage.adapter.writeInput(normalized);
    stage.adapter.writeOutput(renderResponse(normalized));
    sync(stage.adapter.search(searchQuery));
  }

  function resizeViewport() {
    const nextViewport: TerminalViewport =
      snapshot.viewport.cols === stage.resizeViewport.cols
        ? { cols: 96, rows: 14 }
        : stage.resizeViewport;

    sync(stage.adapter.resize(nextViewport));
  }

  function selectSession() {
    const match = stage.adapter.getSnapshot().matches[0];
    if (!match) {
      return;
    }

    sync(
      stage.adapter.select({
        startLine: match.lineIndex,
        startColumn: match.startColumn,
        endLine: match.lineIndex,
        endColumn: match.endColumn,
      }),
    );
  }

  function copySelection() {
    setCopiedText(stage.adapter.copySelection());
  }

  useEffect(() => {
    const host = viewportRef.current;
    if (!host) {
      return;
    }
    const hostElement = host;

    let cancelled = false;

    runWorkbenchTerminalDriverTaskBestEffort(async () => {
      await xtermDriver.attach(hostElement);
      if (!cancelled) {
        await xtermDriver.render(snapshot);
      }
    });

    return () => {
      cancelled = true;
      runWorkbenchTerminalDriverTaskBestEffort(() => xtermDriver.dispose());
    };
  }, []);

  useEffect(() => {
    runWorkbenchTerminalDriverTaskBestEffort(() => xtermDriver.render(snapshot));
  }, [snapshot]);

  const selectedMatch = snapshot.matches[0] ?? null;

  return (
    <SurfaceCard
      title="Workbench"
      accent={<StatusBadge label={`scrollback ${snapshot.totalLines}`} tone="info" />}
    >
      <div style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "grid", gap: 12 }}>
          <div
            style={{
              display: "grid",
              gap: 12,
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
              <span>{stage.searchLabel}</span>
              <input
                value={searchQuery}
                onChange={(event) => {
                  const nextQuery = event.target.value;
                  setSearchQuery(nextQuery);
                  sync(stage.adapter.search(nextQuery));
                }}
                placeholder="search transcript"
                style={{
                  borderRadius: 10,
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  background: "rgba(255, 255, 255, 0.03)",
                  color: "#f5f7fb",
                  padding: "10px 12px",
                }}
              />
            </label>
            <label style={{ display: "grid", gap: 6, fontSize: 13 }}>
              <span>Run command</span>
              <input
                value={commandText}
                onChange={(event) => setCommandText(event.target.value)}
                placeholder="help"
                style={{
                  borderRadius: 10,
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  background: "rgba(255, 255, 255, 0.03)",
                  color: "#f5f7fb",
                  padding: "10px 12px",
                }}
              />
            </label>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {stage.actions.map((action) => {
              const onClick =
                action.id === "run-help"
                  ? runCommand
                  : action.id === "resize-wide"
                    ? resizeViewport
                    : action.id === "select-session"
                      ? selectSession
                      : copySelection;

              return (
                <ActionButton
                  key={action.id}
                  onClick={onClick}
                  active={action.id === "select-session" && copiedText.length > 0}
                >
                  {action.label}
                </ActionButton>
              );
            })}
          </div>
        </div>

        <TerminalViewportFrame
          title={stage.title}
          subtitle={stage.summary}
          accent={<StatusBadge label={`${snapshot.viewport.cols}x${snapshot.viewport.rows}`} tone="success" />}
        >
          <div
            ref={viewportRef}
            style={{
              minHeight: 260,
              borderRadius: 12,
              border: "1px solid rgba(255, 255, 255, 0.06)",
              background: "#0d1117",
              overflow: "hidden",
            }}
          />
        </TerminalViewportFrame>

        <div
          style={{
            display: "grid",
            gap: 16,
            gridTemplateColumns: "minmax(0, 2fr) minmax(260px, 1fr)",
          }}
        >
          <section
            style={{
              padding: 16,
              borderRadius: 16,
              border: "1px solid rgba(255, 255, 255, 0.06)",
              background: "rgba(255, 255, 255, 0.03)",
            }}
          >
            <div style={{ fontWeight: 700, marginBottom: 12 }}>{stage.transcriptLabel}</div>
            <div style={{ display: "grid", gap: 8 }}>
              {snapshot.visibleLines.map((line, index) => {
                const lineIndex = snapshot.totalLines - snapshot.visibleLines.length + index;
                const match = snapshot.matches.find((entry) => entry.lineIndex === lineIndex) ?? null;
                const selected =
                  snapshot.selection !== null &&
                  lineIndex >= snapshot.selection.startLine &&
                  lineIndex <= snapshot.selection.endLine;

                return (
                  <div
                    key={`${line.kind}-${lineIndex}`}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 10,
                      background: selected
                        ? "rgba(123, 223, 246, 0.14)"
                        : "rgba(255, 255, 255, 0.02)",
                      border: match
                        ? "1px solid rgba(123, 223, 246, 0.34)"
                        : "1px solid rgba(255, 255, 255, 0.04)",
                      color: "#dce7f3",
                      fontFamily: "\"IBM Plex Mono\", Consolas, monospace",
                      fontSize: 13,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {line.text}
                  </div>
                );
              })}
            </div>
          </section>

          <aside
            style={{
              padding: 16,
              borderRadius: 16,
              border: "1px solid rgba(255, 255, 255, 0.06)",
              background: "rgba(255, 255, 255, 0.03)",
              display: "grid",
              gap: 12,
              alignContent: "start",
            }}
          >
            <StatusBadge
              label={`${snapshot.matches.length} search hit${snapshot.matches.length === 1 ? "" : "s"}`}
              tone={snapshot.matches.length > 0 ? "success" : "warning"}
            />
            <div style={{ fontSize: 13, color: "#95a3b8" }}>
              Selected text
            </div>
            <div
              style={{
                minHeight: 48,
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(0, 0, 0, 0.18)",
                fontFamily: "\"IBM Plex Mono\", Consolas, monospace",
                fontSize: 13,
                color: "#f5f7fb",
              }}
            >
              {copiedText || "No selection yet"}
            </div>
            <div style={{ fontSize: 13, color: "#95a3b8" }}>
              First match
            </div>
            <div
              style={{
                padding: "10px 12px",
                borderRadius: 10,
                background: "rgba(0, 0, 0, 0.18)",
                fontFamily: "\"IBM Plex Mono\", Consolas, monospace",
                fontSize: 13,
                color: "#f5f7fb",
              }}
            >
              {formatMatch(selectedMatch)}
            </div>
          </aside>
        </div>
      </div>
    </SurfaceCard>
  );
}

function formatMatch(match: TerminalSearchMatch | null) {
  if (!match) {
    return "No transcript hit";
  }

  return `${match.text} @ line ${match.lineIndex + 1}`;
}
