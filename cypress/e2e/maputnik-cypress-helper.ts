/// <reference types="cypress-real-events" />
import { CypressHelper } from "@shellygo/cypress-test-utils";
import "cypress-real-events/support";

export default class MaputnikCypressHelper {
  private helper = new CypressHelper({ defaultDataAttribute: "data-wd-key" });

  public given = {
    ...this.helper.given,
  };

  public get = {
    ...this.helper.get,
  };

  public when = {
    dragAndDropWithWait: (element: string, targetElement: string) => {
      this.helper.get.elementByTestId(element).realMouseDown({ button: "left", position: "center" });
      this.helper.get.elementByTestId(element).realMouseMove(0, 10, { position: "center" });
      this.helper.get.elementByTestId(targetElement).realMouseMove(0, 0, { position: "center" });
      this.helper.when.wait(1);
      this.helper.get.elementByTestId(targetElement).realMouseUp();
    },
    reorderLayerWithKeyboard: (handleTestId: string, arrowPresses: number) => {
      this.helper.get.elementByTestId(handleTestId).focus();
      cy.realPress("Space");
      for (let i = 0; i < arrowPresses; i++) {
        cy.realPress("ArrowDown");
      }
      cy.realPress("Space");
    },
    clickCenter: (element: string) => {
      this.helper.get.elementByTestId(element).realMouseDown({ button: "left", position: "center" });
      this.helper.when.wait(200);
      this.helper.get.elementByTestId(element).realMouseUp();
    },
    openFileByFixture: (fixture: string, buttonTestId: string, inputTestId: string) => {
      cy.window().then((win) => {
        const file = {
          text: cy.stub().resolves(cy.fixture(fixture).then(JSON.stringify)),
        };
        const fileHandle = {
          getFile: cy.stub().resolves(file),
        };
        if (!win.showOpenFilePicker) {
          this.helper.get.elementByTestId(inputTestId).selectFile("cypress/fixtures/" + fixture, { force: true });
        } else {
          cy.stub(win, "showOpenFilePicker").resolves([fileHandle]);
          this.helper.get.elementByTestId(buttonTestId).click();
        }
      });
    },
    ...this.helper.when,
  };

  public beforeAndAfter = this.helper.beforeAndAfter;
}
