import { MaputnikDriver } from "./maputnik-driver";

describe("layout", () => {
  const { beforeAndAfter, when, get, then } = new MaputnikDriver();
  beforeAndAfter();

  it("shows the layer list and editor beside the map on wide screens", () => {
    get.elementByTestId("layout:list").should("have.attr", "data-open", "true");
    get.elementByTestId("layout:drawer").should("have.attr", "data-open", "true");
    then(get.elementByTestId("layer-list")).shouldBeVisible();
    then(get.elementByTestId("layer-editor")).shouldBeVisible();
    then(get.elementByTestId("maplibre:container")).shouldBeVisible();
  });

  it("collapses the layers list", () => {
    when.click("layout:toggle-list");
    get.elementByTestId("layout:list").should("have.attr", "data-open", "false");
    get.elementByTestId("layout:drawer").should("have.attr", "data-open", "true");
    then(get.elementByTestId("layer-editor")).shouldBeVisible();
  });

  it("collapses the layer editor", () => {
    when.click("layout:toggle-editor");
    get.elementByTestId("layout:drawer").should("have.attr", "data-open", "false");
    get.elementByTestId("layout:list").should("have.attr", "data-open", "true");
    then(get.elementByTestId("layer-list")).shouldBeVisible();
  });

  it("enters and leaves map-only mode", () => {
    when.click("layout:toggle-map-only");
    get.elementByTestId("layout:list").should("have.attr", "data-open", "false");
    get.elementByTestId("layout:drawer").should("have.attr", "data-open", "false");
    then(get.elementByTestId("maplibre:container")).shouldBeVisible();

    when.click("layout:toggle-list");
    get.elementByTestId("layout:list").should("have.attr", "data-open", "true");
    then(get.elementByTestId("layer-list")).shouldBeVisible();
  });

  it("persists collapsed panels after reload", () => {
    when.click("layout:toggle-map-only");
    when.setStyle("both");
    get.elementByTestId("layout:list").should("have.attr", "data-open", "false");
    get.elementByTestId("layout:drawer").should("have.attr", "data-open", "false");
  });

  it("keeps the layer list visible when the code editor opens", () => {
    when.click("nav:code-editor");
    then(get.element(".maputnik-code-editor")).shouldExist();
    get.elementByTestId("layout:list").should("have.attr", "data-open", "true");
    then(get.elementByTestId("layer-list")).shouldBeVisible();
    then(get.elementByTestId("layer-editor")).shouldNotExist();
    then(get.elementByTestId("code-editor:close")).shouldBeVisible();
  });

  it("closes the code editor from the compact header", () => {
    when.click("nav:code-editor");
    then(get.element(".maputnik-code-editor")).shouldExist();
    when.click("code-editor:close");
    then(get.element(".maputnik-code-editor")).shouldNotExist();
    then(get.elementByTestId("layer-editor")).shouldBeVisible();
  });

  describe("narrow overlay", () => {
    beforeEach(() => {
      cy.viewport(390, 844);
      cy.window().then((win) => {
        win.localStorage.removeItem("maputnik:layout-panels");
      });
      when.setStyle("both");
    });

    it("starts in map-only mode so the map stays usable", () => {
      get.elementByTestId("layout:list").should("have.attr", "data-open", "false");
      get.elementByTestId("layout:drawer").should("have.attr", "data-open", "false");
      then(get.elementByTestId("maplibre:container")).shouldBeVisible();
    });

    it("opens the layers list as an overlay drawer", () => {
      when.click("layout:toggle-list");
      get.elementByTestId("layout:list").should("have.attr", "data-open", "true");
      then(get.elementByTestId("layer-list")).shouldBeVisible();
      then(get.elementByTestId("layout:backdrop")).shouldBeVisible();
      get.elementByTestId("layout:drawer").should("have.attr", "data-open", "false");
    });

    it("closes the overlay drawer from the backdrop", () => {
      when.click("layout:toggle-list");
      then(get.elementByTestId("layout:backdrop")).shouldBeVisible();
      when.click("layout:backdrop");
      get.elementByTestId("layout:list").should("have.attr", "data-open", "false");
      then(get.elementByTestId("layout:backdrop")).shouldNotExist();
    });
  });
});
