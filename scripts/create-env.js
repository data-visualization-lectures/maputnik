import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiKey = process.env.MAPTILER_KEY;
const protomapsKey = process.env.PROTOMAPS_KEY;
const envLines = [];

if (!apiKey) {
  console.warn("WARNING: MAPTILER_KEY environment variable is not set. The app will use the placeholder key.");
} else {
  envLines.push(`VITE_MAPTILER_KEY=${apiKey}`);
}

if (protomapsKey) {
  envLines.push(`VITE_PROTOMAPS_KEY=${protomapsKey}`);
}

if (envLines.length > 0) {
  const envPath = path.resolve(__dirname, "../.env");
  fs.writeFileSync(envPath, `${envLines.join("\n")}\n`);
  console.log(`Successfully created .env file (${envLines.map((line) => line.split("=")[0]).join(", ")})`);
}
