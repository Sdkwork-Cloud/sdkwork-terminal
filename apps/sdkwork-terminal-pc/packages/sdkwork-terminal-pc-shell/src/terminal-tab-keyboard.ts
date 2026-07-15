export type TerminalTabKeyboardNavigationKey =
  | "ArrowLeft"
  | "ArrowRight"
  | "Home"
  | "End";

export function resolveTerminalTabKeyboardNavigation(args: {
  key: string;
  tabIds: readonly string[];
  currentTabId: string;
}) {
  const currentIndex = args.tabIds.indexOf(args.currentTabId);
  if (currentIndex < 0 || args.tabIds.length === 0) {
    return null;
  }

  switch (args.key as TerminalTabKeyboardNavigationKey) {
    case "ArrowLeft":
      return args.tabIds[(currentIndex - 1 + args.tabIds.length) % args.tabIds.length] ?? null;
    case "ArrowRight":
      return args.tabIds[(currentIndex + 1) % args.tabIds.length] ?? null;
    case "Home":
      return args.tabIds[0] ?? null;
    case "End":
      return args.tabIds[args.tabIds.length - 1] ?? null;
    default:
      return null;
  }
}
