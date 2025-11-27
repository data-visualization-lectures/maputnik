import fs from 'fs';
import path from 'path';

const files = ['src/config/styles.json', 'src/config/tokens.json'];
const placeholder = 'get_your_own_OpIi9ZULNHzrESv6T2vL';
const apiKey = process.env.MAPTILER_KEY;

console.log('--- API Key Injection Script Started ---');

if (!apiKey) {
    console.error('❌ ERROR: MAPTILER_KEY environment variable is NOT set.');
    console.error('   Please set MAPTILER_KEY in Netlify Site Settings > Environment variables.');
    process.exit(1); // Fail the build
}

console.log(`ℹ️  MAPTILER_KEY found (length: ${apiKey.length}, starts with: ${apiKey.substring(0, 4)}...)`);

files.forEach(file => {
    const filePath = path.resolve(process.cwd(), file);
    if (fs.existsSync(filePath)) {
        try {
            let content = fs.readFileSync(filePath, 'utf8');
            if (content.includes(placeholder)) {
                content = content.replace(new RegExp(placeholder, 'g'), apiKey);
                fs.writeFileSync(filePath, content);
                console.log(`✅ Replaced placeholder in ${file}`);
            } else {
                console.warn(`⚠️  Placeholder '${placeholder}' NOT found in ${file}.`);
                console.warn(`   Check if the file was already updated or if the placeholder string matches.`);
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

console.log('--- API Key Injection Script Finished ---');
