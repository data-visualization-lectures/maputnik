import { MaputnikDriver } from "./maputnik-driver";

describe("ui usability", () => {
  const { beforeAndAfter, get, when, then } = new MaputnikDriver();
  beforeAndAfter();

  describe("empty layers", () => {
    beforeEach(() => {
      when.setStyle("geojson");
    });

    it("shows an empty state with an add layer action", () => {
      then(get.elementByTestId("layer-list:empty")).shouldBeVisible();
      then(get.elementByTestId("layer-editor:empty")).shouldBeVisible();
      when.click("layer-editor:empty-add-layer");
      then(get.elementByTestId("modal:add-layer")).shouldBeVisible();
    });
  });

  describe("layer list actions", () => {
    let id: string;

    beforeEach(() => {
      when.setStyle("geojson");
      when.modal.open();
      id = when.modal.fillLayers({
        type: "background",
      });
    });

    it("exposes selected layer actions to keyboard and assistive tech", () => {
      const deleteKey = "layer-list-item:" + id + ":delete";
      then(get.elementByTestId(deleteKey)).shouldBeVisible();
      get.elementByTestId(deleteKey).should("have.attr", "aria-label", "Delete layer");
      get.elementByTestId(deleteKey).should("not.have.attr", "aria-hidden");
      get.elementByTestId(deleteKey).focus().should("be.focused");

      get.elementByTestId("layer-list-item:" + id + ":copy")
        .should("have.attr", "aria-label", "Duplicate layer");
      get.elementByTestId("layer-list-item:" + id + ":toggle-visibility")
        .should("have.attr", "aria-label", "Hide layer");
    });
  });

  describe("export toolbar label", () => {
    it("opens the export modal from Export", () => {
      then(get.elementByTestId("nav:export")).shouldHaveText("Export");
      when.click("nav:export");
      then(get.elementByTestId("modal:export")).shouldBeVisible();
    });
  });

  describe("undo and redo toolbar", () => {
    it("enables undo after a change and restores via the toolbar", () => {
      when.setStyle("geojson");
      get.elementByTestId("nav:undo").should("be.disabled");
      get.elementByTestId("nav:redo").should("be.disabled");

      when.modal.open();
      when.modal.fillLayers({
        id: "toolbar-undo",
        type: "background",
      });

      get.elementByTestId("nav:undo").should("not.be.disabled");
      get.elementByTestId("nav:redo").should("be.disabled");

      when.click("nav:undo");
      then(get.styleFromLocalStorage()).shouldDeepNestedInclude({ layers: [] });
      get.elementByTestId("nav:redo").should("not.be.disabled");

      when.click("nav:redo");
      then(get.styleFromLocalStorage()).shouldDeepNestedInclude({
        layers: [
          {
            id: "toolbar-undo",
            type: "background",
          },
        ],
      });
    });

    it("announces undo feedback in a live region", () => {
      when.setStyle("geojson");
      when.modal.open();
      when.modal.fillLayers({
        id: "live-region",
        type: "background",
      });
      when.click("nav:undo");
      get.element(".maputnik-message-panel [aria-live='polite']").should("exist");
    });
  });

  describe("shortcuts documentation", () => {
    it("documents undo, redo, and global state", () => {
      when.setStyle("");
      when.typeKeys("?");
      then(get.elementByTestId("modal:shortcuts")).shouldBeVisible();
      then(get.elementByTestId("modal:shortcuts")).shouldContainText("Undo");
      then(get.elementByTestId("modal:shortcuts")).shouldContainText("Redo");
      then(get.elementByTestId("modal:shortcuts")).shouldContainText("Global State");
      get.elementByTestId("modal:shortcuts.close-modal")
        .should("have.attr", "aria-label", "Close modal");
    });
  });
});
