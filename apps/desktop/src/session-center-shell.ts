import type { DesktopSessionAttachmentSnapshot } from "@sdkwork/terminal-infrastructure";
import type { SessionCenterSession } from "@sdkwork/terminal-sessions/model";

export interface DesktopSessionReattachIntentState {
  requestId: string;
  sessionId: string;
  attachmentId: string;
  cursor: string;
  profile: "powershell" | "bash" | "shell";
  title: string;
  targetLabel: string;
}

const LOCAL_PROCESS_LAUNCHER_TAG = "launcher:local-process";
const DESKTOP_REATTACHABLE_TARGETS = new Set([
  "local-shell",
  "ssh",
  "docker-exec",
  "kubernetes-exec",
]);
const DESKTOP_LOCAL_PROCESS_TITLES = new Map<string, string>([
  ["codex", "Codex"],
  ["claude-code", "Claude Code"],
  ["claude", "Claude Code"],
  ["gemini-cli", "Gemini CLI"],
  ["gemini", "Gemini CLI"],
  ["opencode-cli", "OpenCode"],
  ["opencode", "OpenCode"],
]);

function normalizeSessionTagValue(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized ? normalized : null;
}

function resolveSessionTagValue(tags: string[], prefix: string) {
  const entry = tags.find((tag) => tag.startsWith(prefix))?.slice(prefix.length);
  return normalizeSessionTagValue(entry);
}

function isDesktopLocalProcessSession(target: string, tags: string[]) {
  return (
    tags.includes(LOCAL_PROCESS_LAUNCHER_TAG) ||
    DESKTOP_LOCAL_PROCESS_TITLES.has(target.trim().toLowerCase())
  );
}

function resolveDesktopLocalProcessTitle(target: string, tags: string[]) {
  const candidates = [
    resolveSessionTagValue(tags, "profile:"),
    normalizeSessionTagValue(target),
    resolveSessionTagValue(tags, "program:"),
  ];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const resolvedTitle = DESKTOP_LOCAL_PROCESS_TITLES.get(candidate);
    if (resolvedTitle) {
      return resolvedTitle;
    }
  }

  return null;
}

function resolveDesktopShellProfileTag(
  tags: string[],
): DesktopSessionReattachIntentState["profile"] | null {
  const profileTag = resolveSessionTagValue(tags, "profile:");
  if (!profileTag) {
    return null;
  }

  if (profileTag === "powershell" || profileTag === "pwsh") {
    return "powershell";
  }

  if (profileTag === "bash" || profileTag === "zsh" || profileTag === "sh") {
    return "bash";
  }

  return "shell";
}

function detectFallbackDesktopShellProfile(): DesktopSessionReattachIntentState["profile"] {
  if (typeof navigator !== "undefined" && /windows/i.test(navigator.userAgent)) {
    return "powershell";
  }

  if (typeof navigator !== "undefined" && /mac|linux|x11/i.test(navigator.userAgent)) {
    return "bash";
  }

  return "shell";
}

function resolveDesktopShellTitle(
  profile: DesktopSessionReattachIntentState["profile"],
  target: string,
  tags: string[],
) {
  const localProcessTitle = resolveDesktopLocalProcessTitle(target, tags);
  if (localProcessTitle) {
    return localProcessTitle;
  }

  if (target === "ssh") {
    return "SSH";
  }

  if (target === "docker-exec") {
    return "Docker";
  }

  if (target === "kubernetes-exec") {
    return "Kubernetes";
  }

  if (target === "remote-runtime") {
    return "Remote Runtime";
  }

  if (profile === "powershell") {
    return "PowerShell";
  }

  if (profile === "bash") {
    return "bash";
  }

  return target === "local-shell" ? "Shell" : "Session";
}

function resolveDesktopSessionProfile(
  target: string,
  tags: string[],
): DesktopSessionReattachIntentState["profile"] {
  const taggedProfile = resolveDesktopShellProfileTag(tags);
  if (taggedProfile) {
    return taggedProfile;
  }

  if (isDesktopLocalProcessSession(target, tags)) {
    return "shell";
  }

  if (target === "ssh" || target === "docker-exec" || target === "kubernetes-exec") {
    return "bash";
  }

  if (target === "remote-runtime") {
    return "shell";
  }

  return detectFallbackDesktopShellProfile();
}

export function canReattachDesktopSession(
  session: Pick<SessionCenterSession, "target" | "state" | "attachmentState" | "tags">,
) {
  const sessionTags = Array.isArray(session.tags) ? session.tags : [];

  return (
    (DESKTOP_REATTACHABLE_TARGETS.has(session.target) ||
      isDesktopLocalProcessSession(session.target, sessionTags)) &&
    session.state !== "Exited" &&
    session.attachmentState === "reattach-required"
  );
}

export function createDesktopSessionReattachIntent(
  snapshot: DesktopSessionAttachmentSnapshot,
  options: {
    requestId?: string;
  } = {},
): DesktopSessionReattachIntentState {
  const profileTags = Array.isArray(snapshot.session.tags) ? snapshot.session.tags : [];
  const profile = resolveDesktopSessionProfile(snapshot.session.target, profileTags);

  return {
    requestId:
      options.requestId ??
      `${snapshot.attachment.attachmentId}:${snapshot.attachment.cursor}:${snapshot.session.sessionId}`,
    sessionId: snapshot.session.sessionId,
    attachmentId: snapshot.attachment.attachmentId,
    cursor: snapshot.attachment.cursor,
    profile,
    title: resolveDesktopShellTitle(profile, snapshot.session.target, profileTags),
    targetLabel: `reattach / ${snapshot.session.target}`,
  };
}
