import React, {useCallback, useEffect, useMemo, useState} from "react";
import classnames from "classnames";
import {useTranslation} from "react-i18next";
import {IconContext} from "react-icons";
import {MdEdit, MdMap, MdViewList} from "react-icons/md";

import ScrollContainer from "./ScrollContainer";
import {
  clampLayoutPanels,
  initialLayoutPanels,
  useOverlayLayout,
  writeLayoutPanels,
  type LayoutPanelState,
} from "../libs/layout-prefs";

const LIST_WIDTH_PX = 200;
const EDITOR_WIDTH_PX = 370;
const RAIL_WIDTH_PX = 40;

type AppLayoutProps = {
  toolbar: React.ReactElement
  layerList: React.ReactElement
  layerEditor?: React.ReactElement
  codeEditor?: React.ReactElement
  map: React.ReactElement
  bottom?: React.ReactElement
  modals?: React.ReactNode
};

export default function AppLayout(props: AppLayoutProps) {
  const {i18n, t} = useTranslation();
  const overlay = useOverlayLayout();
  const [panels, setPanels] = useState<LayoutPanelState>(() => initialLayoutPanels(overlay));

  useEffect(() => {
    document.body.dir = i18n.dir();
  }, [i18n, i18n.language]);

  useEffect(() => {
    setPanels((current) => clampLayoutPanels(current, overlay));
  }, [overlay]);

  const hasCodeEditor = !!props.codeEditor;
  useEffect(() => {
    if (!hasCodeEditor) {
      return;
    }
    setPanels((current) => clampLayoutPanels({
      listOpen: overlay ? false : current.listOpen,
      editorOpen: true,
    }, overlay));
  }, [hasCodeEditor, overlay]);

  useEffect(() => {
    writeLayoutPanels(panels);
  }, [panels]);

  const setPanelState = useCallback((next: LayoutPanelState) => {
    setPanels(clampLayoutPanels(next, overlay));
  }, [overlay]);

  const toggleList = useCallback(() => {
    setPanelState({
      listOpen: !panels.listOpen,
      editorOpen: overlay ? false : panels.editorOpen,
    });
  }, [overlay, panels.editorOpen, panels.listOpen, setPanelState]);

  const toggleEditor = useCallback(() => {
    setPanelState({
      listOpen: overlay ? false : panels.listOpen,
      editorOpen: !panels.editorOpen,
    });
  }, [overlay, panels.editorOpen, panels.listOpen, setPanelState]);

  const showMapOnly = useCallback(() => {
    setPanelState({listOpen: false, editorOpen: false});
  }, [setPanelState]);

  const closeOverlayPanels = useCallback(() => {
    if (overlay) {
      setPanelState({listOpen: false, editorOpen: false});
    }
  }, [overlay, setPanelState]);

  useEffect(() => {
    if (!overlay || (!panels.listOpen && !panels.editorOpen)) {
      return;
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeOverlayPanels();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [closeOverlayPanels, overlay, panels.editorOpen, panels.listOpen]);

  const mapOnly = !panels.listOpen && !panels.editorOpen;
  const editorPane = props.codeEditor ?? props.layerEditor;
  const chromeStart = overlay
    ? RAIL_WIDTH_PX
    : RAIL_WIDTH_PX
      + (panels.listOpen ? LIST_WIDTH_PX : 0)
      + (panels.editorOpen ? EDITOR_WIDTH_PX : 0);

  const layoutStyle = useMemo(() => ({
    "--maputnik-chrome-start": `${chromeStart}px`,
  } as React.CSSProperties), [chromeStart]);

  const listLabel = panels.listOpen ? t("Hide layers list") : t("Show layers list");
  const editorLabel = props.codeEditor
    ? (panels.editorOpen ? t("Hide code editor") : t("Show code editor"))
    : (panels.editorOpen ? t("Hide layer editor") : t("Show layer editor"));

  return <IconContext.Provider value={{size: "14px"}}>
    <div
      className={classnames("maputnik-layout", {
        "maputnik-layout--overlay": overlay,
        "maputnik-layout--list-open": panels.listOpen,
        "maputnik-layout--editor-open": panels.editorOpen,
        "maputnik-layout--map-only": mapOnly,
        "maputnik-layout--code": !!props.codeEditor,
      })}
      style={layoutStyle}
    >
      {props.toolbar}
      <div className="maputnik-layout-main">
        <div
          className="maputnik-layout-controls"
          role="toolbar"
          aria-label={t("Layout")}
          data-wd-key="layout:controls"
        >
          <button
            type="button"
            className="maputnik-layout-controls__button"
            data-wd-key="layout:toggle-list"
            aria-pressed={panels.listOpen}
            aria-label={listLabel}
            title={listLabel}
            onClick={toggleList}
          >
            <MdViewList />
          </button>
          <button
            type="button"
            className="maputnik-layout-controls__button"
            data-wd-key="layout:toggle-editor"
            aria-pressed={panels.editorOpen}
            aria-label={editorLabel}
            title={editorLabel}
            onClick={toggleEditor}
          >
            <MdEdit />
          </button>
          <button
            type="button"
            className="maputnik-layout-controls__button"
            data-wd-key="layout:toggle-map-only"
            aria-pressed={mapOnly}
            aria-label={t("Map only")}
            title={t("Map only")}
            onClick={showMapOnly}
          >
            <MdMap />
          </button>
        </div>

        <div
          className={classnames("maputnik-layout-list", {
            "maputnik-layout-list--open": panels.listOpen,
          })}
          data-wd-key="layout:list"
          data-open={panels.listOpen ? "true" : "false"}
          inert={!panels.listOpen}
          aria-hidden={!panels.listOpen}
        >
          {props.layerList}
        </div>

        <div
          className={classnames("maputnik-layout-drawer", {
            "maputnik-layout-drawer--open": panels.editorOpen,
            "maputnik-layout-drawer--code": !!props.codeEditor,
          })}
          data-wd-key="layout:drawer"
          data-open={panels.editorOpen ? "true" : "false"}
          inert={!panels.editorOpen}
          aria-hidden={!panels.editorOpen}
        >
          <ScrollContainer>
            {editorPane}
          </ScrollContainer>
        </div>

        {overlay && (panels.listOpen || panels.editorOpen) &&
          <button
            type="button"
            className="maputnik-layout-backdrop"
            data-wd-key="layout:backdrop"
            aria-label={t("Close editor panels")}
            onClick={closeOverlayPanels}
          />
        }

        <div className="maputnik-layout-map">
          {props.map}
        </div>
      </div>
      {props.bottom && <div className="maputnik-layout-bottom">
        {props.bottom}
      </div>}
      {props.modals}
    </div>
  </IconContext.Provider>;
}
