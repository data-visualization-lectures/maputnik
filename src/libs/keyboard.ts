/**
 * Keyboard-shortcut targeting helpers.
 *
 * App letter shortcuts should run from chrome (buttons, the map, layer list)
 * but never steal keystrokes from typing surfaces. Modifier undo/redo follows
 * the same idea, except <select> is not treated as an editor.
 */

export type KeyboardFocusTarget = {
  tagName?: string
  isContentEditable?: boolean
  type?: string
  closest?: (selector: string) => KeyboardFocusTarget | null
};

const CODEMIRROR_SELECTOR = ".cm-editor, .cm-content";
const CONTENTEDITABLE_SELECTOR = "[contenteditable]:not([contenteditable='false'])";

const NON_TEXT_INPUT_TYPES = new Set([
  "button",
  "checkbox",
  "color",
  "file",
  "hidden",
  "image",
  "radio",
  "range",
  "reset",
  "submit",
]);

function asKeyboardFocusTarget(target: EventTarget | KeyboardFocusTarget | null): KeyboardFocusTarget | null {
  if (target == null) {
    return null;
  }
  if (typeof (target as KeyboardFocusTarget).tagName === "string") {
    return target as KeyboardFocusTarget;
  }
  return null;
}

function isInside(el: KeyboardFocusTarget, selector: string): boolean {
  return typeof el.closest === "function" && Boolean(el.closest(selector));
}

export function isTextEditingTarget(target: EventTarget | KeyboardFocusTarget | null): boolean {
  const el = asKeyboardFocusTarget(target);
  if (!el?.tagName) {
    return false;
  }

  if (el.isContentEditable) {
    return true;
  }

  if (isInside(el, CODEMIRROR_SELECTOR) || isInside(el, CONTENTEDITABLE_SELECTOR)) {
    return true;
  }

  const tag = el.tagName.toUpperCase();
  if (tag === "TEXTAREA") {
    return true;
  }

  if (tag === "INPUT") {
    const type = (el.type || "text").toLowerCase();
    return !NON_TEXT_INPUT_TYPES.has(type);
  }

  return false;
}

/** Single-letter shortcuts are ignored in text fields, <select>, contenteditable, and CodeMirror. */
export function isLetterShortcutBlocked(target: EventTarget | KeyboardFocusTarget | null): boolean {
  if (isTextEditingTarget(target)) {
    return true;
  }
  const el = asKeyboardFocusTarget(target);
  return Boolean(el?.tagName && el.tagName.toUpperCase() === "SELECT");
}

/** Cmd/Ctrl undo/redo should not override native editing (select is not an editor). */
export function isModifierUndoBlocked(target: EventTarget | KeyboardFocusTarget | null): boolean {
  return isTextEditingTarget(target);
}
