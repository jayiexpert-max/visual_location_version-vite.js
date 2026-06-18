import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, '..', 'public');
const phpPath = path.join(PUBLIC, 'tv_display.php');
const cssPath = path.join(PUBLIC, 'assets', 'pages', 'tv-display.css');

const root = `:root {
            --primary: #4f46e5;
            --primary-dark: #4338ca;
            --secondary: #10b981;
            --bg: #0f172a;
            --surface: #1e293b;
            --surface-light: #334155;
            --text: #f8fafc;
            --text-muted: #94a3b8;
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
            --highlight: #3b82f6;
        }

`;

let css = fs.readFileSync(cssPath, 'utf8');
css = css.replace(/\/\* :root removed[^*]*\*\/\s*/, '').trim();

const styleBlock =
    '    <link href="plugins/google-fonts/fonts.css" rel="stylesheet">\n' +
    '    <link href="plugins/font-awesome/all.css" rel="stylesheet">\n\n' +
    '    <style>\n' +
    root +
    css +
    '\n    </style>';

let php = fs.readFileSync(phpPath, 'utf8');
php = php.replace(
    /<link href="plugins\/font-awesome\/all\.css" rel="stylesheet">[\s\S]*?<\/head>/,
    styleBlock + '\n</head>'
);

fs.writeFileSync(phpPath, php);

// Keep external file in sync for reference
fs.writeFileSync(cssPath, root + css + '\n');

console.log('Restored tv_display.php inline styles');
