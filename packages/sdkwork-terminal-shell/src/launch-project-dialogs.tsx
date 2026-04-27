import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import type { NormalizedLaunchProject } from "./launch-projects";
import { runTerminalTaskBestEffort } from "./terminal-async-boundary.ts";
import {
  filterLaunchProjects,
  resolveBoundedLaunchProjectIndex,
  resolveNextLaunchProjectIndex,
  resolvePreferredLaunchProjectIndex,
  shouldIgnoreLaunchProjectPickerNavigationTarget,
  shouldIgnoreLaunchProjectPickerRowActivationTarget,
} from "./launch-project-dialog-model.ts";

const TERMINAL_MENU_BACKGROUND = "rgba(22, 24, 27, 0.98)";

const launchProjectPickerBackdropStyle: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 70,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 20,
  background: "rgba(5, 6, 7, 0.72)",
  backdropFilter: "blur(4px)",
};

const launchProjectPickerDialogStyle: CSSProperties = {
  width: "min(640px, calc(100vw - 32px))",
  maxHeight: "min(70vh, 720px)",
  display: "flex",
  flexDirection: "column",
  minHeight: 0,
  border: "1px solid rgba(255, 255, 255, 0.08)",
  background: TERMINAL_MENU_BACKGROUND,
  boxShadow: "0 24px 48px rgba(0, 0, 0, 0.4)",
  outline: "none",
};

const launchProjectResolvingDialogStyle: CSSProperties = {
  width: "min(420px, calc(100vw - 32px))",
  display: "grid",
  gap: 12,
  padding: "20px 20px 16px",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  background: TERMINAL_MENU_BACKGROUND,
  boxShadow: "0 24px 48px rgba(0, 0, 0, 0.4)",
};

const launchProjectResolvingTitleStyle: CSSProperties = {
  fontSize: 14,
  color: "#fafafa",
};

const launchProjectResolvingSubtitleStyle: CSSProperties = {
  fontSize: 12,
  color: "#a1a1aa",
};

const launchProjectResolvingSpinnerStyle: CSSProperties = {
  width: 18,
  height: 18,
  borderRadius: "50%",
  border: "2px solid rgba(255, 255, 255, 0.12)",
  borderTopColor: "#60a5fa",
  animation: "terminal-launch-spin 0.75s linear infinite",
};

const launchProjectPickerHeaderStyle: CSSProperties = {
  display: "grid",
  gap: 6,
  padding: "16px 18px 12px",
  borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
};

const launchProjectPickerTitleStyle: CSSProperties = {
  fontSize: 14,
  color: "#fafafa",
};

const launchProjectPickerSubtitleStyle: CSSProperties = {
  fontSize: 12,
  color: "#a1a1aa",
};

const launchProjectPickerSearchInputStyle: CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  background: "rgba(0, 0, 0, 0.16)",
  color: "#f4f4f5",
  outline: "none",
};

const launchProjectPickerListStyle: CSSProperties = {
  display: "grid",
  gap: 6,
  minHeight: 0,
  padding: 12,
  overflowY: "auto",
};

function launchProjectPickerItemStyle(active: boolean): CSSProperties {
  return {
    display: "grid",
    gap: 4,
    minWidth: 0,
    padding: "12px 14px",
    border: "1px solid rgba(255, 255, 255, 0.08)",
    background: active ? "rgba(59, 130, 246, 0.16)" : "rgba(255, 255, 255, 0.02)",
    color: "#e4e4e7",
    cursor: "pointer",
    textAlign: "left",
  };
}

const launchProjectPickerItemNameStyle: CSSProperties = {
  fontSize: 13,
  color: "#fafafa",
};

const launchProjectPickerItemPathStyle: CSSProperties = {
  fontSize: 11,
  color: "#a1a1aa",
  wordBreak: "break-all",
};

const launchProjectPickerEmptyStateStyle: CSSProperties = {
  padding: "24px 12px",
  color: "#a1a1aa",
  fontSize: 12,
  textAlign: "center",
};

