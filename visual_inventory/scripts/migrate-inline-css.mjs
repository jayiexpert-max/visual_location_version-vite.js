/**
 * Extract inline <style> blocks from public/*.php into assets/pages/*.css
 * and replace with factory.css + pages-common.css + page CSS links.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(__dirname, '..', 'public');
const PAGES_DIR = path.join(PUBLIC, 'assets', 'pages');
const V = '20260607';

const SKIP = new Set([
  'test_io.php',
  'audio_diagnostic.php',
  'tv_display.php',
  'layout_3d.php',
]);

const EXTRA_FILES = [];

function pageCssName(phpPath) {
  const base = path.basename(phpPath, '.php');
  if (base === 'index' && phpPath.includes('abdul_ai')) return 'abdul-ai';
  return base.replace(/_/g, '-');
}

function buildLinks(cssName, indent = '    ') {
  return [
    `${indent}<link rel="stylesheet" href="assets/factory.css?v=${V}">`,
    `${indent}<link rel="stylesheet" href="assets/pages-common.css?v=${V}">`,
    `${indent}<link rel="stylesheet" href="assets/pages/${cssName}.css?v=${V}">`,
  ].join('\n');
}

function cleanCss(raw) {
  return raw
    .replace(/<\?php\s+require[^?]+\?>\s*/g, '')
    .replace(/:root\s*\{[^}]*\}/gs, (m) => {
      if (m.includes('--primary') && m.includes('#4f46e5')) return '/* :root removed — use pages-common.css aliases */\n';
      if (m.includes('--primary') && m.includes('#6366f1')) return '/* :root removed — use login.css factory tokens */\n';
      return m;
    })
    .trim();
}

function migrateFile(phpPath) {
  const rel = path.relative(PUBLIC, phpPath).replace(/\\/g, '/');
  if (SKIP.has(path.basename(phpPath))) {
    console.log(`SKIP ${rel}`);
    return false;
  }

  let content = fs.readFileSync(phpPath, 'utf8');
  const styleMatch = content.match(/<style>([\s\S]*?)<\/style>/);
  if (!styleMatch) {
    console.log(`NO_STYLE ${rel}`);
    return false;
  }

  const cssName = pageCssName(phpPath);
  const css = cleanCss(styleMatch[1]);
  fs.mkdirSync(PAGES_DIR, { recursive: true });
  fs.writeFileSync(path.join(PAGES_DIR, `${cssName}.css`), css + '\n', 'utf8');

  const links = buildLinks(cssName);

  // Pages using $extra_head_links before head.php
  if (content.includes('$extra_head_links')) {
    content = content.replace(
      /\$extra_head_links\s*=\s*\[[^\]]*\];/,
      `$extra_head_links = [\n    '<link rel="stylesheet" href="assets/factory.css?v=${V}">',\n    '<link rel="stylesheet" href="assets/pages-common.css?v=${V}">',\n    '<link rel="stylesheet" href="assets/pages/${cssName}.css?v=${V}">',\n];`
    );
    content = content.replace(/<style>[\s\S]*?<\/style>\s*/g, '');
  } else {
    // Replace standalone factory.css link + style, or just style
    content = content.replace(
      /<link[^>]*href="assets\/factory\.css[^"]*"[^>]*>\s*\n\s*<style>[\s\S]*?<\/style>/,
      links
    );
    content = content.replace(/<style>[\s\S]*?<\/style>/, links);
    // Normalize old factory.css without style following
    content = content.replace(
      /<link[^>]*href="assets\/factory\.css[^"]*"[^>]*>/g,
      (tag) => {
        if (tag.includes(`v=${V}`)) return tag;
        return `<link rel="stylesheet" href="assets/factory.css?v=${V}">`;
      }
    );
  }

  // Close head if style was before </head>
  if (!content.includes('</head>') && content.includes('require') && content.includes('head.php')) {
    // head.php pages: add </head> after removed style if missing
    const afterHead = content.indexOf("require_once __DIR__ . '/includes/head.php';");
    if (afterHead !== -1 && !content.slice(afterHead).includes('</head>')) {
      content = content.replace(
        /(require_once __DIR__ \. '\/includes\/head\.php';\s*\?>\s*)/,
        `$1</head>\n\n`
      );
    }
  }

  fs.writeFileSync(phpPath, content, 'utf8');
  console.log(`OK ${rel} -> assets/pages/${cssName}.css`);
  return true;
}

const phpFiles = fs.readdirSync(PUBLIC)
  .filter((f) => f.endsWith('.php'))
  .map((f) => path.join(PUBLIC, f));

let count = 0;
for (const f of [...phpFiles, ...EXTRA_FILES]) {
  if (!fs.existsSync(f)) continue;
  if (migrateFile(f)) count++;
}

console.log(`\nMigrated ${count} files.`);
