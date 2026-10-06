import React from "react";
import classnames from "classnames";
import {detect} from "detect-browser";

import {
  MdOpenInBrowser,
  MdSettings,
  MdLayers,
  MdHelpOutline,
  MdFindInPage,
  MdLanguage,
  MdSave,
  MdPublic,
  MdCode,
  MdMoreHoriz,
  MdUndo,
  MdRedo
} from "react-icons/md";
import pkgJson from "../../package.json";
//@ts-ignore
import maputnikLogo from "maputnik-design/logos/logo-color.svg?inline";
import { withTranslation, type WithTranslation } from "react-i18next";
import { supportedLanguages } from "../i18n";
import type { OnStyleChangedCallback } from "../libs/definitions";
import generateUniqueId from "../libs/document-uid";
import { countVisibleToolbarItems, TOOLBAR_COMPACT_WIDTH } from "../libs/toolbar-overflow";

// This is required because of <https://stackoverflow.com/a/49846426>, there isn't another way to detect support that I'm aware of.
const browser = detect();
const colorAccessibilityFiltersEnabled = ["chrome", "firefox"].indexOf(browser!.name) > -1;

const TOOLBAR_ITEM_IDS = [
  "open",
  "export",
  "undo",
  "redo",
  "inspect",
  "codeEditor",
  "sources",
  "settings",
  "globalState",
  "view",
  "language",
  "help",
] as const;

type ToolbarItemId = typeof TOOLBAR_ITEM_IDS[number];

const FOCUSABLE_SELECTOR = "button:not([disabled]), a[href], select:not([disabled]), [tabindex]:not([tabindex='-1'])";

export type ModalTypes = "settings" | "sources" | "open" | "shortcuts" | "export" | "debug" | "globalState" | "codeEditor";

type IconTextProps = {
  children?: React.ReactNode
};


class IconText extends React.Component<IconTextProps> {
  render() {
    return <span className="maputnik-icon-text">{this.props.children}</span>;
  }
}

type ToolbarLinkProps = {
  className?: string
  children?: React.ReactNode
  href?: string
  title?: string
  ariaLabel?: string
  wdKey?: string
};

class ToolbarLink extends React.Component<ToolbarLinkProps> {
  render() {
    return <a
      className={classnames("maputnik-toolbar-link", this.props.className)}
      href={this.props.href}
      rel="noopener noreferrer"
      target="_blank"
      title={this.props.title}
      aria-label={this.props.ariaLabel}
      data-wd-key={this.props.wdKey}
    >
      {this.props.children}
    </a>;
  }
}

type ToolbarSelectProps = {
  children?: React.ReactNode
  wdKey?: string
  title?: string
};

class ToolbarSelect extends React.Component<ToolbarSelectProps> {
  render() {
    return <div
      className='maputnik-toolbar-select'
      data-wd-key={this.props.wdKey}
      title={this.props.title}
    >
      {this.props.children}
    </div>;
  }
}

type ToolbarActionProps = {
  children?: React.ReactNode
  onClick?(...args: unknown[]): unknown
  wdKey?: string
  title?: string
  ariaLabel?: string
  ariaPressed?: boolean
  disabled?: boolean
  className?: string
};

class ToolbarAction extends React.Component<ToolbarActionProps> {
  render() {
    return <button
      type="button"
      className={classnames("maputnik-toolbar-action", this.props.className)}
      data-wd-key={this.props.wdKey}
      onClick={this.props.onClick}
      title={this.props.title}
      aria-label={this.props.ariaLabel}
      aria-pressed={this.props.ariaPressed}
      disabled={this.props.disabled}
    >
      {this.props.children}
    </button>;
  }
}

export type MapState = "map" | "inspect" | "filter-achromatopsia" | "filter-deuteranopia" | "filter-protanopia" | "filter-tritanopia";

