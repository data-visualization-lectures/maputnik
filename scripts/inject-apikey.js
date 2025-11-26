import fs from 'fs';
import path from 'path';

const files = ['src/config/styles.json', 'src/config/tokens.json'];
const placeholder = 'get_your_own_OpIi9ZULNHzrESv6T2vL';
const apiKey = process.env.MAPTILER_KEY;

console.log('Starting API Key Injection...');

if (!apiKey) {
    console.warn('WARNING: MAPTILER_KEY environment variable is not set. Skipping injection.');
    process.exit(0);
}

files.forEach(file => {
    const filePath = path.resolve(process.cwd(), file);
    if (fs.existsSync(filePath)) {
        try {
            let content = fs.readFileSync(filePath, 'utf8');
            if (content.includes(placeholder)) {
                content = content.replace(new RegExp(placeholder, 'g'), apiKey);
                fs.writeFileSync(filePath, content);
                console.log(`✅ Successfully updated ${file}`);
            } else {
                console.log(`ℹ️  Placeholder not found in ${file} (already updated?)`);
            }
        } catch (error) {
            console.error(`❌ Error processing ${file}:`, error);
            process.exit(1);
        }
    } else {
        console.error(`❌ File not found: ${file}`);
        process.exit(1);
    }
});

console.log('API Key Injection Completed.');
