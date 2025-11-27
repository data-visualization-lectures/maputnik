const apiKey = import.meta.env.VITE_MAPTILER_KEY;
console.log("Maputnik Config Debug:", {
    VITE_MAPTILER_KEY: apiKey ? "***" + apiKey.slice(-4) : "undefined",
    MODE: import.meta.env.MODE,
    ALL_ENV: import.meta.env
});

export const tokens = {
    "openmaptiles": apiKey || "get_your_own_OpIi9ZULNHzrESv6T2vL",
    "thunderforest": "b71f7f0ba4064f5eb9e903859a9cf5c6",
    "locationiq": "pk.put_your_api_key_here7bb23dffeb4"
};
