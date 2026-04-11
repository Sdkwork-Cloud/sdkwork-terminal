import type { DesktopSessionAttachmentSnapshot } from "../../../packages/sdkwork-terminal-infrastructure/src/index.ts";
import type { SessionCenterSession } from "../../../packages/sdkwork-terminal-sessions/src/model.ts";

export interface DesktopSessionReattachIntentState {
  requestId: string;
  sessionId: string;
  attachmentId: string;
  cursor: string;
  profile: "powershell" | "bash" | "shell";
  title: string;
  targetLabel: string;
}

const DESKTOP_REATTACHABLE_TARGETS = new Set([
  "local-shell",
  "ssh",
  "docker-exec",
  "kubernetes-exec",
]);

function resolveDesktopShellProfileTag(
  tags: string[],
): DesktopSessionReattachIntentState["profile"] | null {
  const profileTag = tags.find((tag) => tag.startsWith("profile:"))?.slice("profile:".length);
  if (!profileTag) {
    return null;
  }

  const normalizedProfile = profileTag.trim().toLowerCase();
  if (normalizedProfile === "powershell" || normalizedProfile === "pwsh") {
    return "powershell";
  }

  if (normalizedProfile === "bash" || normalizedProfile === "zsh" || normalizedProfile === "sh") {
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
) {
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

  if (target === "ssh" || target === "docker-exec" || target === "kubernetes-exec") {
    return "bash";
  }

  if (target === "remote-runtime") {
    return "shell";
  }

  return detectFallbackDesktopShellProfile();
}

export function canReattachDesktopSession(
  session: Pick<SessionCenterSession, "target" | "state" | "attachmentState">,
) {
  return (
    DESKTOP_REATTACHABLE_TARGETS.has(session.target) &&
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
    title: resolveDesktopShellTitle(profile, snapshot.session.target),
    targetLabel: `reattach / ${snapshot.session.target}`,
  };
}
