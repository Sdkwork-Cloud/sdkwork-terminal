import type {
  TerminalViewportInput,
} from "@sdkwork/terminal-infrastructure";
import type {
  CompositionEvent as ReactCompositionEvent,
  FormEvent as ReactFormEvent,
  KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { splitTerminalClipboardPaste } from "./terminal-clipboard.ts";
import { resolveTerminalTextareaInputSequence } from "./terminal-stage-shared.ts";

export interface CreateTerminalHiddenInputBridgeArgs {
  onViewportInput: (input: TerminalViewportInput) => void;
}

export function readAndResetTerminalHiddenInputValue(
  target: Pick<HTMLTextAreaElement, "value">,
) {
  const value = target.value;
  target.value = "";
  return value;
}

export function focusTerminalHiddenInput(
  input: Pick<HTMLTextAreaElement, "focus"> | null,
) {
  input?.focus();
}

export function createTerminalHiddenInputBridge(
  args: CreateTerminalHiddenInputBridgeArgs,
) {
  let compositionActive = false;

  function isComposingKeyboardEvent(
    event: Pick<ReactKeyboardEvent<HTMLTextAreaElement>, "nativeEvent">,
  ) {
    const nativeEvent = event.nativeEvent as { isComposing?: boolean } | undefined;
    return nativeEvent?.isComposing === true;
  }

  function forwardInputValue(target: Pick<HTMLTextAreaElement, "value">) {
    const chunks = splitTerminalClipboardPaste(
      readAndResetTerminalHiddenInputValue(target),
    );
    for (const chunk of chunks) {
      args.onViewportInput({ kind: "text", data: chunk });
    }
  }

  function handleHiddenInput(event: ReactFormEvent<HTMLTextAreaElement>) {
    forwardInputValue(event.target as HTMLTextAreaElement);
  }

  function handleCompositionStart() {
    compositionActive = true;
  }

  function handleCompositionEnd(event: ReactCompositionEvent<HTMLTextAreaElement>) {
    compositionActive = false;
    forwardInputValue(event.target as HTMLTextAreaElement);
  }

  function handleHiddenInputKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (compositionActive || isComposingKeyboardEvent(event)) {
      return;
    }

    const inputSequence = resolveTerminalTextareaInputSequence(event);
    if (inputSequence === null) {
      return;
    }

    event.preventDefault();
    args.onViewportInput({ kind: "text", data: inputSequence });
  }

  return {
    handleHiddenInput,
    handleCompositionStart,
    handleCompositionEnd,
    handleHiddenInputKeyDown,
  };
}
