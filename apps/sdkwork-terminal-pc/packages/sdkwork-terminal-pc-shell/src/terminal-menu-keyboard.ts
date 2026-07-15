export type TerminalMenuKeyboardAction =
  | "first"
  | "last"
  | "previous"
  | "next"
  | "close";

export function resolveTerminalMenuKeyboardAction(key: string) {
  switch (key) {
    case "ArrowUp":
      return "previous" as const;
    case "ArrowDown":
      return "next" as const;
    case "Home":
      return "first" as const;
    case "End":
      return "last" as const;
    case "Escape":
      return "close" as const;
    default:
      return null;
  }
}

export function resolveTerminalMenuFocusIndex(args: {
  action: Exclude<TerminalMenuKeyboardAction, "close">;
  currentIndex: number;
  itemCount: number;
}) {
  if (args.itemCount <= 0) {
    return null;
  }

  if (args.action === "first") {
    return 0;
  }

  if (args.action === "last") {
    return args.itemCount - 1;
  }

  if (args.currentIndex < 0) {
    return args.action === "next" ? 0 : args.itemCount - 1;
  }

  return args.action === "next"
    ? (args.currentIndex + 1) % args.itemCount
    : (args.currentIndex - 1 + args.itemCount) % args.itemCount;
}

function getTerminalMenuItems(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll<HTMLButtonElement>(
      'button[role="menuitem"]:not(:disabled)',
    ),
  );
}

export function focusFirstTerminalMenuItem(container: HTMLElement | null) {
  if (!container) {
    return;
  }

  getTerminalMenuItems(container)[0]?.focus();
}

export function moveTerminalMenuFocus(args: {
  container: HTMLElement;
  action: Exclude<TerminalMenuKeyboardAction, "close">;
}) {
  const items = getTerminalMenuItems(args.container);
  const currentIndex = items.indexOf(
    args.container.ownerDocument.activeElement as HTMLButtonElement,
  );
  const nextIndex = resolveTerminalMenuFocusIndex({
    action: args.action,
    currentIndex,
    itemCount: items.length,
  });
  if (nextIndex === null) {
    return;
  }

  items[nextIndex]?.focus();
}
