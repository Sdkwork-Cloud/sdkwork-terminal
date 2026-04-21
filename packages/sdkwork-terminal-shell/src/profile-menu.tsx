import type { CSSProperties } from "react";

const PROFILE_MENU_WIDTH = 280;
const PROFILE_MENU_VIEWPORT_INSET = 8;
const TERMINAL_MENU_BACKGROUND = "rgba(22, 24, 27, 0.98)";

const profileMenuSectionStyle: CSSProperties = {
  display: "grid",
  gap: 2,
};

const profileMenuSectionTitleStyle: CSSProperties = {
  padding: "4px 10px",
  fontSize: 10,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "#71717a",
};

const profileMenuDividerStyle: CSSProperties = {
  height: 1,
  background: "rgba(255, 255, 255, 0.08)",
};

const profileMenuItemStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 10,
  minWidth: 0,
  padding: "10px 12px",
  border: "none",
  background: "transparent",
  color: "#e4e4e7",
  cursor: "pointer",
  textAlign: "left",
};

const profileMenuStatusItemStyle: CSSProperties = {
  ...profileMenuItemStyle,
  cursor: "default",
  opacity: 0.92,
};

const profileMenuTextStyle: CSSProperties = {
  display: "grid",
  minWidth: 0,
};

const profileMenuLabelStyle: CSSProperties = {
  fontSize: 12,
  color: "#fafafa",
};

const profileMenuSubtitleStyle: CSSProperties = {
  fontSize: 11,
  color: "#71717a",
};

const profileGlyphWrapStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  width: 14,
  height: 14,
  flex: "none",
};

const profileGlyphStyle: CSSProperties = {
  display: "block",
  flex: "none",
};

export interface ProfileMenuDescriptor {
  title: string;
  subtitle: string;
  accent: string;
}

export interface ProfileMenuEntryBase {
  label: string;
  subtitle: string;
  accent: string;
}

export function profileMenuStyle(menu: {
  top: number;
  left: number;
  maxHeight: number;
}): CSSProperties {
  return {
    position: "fixed",
    top: menu.top,
    left: menu.left,
    zIndex: 60,
    maxHeight: menu.maxHeight,
    overflowY: "auto",
    overscrollBehavior: "contain",
    display: "grid",
    gap: 6,
    minWidth: PROFILE_MENU_WIDTH,
    maxWidth: `min(${PROFILE_MENU_WIDTH}px, calc(100vw - ${PROFILE_MENU_VIEWPORT_INSET * 2}px))`,
    padding: 6,
    border: "1px solid rgba(255, 255, 255, 0.08)",
    background: TERMINAL_MENU_BACKGROUND,
    boxShadow: "0 20px 40px rgba(0, 0, 0, 0.45)",
  };
}

export function ProfileMenuSection<TEntry extends ProfileMenuEntryBase>(props: {
  title: string;
  entries: readonly TEntry[];
  getKey: (entry: TEntry) => string;
  onSelect: (entry: TEntry) => void;
}) {
  return (
    <div style={profileMenuSectionStyle}>
      <div style={profileMenuSectionTitleStyle}>{props.title}</div>
      {props.entries.map((entry) => (
        <button
          key={props.getKey(entry)}
          type="button"
          role="menuitem"
          onClick={() => props.onSelect(entry)}
          style={profileMenuItemStyle}
        >
          <ProfileGlyph accent={entry.accent} label={entry.label} />
          <span style={profileMenuTextStyle}>
            <span style={profileMenuLabelStyle}>{entry.label}</span>
            <span style={profileMenuSubtitleStyle}>{entry.subtitle}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

export function ProfileMenuActionItem(props: {
  accent: string;
  label: string;
  subtitle: string;
  slot?: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      data-slot={props.slot}
      onClick={props.onSelect}
      style={profileMenuItemStyle}
    >
      <ProfileGlyph accent={props.accent} label={props.label} />
      <span style={profileMenuTextStyle}>
        <span style={profileMenuLabelStyle}>{props.label}</span>
        <span style={profileMenuSubtitleStyle}>{props.subtitle}</span>
      </span>
    </button>
  );
}

export function ProfileMenuStatusItem(props: {
  descriptor: ProfileMenuDescriptor;
  slot: string;
}) {
  const { descriptor } = props;

  return (
    <div
      role="menuitem"
      aria-disabled="true"
      data-slot={props.slot}
      style={profileMenuStatusItemStyle}
    >
      <ProfileGlyph accent={descriptor.accent} label={descriptor.title} />
      <span style={profileMenuTextStyle}>
        <span style={profileMenuLabelStyle}>{descriptor.title}</span>
        <span style={profileMenuSubtitleStyle}>{descriptor.subtitle}</span>
      </span>
    </div>
  );
}

export function ProfileMenuDivider() {
  return <div style={profileMenuDividerStyle} />;
}

export function ProfileGlyph(props: {
  accent: string;
  label: string;
}) {
  return (
    <span aria-hidden="true" title={props.label} style={profileGlyphWrapStyle}>
      <svg viewBox="0 0 16 16" width="14" height="14" fill="none" style={profileGlyphStyle}>
        <rect
          x="1.5"
          y="2"
          width="13"
          height="10.5"
          rx="1.75"
          stroke={props.accent}
          strokeWidth="1.2"
        />
        <path
          d="M4.2 5.2L6.4 7.1L4.2 9"
          stroke={props.accent}
          strokeWidth="1.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M8.4 9H11.4"
          stroke={props.accent}
          strokeWidth="1.2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
