import type {
  Dispatch,
  KeyboardEvent as ReactKeyboardEvent,
  MouseEvent as ReactMouseEvent,
  SetStateAction,
} from "react";
import { memo, useRef } from "react";
import {
  type TerminalShellProfile,
  type TerminalShellSnapshot,
} from "./model";
import { type LaunchProfileDefinition } from "./launch-profiles.ts";
import { ProfileGlyph } from "./profile-menu.tsx";
import type { NullableElementRef } from "./ref-types.ts";
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
import { terminalTabStripMessagesEnUS } from "./i18n/en-US/device/shell/terminal-tab-strip.ts";
import type { TerminalTabStripMessages } from "./terminal-interaction-messages.ts";
import { useStableCallback } from "./terminal-react-stability.ts";
import {
  shouldReuseTerminalTabListRender,
  type TerminalTabListMemoProps,
} from "./terminal-tab-strip-memo.ts";
import { resolveTerminalTabKeyboardNavigation } from "./terminal-tab-keyboard.ts";

export interface TerminalTabStripProps {
  mode: "desktop" | "web";
  tabs: TerminalShellSnapshot["tabs"];
  launchProfiles: LaunchProfileDefinition[];
  messages?: TerminalTabStripMessages;
  profileMenuOpen: boolean;
  hoveredTabId: string | null;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  shouldDockTabActionsToTrailing: boolean;
  desktopWindowController?: Parameters<typeof DesktopWindowControls>[0]["controller"];
  headerLeadingRef: NullableElementRef<HTMLDivElement>;
  headerChromeRef: NullableElementRef<HTMLDivElement>;
  tabScrollRef: NullableElementRef<HTMLDivElement>;
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
  const messages = props.messages ?? terminalTabStripMessagesEnUS;
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
            aria-label={messages.scrollTabsLeft}
            title={messages.scrollTabsLeft}
            onClick={() => scrollTabs(props.tabScrollRef.current, "left")}
            style={tabScrollButtonStyle}
          >
            <ChevronGlyph direction="left" />
          </button>
        ) : null}

        <MemoTerminalTabList
          tabs={props.tabs}
          launchProfiles={props.launchProfiles}
          messages={messages}
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
            aria-label={messages.scrollTabsRight}
            title={messages.scrollTabsRight}
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
  tabScrollRef: NullableElementRef<HTMLDivElement>;
  setCanScrollLeft: (value: boolean) => void;
  setCanScrollRight: (value: boolean) => void;
  onOpenTabContextMenu: (event: ReactMouseEvent<HTMLDivElement>, tabId: string) => void;
  onActivateTab: (tabId: string) => void;
  onCloseTab: (tabId: string) => void;
  onSetHoveredTabId: Dispatch<SetStateAction<string | null>>;
}

const MemoTerminalTabList = memo(function TerminalTabList(props: TerminalTabListProps) {
  const tabButtonRefs = useRef(new Map<string, HTMLButtonElement>());

  function handleTabKeyDown(
    event: ReactKeyboardEvent<HTMLButtonElement>,
    tabId: string,
  ) {
    const nextTabId = resolveTerminalTabKeyboardNavigation({
      key: event.key,
      tabIds: props.tabs.map((tab) => tab.id),
      currentTabId: tabId,
    });
    if (!nextTabId) {
      return;
    }

    event.preventDefault();
    props.onActivateTab(nextTabId);
    tabButtonRefs.current.get(nextTabId)?.focus();
  }

  return (
    <div
      ref={props.tabScrollRef}
      role="tablist"
      aria-label={props.messages.tabListAriaLabel}
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
            onMouseLeave={(event) => {
              if (event.currentTarget.contains(event.currentTarget.ownerDocument.activeElement)) {
                return;
              }

              props.onSetHoveredTabId((current) => (current === tab.id ? null : current));
            }}
            onFocusCapture={() => props.onSetHoveredTabId(tab.id)}
            onBlurCapture={(event) => {
              const nextFocusedElement = event.relatedTarget;
              if (
                nextFocusedElement instanceof Node &&
                event.currentTarget.contains(nextFocusedElement)
              ) {
                return;
              }

              props.onSetHoveredTabId((current) => (current === tab.id ? null : current));
            }}
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
              aria-posinset={props.tabs.indexOf(tab) + 1}
              aria-setsize={props.tabs.length}
              tabIndex={active ? 0 : -1}
              ref={(element) => {
                if (element) {
                  tabButtonRefs.current.set(tab.id, element);
                  return;
                }

                tabButtonRefs.current.delete(tab.id);
              }}
              onClick={() => props.onActivateTab(tab.id)}
              onKeyDown={(event) => handleTabKeyDown(event, tab.id)}
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
                aria-label={props.messages.closeTabAriaLabel}
                aria-hidden={!closeVisible}
                disabled={!closeVisible}
                tabIndex={closeVisible ? 0 : -1}
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

