import { MaputnikDriver } from "./maputnik-driver";

describe("toolbar", () => {
  const { beforeAndAfter, get, when, then } = new MaputnikDriver();
  beforeAndAfter();

  it("uses overflow-x on the actions strip", () => {
    when.setStyle("layer");
    cy.get(".maputnik-toolbar__actions").should("have.css", "overflow-x", "auto");
  });

  it("keeps labeled actions available at the default viewport", () => {
    when.setStyle("layer");
    then(get.elementByTestId("nav:open")).shouldBeVisible();
    then(get.elementByTestId("nav:export")).shouldBeVisible();
    then(get.elementByTestId("toolbar:link")).shouldBeVisible();
    then(get.elementByTestId("nav:more")).shouldNotExist();
  });

  it("exposes icon-only actions with tooltips when the toolbar is compact", () => {
    when.setStyle("layer");
    cy.get("[data-wd-key='nav:open']").should("have.attr", "title", "Open");
    cy.get("[data-wd-key='nav:open']").should("have.attr", "aria-label", "Open");
  });

  describe("inspect toggle", () => {
    it("turns inspect mode on and off", () => {
      when.setStyle("layer");
      when.click("nav:inspect-toggle");
      then(get.inputValue("maputnik-select")).shouldEqual("inspect");
      cy.get("[data-wd-key='nav:inspect-toggle']").should("have.attr", "aria-pressed", "true");

      when.click("nav:inspect-toggle");
      then(get.inputValue("maputnik-select")).shouldEqual("map");
      cy.get("[data-wd-key='nav:inspect-toggle']").should("have.attr", "aria-pressed", "false");
    });
  });

  describe("More menu", () => {
    beforeEach(() => {
      when.setStyle("layer");
      cy.viewport(420, 800);
      cy.get("[data-wd-key='nav:more']").should("be.visible");
    });

    it("moves overflowing actions into an accessible menu", () => {
      then(get.elementByTestId("nav:open")).shouldBeVisible();
      then(get.elementByTestId("nav:inspect-toggle")).shouldBeVisible();
      then(get.elementByTestId("nav:more")).shouldBeVisible();
      cy.get("[data-wd-key='nav:more']")
        .should("have.attr", "aria-haspopup", "true")
        .and("have.attr", "aria-expanded", "false");

      when.click("nav:more");
      then(get.elementByTestId("nav:more-menu")).shouldBeVisible();
      cy.get("[data-wd-key='nav:more']").should("have.attr", "aria-expanded", "true");
      then(get.elementByTestId("nav:global-state")).shouldBeVisible();
      then(get.elementByTestId("toolbar:link")).shouldBeVisible();
    });

    it("closes on Escape and restores focus to the More button", () => {
      when.click("nav:more");
      then(get.elementByTestId("nav:more-menu")).shouldBeVisible();
      cy.focused().type("{esc}");
      then(get.elementByTestId("nav:more-menu")).shouldNotExist();
      then(get.elementByTestId("nav:more")).shouldBeFocused();
    });

    it("opens from the keyboard with ArrowDown", () => {
      cy.get("[data-wd-key='nav:more']").focus().type("{downarrow}");
      then(get.elementByTestId("nav:more-menu")).shouldBeVisible();
    });
  });
});
