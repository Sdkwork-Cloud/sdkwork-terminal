import type {
  Dispatch,
  MouseEvent as ReactMouseEvent,
  RefObject,
  SetStateAction,
} from "react";
import { memo } from "react";
import {
  type TerminalShellProfile,
  type TerminalShellSnapshot,
} from "./model";
import { type LaunchProfileDefinition } from "./launch-profiles.ts";
import { ProfileGlyph } from "./profile-menu.tsx";
import {
  activeTabAccentStyle,
  activeTabBottomMaskStyle,
  ChevronGlyph,
  CloseGlyph,
  DesktopWindowControls,
  headerChromeStyle,
  headerDragSpacerStyle,
  scrollTabs,
  syncTabScrollState,
  TabHeaderActions,
  tabButtonStyle,
  tabCloseButtonStyle,
  tabExitedIndicatorStyle,
  tabListStyle,
  tabScrollButtonStyle,
  tabShellStyle,
  tabTitleStyle,
} from "./terminal-header.tsx";
import {
  headerLeadingStyle,
  headerTrailingStyle,
  tabStripStyle,
} from "./shell-layout.ts";
import { useStableCallback } from "./terminal-react-stability.ts";
import {
  shouldReuseTerminalTabListRender,
  type TerminalTabListMemoProps,
} from "./terminal-tab-strip-memo.ts";

export interface TerminalTabStripProps {
  mode: "desktop" | "web";
  tabs: TerminalShellSnapshot["tabs"];
  launchProfiles: LaunchProfileDefinition[];
  profileMenuOpen: boolean;
  hoveredTabId: string | null;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  shouldDockTabActionsToTrailing: boolean;
  desktopWindowController?: Parameters<typeof DesktopWindowControls>[0]["controller"];
  headerLeadingRef: RefObject<HTMLDivElement>;
  headerChromeRef: RefObject<HTMLDivElement>;
  tabScrollRef: RefObject<HTMLDivElement>;
  setCanScrollLeft: (value: boolean) => void;
  setCanScrollRight: (value: boolean) => void;
  onOpenNewTab: () => void;
  onToggleProfileMenu: () => void;
  onOpenTabContextMenu: (event: ReactMouseEvent<HTMLDivElement>, tabId: string) => void;
  onActivateTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onSetHoveredTabId: Dispatch<SetStateAction<string | null>>;
}

export function TerminalTabStrip(props: TerminalTabStripProps) {
  const isDesktopShell = props.mode === "desktop";
  const handleOpenTabContextMenu = useStableCallback(props.onOpenTabContextMenu);
  const handleActivateTab = useStableCallback(props.onActivateTab);
  const handleCloseTab = useStableCallback(props.onCloseTab);
  const handleSetHoveredTabId = useStableCallback(props.onSetHoveredTabId);

  return (
    <div style={tabStripStyle}>
      <div
        ref={props.headerLeadingRef}
        data-slot="terminal-header-leading"
        {...(isDesktopShell ? { "data-tauri-drag-region": true } : {})}
        style={headerLeadingStyle}
      >
        {props.canScrollLeft ? (
          <button
            type="button"
            data-tauri-drag-region="false"
            aria-label="Scroll terminal tabs left"
            title="Scroll terminal tabs left"
            onClick={() => scrollTabs(props.tabScrollRef.current, "left")}
            style={tabScrollButtonStyle}
          >
            <ChevronGlyph direction="left" />
          </button>
        ) : null}

        <MemoTerminalTabList
          tabs={props.tabs}
          launchProfiles={props.launchProfiles}
          hoveredTabId={props.hoveredTabId}
          shouldDockTabActionsToTrailing={props.shouldDockTabActionsToTrailing}
          tabScrollRef={props.tabScrollRef}
          setCanScrollLeft={props.setCanScrollLeft}
          setCanScrollRight={props.setCanScrollRight}
          onOpenTabContextMenu={handleOpenTabContextMenu}
          onActivateTab={handleActivateTab}
          onCloseTab={handleCloseTab}
          onSetHoveredTabId={handleSetHoveredTabId}
        />

        {props.canScrollRight ? (
          <button
            type="button"
            data-tauri-drag-region="false"
            aria-label="Scroll terminal tabs right"
            title="Scroll terminal tabs right"
            onClick={() => scrollTabs(props.tabScrollRef.current, "right")}
            style={tabScrollButtonStyle}
          >
            <ChevronGlyph direction="right" />
          </button>
        ) : null}

        {!props.shouldDockTabActionsToTrailing ? (
          <div
            ref={props.headerChromeRef}
            data-slot="terminal-header-chrome"
            style={headerChromeStyle}
          >
            <TabHeaderActions
              profileMenuOpen={props.profileMenuOpen}
              onOpenNewTab={props.onOpenNewTab}
              onToggleProfileMenu={props.onToggleProfileMenu}
            />
          </div>
        ) : null}

        {isDesktopShell ? (
          <div
            data-tauri-drag-region
            style={headerDragSpacerStyle(props.shouldDockTabActionsToTrailing)}
          />
        ) : null}
      </div>

      <div
        data-slot="terminal-header-trailing"
        data-tauri-drag-region="false"
        style={headerTrailingStyle}
      >
        {props.shouldDockTabActionsToTrailing ? (
          <div
            ref={props.headerChromeRef}
            data-slot="terminal-header-chrome"
            style={headerChromeStyle}
          >
            <TabHeaderActions
              profileMenuOpen={props.profileMenuOpen}
              onOpenNewTab={props.onOpenNewTab}
              onToggleProfileMenu={props.onToggleProfileMenu}
            />
          </div>
        ) : null}

        {isDesktopShell && props.desktopWindowController ? (
          <DesktopWindowControls controller={props.desktopWindowController} />
        ) : null}
      </div>
    </div>
  );
}

