import { MaputnikDriver } from "./maputnik-driver";

describe("keyboard", () => {
  const { beforeAndAfter, given, when, get, then } = new MaputnikDriver();
  beforeAndAfter();
  describe("shortcuts", () => {
    beforeEach(() => {
      given.setupMockBackedResponses();
      when.setStyle("");
    });

    it("ESC should unfocus", () => {
      const targetSelector = "maputnik-select";
      when.focus(targetSelector);
      then(get.elementByTestId(targetSelector)).shouldBeFocused();
      when.typeKeys("{esc}");
      then(get.elementByTestId(targetSelector)).shouldNotBeFocused();
    });

    it("'?' should show shortcuts modal", () => {
      when.typeKeys("?");
      then(get.elementByTestId("modal:shortcuts")).shouldBeVisible();
      then(get.element(".maputnik-modal-shortcuts")).shouldContainText("text field, dropdown, or code editor");
    });

    it("'o' should show open modal", () => {
      when.typeKeys("o");
      then(get.elementByTestId("modal:open")).shouldBeVisible();
    });

    it("'e' should show export modal", () => {
      when.typeKeys("e");
      then(get.elementByTestId("modal:export")).shouldBeVisible();
    });

    it("'d' should show sources modal", () => {
      when.typeKeys("d");
      then(get.elementByTestId("modal:sources")).shouldBeVisible();
    });

    it("'s' should show settings modal", () => {
      when.typeKeys("s");
      then(get.elementByTestId("modal:settings")).shouldBeVisible();
    });

    it("'i' should change map to inspect mode", () => {
      when.typeKeys("i");
      then(get.inputValue("maputnik-select")).shouldEqual("inspect");
    });

    it("'m' should focus map", () => {
      when.typeKeys("m");
      then(get.canvas()).shouldBeFocused();
    });

    it("'!' should show debug modal", () => {
      when.typeKeys("!");
      then(get.elementByTestId("modal:debug")).shouldBeVisible();
    });

    it("'g' should show global state modal", () => {
      when.typeKeys("g");
      then(get.elementByTestId("modal:global-state")).shouldBeVisible();
    });

    it("letter shortcuts work when a toolbar button is focused", () => {
      when.focus("nav:export");
      then(get.elementByTestId("nav:export")).shouldBeFocused();
      when.keyupOn("nav:export", "o");
      then(get.elementByTestId("modal:open")).shouldBeVisible();
    });

    it("letter shortcuts are ignored in a text input", () => {
      when.click("nav:open");
      then(get.elementByTestId("modal:open")).shouldBeVisible();
      when.typeKeysOn("modal:open.url.input", "o");
      then(get.elementByTestId("modal:open.url.input")).shouldHaveValue("o");
      then(get.elementByTestId("modal:export")).shouldNotExist();
    });

    it("letter shortcuts are ignored in a select", () => {
      when.focus("maputnik-select");
      then(get.elementByTestId("maputnik-select")).shouldBeFocused();
      when.keyupOn("maputnik-select", "o");
      then(get.elementByTestId("modal:open")).shouldNotExist();
    });

    it("letter shortcuts are ignored in the code editor", () => {
      when.click("nav:code-editor");
      then(get.element(".maputnik-code-editor")).shouldExist();
      when.appendTextInJsonEditor("o");
      then(get.elementByTestId("modal:open")).shouldNotExist();
    });
  });
});
