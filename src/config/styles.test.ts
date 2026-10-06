import { describe, it, expect } from "vitest";
import { styles } from "./styles";
import { PROTOMAPS_GALLERY_STYLE_PATH } from "../libs/protomaps-proxy";

describe("gallery styles", () => {
  it("serves Protomaps Light from a same-origin snapshot instead of api.protomaps.com", () => {
    const protomaps = styles.find((entry) => entry.id === "protomaps-light");
    expect(protomaps).toBeDefined();
    expect(protomaps?.url).toBe(PROTOMAPS_GALLERY_STYLE_PATH);
    expect(protomaps?.url).not.toContain("api.protomaps.com");
  });
});
