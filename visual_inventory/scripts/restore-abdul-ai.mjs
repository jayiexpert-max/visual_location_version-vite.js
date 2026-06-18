import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.join(__dirname, '..', '..', 'abdul_ai', 'index.php');
const targetPath = path.join(__dirname, '..', 'public', 'abdul_ai', 'index.php');

const sourcePhp = fs.readFileSync(sourcePath, 'utf8');
const styleMatch = sourcePhp.match(/<style>([\s\S]*?)<\/style>/);
if (!styleMatch) {
    console.error('No <style> block found in source abdul_ai/index.php');
    process.exit(1);
}

const newHead =
    '    <link rel="icon" type="image/png" href="assets/img/abdul_ai_2.png">\n' +
    '    <link rel="stylesheet" href="../plugins/google-fonts/fonts.css">\n' +
    '    <link rel="stylesheet" href="../plugins/font-awesome/all.css">\n' +
    '<style>' +
    styleMatch[1] +
    '</style>';

let targetPhp = fs.readFileSync(targetPath, 'utf8');
targetPhp = targetPhp.replace(
    /<link rel="icon"[^>]*>[\s\S]*?<\/head>/,
    newHead + '\n</head>'
);

fs.writeFileSync(targetPath, targetPhp);
console.log('Restored abdul_ai/index.php inline styles from original');
