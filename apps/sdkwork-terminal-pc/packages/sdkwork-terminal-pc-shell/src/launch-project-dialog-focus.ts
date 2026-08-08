import {
  useEffect,
  useRef,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import type { NullableElementRef } from "./ref-types";

const LAUNCH_PROJECT_DIALOG_FOCUSABLE_SELECTOR = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "[tabindex]",
  '[contenteditable="true"]',
].join(", ");

function isLaunchProjectDialogFocusable(element: HTMLElement) {
  if (
    element.hasAttribute("disabled") ||
    element.closest('[aria-hidden="true"], [inert]') !== null ||
    element.tabIndex < 0
  ) {
    return false;
  }

  return !(element instanceof HTMLInputElement && element.type === "hidden");
}

function getLaunchProjectDialogFocusableElements(dialog: HTMLElement) {
  return Array.from(
    dialog.querySelectorAll<HTMLElement>(LAUNCH_PROJECT_DIALOG_FOCUSABLE_SELECTOR),
  ).filter(isLaunchProjectDialogFocusable);
}

export function trapLaunchProjectDialogFocus(
  event: ReactKeyboardEvent<HTMLElement>,
) {
  if (event.key !== "Tab") {
    return false;
  }

  const dialog = event.currentTarget;
  const focusableElements = getLaunchProjectDialogFocusableElements(dialog);
  if (focusableElements.length === 0) {
    event.preventDefault();
    dialog.focus();
    return true;
  }

  const activeElement = document.activeElement;
  const firstFocusableElement = focusableElements[0];
  const lastFocusableElement = focusableElements[focusableElements.length - 1];
  const activeElementIndex = focusableElements.indexOf(activeElement as HTMLElement);

  if (event.shiftKey && activeElementIndex <= 0) {
    event.preventDefault();
    lastFocusableElement.focus();
    return true;
  }

  if (
    !event.shiftKey &&
    (activeElementIndex < 0 || activeElementIndex === focusableElements.length - 1)
  ) {
    event.preventDefault();
    firstFocusableElement.focus();
  }

  return true;
}

interface LaunchProjectDialogFocusOptions {
  dialogRef: NullableElementRef<HTMLElement>;
  initialFocusRef: NullableElementRef<HTMLElement>;
}

export function useLaunchProjectDialogFocus(options: LaunchProjectDialogFocusOptions) {
  const previousFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = options.dialogRef.current;
    if (!dialog || typeof document === "undefined") {
      return;
    }

    previousFocusedElementRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;

    const initialFocusElement = options.initialFocusRef.current;
    if (initialFocusElement && dialog.contains(initialFocusElement)) {
      initialFocusElement.focus();
    } else {
      dialog.focus();
    }

    return () => {
      const previousFocusedElement = previousFocusedElementRef.current;
      previousFocusedElementRef.current = null;
      if (previousFocusedElement?.isConnected) {
        previousFocusedElement.focus();
      }
    };
  }, [options.dialogRef, options.initialFocusRef]);
}
