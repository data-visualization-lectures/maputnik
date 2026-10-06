import type { StyleSpecification } from "maplibre-gl";

export const PROTOMAPS_API_ORIGIN = "https://api.protomaps.com";
export const PROTOMAPS_PROXY_PREFIX = "/api/protomaps";
export const PROTOMAPS_GALLERY_STYLE_PATH = "/gallery/protomaps-light.json";
export const PROTOMAPS_PMTILES_URL = "pmtiles://https://data.source.coop/protomaps/openstreetmap/v4.pmtiles";

const PROTOMAPS_LIGHT_STYLE_PATH = /\/styles\/v\d+\/light\/[^/]+\.json/;

export function isProtomapsApiUrl(url: string): boolean {
  try {
    const parsed = new URL(url, "https://maputnik.invalid");
    return parsed.origin === PROTOMAPS_API_ORIGIN
      || parsed.pathname.startsWith(`${PROTOMAPS_PROXY_PREFIX}/`);
  } catch {
    return url.startsWith(PROTOMAPS_API_ORIGIN)
      || url.startsWith(`${PROTOMAPS_PROXY_PREFIX}/`);
  }
}

export function toSameOriginProtomapsUrl(url: string): string {
  try {
    const parsed = new URL(url, "https://maputnik.invalid");
    if (parsed.origin === PROTOMAPS_API_ORIGIN) {
      return `${PROTOMAPS_PROXY_PREFIX}${parsed.pathname}${parsed.search}`;
    }
  } catch {
    if (url.startsWith(PROTOMAPS_API_ORIGIN)) {
      return PROTOMAPS_PROXY_PREFIX + url.slice(PROTOMAPS_API_ORIGIN.length);
    }
  }
  return url;
}

export function protomapsStyleFallbackUrl(url: string): string | null {
  const resolved = toSameOriginProtomapsUrl(url);
  if (PROTOMAPS_LIGHT_STYLE_PATH.test(resolved)) {
    return PROTOMAPS_GALLERY_STYLE_PATH;
  }
  return null;
}

function sourceUsesProtomapsApi(source: { tiles?: unknown, url?: unknown }): boolean {
  const tiles = Array.isArray(source.tiles) ? source.tiles : [];
  if (tiles.some((tile) => typeof tile === "string" && tile.includes("api.protomaps.com"))) {
    return true;
  }
  return typeof source.url === "string" && source.url.includes("api.protomaps.com");
}

export function rewriteProtomapsStyleSources<T extends Pick<StyleSpecification, "sources">>(styleDoc: T): T {
  if (!styleDoc.sources) {
    return styleDoc;
  }

  let changed = false;
  const sources = { ...styleDoc.sources };

  for (const [id, source] of Object.entries(sources)) {
    if (!source || typeof source !== "object" || !sourceUsesProtomapsApi(source)) {
      continue;
    }
    changed = true;
    const next = { ...source } as typeof source & { tiles?: unknown };
    delete next.tiles;
    next.url = PROTOMAPS_PMTILES_URL;
    sources[id] = next;
  }

  return changed ? { ...styleDoc, sources } : styleDoc;
}

export async function fetchStyleJson(styleUrl: string): Promise<unknown> {
  const candidates = [toSameOriginProtomapsUrl(styleUrl)];
  const fallback = protomapsStyleFallbackUrl(styleUrl);
  if (fallback && !candidates.includes(fallback)) {
    candidates.push(fallback);
  }

  let lastError: unknown;
  for (const candidate of candidates) {
    try {
      const response = await fetch(candidate, {
        mode: "cors",
        credentials: "same-origin",
      });
      if (!response.ok) {
        lastError = new Error(`HTTP ${response.status} for ${candidate}`);
        continue;
      }
      const body = await response.json();
      return rewriteProtomapsStyleSources(body);
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`Failed to load: '${styleUrl}'`);
}
