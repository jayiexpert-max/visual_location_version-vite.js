import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const logPath = path.join(root, 'debug-aaf99d.log');
const baseUrl = 'http://127.0.0.1/visual_inventory/public';

const pages = [
    'index.php', 'manage_users.php', 'admin.php', 'check_expiration.php',
    'view_inventory_receive.php', 'login.php', 'report_stock.php',
];

function log(entry) {
    fs.appendFileSync(logPath, JSON.stringify({ sessionId: 'aaf99d', timestamp: Date.now(), ...entry }) + '\n');
}

function extractFromPhp(text) {
    const assets = new Set();
    for (const m of text.matchAll(/(?:href|src)=["']([^"']+)["']/g)) assets.add(m[1].split('?')[0]);
    for (const m of text.matchAll(/['"](assets\/pages\/[^'"]+\.css)['"]/g)) assets.add(m[1]);
    return [...assets];
}

async function headStatus(url) {
    try {
        const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
        return res.status;
    } catch {
        return 0;
    }
}

for (const page of pages) {
    const phpPath = path.join(publicDir, page);
    const text = fs.readFileSync(phpPath, 'utf8');
    const assets = extractFromPhp(text);
    const broken = [];
    for (const asset of assets) {
        if (asset.startsWith('http') || asset.startsWith('//')) continue;
        const full = path.join(publicDir, asset.replace(/\//g, path.sep));
        const exists = fs.existsSync(full);
        const httpStatus = exists ? 200 : await headStatus(`${baseUrl}/${asset}`);
        if (!exists && httpStatus !== 200) broken.push({ asset, exists, httpStatus });
    }
    log({
        runId: 'php-source-asset-audit',
        hypothesisId: 'H8',
        location: `php:${page}`,
        message: 'PHP source asset existence check',
        data: {
            page,
            assetCount: assets.length,
            assets,
            broken,
            hasFactoryCss: text.includes('factory.css'),
            hasLayoutHeader: text.includes('layout_header.php'),
            hasLayoutFooter: text.includes('layout_footer.php'),
            ok: broken.length === 0,
        },
    });
}

console.log('PHP source asset audit done');