type AppToolbarInternalProps = {
  mapStyle: object
  inspectModeEnabled: boolean
  onStyleChanged: OnStyleChangedCallback
  // A new style has been uploaded
  onStyleOpen: OnStyleChangedCallback
  // A dict of source id's and the available source layers
  sources: object
  children?: React.ReactNode
  onToggleModal(modal: ModalTypes): void
  onSetMapState(mapState: MapState): unknown
  mapState?: MapState
  renderer?: string
  onUndo(): void
  onRedo(): void
  canUndo: boolean
  canRedo: boolean
} & WithTranslation;

type AppToolbarInternalState = {
  visibleCount: number
  compact: boolean
  moreOpen: boolean
  moreInstant: boolean
};

class AppToolbarInternal extends React.Component<AppToolbarInternalProps, AppToolbarInternalState> {
  actionsRef = React.createRef<HTMLDivElement>();
  measureRef = React.createRef<HTMLDivElement>();
  moreButtonRef = React.createRef<HTMLButtonElement>();
  moreMenuRef = React.createRef<HTMLDivElement>();
  resizeObserver?: ResizeObserver;
  overflowRaf = 0;
  menuId = generateUniqueId("toolbar-more-");

  state: AppToolbarInternalState = {
    visibleCount: TOOLBAR_ITEM_IDS.length,
    compact: false,
    moreOpen: false,
    moreInstant: false,
  };

  componentDidMount() {
    this.resizeObserver = new ResizeObserver(() => this.scheduleOverflowUpdate());
    if (this.actionsRef.current) {
      this.resizeObserver.observe(this.actionsRef.current);
    }
    if (this.measureRef.current) {
      this.resizeObserver.observe(this.measureRef.current);
    }
    this.scheduleOverflowUpdate();
  }

  componentDidUpdate(_prevProps: AppToolbarInternalProps, prevState: AppToolbarInternalState) {
    if (this.state.moreOpen && !prevState.moreOpen) {
      document.addEventListener("mousedown", this.onDocumentMouseDown);
      document.addEventListener("keydown", this.onDocumentKeyDown);
      this.focusFirstInMore();
    }
    else if (!this.state.moreOpen && prevState.moreOpen) {
      this.removeMenuListeners();
    }
  }

  componentWillUnmount() {
    this.resizeObserver?.disconnect();
    if (this.overflowRaf) {
      cancelAnimationFrame(this.overflowRaf);
    }
    this.removeMenuListeners();
  }

  removeMenuListeners() {
    document.removeEventListener("mousedown", this.onDocumentMouseDown);
    document.removeEventListener("keydown", this.onDocumentKeyDown);
  }

  scheduleOverflowUpdate = () => {
    if (this.overflowRaf) {
      cancelAnimationFrame(this.overflowRaf);
    }
    this.overflowRaf = requestAnimationFrame(() => this.updateOverflow());
  };

  updateOverflow = () => {
    const actions = this.actionsRef.current;
    const measure = this.measureRef.current;
    if (!actions || !measure) {
      return;
    }

    const compact = actions.clientWidth <= TOOLBAR_COMPACT_WIDTH;
    const children = Array.from(measure.children) as HTMLElement[];
    if (children.length === 0) {
      return;
    }

    const moreEl = children[children.length - 1];
    const itemEls = children.slice(0, -1);
    const moreWidth = moreEl.offsetWidth;
    const widths = itemEls.map((el) => el.offsetWidth);
    const visibleCount = countVisibleToolbarItems(widths, actions.clientWidth, moreWidth);

    this.setState((prev) => {
      if (prev.visibleCount === visibleCount && prev.compact === compact) {
        return null;
      }

      const next: Partial<AppToolbarInternalState> = { visibleCount, compact };
      if (visibleCount >= widths.length && prev.moreOpen) {
        next.moreOpen = false;
      }
      return next as AppToolbarInternalState;
    });
  };

  handleSelection(val: MapState) {
    this.props.onSetMapState(val);
  }

  handleLanguageChange(val: string) {
    this.props.i18n.changeLanguage(val);
  }

  toggleInspect = () => {
    this.props.onSetMapState(this.props.inspectModeEnabled ? "map" : "inspect");
  };

  onSkip = (target: string) => {
    if (target === "map") {
      (document.querySelector(".maplibregl-canvas") as HTMLCanvasElement).focus();
    }
    else {
      const el = document.querySelector("#skip-target-"+target) as HTMLButtonElement;
      el.focus();
    }
  };

