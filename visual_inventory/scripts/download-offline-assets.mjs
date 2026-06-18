/**
 * Download frontend assets for offline / air-gapped deployment.
 * Run once on a machine with internet: node scripts/download-offline-assets.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');

const FONT_OUTFIT_WEIGHTS = [300, 400, 500, 600, 700, 800];
const FONT_SARABUN_WEIGHTS = [300, 400, 500, 600, 700];
const FONT_SUBSETS = {
    outfit: ['latin', 'latin-ext'],
    sarabun: ['thai', 'latin', 'latin-ext'],
};

const FA_WEBFONTS = [
    'fa-solid-900.woff2',
    'fa-solid-900.ttf',
    'fa-brands-400.woff2',
    'fa-brands-400.ttf',
    'fa-regular-400.woff2',
    'fa-regular-400.ttf',
    'fa-v4compatibility.woff2',
    'fa-v4compatibility.ttf',
];

async function download(url, dest) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
        console.log(`  skip (exists): ${path.relative(root, dest)}`);
        return;
    }
    const res = await fetch(url);
    if (!res.ok) {
        throw new Error(`HTTP ${res.status} for ${url}`);
    }
    const buf = Buffer.from(await res.arrayBuffer());
    fs.writeFileSync(dest, buf);
    console.log(`  ok: ${path.relative(root, dest)} (${buf.length} bytes)`);
}

async function downloadFontsource() {
    const outDir = path.join(publicDir, 'plugins', 'google-fonts', 'files');
    console.log('\n[1/2] Google fonts (Outfit + Sarabun via @fontsource)');

    for (const weight of FONT_OUTFIT_WEIGHTS) {
        for (const subset of FONT_SUBSETS.outfit) {
            const name = `outfit-${subset}-${weight}-normal.woff2`;
            const url = `https://cdn.jsdelivr.net/npm/@fontsource/outfit@5.0.8/files/${name}`;
            await download(url, path.join(outDir, name));
        }
    }

    for (const weight of FONT_SARABUN_WEIGHTS) {
        for (const subset of FONT_SUBSETS.sarabun) {
            const name = `sarabun-${subset}-${weight}-normal.woff2`;
            const url = `https://cdn.jsdelivr.net/npm/@fontsource/sarabun@5.0.18/files/${name}`;
            await download(url, path.join(outDir, name));
        }
    }
}

async function downloadFontAwesome() {
    const outDir = path.join(publicDir, 'plugins', 'font-awesome', 'webfonts');
    console.log('\n[2/2] Font Awesome 6.0.0 webfonts');
    const base = 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts';
    for (const file of FA_WEBFONTS) {
        await download(`${base}/${file}`, path.join(outDir, file));
    }
}

function verifyFontsCss() {
    const cssPath = path.join(publicDir, 'plugins', 'google-fonts', 'fonts.css');
    const css = fs.readFileSync(cssPath, 'utf8');
    const refs = [...css.matchAll(/url\("files\/([^"]+)"\)/g)].map((m) => m[1]);
    const unique = [...new Set(refs)];
    const filesDir = path.join(publicDir, 'plugins', 'google-fonts', 'files');
    const missing = unique.filter((f) => !fs.existsSync(path.join(filesDir, f)));
    if (missing.length) {
        console.warn('\nWarning: still missing font files:', missing.join(', '));
        return false;
    }
    console.log(`\nVerified ${unique.length} font files referenced in fonts.css`);
    return true;
}

async function main() {
    console.log('Downloading offline frontend assets...');
    await downloadFontsource();
    await downloadFontAwesome();
    const ok = verifyFontsCss();
    console.log(ok ? '\nDone. Project is ready for offline UI assets.' : '\nDone with warnings.');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
