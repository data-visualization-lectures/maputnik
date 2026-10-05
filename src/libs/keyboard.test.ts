import { describe, it, expect } from "vitest";
import {
  isLetterShortcutBlocked,
  isModifierUndoBlocked,
  isTextEditingTarget,
  type KeyboardFocusTarget,
} from "./keyboard";

function stub(partial: Partial<KeyboardFocusTarget> & { tagName: string }): KeyboardFocusTarget {
  return {
    isContentEditable: false,
    closest: () => null,
    ...partial,
  };
}

describe("keyboard shortcut targeting", () => {
  it("allows shortcuts on body, buttons, and checkbox inputs", () => {
    expect(isLetterShortcutBlocked(null)).toBe(false);
    expect(isLetterShortcutBlocked(stub({ tagName: "BODY" }))).toBe(false);
    expect(isLetterShortcutBlocked(stub({ tagName: "BUTTON" }))).toBe(false);
    expect(isLetterShortcutBlocked(stub({ tagName: "A" }))).toBe(false);
    expect(isLetterShortcutBlocked(stub({ tagName: "INPUT", type: "checkbox" }))).toBe(false);
    expect(isLetterShortcutBlocked(stub({ tagName: "INPUT", type: "button" }))).toBe(false);
  });

  it("blocks letter shortcuts in text-like inputs, textarea, and select", () => {
    expect(isLetterShortcutBlocked(stub({ tagName: "INPUT" }))).toBe(true);
    expect(isLetterShortcutBlocked(stub({ tagName: "INPUT", type: "text" }))).toBe(true);
    expect(isLetterShortcutBlocked(stub({ tagName: "INPUT", type: "number" }))).toBe(true);
    expect(isLetterShortcutBlocked(stub({ tagName: "INPUT", type: "search" }))).toBe(true);
    expect(isLetterShortcutBlocked(stub({ tagName: "TEXTAREA" }))).toBe(true);
    expect(isLetterShortcutBlocked(stub({ tagName: "SELECT" }))).toBe(true);
  });

  it("blocks letter shortcuts in contenteditable and CodeMirror", () => {
    expect(isLetterShortcutBlocked(stub({ tagName: "DIV", isContentEditable: true }))).toBe(true);

    const editor = stub({ tagName: "DIV" });
    const content = stub({
      tagName: "DIV",
      closest: (selector: string) => selector.includes(".cm-editor") ? editor : null,
    });
    expect(isLetterShortcutBlocked(content)).toBe(true);
  });

  it("treats select as not an undo editor, but inputs as one", () => {
    expect(isTextEditingTarget(stub({ tagName: "SELECT" }))).toBe(false);
    expect(isModifierUndoBlocked(stub({ tagName: "SELECT" }))).toBe(false);
    expect(isModifierUndoBlocked(stub({ tagName: "BUTTON" }))).toBe(false);
    expect(isModifierUndoBlocked(stub({ tagName: "INPUT", type: "text" }))).toBe(true);
    expect(isModifierUndoBlocked(stub({ tagName: "TEXTAREA" }))).toBe(true);
    expect(isModifierUndoBlocked(stub({ tagName: "DIV", isContentEditable: true }))).toBe(true);
  });
});
