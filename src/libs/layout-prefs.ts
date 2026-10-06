import {useEffect, useState} from "react";

export const LAYOUT_PANELS_STORAGE_KEY = "maputnik:layout-panels";
export const LAYOUT_OVERLAY_MEDIA = "(max-width: 899px)";

export type LayoutPanelState = {
  listOpen: boolean
  editorOpen: boolean
};

export function clampLayoutPanels(state: LayoutPanelState, overlay: boolean): LayoutPanelState {
  if (overlay && state.listOpen && state.editorOpen) {
    return {listOpen: true, editorOpen: false};
  }
  return state;
}

export function readLayoutPanels(): LayoutPanelState | null {
  try {
    const raw = window.localStorage.getItem(LAYOUT_PANELS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LayoutPanelState>;
    if (typeof parsed.listOpen !== "boolean" || typeof parsed.editorOpen !== "boolean") {
      return null;
    }
    return {listOpen: parsed.listOpen, editorOpen: parsed.editorOpen};
  }
  catch {
    return null;
  }
}

export function writeLayoutPanels(state: LayoutPanelState): void {
  try {
    window.localStorage.setItem(LAYOUT_PANELS_STORAGE_KEY, JSON.stringify(state));
  }
  catch {
    // Ignore quota / private-mode failures.
  }
}

export function defaultLayoutPanels(overlay: boolean): LayoutPanelState {
  return overlay
    ? {listOpen: false, editorOpen: false}
    : {listOpen: true, editorOpen: true};
}

export function initialLayoutPanels(overlay: boolean): LayoutPanelState {
  const stored = readLayoutPanels();
  return clampLayoutPanels(stored ?? defaultLayoutPanels(overlay), overlay);
}

export function useOverlayLayout(): boolean {
  const [overlay, setOverlay] = useState(() => (
    typeof window !== "undefined" && window.matchMedia(LAYOUT_OVERLAY_MEDIA).matches
  ));

  useEffect(() => {
    const media = window.matchMedia(LAYOUT_OVERLAY_MEDIA);
    const onChange = () => setOverlay(media.matches);
    onChange();
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, []);

  return overlay;
}
