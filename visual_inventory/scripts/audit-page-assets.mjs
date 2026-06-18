/**
 * HTTP asset audit for factory pages — writes debug-aaf99d.log
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');
const logPath = path.join(root, 'debug-aaf99d.log');
const baseUrl = 'http://127.0.0.1/visual_inventory/public';

const pages = [
    'index.php',
    'manage_users.php',
    'admin.php',
    'check_expiration.php',
    'view_inventory_receive.php',
    'login.php',
];

function log(entry) {
    fs.appendFileSync(logPath, JSON.stringify({ sessionId: 'aaf99d', timestamp: Date.now(), ...entry }) + '\n');
}

function extractAssets(html) {
    const assets = new Set();
    for (const m of html.matchAll(/(?:href|src)=["']([^"']+)["']/g)) {
        const u = m[1];
        if (u.startsWith('http') || u.startsWith('//') || u.startsWith('data:') || u.startsWith('#')) continue;
        assets.add(u.split('?')[0]);
    }
    return [...assets];
}

async function headStatus(url) {
    try {
        const res = await fetch(url, { method: 'HEAD', redirect: 'follow' });
        return res.status;
    } catch (e) {
        return 0;
    }
}

async function main() {
    log({ runId: 'server-asset-audit', hypothesisId: 'H7', location: 'audit-page-assets.mjs', message: 'start', data: {} });

    for (const page of pages) {
        const pageUrl = `${baseUrl}/${page}`;
        const res = await fetch(pageUrl, { redirect: 'follow' });
        const html = await res.text();
        const assets = extractAssets(html);
        const broken = [];

        for (const asset of assets) {
            const assetUrl = asset.startsWith('/') ? `http://127.0.0.1${asset}` : `${baseUrl}/${asset}`;
            const status = await headStatus(assetUrl);
            if (status !== 200) broken.push({ asset, status });
        }

        const hasAppbarShield = html.includes('factory.css');
        const hasLayoutFooter = html.includes('layout_footer') || html.includes('fx-footer');

        log({
            runId: 'server-asset-audit',
            hypothesisId: 'H7',
            location: `page:${page}`,
            message: 'Page asset HTTP audit',
            data: {
                page,
                httpStatus: res.status,
                finalUrl: res.url,
                assetCount: assets.length,
                broken,
                hasAppbarShield,
                hasLayoutFooter,
                ok: broken.length === 0,
            },
        });
    }
}

main().catch((err) => {
    log({ runId: 'server-asset-audit', hypothesisId: 'H7', location: 'audit-page-assets.mjs', message: 'error', data: { error: String(err) } });
    process.exit(1);
});
