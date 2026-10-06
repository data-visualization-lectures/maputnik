import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { validate, ErrorType, loadStyleUrl } from "./urlopen";
import { PROTOMAPS_GALLERY_STYLE_PATH, PROTOMAPS_PMTILES_URL } from "./protomaps-proxy";

// Mock window.location if not in browser environment
const mockLocation = {
  protocol: "http:",
  hostname: "localhost",
};

Object.defineProperty(global, "window", {
  value: {
    location: mockLocation,
  },
  writable: true,
});

describe("validate", () => {
  let originalProtocol: string;

  beforeEach(() => {
    // Save original protocol
    originalProtocol = window.location.protocol;
  });

  afterEach(() => {
    // Restore original protocol
    Object.defineProperty(window.location, "protocol", {
      writable: true,
      value: originalProtocol,
    });
  });

  describe("when URL is empty", () => {
    it("should return ErrorType.None", () => {
      expect(validate("")).toBe(ErrorType.None);
    });
  });

  describe("when window.location.protocol is https:", () => {
    beforeEach(() => {
      Object.defineProperty(window.location, "protocol", {
        writable: true,
        value: "https:",
      });
    });

    it("should return EmptyHttpsProtocol when URL has no protocol", () => {
      expect(validate("example.com")).toBe(ErrorType.EmptyHttpsProtocol);
      expect(validate("www.example.com/path")).toBe(ErrorType.EmptyHttpsProtocol);
    });

    it("should return None for valid https URLs", () => {
      expect(validate("https://example.com")).toBe(ErrorType.None);
      expect(validate("https://www.example.com/path")).toBe(ErrorType.None);
    });

    it("should return CorsError for http URLs pointing to non-local hosts", () => {
      expect(validate("http://example.com")).toBe(ErrorType.CorsError);
      expect(validate("http://api.example.com/endpoint")).toBe(ErrorType.CorsError);
    });

    it("should return None for http URLs pointing to localhost", () => {
      expect(validate("http://localhost")).toBe(ErrorType.None);
      expect(validate("http://localhost:3000")).toBe(ErrorType.None);
      expect(validate("http://127.0.0.1")).toBe(ErrorType.None);
      expect(validate("http://127.0.0.1:8080")).toBe(ErrorType.None);
      expect(validate("http://127.255.255.255")).toBe(ErrorType.None);
    });

    it("should return None for http URLs pointing to IPv6 localhost", () => {
      expect(validate("http://[::1]")).toBe(ErrorType.None);
      expect(validate("http://[::1]:3000")).toBe(ErrorType.None);
    });

    it("should return None for other protocols", () => {
      expect(validate("ftp://example.com")).toBe(ErrorType.None);
      expect(validate("ws://example.com")).toBe(ErrorType.None);
      expect(validate("wss://example.com")).toBe(ErrorType.None);
    });
  });

  describe("when window.location.protocol is http:", () => {
    beforeEach(() => {
      Object.defineProperty(window.location, "protocol", {
        writable: true,
        value: "http:",
      });
    });

    it("should return EmptyHttpOrHttpsProtocol when URL has no protocol", () => {
      expect(validate("example.com")).toBe(ErrorType.EmptyHttpOrHttpsProtocol);
      expect(validate("www.example.com/path")).toBe(ErrorType.EmptyHttpOrHttpsProtocol);
    });

    it("should return None for valid http URLs", () => {
      expect(validate("http://example.com")).toBe(ErrorType.None);
      expect(validate("http://www.example.com/path")).toBe(ErrorType.None);
    });

    it("should return None for valid https URLs", () => {
      expect(validate("https://example.com")).toBe(ErrorType.None);
      expect(validate("https://www.example.com/path")).toBe(ErrorType.None);
    });

    it("should return None for localhost URLs", () => {
      expect(validate("http://localhost")).toBe(ErrorType.None);
      expect(validate("http://127.0.0.1")).toBe(ErrorType.None);
    });
  });

  describe("edge cases", () => {
    it("should handle URLs with ports", () => {
      Object.defineProperty(window.location, "protocol", {
        writable: true,
        value: "https:",
      });

      expect(validate("https://example.com:8443")).toBe(ErrorType.None);
      expect(validate("http://example.com:8080")).toBe(ErrorType.CorsError);
      expect(validate("http://localhost:3000")).toBe(ErrorType.None);
    });

    it("should handle URLs with paths and query strings", () => {
      Object.defineProperty(window.location, "protocol", {
        writable: true,
        value: "https:",
      });

      expect(validate("https://example.com/path?query=value")).toBe(ErrorType.None);
      expect(validate("http://example.com/path?query=value")).toBe(ErrorType.CorsError);
    });

    it("should handle malformed URLs that cannot be parsed", () => {
      Object.defineProperty(window.location, "protocol", {
        writable: true,
        value: "https:",
      });

      expect(validate("not a url at all")).toBe(ErrorType.EmptyHttpsProtocol);
      expect(validate("://")).toBe(ErrorType.EmptyHttpsProtocol);
    });

    it("should handle localhost variations case-insensitively", () => {
      Object.defineProperty(window.location, "protocol", {
        writable: true,
        value: "https:",
      });

      expect(validate("http://LOCALHOST")).toBe(ErrorType.None);
      expect(validate("http://LocalHost:3000")).toBe(ErrorType.None);
    });
  });
});

describe("loadStyleUrl", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    globalThis.fetch = vi.fn();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("rewrites a Protomaps API style onto the same-origin gallery fallback", async () => {
    vi.mocked(globalThis.fetch)
      .mockResolvedValueOnce({ ok: false, status: 403 } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          version: 8,
          name: "Protomaps Light",
          sources: {
            protomaps: {
              type: "vector",
              tiles: ["https://api.protomaps.com/tiles/v4/{z}/{x}/{y}.mvt?key=test-key"],
            },
          },
          layers: [],
        }),
      } as Response);

    const mapStyle = await loadStyleUrl("https://api.protomaps.com/styles/v4/light/en.json?key=test-key");

    expect(vi.mocked(globalThis.fetch).mock.calls[1][0]).toBe(PROTOMAPS_GALLERY_STYLE_PATH);
    expect(mapStyle.sources.protomaps).toMatchObject({ url: PROTOMAPS_PMTILES_URL });
    expect(mapStyle.id).toBeTruthy();
  });

  it("returns the empty style when every fetch candidate fails", async () => {
    vi.mocked(globalThis.fetch).mockRejectedValue(new TypeError("Failed to fetch"));

    const mapStyle = await loadStyleUrl("https://example.com/missing.json");
    expect(mapStyle.layers).toEqual([]);
    expect(mapStyle.sources).toEqual({});
  });
});
