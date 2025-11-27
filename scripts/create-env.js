import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const apiKey = process.env.MAPTILER_KEY;

if (!apiKey) {
    console.warn('WARNING: MAPTILER_KEY environment variable is not set. The app will use the placeholder key.');
} else {
    const envContent = `VITE_MAPTILER_KEY=${apiKey}\n`;
    const envPath = path.resolve(__dirname, '../.env');

    fs.writeFileSync(envPath, envContent);
    console.log(`Successfully created .env file with VITE_MAPTILER_KEY (length: ${apiKey.length})`);
}