const launchProjectPickerFooterStyle: CSSProperties = {
  display: "flex",
  gap: 8,
  justifyContent: "flex-end",
  padding: "12px 18px 16px",
  borderTop: "1px solid rgba(255, 255, 255, 0.08)",
};

const launchProjectPickerCancelButtonStyle: CSSProperties = {
  minWidth: 88,
  padding: "8px 14px",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  background: "transparent",
  color: "#d4d4d8",
  cursor: "pointer",
};

const launchProjectPickerItemRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "flex-start",
  gap: 12,
  minWidth: 0,
};

const launchProjectPickerItemSelectButtonStyle: CSSProperties = {
  display: "grid",
  gap: 4,
  minWidth: 0,
  flex: 1,
  padding: 0,
  border: "none",
  background: "transparent",
  color: "inherit",
  cursor: "pointer",
  textAlign: "left",
};

const launchProjectPickerItemRemoveButtonStyle: CSSProperties = {
  flex: "none",
  minWidth: 0,
  padding: "4px 8px",
  border: "1px solid rgba(255, 255, 255, 0.1)",
  background: "rgba(0, 0, 0, 0.12)",
  color: "#d4d4d8",
  cursor: "pointer",
  fontSize: 11,
};

export function LaunchProjectResolvingDialog(props: {
  entryLabel: string;
  sourceLabel?: string | null;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") {
        return;
      }

      event.preventDefault();
      props.onCancel();
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [props.onCancel]);

  return (
    <div
      data-slot="terminal-launch-project-picker-backdrop"
      role="presentation"
      onClick={props.onCancel}
      style={launchProjectPickerBackdropStyle}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Resolving projects for ${props.entryLabel}`}
        onClick={(event) => {
          event.stopPropagation();
        }}
        style={launchProjectResolvingDialogStyle}
      >
        <strong style={launchProjectResolvingTitleStyle}>
          Resolving projects for {props.entryLabel}
        </strong>
        <span style={launchProjectResolvingSubtitleStyle}>
          {props.sourceLabel
            ? `${props.sourceLabel}. Loading the available project list before opening a new terminal tab.`
            : "Loading the available project list before opening a new terminal tab."}
        </span>
        <div style={launchProjectResolvingSpinnerStyle} />
        <div style={launchProjectPickerFooterStyle}>
          <button
            type="button"
            onClick={props.onCancel}
            style={launchProjectPickerCancelButtonStyle}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function LaunchProjectPickerDialog(props: {
  entryLabel: string;
  sourceLabel?: string | null;
  projects: NormalizedLaunchProject[];
  activeWorkingDirectory?: string | null;
  onClose: () => void;
  onSelectWorkingDirectory?: () => void | Promise<void>;
  onClearProjects?: () => void | Promise<void>;
  onRemoveProject?: (project: NormalizedLaunchProject) => void | Promise<void>;
  onSelect: (project: NormalizedLaunchProject) => void;
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [query, setQuery] = useState("");
  const filteredProjects = useMemo(
    () => filterLaunchProjects(props.projects, query),
    [props.projects, query],
  );
  const preferredProjectIndex = useMemo(
    () => resolvePreferredLaunchProjectIndex(
      filteredProjects,
      props.activeWorkingDirectory,
    ),
    [filteredProjects, props.activeWorkingDirectory],
  );
  const [activeProjectIndex, setActiveProjectIndex] = useState(preferredProjectIndex);

  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        props.onClose();
        return;
      }

      if (filteredProjects.length === 0) {
        return;
      }

      if (shouldIgnoreLaunchProjectPickerNavigationTarget(event.target)) {
        return;
      }

      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveProjectIndex((current) =>
          resolveNextLaunchProjectIndex(current, filteredProjects.length, "next"),
        );
        return;
      }

      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveProjectIndex((current) =>
          resolveNextLaunchProjectIndex(current, filteredProjects.length, "previous"),
        );
        return;
      }

      if (event.key === "Enter") {
        const selectedProject = filteredProjects[activeProjectIndex] ?? filteredProjects[0];
        if (!selectedProject) {
          return;
        }

        event.preventDefault();
        props.onSelect(selectedProject);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeProjectIndex, filteredProjects, props.onClose, props.onSelect]);

  useEffect(() => {
    setActiveProjectIndex((current) => {
      return resolveBoundedLaunchProjectIndex(
        current,
        filteredProjects.length,
        preferredProjectIndex,
      );
    });
  }, [filteredProjects.length, preferredProjectIndex]);

  return (
    <div
      data-slot="terminal-launch-project-picker-backdrop"
      role="presentation"
      onClick={props.onClose}
      style={launchProjectPickerBackdropStyle}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={`Choose project for ${props.entryLabel}`}
        tabIndex={-1}
        onClick={(event) => {
          event.stopPropagation();
        }}
        style={launchProjectPickerDialogStyle}
      >
        <div style={launchProjectPickerHeaderStyle}>
          <strong style={launchProjectPickerTitleStyle}>
            Choose project for {props.entryLabel}
          </strong>
          <span style={launchProjectPickerSubtitleStyle}>
            {props.sourceLabel
              ? `${props.sourceLabel}. Select the working directory to open in a new terminal tab.`
              : "Select the working directory to open in a new terminal tab."}
          </span>
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            placeholder="Filter projects by name or path"
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            style={launchProjectPickerSearchInputStyle}
          />
        </div>

        <div style={launchProjectPickerListStyle}>
          {filteredProjects.length === 0 ? (
            <div style={launchProjectPickerEmptyStateStyle}>
              No projects match the current filter.
            </div>
          ) : (
            filteredProjects.map((project, index) => (
              <div
                key={`${project.path}:${project.projectId ?? ""}:${project.workspaceId ?? ""}`}
                data-launch-project-picker-row="true"
                onClick={(event) => {
                  event.stopPropagation();
                  if (shouldIgnoreLaunchProjectPickerRowActivationTarget(event.target)) {
                    return;
                  }
                  props.onSelect(project);
                }}
                onMouseEnter={() => {
                  setActiveProjectIndex(index);
                }}
                style={launchProjectPickerItemStyle(index === activeProjectIndex)}
              >
                <span style={launchProjectPickerItemRowStyle}>
                  <button
                    type="button"
                    onClick={() => props.onSelect(project)}
                    style={launchProjectPickerItemSelectButtonStyle}
                  >
                    <span style={launchProjectPickerItemNameStyle}>{project.name}</span>
                    <span style={launchProjectPickerItemPathStyle}>{project.path}</span>
                  </button>
                  {props.onRemoveProject ? (
                    <button
                      type="button"
                      aria-label={`Remove ${project.name}`}
                      data-launch-project-picker-action="true"
                      onClick={(event) => {
                        event.stopPropagation();
                        runTerminalTaskBestEffort(() =>
                          props.onRemoveProject?.(project),
                        );
                      }}
                      style={launchProjectPickerItemRemoveButtonStyle}
                    >
                      Remove
                    </button>
                  ) : null}
                </span>
              </div>
            ))
          )}
        </div>

        <div style={launchProjectPickerFooterStyle}>
          {props.onClearProjects ? (
            <button
              type="button"
              onClick={() => {
                runTerminalTaskBestEffort(() => props.onClearProjects?.());
              }}
              style={launchProjectPickerCancelButtonStyle}
            >
              Clear recent
            </button>
          ) : null}
          {props.onSelectWorkingDirectory ? (
            <button
              type="button"
              onClick={() => {
                runTerminalTaskBestEffort(() =>
                  props.onSelectWorkingDirectory?.(),
                );
              }}
              style={launchProjectPickerCancelButtonStyle}
            >
              Choose folder
            </button>
          ) : null}
          <button
            type="button"
            onClick={props.onClose}
            style={launchProjectPickerCancelButtonStyle}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
