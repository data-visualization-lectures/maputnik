import { MaputnikDriver } from "./maputnik-driver";

describe("gallery styles", () => {
  const { beforeAndAfter, when, get, given, then } = new MaputnikDriver();

  beforeEach(() => {
    cy.on("uncaught:exception", (err) => {
      return !/WebGL|webglcontextcreationerror/i.test(err.message);
    });
  });

  beforeAndAfter();

  describe("open", () => {
    beforeEach(() => {
      when.setStyle("");
      when.click("nav:open");
    });

    it("loads the Protomaps Light gallery style from the same origin", () => {
      when.click("modal:open.gallery.protomaps-light");
      when.wait(400);
      then(get.elementByTestId("modal:open")).shouldNotExist();
      get.styleFromLocalStorage().then((style) => {
        expect(style.id).to.eq("protomaps-light");
        expect(style.name).to.eq("Protomaps Light");
        expect(style.sources.protomaps.url).to.eq(
          "pmtiles://https://data.source.coop/protomaps/openstreetmap/v4.pmtiles"
        );
      });
    });

    it("falls back to the bundled Protomaps style when the hosted API URL is blocked", () => {
      given.interceptAndMockResponse({
        method: "GET",
        url: "**/api/protomaps/styles/**",
        response: { statusCode: 403, body: "Invalid origin for API key" },
      });
      when.setValue(
        "modal:open.url.input",
        "https://api.protomaps.com/styles/v4/light/en.json?key=test-key"
      );
      when.click("modal:open.url.button");
      when.wait(400);
      then(get.elementByTestId("modal:open")).shouldNotExist();
      get.styleFromLocalStorage().then((style) => {
        expect(style.id).to.eq("protomaps-light");
        expect(style.sources.protomaps.url).to.include("source.coop");
      });
    });
  });
});
