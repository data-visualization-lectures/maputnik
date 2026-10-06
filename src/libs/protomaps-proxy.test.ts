import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  isProtomapsApiUrl,
  toSameOriginProtomapsUrl,
  protomapsStyleFallbackUrl,
  rewriteProtomapsStyleSources,
  fetchStyleJson,
  PROTOMAPS_GALLERY_STYLE_PATH,
  PROTOMAPS_PMTILES_URL,
  PROTOMAPS_PROXY_PREFIX,
} from "./protomaps-proxy";

const API_STYLE = "https://api.protomaps.com/styles/v4/light/en.json?key=test-key";

describe("protomaps-proxy", () => {
  describe("isProtomapsApiUrl", () => {
    it("detects hosted API and same-origin proxy URLs", () => {
      expect(isProtomapsApiUrl(API_STYLE)).toBe(true);
      expect(isProtomapsApiUrl(`${PROTOMAPS_PROXY_PREFIX}/styles/v4/light/en.json`)).toBe(true);
      expect(isProtomapsApiUrl("https://cdn.jsdelivr.net/style.json")).toBe(false);
      expect(isProtomapsApiUrl(PROTOMAPS_GALLERY_STYLE_PATH)).toBe(false);
    });
  });

  describe("toSameOriginProtomapsUrl", () => {
    it("rewrites api.protomaps.com to the same-origin proxy", () => {
      expect(toSameOriginProtomapsUrl(API_STYLE)).toBe(
        `${PROTOMAPS_PROXY_PREFIX}/styles/v4/light/en.json?key=test-key`
      );
    });

    it("leaves other URLs unchanged", () => {
      expect(toSameOriginProtomapsUrl("https://example.com/style.json")).toBe("https://example.com/style.json");
      expect(toSameOriginProtomapsUrl(PROTOMAPS_GALLERY_STYLE_PATH)).toBe(PROTOMAPS_GALLERY_STYLE_PATH);
    });
  });

  describe("protomapsStyleFallbackUrl", () => {
    it("falls back to the bundled gallery style for hosted light style JSON", () => {
      expect(protomapsStyleFallbackUrl(API_STYLE)).toBe(PROTOMAPS_GALLERY_STYLE_PATH);
      expect(protomapsStyleFallbackUrl("https://api.protomaps.com/styles/v5/light/ja.json")).toBe(PROTOMAPS_GALLERY_STYLE_PATH);
      expect(protomapsStyleFallbackUrl("https://api.protomaps.com/styles/v5/dark/en.json")).toBeNull();
    });

    it("does not fall back for non-style Protomaps URLs", () => {
      expect(protomapsStyleFallbackUrl("https://api.protomaps.com/tiles/v4/0/0/0.mvt")).toBeNull();
      expect(protomapsStyleFallbackUrl("https://example.com/style.json")).toBeNull();
    });
  });

  describe("rewriteProtomapsStyleSources", () => {
    it("replaces CORS-blocked API tiles with the public PMTiles source", () => {
      const rewritten = rewriteProtomapsStyleSources({
        sources: {
          protomaps: {
            type: "vector",
            tiles: ["https://api.protomaps.com/tiles/v4/{z}/{x}/{y}.mvt?key=test-key"],
            maxzoom: 15,
          },
          other: {
            type: "geojson",
            data: { type: "FeatureCollection", features: [] },
          },
        },
      });

      expect(rewritten.sources.protomaps).toEqual({
        type: "vector",
        url: PROTOMAPS_PMTILES_URL,
        maxzoom: 15,
      });
      expect(rewritten.sources.other).toEqual({
        type: "geojson",
        data: { type: "FeatureCollection", features: [] },
      });
    });

    it("returns the same object when no Protomaps API source is present", () => {
      const styleDoc = {
        sources: {
          openmaptiles: { type: "vector", url: "https://example.com/tiles.json" },
        },
      };
      expect(rewriteProtomapsStyleSources(styleDoc)).toBe(styleDoc);
    });
  });

  describe("fetchStyleJson", () => {
    const originalFetch = globalThis.fetch;

    beforeEach(() => {
      globalThis.fetch = vi.fn();
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
      vi.restoreAllMocks();
    });

    it("loads through the same-origin proxy and rewrites tile URLs", async function () {
      vi.mocked(globalThis.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({
          version: 8,
          sources: {
            protomaps: {
              type: "vector",
              tiles: ["https://api.protomaps.com/tiles/v4/{z}/{x}/{y}.mvt?key=test-key"],
            },
          },
          layers: [],
        }),
      } as Response);

      const body = await fetchStyleJson(API_STYLE) as {
        sources: { protomaps: { url?: string, tiles?: string[] } }
      };

      expect(globalThis.fetch).toHaveBeenCalledWith(
        `${PROTOMAPS_PROXY_PREFIX}/styles/v4/light/en.json?key=test-key`,
        { mode: "cors", credentials: "same-origin" }
      );
      expect(body.sources.protomaps.url).toBe(PROTOMAPS_PMTILES_URL);
      expect(body.sources.protomaps.tiles).toBeUndefined();
    });

    it("falls back to the bundled gallery style when the proxy is blocked", async function () {
      vi.mocked(globalThis.fetch)
        .mockResolvedValueOnce({
          ok: false,
          status: 403,
        } as Response)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            version: 8,
            name: "Protomaps Light",
            sources: {},
            layers: [],
          }),
        } as Response);

      const body = await fetchStyleJson(API_STYLE) as { name: string };

      expect(vi.mocked(globalThis.fetch).mock.calls.map((call) => call[0])).toEqual([
        `${PROTOMAPS_PROXY_PREFIX}/styles/v4/light/en.json?key=test-key`,
        PROTOMAPS_GALLERY_STYLE_PATH,
      ]);
      expect(body.name).toBe("Protomaps Light");
    });

    it("throws when every candidate fails", async function () {
      vi.mocked(globalThis.fetch).mockRejectedValue(new TypeError("Failed to fetch"));

      await expect(fetchStyleJson(API_STYLE)).rejects.toThrow("Failed to fetch");
    });
  });
});
