import fs from 'fs';
import path from 'path';

const files = ['src/config/styles.json', 'src/config/tokens.json'];
const placeholder = 'get_your_own_OpIi9ZULNHzrESv6T2vL';
const apiKey = process.env.MAPTILER_KEY;

if (!apiKey) {
    console.error('Error: MAPTILER_KEY environment variable is not set.');
    process.exit(1);
}

files.forEach(file => {
    const filePath = path.resolve(process.cwd(), file);
    if (fs.existsSync(filePath)) {
        try {
            let content = fs.readFileSync(filePath, 'utf8');
            if (content.includes(placeholder)) {
                content = content.replace(new RegExp(placeholder, 'g'), apiKey);
                fs.writeFileSync(filePath, content);
            }
        } catch (error) {
            console.error(`Error processing ${file}:`, error);
            process.exit(1);
        }
    }
});
