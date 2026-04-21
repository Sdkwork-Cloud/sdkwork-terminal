import type { OpenTerminalShellTabOptions, TerminalShellProfile } from "./model";

export type LaunchProfileGroup = "shell" | "wsl" | "cli";

export interface LaunchProfileDefinition {
  id: string;
  group: LaunchProfileGroup;
  profile: TerminalShellProfile;
  label: string;
  subtitle: string;
  accent: string;
  openOptions?: OpenTerminalShellTabOptions;
  requiresWorkingDirectoryPicker?: boolean;
}

export interface LaunchProfileStatusDescriptor {
  title: string;
  subtitle: string;
  accent: string;
}

export const WSL_DISCOVERY_CACHE_TTL_MS = 30_000;
export const WSL_DISCOVERY_COMMAND = "wsl.exe --list --quiet";
const WSL_PROFILE_ACCENTS = ["#22c55e", "#14b8a6", "#38bdf8", "#f97316"] as const;
const HIDDEN_WSL_DISTRIBUTIONS = new Set(["docker-desktop", "docker-desktop-data"]);

export function detectDefaultDesktopProfile(): TerminalShellProfile {
  if (typeof navigator !== "undefined" && /windows/i.test(navigator.userAgent)) {
    return "powershell";
  }

  return "bash";
}

function createDesktopCliLaunchOptions(
  profileId: string,
  title: string,
  command: string[],
  targetLabel: string,
): OpenTerminalShellTabOptions {
  return {
    profile: "shell",
    title,
    targetLabel,
    runtimeBootstrap: {
      kind: "local-process",
      request: {
        command,
        title,
        profileId,
      },
    },
  };
}

function createDesktopWslLaunchOptions(
  distributionName: string,
): OpenTerminalShellTabOptions {
  return {
    profile: "bash",
    title: distributionName,
    targetLabel: `${distributionName} / wsl`,
    runtimeBootstrap: {
      kind: "local-process",
      request: {
        command: ["wsl.exe", "-d", distributionName],
      },
    },
  };
}

export function isWindowsDesktopHost() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /windows/i.test(`${navigator.userAgent} ${navigator.platform ?? ""}`);
}

function parseWslDistributionNames(stdout: string) {
  const discovered = new Set<string>();
  const entries: string[] = [];

  for (const rawLine of stdout.split(/\r?\n/u)) {
    const normalized = rawLine
      .replace(/\u0000/g, "")
      .replace(/^\uFEFF/u, "")
      .trim();
    const normalizedKey = normalized.toLowerCase();

    if (
      !normalized ||
      HIDDEN_WSL_DISTRIBUTIONS.has(normalizedKey) ||
      discovered.has(normalized)
    ) {
      continue;
    }

    discovered.add(normalized);
    entries.push(normalized);
  }

  return entries;
}

function resolveWslAccent(distributionName: string) {
  let hash = 0;
  for (let index = 0; index < distributionName.length; index += 1) {
    hash = (hash * 33 + distributionName.charCodeAt(index)) >>> 0;
  }

  return WSL_PROFILE_ACCENTS[hash % WSL_PROFILE_ACCENTS.length];
}

function createDesktopWslLaunchProfile(
  distributionName: string,
): LaunchProfileDefinition {
  return {
    id: `wsl-${encodeURIComponent(distributionName)}`,
    group: "wsl",
    profile: "bash",
    label: distributionName,
    subtitle: "Windows Subsystem for Linux",
    accent: resolveWslAccent(distributionName),
    openOptions: createDesktopWslLaunchOptions(distributionName),
  };
}

export function resolveDesktopWslLaunchProfiles(stdout: string) {
  return parseWslDistributionNames(stdout).map(createDesktopWslLaunchProfile);
}

export function createDesktopWslDiscoveryFailureStatus(args: {
  hasCachedProfiles: boolean;
  exitCode?: number;
  message?: string;
}): LaunchProfileStatusDescriptor {
  const title = args.hasCachedProfiles ? "WSL discovery stale" : "WSL unavailable";
  const accent = args.hasCachedProfiles ? "#f59e0b" : "#ef4444";

  if (typeof args.exitCode === "number") {
    return {
      title,
      subtitle: args.hasCachedProfiles
        ? `Showing last known distributions until discovery succeeds again. Command exited with code ${args.exitCode}.`
        : `Failed to query WSL distributions. Command exited with code ${args.exitCode}.`,
      accent,
    };
  }

  const message = args.message?.trim() || "Unknown error.";
  return {
    title,
    subtitle: args.hasCachedProfiles
      ? `Showing last known distributions. ${message}`
      : `Failed to discover WSL distributions. ${message}`,
    accent,
  };
}

