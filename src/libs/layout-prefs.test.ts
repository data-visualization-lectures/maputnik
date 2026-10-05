import {afterEach, beforeEach, describe, expect, it} from "vitest";
import {
  LAYOUT_PANELS_STORAGE_KEY,
  clampLayoutPanels,
  defaultLayoutPanels,
  initialLayoutPanels,
  readLayoutPanels,
  writeLayoutPanels,
} from "./layout-prefs";

const memoryStore = new Map<string, string>();
const localStorageMock = {
  getItem: (key: string) => memoryStore.get(key) ?? null,
  setItem: (key: string, value: string) => {
    memoryStore.set(key, value);
  },
  removeItem: (key: string) => {
    memoryStore.delete(key);
  },
};

if (typeof window === "undefined") {
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {localStorage: localStorageMock},
    writable: true,
  });
}

describe("layout-prefs", () => {
  beforeEach(() => {
    memoryStore.clear();
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      value: localStorageMock,
    });
  });

  afterEach(() => {
    memoryStore.clear();
  });

  it("clamps overlay so only one panel is open", () => {
    expect(clampLayoutPanels({listOpen: true, editorOpen: true}, true)).toEqual({
      listOpen: true,
      editorOpen: false,
    });
    expect(clampLayoutPanels({listOpen: true, editorOpen: true}, false)).toEqual({
      listOpen: true,
      editorOpen: true,
    });
  });

  it("defaults to map-only on overlay and both panels on desktop", () => {
    expect(defaultLayoutPanels(true)).toEqual({listOpen: false, editorOpen: false});
    expect(defaultLayoutPanels(false)).toEqual({listOpen: true, editorOpen: true});
  });

  it("reads and writes panel state", () => {
    expect(readLayoutPanels()).toBeNull();
    writeLayoutPanels({listOpen: false, editorOpen: true});
    expect(readLayoutPanels()).toEqual({listOpen: false, editorOpen: true});
  });

  it("ignores invalid stored JSON", () => {
    window.localStorage.setItem(LAYOUT_PANELS_STORAGE_KEY, "{not-json");
    expect(readLayoutPanels()).toBeNull();
    window.localStorage.setItem(LAYOUT_PANELS_STORAGE_KEY, JSON.stringify({listOpen: "yes"}));
    expect(readLayoutPanels()).toBeNull();
  });

  it("uses stored state when present", () => {
    writeLayoutPanels({listOpen: false, editorOpen: false});
    expect(initialLayoutPanels(false)).toEqual({listOpen: false, editorOpen: false});
  });
});
