/**
 * Project health audit — writes NDJSON to debug-aaf99d.log
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const logPath = path.join(root, 'debug-aaf99d.log');
const sessionId = 'aaf99d';

function log(hypothesisId, location, message, data = {}) {
    const entry = {
        sessionId,
        runId: 'audit-initial',
        hypothesisId,
        location,
        message,
        data,
        timestamp: Date.now(),
    };
    fs.appendFileSync(logPath, JSON.stringify(entry) + '\n');
}

function readText(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch {
        return null;
    }
}

function globPhpFiles(dir, results = []) {
    if (!fs.existsSync(dir)) return results;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (entry.name === 'vendor' || entry.name === 'node_modules') continue;
            globPhpFiles(full, results);
        } else if (entry.name.endsWith('.php') || entry.name.endsWith('.html') || entry.name.endsWith('.js') || entry.name.endsWith('.css')) {
            results.push(full);
        }
    }
    return results;
}

// H1: Missing offline font/webfont files
function auditFonts() {
    const css = readText(path.join(publicDir, 'plugins', 'google-fonts', 'fonts.css'));
    const fontRefs = css ? [...css.matchAll(/url\("files\/([^"]+)"\)/g)].map((m) => m[1]) : [];
    const fontDir = path.join(publicDir, 'plugins', 'google-fonts', 'files');
    const missingFonts = [...new Set(fontRefs)].filter((f) => !fs.existsSync(path.join(fontDir, f)));

    const faDir = path.join(publicDir, 'plugins', 'font-awesome', 'webfonts');
    const faNeeded = ['fa-solid-900.woff2', 'fa-brands-400.woff2', 'fa-regular-400.woff2', 'fa-v4compatibility.woff2'];
    const missingFa = faNeeded.filter((f) => !fs.existsSync(path.join(faDir, f)));

    log('H1', 'audit:fonts', 'Font asset check', {
        fontRefs: fontRefs.length,
        missingFonts,
        missingFa,
        ok: missingFonts.length === 0 && missingFa.length === 0,
    });
}

// H2: External CDN/runtime URLs in frontend
function auditExternalUrls() {
    const files = globPhpFiles(publicDir).filter((f) => !f.includes(`${path.sep}vendor${path.sep}`));
    const patterns = [
        /(?:src|href)=["']https?:\/\/(?!127\.0\.0\.1)/gi,
        /@import\s+url\(["']?https?:\/\//gi,
        /url\(["']?https?:\/\/(?!www\.w3\.org)/gi,
    ];
    const hits = [];
    for (const file of files) {
        const text = readText(file);
        if (!text) continue;
        for (const re of patterns) {
            re.lastIndex = 0;
            if (re.test(text)) {
                hits.push(path.relative(root, file));
                break;
            }
        }
    }
    log('H2', 'audit:external', 'External URL references in public (non-vendor)', {
        hitCount: hits.length,
        files: hits.slice(0, 30),
        ok: hits.length === 0,
    });
}

// H3: Missing referenced static assets (favicon, abdul img, plugins)
function auditMissingAssets() {
    const checks = [
        'public/assets/favicon.png',
        'public/abdul_ai/assets/img/abdul_ai_2.png',
        'public/plugins/jquery/jquery.min.js',
        'public/plugins/sweetalert2/sweetalert2.all.min.js',
        'public/plugins/babylonjs/babylon.js',
        'public/assets/factory.css',
        'public/includes/layout_header.php',
        'public/includes/layout_footer.php',
        'config/condb.php',
        '.env',
    ];
    const missing = checks.filter((rel) => !fs.existsSync(path.join(root, rel)));
    log('H3', 'audit:assets', 'Critical static/config files', { missing, ok: missing.length === 0 });
}

// H4: abdul_ai asset paths
function auditAbdulAi() {
    const index = readText(path.join(publicDir, 'abdul_ai', 'index.php'));
    const usesSharedPlugins = index?.includes('../plugins/google-fonts/fonts.css') ?? false;
    const usesOldLocal = index?.includes('assets/plugins/fonts/fonts.css') ?? false;
    const imgRef = index?.includes('assets/img/abdul_ai_2.png') ?? false;
    const imgExists = fs.existsSync(path.join(publicDir, 'abdul_ai', 'assets', 'img', 'abdul_ai_2.png'));
    log('H4', 'audit:abdul_ai', 'Abdul AI asset wiring', {
        usesSharedPlugins,
        usesOldLocal,
        imgRef,
        imgExists,
        ok: usesSharedPlugins && !usesOldLocal,
    });
}

// H5: Page CSS may still override app bar title (bare h1 / gradient)
function auditAppbarCssConflicts() {
    const pagesDir = path.join(publicDir, 'assets', 'pages');
    const conflicts = [];
    if (fs.existsSync(pagesDir)) {
        for (const file of fs.readdirSync(pagesDir)) {
            if (!file.endsWith('.css')) continue;
            const css = readText(path.join(pagesDir, file));
            if (!css) continue;
            const bareH1 = /^\s*h1\s*\{/m.test(css);
            const transparentFill = /-webkit-text-fill-color:\s*transparent/.test(css) && !css.includes('.fx-main');
            if (bareH1 || transparentFill) {
                conflicts.push({ file, bareH1, transparentFill });
            }
        }
    }
    log('H5', 'audit:appbar-css', 'Page CSS that may break app bar title', {
        conflictCount: conflicts.length,
        conflicts,
        ok: conflicts.length === 0,
    });
}

// H6: PHP files referencing plugins that don't exist
function auditPluginRefs() {
    const phpFiles = globPhpFiles(publicDir).filter((f) => f.endsWith('.php') && !f.includes(`${path.sep}vendor${path.sep}`));
    const pluginRefs = new Set();
    const missingRefs = [];
    for (const file of phpFiles) {
        const text = readText(file);
        if (!text) continue;
        for (const m of text.matchAll(/(?:href|src)=["'](plugins\/[^"']+)["']/g)) {
            pluginRefs.add(m[1]);
        }
    }
    for (const ref of pluginRefs) {
        const full = path.join(publicDir, ref.replace(/\//g, path.sep));
        if (!fs.existsSync(full)) missingRefs.push(ref);
    }
    log('H6', 'audit:plugin-refs', 'Broken plugins/ paths in PHP', {
        totalRefs: pluginRefs.size,
        missingRefs,
        ok: missingRefs.length === 0,
    });
}

fs.mkdirSync(root, { recursive: true });
auditFonts();
auditExternalUrls();
auditMissingAssets();
auditAbdulAi();
auditAppbarCssConflicts();
auditPluginRefs();
console.log('Audit complete. Log:', logPath);