  onToggleMore = (event: React.MouseEvent<HTMLButtonElement>) => {
    const instant = event.detail === 0;
    this.setState((prev) => ({
      moreOpen: !prev.moreOpen,
      moreInstant: instant,
    }));
  };

  onMoreKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" && !this.state.moreOpen) {
      event.preventDefault();
      this.setState({ moreOpen: true, moreInstant: true });
    }
  };

  closeMore = (restoreFocus = false) => {
    this.setState({ moreOpen: false }, () => {
      if (restoreFocus) {
        this.moreButtonRef.current?.focus();
      }
    });
  };

  onDocumentMouseDown = (event: MouseEvent) => {
    const target = event.target as Node | null;
    if (!target) {
      return;
    }
    if (this.moreMenuRef.current?.contains(target) || this.moreButtonRef.current?.contains(target)) {
      return;
    }
    this.closeMore();
  };

  onDocumentKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") {
      event.preventDefault();
      this.closeMore(true);
      return;
    }

    if (event.key !== "Tab" || !this.moreMenuRef.current) {
      return;
    }

    const focusable = this.getMoreFocusable();
    if (focusable.length === 0) {
      return;
    }

    const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
    if (event.shiftKey) {
      if (currentIndex <= 0) {
        event.preventDefault();
        focusable[focusable.length - 1].focus();
      }
    }
    else if (currentIndex === focusable.length - 1) {
      event.preventDefault();
      focusable[0].focus();
    }
  };

  getMoreFocusable(): HTMLElement[] {
    if (!this.moreMenuRef.current) {
      return [];
    }
    return Array.from(this.moreMenuRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
  }

  focusFirstInMore = () => {
    requestAnimationFrame(() => {
      const focusable = this.getMoreFocusable();
      focusable[0]?.focus();
    });
  };

  renderViews() {
    const t = this.props.t;
    return [
      {
        id: "map",
        group: "general",
        title: t("Map"),
      },
      {
        id: "inspect",
        group: "general",
        title: t("Inspect"),
        disabled: this.props.renderer === "ol",
      },
      {
        id: "filter-deuteranopia",
        group: "color-accessibility",
        title: t("Deuteranopia filter"),
        disabled: !colorAccessibilityFiltersEnabled,
      },
      {
        id: "filter-protanopia",
        group: "color-accessibility",
        title: t("Protanopia filter"),
        disabled: !colorAccessibilityFiltersEnabled,
      },
      {
        id: "filter-tritanopia",
        group: "color-accessibility",
        title: t("Tritanopia filter"),
        disabled: !colorAccessibilityFiltersEnabled,
      },
      {
        id: "filter-achromatopsia",
        group: "color-accessibility",
        title: t("Achromatopsia filter"),
        disabled: !colorAccessibilityFiltersEnabled,
      },
    ];
  }

  renderItem(id: ToolbarItemId, measure: boolean) {
    const t = this.props.t;
    const wd = (key: string) => measure ? undefined : key;
    const views = this.renderViews();
    const currentView = views.find((view) => {
      return view.id === this.props.mapState;
    });

    switch (id) {
      case "open":
        return <ToolbarAction wdKey={wd("nav:open")} title={t("Open")} ariaLabel={t("Open")} onClick={() => this.props.onToggleModal("open")}>
          <MdOpenInBrowser />
          <IconText>{t("Open")}</IconText>
        </ToolbarAction>;
      case "export":
        return <ToolbarAction wdKey={wd("nav:export")} title={t("Export")} ariaLabel={t("Export")} onClick={() => this.props.onToggleModal("export")}>
          <MdSave />
          <IconText>{t("Export")}</IconText>
        </ToolbarAction>;
      case "undo":
        return <ToolbarAction
          wdKey={wd("nav:undo")}
          title={t("Undo")}
          ariaLabel={t("Undo")}
          disabled={!this.props.canUndo}
          onClick={() => this.props.onUndo()}
        >
          <MdUndo />
          <IconText>{t("Undo")}</IconText>
        </ToolbarAction>;
      case "redo":
        return <ToolbarAction
          wdKey={wd("nav:redo")}
          title={t("Redo")}
          ariaLabel={t("Redo")}
          disabled={!this.props.canRedo}
          onClick={() => this.props.onRedo()}
        >
          <MdRedo />
          <IconText>{t("Redo")}</IconText>
        </ToolbarAction>;
      case "inspect":
        return <ToolbarAction
          wdKey={wd("nav:inspect-toggle")}
          title={t("Inspect")}
          ariaLabel={t("Inspect")}
          ariaPressed={this.props.inspectModeEnabled}
          className={this.props.inspectModeEnabled ? "maputnik-toolbar-action--pressed" : undefined}
          disabled={this.props.renderer === "ol"}
          onClick={this.toggleInspect}
        >
          <MdFindInPage />
          <IconText>{t("Inspect")}</IconText>
        </ToolbarAction>;
      case "codeEditor":
        return <ToolbarAction wdKey={wd("nav:code-editor")} title={t("Code Editor")} ariaLabel={t("Code Editor")} onClick={() => this.props.onToggleModal("codeEditor")}>
          <MdCode />
          <IconText>{t("Code Editor")}</IconText>
        </ToolbarAction>;
      case "sources":
        return <ToolbarAction wdKey={wd("nav:sources")} title={t("Data Sources")} ariaLabel={t("Data Sources")} onClick={() => this.props.onToggleModal("sources")}>
          <MdLayers />
          <IconText>{t("Data Sources")}</IconText>
        </ToolbarAction>;
      case "settings":
        return <ToolbarAction wdKey={wd("nav:settings")} title={t("Style Settings")} ariaLabel={t("Style Settings")} onClick={() => this.props.onToggleModal("settings")}>
          <MdSettings />
          <IconText>{t("Style Settings")}</IconText>
        </ToolbarAction>;
      case "globalState":
        return <ToolbarAction wdKey={wd("nav:global-state")} title={t("Global State")} ariaLabel={t("Global State")} onClick={() => this.props.onToggleModal("globalState")}>
          <MdPublic />
          <IconText>{t("Global State")}</IconText>
        </ToolbarAction>;
      case "view":
        return <ToolbarSelect wdKey={wd("nav:inspect")} title={t("View")}>
          <MdFindInPage />
          <IconText>{t("View")}</IconText>
          <select
            className="maputnik-select"
            data-wd-key={wd("maputnik-select")}
            aria-label={t("View")}
            onChange={(e) => this.handleSelection(e.target.value as MapState)}
            value={currentView?.id}
          >
            {views.filter(v => v.group === "general").map((item) => {
              return (
                <option key={item.id} value={item.id} disabled={item.disabled} data-wd-key={wd(item.id)}>
                  {item.title}
                </option>
              );
            })}
            <optgroup label={t("Color accessibility")}>
              {views.filter(v => v.group === "color-accessibility").map((item) => {
                return (
                  <option key={item.id} value={item.id} disabled={item.disabled}>
                    {item.title}
                  </option>
                );
              })}
            </optgroup>
          </select>
        </ToolbarSelect>;
      case "language":
        return <ToolbarSelect wdKey={wd("nav:language")} title={t("Language")}>
          <MdLanguage />
          <IconText>{t("Language")}</IconText>
          <select
            className="maputnik-select"
            data-wd-key={wd("maputnik-lang-select")}
            aria-label={t("Language")}
            onChange={(e) => this.handleLanguageChange(e.target.value)}
            value={this.props.i18n.language}
          >
            {Object.entries(supportedLanguages).map(([code, name]) => {
              return (
                <option key={code} value={code}>
                  {name}
                </option>
              );
            })}
          </select>
        </ToolbarSelect>;
      case "help":
        return <ToolbarLink href={"https://github.com/maplibre/maputnik/wiki"} wdKey={wd("toolbar:link")} title={t("Help")} ariaLabel={t("Help")}>
          <MdHelpOutline />
          <IconText>{t("Help")}</IconText>
        </ToolbarLink>;
    }
  }

  renderMoreButton(measure: boolean) {
    const t = this.props.t;
    if (measure) {
      return <button type="button" className="maputnik-toolbar-action maputnik-toolbar-overflow__button" tabIndex={-1} aria-hidden="true">
        <MdMoreHoriz />
        <IconText>{t("More")}</IconText>
      </button>;
    }

    return <button
      type="button"
      ref={this.moreButtonRef}
      className="maputnik-toolbar-action maputnik-toolbar-overflow__button"
      data-wd-key="nav:more"
      title={t("More")}
      aria-label={t("More")}
      aria-haspopup="true"
      aria-expanded={this.state.moreOpen}
      aria-controls={this.menuId}
      onClick={this.onToggleMore}
      onKeyDown={this.onMoreKeyDown}
    >
      <MdMoreHoriz />
      <IconText>{t("More")}</IconText>
    </button>;
  }

  render() {
    const t = this.props.t;
    const visibleCount = Math.min(this.state.visibleCount, TOOLBAR_ITEM_IDS.length);
    const overflowIds = TOOLBAR_ITEM_IDS.slice(visibleCount);
    const hasOverflow = overflowIds.length > 0;
    const visibleIds = TOOLBAR_ITEM_IDS.slice(0, visibleCount);

    return <nav className='maputnik-toolbar'>
      <div className="maputnik-toolbar__inner">
        <div
          className="maputnik-toolbar-logo-container"
        >
          {/* Keyboard accessible quick links */}
          <button
            data-wd-key="root:skip:layer-list"
            className="maputnik-toolbar-skip"
            onClick={_e => this.onSkip("layer-list")}
          >
            {t("Layers list")}
          </button>
          <button
            data-wd-key="root:skip:layer-editor"
            className="maputnik-toolbar-skip"
            onClick={_e => this.onSkip("layer-editor")}
          >
            {t("Layer editor")}
          </button>
          <button
            data-wd-key="root:skip:map-view"
            className="maputnik-toolbar-skip"
            onClick={_e => this.onSkip("map")}
          >
            {t("Map view")}
          </button>
          <a
            className="maputnik-toolbar-logo"
            target="blank"
            rel="noreferrer noopener"
            href="https://github.com/maplibre/maputnik"
          >
            <img src={maputnikLogo} alt={t("Maputnik on GitHub")} />
            <h1>
              <span className="maputnik-toolbar-name">{pkgJson.name}</span>
              <span className="maputnik-toolbar-version">v{pkgJson.version}</span>
            </h1>
          </a>
        </div>
        <div
          ref={this.actionsRef}
          className={classnames("maputnik-toolbar__actions", {
            "maputnik-toolbar__actions--compact": this.state.compact,
            "maputnik-toolbar__actions--has-overflow": hasOverflow,
          })}
          role="navigation"
          aria-label={t("Toolbar")}
        >
          <div ref={this.measureRef} className="maputnik-toolbar__measure" aria-hidden="true">
            {TOOLBAR_ITEM_IDS.map((id) => (
              <React.Fragment key={id}>{this.renderItem(id, true)}</React.Fragment>
            ))}
            {this.renderMoreButton(true)}
          </div>
          <div className="maputnik-toolbar__visible">
            {visibleIds.map((id) => (
              <React.Fragment key={id}>{this.renderItem(id, false)}</React.Fragment>
            ))}
            {hasOverflow && <div className="maputnik-toolbar-overflow">
              {this.renderMoreButton(false)}
              {this.state.moreOpen && <div
                ref={this.moreMenuRef}
                id={this.menuId}
                className={classnames("maputnik-toolbar-overflow__menu", {
                  "maputnik-toolbar-overflow__menu--instant": this.state.moreInstant,
                })}
                role="group"
                aria-label={t("More")}
                data-wd-key="nav:more-menu"
              >
                {overflowIds.map((id) => (
                  <React.Fragment key={id}>{this.renderItem(id, false)}</React.Fragment>
                ))}
              </div>}
            </div>}
          </div>
        </div>
      </div>
    </nav>;
  }
}

const AppToolbar = withTranslation()(AppToolbarInternal);
export default AppToolbar;
