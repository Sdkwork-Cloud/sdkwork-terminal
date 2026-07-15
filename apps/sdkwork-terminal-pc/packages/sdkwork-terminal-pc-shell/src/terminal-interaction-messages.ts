/**
 * Typed, host-injectable copy for the terminal workflows that require
 * localization. The shell only supplies safe, locally-derived counts to
 * formatter functions; clipboard contents and host errors never cross this
 * boundary.
 */
export interface TerminalSearchOverlayMessages {
  inputAriaLabel: string;
  inputPlaceholder: string;
  matchFoundStatus: string;
  noMatchesStatus: string;
  previousMatchAriaLabel: string;
  previousMatchTitle: string;
  previousActionLabel: string;
  nextMatchAriaLabel: string;
  nextMatchTitle: string;
  nextActionLabel: string;
  closeAriaLabel: string;
  closeTitle: string;
}

export interface TerminalPasteConfirmationDescription {
  lineCount?: number;
  controlCharacterCount?: number;
}

export interface TerminalPasteConfirmationMessages {
  title: string;
  description: (args: TerminalPasteConfirmationDescription) => string;
  privacyHint: string;
  cancelActionLabel: string;
  confirmActionLabel: string;
}

export interface TerminalCloseConfirmationDescription {
  runningSessionCount: number;
  otherTabCount: number;
}

export interface TerminalCloseConfirmationMessages {
  title: (runningSessionCount: number) => string;
  description: (args: TerminalCloseConfirmationDescription) => string;
  confirmActionLabel: (tabCount: number) => string;
  cancelActionLabel: string;
}

export interface TerminalTabStripMessages {
  tabListAriaLabel: string;
  scrollTabsLeft: string;
  scrollTabsRight: string;
  closeTabAriaLabel: string;
}

export interface TerminalViewportContextMenuMessages {
  menuAriaLabel: string;
  copyActionLabel: string;
  pasteActionLabel: string;
  selectAllActionLabel: string;
  clearTerminalActionLabel: string;
  findActionLabel: string;
}

export interface TerminalInteractionMessages {
  search: TerminalSearchOverlayMessages;
  pasteConfirmation: TerminalPasteConfirmationMessages;
  closeConfirmation: TerminalCloseConfirmationMessages;
  /**
   * Optional to preserve compatibility for hosts that supply the earlier
   * search, paste, and close workflow catalog only.
   */
  tabStrip?: TerminalTabStripMessages;
  /**
   * Optional to preserve compatibility for hosts that supply the earlier
   * search, paste, and close workflow catalog only.
   */
  viewportContextMenu?: TerminalViewportContextMenuMessages;
}
