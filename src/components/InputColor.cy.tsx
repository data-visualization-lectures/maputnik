import {useState} from "react";
import InputColor from "./InputColor";
import {mount} from "cypress/react";
import i18n from "../i18n";

function ControlledColor({initial = "#00ff00"}: {initial?: string}) {
  const [value, setValue] = useState<string | undefined>(initial);
  return (
    <div>
      <button type="button" id="outside">outside</button>
      <InputColor
        aria-label="Fill color"
        value={value}
        onChange={(next) => setValue(next as string | undefined)}
      />
    </div>
  );
}

describe("<InputColor />", () => {
  beforeEach(() => {
    cy.wrap(i18n.changeLanguage("en"));
  });

  it("opens from the swatch button with dialog aria", () => {
    mount(<ControlledColor />);

    cy.get(".maputnik-color-swatch")
      .should("have.attr", "aria-haspopup", "dialog")
      .and("have.attr", "aria-expanded", "false")
      .click();

    cy.get("[role=dialog]")
      .should("be.visible")
      .and("have.attr", "aria-label", "Color picker");
    cy.get(".chrome-picker").should("be.visible");
    cy.get(".maputnik-color-swatch").should("have.attr", "aria-expanded", "true");
  });

  it("closes on Escape and returns focus to the swatch", () => {
    mount(<ControlledColor />);

    cy.get(".maputnik-color-swatch").click();
    cy.get("[role=dialog]").should("be.visible").focus().type("{esc}");
    cy.get("[role=dialog]").should("not.exist");
    cy.get(".maputnik-color-swatch").should("be.focused");
  });

  it("closes on outside click", () => {
    mount(<ControlledColor />);

    cy.get(".maputnik-color-swatch").click();
    cy.get(".chrome-picker").should("be.visible");
    cy.get("#outside").click();
    cy.get(".chrome-picker").should("not.exist");
  });

  it("keeps the last valid swatch and shows inline validation", () => {
    mount(<ControlledColor initial="#00ff00" />);

    cy.get(".maputnik-color-swatch")
      .should("have.css", "background-color", "rgb(0, 255, 0)");

    cy.get(".maputnik-color").clear().type("not-a-color");

    cy.get(".maputnik-color-error")
      .should("be.visible")
      .and("contain", "Invalid color");
    cy.get(".maputnik-color")
      .should("have.attr", "aria-invalid", "true")
      .and("have.value", "not-a-color");
    cy.get(".maputnik-color-swatch")
      .should("have.css", "background-color", "rgb(0, 255, 0)");
  });

  it("clears the validation message when the color becomes valid again", () => {
    mount(<ControlledColor initial="#112233" />);

    cy.get(".maputnik-color").clear().type("nope");
    cy.get(".maputnik-color-error").should("be.visible");
    cy.get(".maputnik-color").clear().type("#ff0000");
    cy.get(".maputnik-color-error").should("not.exist");
    cy.get(".maputnik-color").should("have.attr", "aria-invalid", "false");
    cy.get(".maputnik-color-swatch")
      .should("have.css", "background-color", "rgb(255, 0, 0)");
  });
});