export const DESKTOP_LAUNCH_PROFILES: LaunchProfileDefinition[] = [
  {
    id: "powershell",
    group: "shell",
    profile: "powershell",
    label: "PowerShell",
    subtitle: "Windows native shell",
    accent: "#3b82f6",
  },
  {
    id: "bash",
    group: "shell",
    profile: "bash",
    label: "bash",
    subtitle: "POSIX login shell (requires bash in PATH)",
    accent: "#f97316",
  },
  {
    id: "shell",
    group: "shell",
    profile: "shell",
    label: "Shell",
    subtitle: "Fallback command shell",
    accent: "#22c55e",
  },
  {
    id: "codex",
    group: "cli",
    profile: "shell",
    label: "Codex CLI",
    subtitle: "Choose folder and open Codex in a local terminal tab",
    accent: "#2563eb",
    openOptions: createDesktopCliLaunchOptions(
      "codex",
      "Codex",
      ["codex", "--no-alt-screen"],
      "codex / local cli",
    ),
    requiresWorkingDirectoryPicker: true,
  },
  {
    id: "claude-code",
    group: "cli",
    profile: "shell",
    label: "Claude Code",
    subtitle: "Choose folder and open Claude Code in a local terminal tab",
    accent: "#ea580c",
    openOptions: createDesktopCliLaunchOptions(
      "claude-code",
      "Claude Code",
      ["claude"],
      "claude / local cli",
    ),
    requiresWorkingDirectoryPicker: true,
  },
  {
    id: "gemini-cli",
    group: "cli",
    profile: "shell",
    label: "Gemini CLI",
    subtitle: "Choose folder and open Gemini CLI in a local terminal tab",
    accent: "#1d4ed8",
    openOptions: createDesktopCliLaunchOptions(
      "gemini-cli",
      "Gemini CLI",
      ["gemini"],
      "gemini / local cli",
    ),
    requiresWorkingDirectoryPicker: true,
  },
  {
    id: "opencode-cli",
    group: "cli",
    profile: "shell",
    label: "OpenCode CLI",
    subtitle: "Choose folder and open OpenCode in a local terminal tab",
    accent: "#059669",
    openOptions: createDesktopCliLaunchOptions(
      "opencode-cli",
      "OpenCode",
      ["opencode"],
      "opencode / local cli",
    ),
    requiresWorkingDirectoryPicker: true,
  },
];

export const WEB_LAUNCH_PROFILES: LaunchProfileDefinition[] = [
  {
    id: "bash",
    group: "shell",
    profile: "bash",
    label: "bash",
    subtitle: "POSIX login shell",
    accent: "#f97316",
  },
  {
    id: "shell",
    group: "shell",
    profile: "shell",
    label: "Shell",
    subtitle: "Generic remote shell",
    accent: "#22c55e",
  },
  {
    id: "codex",
    group: "cli",
    profile: "bash",
    label: "Codex CLI",
    subtitle: "Open Codex in a shell tab",
    accent: "#2563eb",
    openOptions: {
      profile: "bash",
      title: "Codex",
      commandText: "codex --no-alt-screen",
      targetLabel: "codex / shell cli",
    },
  },
  {
    id: "claude-code",
    group: "cli",
    profile: "bash",
    label: "Claude Code",
    subtitle: "Open Claude Code in a shell tab",
    accent: "#ea580c",
    openOptions: {
      profile: "bash",
      title: "Claude Code",
      commandText: "claude",
      targetLabel: "claude / shell cli",
    },
  },
  {
    id: "gemini-cli",
    group: "cli",
    profile: "bash",
    label: "Gemini CLI",
    subtitle: "Open Gemini CLI in a shell tab",
    accent: "#1d4ed8",
    openOptions: {
      profile: "bash",
      title: "Gemini CLI",
      commandText: "gemini",
      targetLabel: "gemini / shell cli",
    },
  },
  {
    id: "opencode-cli",
    group: "cli",
    profile: "bash",
    label: "OpenCode CLI",
    subtitle: "Open OpenCode in a shell tab",
    accent: "#059669",
    openOptions: {
      profile: "bash",
      title: "OpenCode",
      commandText: "opencode",
      targetLabel: "opencode / shell cli",
    },
  },
];
