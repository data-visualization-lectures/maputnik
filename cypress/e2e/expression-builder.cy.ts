import { MaputnikDriver } from "./maputnik-driver";
import { v1 as uuid } from "uuid";

describe("expression builder", () => {
  const { beforeAndAfter, get, when, then } = new MaputnikDriver();
  beforeAndAfter();
  beforeEach(() => {
    when.setStyle("both");
    when.modal.open();
  });

  function createBackground() {
    const id = uuid();

    when.selectWithin("add-layer.layer-type", "background");
    when.setValue("add-layer.layer-id.input", "background:" + id);
    when.click("add-layer");
    when.click("layer-list-item:background:" + id);
    return "background:" + id;
  }

  function convertBackgroundColorToExpression() {
    when.collapseGroupInLayerEditor();
    get.element("[data-wd-key='spec-field-container:background-color'] [data-wd-key='function-menu']").click();
    then(get.elementByTestId("function-menu:expression")).shouldBeVisible();
    then(get.elementByTestId("function-menu:zoom")).shouldBeVisible();
    when.click("function-menu:expression");
  }

  it("converts a property through the fx menu and edits a get expression in the builder", () => {
    const bgId = createBackground();
    convertBackgroundColorToExpression();

    then(get.elementByTestId("expression-editor-tab:builder")).shouldBeVisible();
    then(get.elementByTestId("expression-builder-literal")).shouldBeVisible();
    then(get.elementByTestId("expression-editor-tab:advanced")).shouldBeVisible();

    when.select("expression-builder-pattern", "get");
    when.setValue("expression-builder-get-property", "class");
    when.click("layer-editor.layer-id");

    then(get.styleFromLocalStorage()).shouldDeepNestedInclude({
      layers: [
        {
          id: bgId,
          type: "background",
          paint: {
            "background-color": ["get", "class"],
          },
        },
      ],
    });
  });

  it("builds interpolate-by-zoom stops and keeps JSON behind the advanced tab", () => {
    const bgId = createBackground();
    convertBackgroundColorToExpression();

    when.select("expression-builder-pattern", "interpolate-zoom");
    when.click("expression-builder-zoom-add");
    when.click("layer-editor.layer-id");

    then(get.styleFromLocalStorage()).shouldDeepNestedInclude({
      layers: [
        {
          id: bgId,
          type: "background",
          paint: {
            "background-color": [
              "interpolate",
              ["linear"],
              ["zoom"],
              6,
              "#000000",
              10,
              "#000000",
              11,
              "#000000",
            ],
          },
        },
      ],
    });

    when.click("expression-editor-tab:advanced");
    then(get.element("[data-wd-key='spec-field-container:background-color'] .cm-line")).shouldBeVisible();
  });
});
