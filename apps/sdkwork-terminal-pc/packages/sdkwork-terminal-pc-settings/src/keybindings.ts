/**
 * Keybindings Configuration System
 * 
 * Provides configurable keybindings for terminal actions.
 * Supports Vim mode and custom keybindings per user preference.
 */

export interface KeybindingAction {
  id: string;
  name: string;
  category: "navigation" | "edit" | "pane" | "tab" | "terminal" | "search";
  defaultBinding: string;
  description?: string;
}

export interface KeybindingConfig {
  actionId: string;
  binding: string;
  enabled: boolean;
}

export type KeybindingProfile = "default" | "vim" | "emacs" | "custom";

// Standard terminal keybindings
export const TERMINAL_KEYBINDING_ACTIONS: KeybindingAction[] = [
  // Navigation
  { id: "focus-next-pane", name: "Focus Next Pane", category: "pane", defaultBinding: "Ctrl+Shift+Right", description: "Move focus to next pane" },
  { id: "focus-prev-pane", name: "Focus Previous Pane", category: "pane", defaultBinding: "Ctrl+Shift+Left", description: "Move focus to previous pane" },
  { id: "focus-pane-up", name: "Focus Pane Above", category: "pane", defaultBinding: "Ctrl+Shift+Up", description: "Move focus to pane above" },
  { id: "focus-pane-down", name: "Focus Pane Below", category: "pane", defaultBinding: "Ctrl+Shift+Down", description: "Move focus to pane below" },
  
  // Pane Management
  { id: "split-pane-horizontal", name: "Split Pane Horizontal", category: "pane", defaultBinding: "Ctrl+Shift+H", description: "Split current pane horizontally" },
  { id: "split-pane-vertical", name: "Split Pane Vertical", category: "pane", defaultBinding: "Ctrl+Shift+V", description: "Split current pane vertically" },
  { id: "close-pane", name: "Close Pane", category: "pane", defaultBinding: "Ctrl+Shift+W", description: "Close current pane" },
  { id: "maximize-pane", name: "Maximize Pane", category: "pane", defaultBinding: "Ctrl+Shift+M", description: "Maximize current pane" },
  { id: "equalize-panes", name: "Equalize Pane Sizes", category: "pane", defaultBinding: "Ctrl+Shift+E", description: "Make all panes equal size" },
  
  // Tab Management
  { id: "new-tab", name: "New Tab", category: "tab", defaultBinding: "Ctrl+Shift+T", description: "Create new terminal tab" },
  { id: "close-tab", name: "Close Tab", category: "tab", defaultBinding: "Ctrl+Shift+Q", description: "Close current tab" },
  { id: "next-tab", name: "Next Tab", category: "tab", defaultBinding: "Ctrl+Tab", description: "Switch to next tab" },
  { id: "prev-tab", name: "Previous Tab", category: "tab", defaultBinding: "Ctrl+Shift+Tab", description: "Switch to previous tab" },
  { id: "tab-1", name: "Switch to Tab 1", category: "tab", defaultBinding: "Ctrl+1", description: "Switch to tab 1" },
  { id: "tab-2", name: "Switch to Tab 2", category: "tab", defaultBinding: "Ctrl+2", description: "Switch to tab 2" },
  { id: "tab-3", name: "Switch to Tab 3", category: "tab", defaultBinding: "Ctrl+3", description: "Switch to tab 3" },
  { id: "tab-4", name: "Switch to Tab 4", category: "tab", defaultBinding: "Ctrl+4", description: "Switch to tab 4" },
  { id: "tab-5", name: "Switch to Tab 5", category: "tab", defaultBinding: "Ctrl+5", description: "Switch to tab 5" },
  
  // Terminal Actions
  { id: "copy", name: "Copy", category: "edit", defaultBinding: "Ctrl+Shift+C", description: "Copy selected text" },
  { id: "paste", name: "Paste", category: "edit", defaultBinding: "Ctrl+Shift+V", description: "Paste text from clipboard" },
  { id: "clear-screen", name: "Clear Screen", category: "terminal", defaultBinding: "Ctrl+Shift+K", description: "Clear terminal screen" },
  { id: "reset-terminal", name: "Reset Terminal", category: "terminal", defaultBinding: "Ctrl+Shift+R", description: "Reset terminal state" },
  { id: "scroll-up", name: "Scroll Up", category: "navigation", defaultBinding: "Ctrl+Up", description: "Scroll terminal up" },
  { id: "scroll-down", name: "Scroll Down", category: "navigation", defaultBinding: "Ctrl+Down", description: "Scroll terminal down" },
  { id: "scroll-page-up", name: "Scroll Page Up", category: "navigation", defaultBinding: "Ctrl+PageUp", description: "Scroll one page up" },
  { id: "scroll-page-down", name: "Scroll Page Down", category: "navigation", defaultBinding: "Ctrl+PageDown", description: "Scroll one page down" },
  { id: "scroll-top", name: "Scroll to Top", category: "navigation", defaultBinding: "Ctrl+Home", description: "Scroll to top of scrollback" },
  { id: "scroll-bottom", name: "Scroll to Bottom", category: "navigation", defaultBinding: "Ctrl+End", description: "Scroll to bottom of output" },
  
  // Search
  { id: "find", name: "Find", category: "search", defaultBinding: "Ctrl+Shift+F", description: "Open find dialog" },
  { id: "find-next", name: "Find Next", category: "search", defaultBinding: "F3", description: "Find next occurrence" },
  { id: "find-prev", name: "Find Previous", category: "search", defaultBinding: "Shift+F3", description: "Find previous occurrence" },
  
  // Zoom
  { id: "zoom-in", name: "Zoom In", category: "terminal", defaultBinding: "Ctrl++", description: "Increase font size" },
  { id: "zoom-out", name: "Zoom Out", category: "terminal", defaultBinding: "Ctrl+-", description: "Decrease font size" },
  { id: "zoom-reset", name: "Reset Zoom", category: "terminal", defaultBinding: "Ctrl+0", description: "Reset font size to default" },
];

