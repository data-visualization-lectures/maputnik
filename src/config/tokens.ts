const apiKey = import.meta.env.VITE_MAPTILER_KEY;
const protomapsKey = import.meta.env.VITE_PROTOMAPS_KEY;
console.log("Maputnik Config Debug:", {
    VITE_MAPTILER_KEY: apiKey ? "***" + apiKey.slice(-4) : "undefined",
    VITE_PROTOMAPS_KEY: protomapsKey ? "***" + protomapsKey.slice(-4) : "undefined",
    MODE: import.meta.env.MODE,
});

export const tokens = {
    "openmaptiles": import.meta.env.VITE_MAPTILER_KEY || "get_your_own_OpIi9ZULNHzrESv6T2vL",
    "thunderforest": "b71f7f0ba4064f5eb9e903859a9cf5c6",
    "locationiq": "pk.put_your_api_key_here7bb23dffeb4",
    // Public demo key already shipped in the gallery URL; override via PROTOMAPS_KEY / VITE_PROTOMAPS_KEY.
    "protomaps": protomapsKey || "get_your_own_protomaps_key",
};