interface TerminalTabListProps extends TerminalTabListMemoProps {
  tabScrollRef: RefObject<HTMLDivElement>;
  setCanScrollLeft: (value: boolean) => void;
  setCanScrollRight: (value: boolean) => void;
  onOpenTabContextMenu: (event: ReactMouseEvent<HTMLDivElement>, tabId: string) => void;
  onActivateTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onSetHoveredTabId: Dispatch<SetStateAction<string | null>>;
}

const MemoTerminalTabList = memo(function TerminalTabList(props: TerminalTabListProps) {
  return (
    <div
      ref={props.tabScrollRef}
      role="tablist"
      aria-label="Terminal tabs"
      onScroll={() =>
        syncTabScrollState(
          props.tabScrollRef.current,
          props.setCanScrollLeft,
          props.setCanScrollRight,
        )
      }
      style={tabListStyle(props.shouldDockTabActionsToTrailing)}
    >
      {props.tabs.map((tab) => {
        const active = tab.active;
        const closeVisible = active || props.hoveredTabId === tab.id;
        const profile = resolveLaunchProfile(props.launchProfiles, tab.profile);

        return (
          <div
            key={tab.id}
            data-terminal-tab-id={tab.id}
            data-tauri-drag-region="false"
            onContextMenu={(event) => props.onOpenTabContextMenu(event, tab.id)}
            onMouseDown={(event) => {
              if (event.button === 1 && tab.closable) {
                event.preventDefault();
                props.onCloseTab(tab.id);
              }
            }}
            onMouseEnter={() => props.onSetHoveredTabId(tab.id)}
            onMouseLeave={() =>
              props.onSetHoveredTabId((current) => (current === tab.id ? null : current))
            }
            style={tabShellStyle(
              active,
              closeVisible,
              props.shouldDockTabActionsToTrailing,
            )}
          >
            {active ? <div style={activeTabAccentStyle} /> : null}
            {active ? <div style={activeTabBottomMaskStyle} /> : null}
            <button
              id={`terminal-tab-${tab.id}`}
              type="button"
              role="tab"
              aria-selected={active}
              aria-controls={`terminal-panel-${tab.id}`}
              onClick={() => props.onActivateTab(tab.id)}
              style={tabButtonStyle}
            >
              <ProfileGlyph accent={profile.accent} label={profile.label} />
              <span style={tabTitleStyle}>{tab.title}</span>
              {tab.runtimeState === "exited" ? (
                <span aria-hidden="true" style={tabExitedIndicatorStyle} />
              ) : null}
            </button>
            {tab.closable ? (
              <button
                type="button"
                data-slot="terminal-tab-close"
                aria-label={`Close ${tab.title}`}
                onClick={(event) => {
                  event.stopPropagation();
                  props.onCloseTab(tab.id);
                }}
                style={tabCloseButtonStyle(active, closeVisible)}
              >
                <CloseGlyph />
              </button>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}, shouldReuseTerminalTabListRender);

function resolveLaunchProfile(
  profiles: TerminalTabListMemoProps["launchProfiles"],
  profileId: TerminalShellProfile,
) {
  return (
    profiles.find(
      (entry) => entry.group === "shell" && entry.profile === profileId,
    ) ??
    profiles[0] ?? {
      accent: "#64748b",
      label: profileId,
    }
  );
}