// Vim-style keybindings profile
export const VIM_KEYBINDING_PROFILE: Partial<Record<string, string>> = {
  "scroll-up": "Ctrl+K",
  "scroll-down": "Ctrl+J",
  "scroll-page-up": "Ctrl+U",
  "scroll-page-down": "Ctrl+D",
  "scroll-top": "Ctrl+G",
  "scroll-bottom": "Ctrl+Shift+G",
  "find": "/",
  "find-next": "n",
  "find-prev": "Shift+N",
};

// Emacs-style keybindings profile
export const EMACS_KEYBINDING_PROFILE: Partial<Record<string, string>> = {
  "scroll-up": "Alt+V",
  "scroll-down": "Ctrl+V",
  "scroll-top": "Alt+Shift+Comma",
  "scroll-bottom": "Alt+Shift+Period",
  "find": "Ctrl+S",
  "find-next": "Ctrl+S",
  "find-prev": "Ctrl+R",
};

/**
 * Parse keybinding string into normalized format
 */
export function parseKeybinding(binding: string): {
  ctrl: boolean;
  alt: boolean;
  shift: boolean;
  key: string;
} {
  const parts = binding.split("+").map(p => p.trim());
  const result = {
    ctrl: parts.includes("Ctrl"),
    alt: parts.includes("Alt"),
    shift: parts.includes("Shift"),
    key: parts[parts.length - 1] || "",
  };
  return result;
}

/**
 * Convert keyboard event to keybinding string
 */
export function eventToKeybinding(event: KeyboardEvent): string {
  const parts: string[] = [];
  if (event.ctrlKey) parts.push("Ctrl");
  if (event.altKey) parts.push("Alt");
  if (event.shiftKey && event.key.length === 1) parts.push("Shift");
  parts.push(event.key);
  return parts.join("+");
}

/**
 * Check if keyboard event matches keybinding
 */
export function matchesKeybinding(event: KeyboardEvent, binding: string): boolean {
  const parsed = parseKeybinding(binding);
  return (
    event.ctrlKey === parsed.ctrl &&
    event.altKey === parsed.alt &&
    event.shiftKey === parsed.shift &&
    event.key.toLowerCase() === parsed.key.toLowerCase()
  );
}

/**
 * Get keybindings for a profile
 */
export function getKeybindingsForProfile(
  profile: KeybindingProfile
): Map<string, string> {
  const bindings = new Map<string, string>();
  
  // Start with defaults
  for (const action of TERMINAL_KEYBINDING_ACTIONS) {
    bindings.set(action.id, action.defaultBinding);
  }
  
  // Apply profile overrides
  if (profile === "vim") {
    for (const [id, binding] of Object.entries(VIM_KEYBINDING_PROFILE)) {
      bindings.set(id, binding);
    }
  } else if (profile === "emacs") {
    for (const [id, binding] of Object.entries(EMACS_KEYBINDING_PROFILE)) {
      bindings.set(id, binding);
    }
  }
  
  return bindings;
}

/**
 * Keybindings configuration manager
 */
export class KeybindingsManager {
  private bindings: Map<string, string>;
  private profile: KeybindingProfile;
  private customBindings: Map<string, string>;
  
  constructor(profile: KeybindingProfile = "default") {
