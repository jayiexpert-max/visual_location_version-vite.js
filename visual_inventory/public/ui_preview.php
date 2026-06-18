<?php
require_once __DIR__ . '/../config/session_check.php';

if (($_SESSION['role'] ?? '') !== 'admin' && !is_development()) {
    require_once __DIR__ . '/../config/dev_guard.php';
    dev_guard_or_exit();
}

require_once __DIR__ . '/../config/helpers.php';

$page_title = 'UI Preview — Factory Standard';
$page_icon = 'fa-palette';
$show_home = true;
$is_dashboard = false;
$isEN = ($_SESSION['lang'] ?? 'th') === 'en';
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'th') ?>">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($page_title) ?></title>
    <link rel="icon" type="image/png" href="assets/favicon.png">
    <link href="plugins/google-fonts/fonts.css" rel="stylesheet">
    <link href="plugins/font-awesome/all.css" rel="stylesheet">
    <link href="assets/factory.css" rel="stylesheet">
</head>

<body class="factory-app">
<?php require __DIR__ . '/includes/layout_header.php'; ?>
<?php require __DIR__ . '/includes/layout_status_bar.php'; ?>

<main class="fx-main">
    <div class="fx-alert fx-alert-info">
        <?= $isEN
            ? 'Preview only — production pages will use this design system after approval.'
            : 'หน้าตัวอย่างเท่านั้น — หน้างานจริงจะใช้ชุด UI นี้หลัง approve' ?>
    </div>

    <!-- Desktop scan workflow -->
    <section class="fx-preview-section">
        <h2><i class="fas fa-desktop"></i> <?= $isEN ? 'Desktop — Scan workflow (Add / Withdraw)' : 'Desktop — หน้าสแกน (รับ / จ่าย)' ?></h2>
        <div class="fx-panel">
            <p class="fx-panel__title"><i class="fas fa-barcode"></i> Step 1: Scan PUID</p>
            <div class="fx-scan-row">
                <input type="text" class="fx-scan-input" placeholder="Scan PUID here..." value="PUID-20240501-001" readonly>
                <button type="button" class="fx-btn fx-btn-accent"><?= $isEN ? 'Verify' : 'ตรวจสอบ' ?></button>
            </div>
        </div>
        <div class="fx-panel">
            <p class="fx-panel__title"><i class="fas fa-box"></i> <?= $isEN ? 'Material summary' : 'ข้อมูลวัสดุ' ?></p>
            <dl class="fx-summary">
                <div><dt>Part</dt><dd>R0402_10K</dd></div>
                <div><dt>Qty</dt><dd>1000</dd></div>
                <div><dt>Lot</dt><dd>BT240501</dd></div>
                <div><dt>Exp</dt><dd>2025-12-31</dd></div>
                <div><dt>Location</dt><dd>Shelf-A / L2 / Box-03</dd></div>
            </dl>
        </div>
        <button type="button" class="fx-btn fx-btn-primary fx-btn-lg fx-btn-block">
            <i class="fas fa-check-circle"></i> <?= $isEN ? 'Confirm receive' : 'ยืนยันรับเข้าคลัง' ?>
        </button>
        <div style="margin-top:1rem;display:flex;flex-wrap:wrap;gap:0.75rem;">
            <div class="fx-alert fx-alert-success" style="flex:1;min-width:200px;margin:0;">Success message</div>
            <div class="fx-alert fx-alert-warning" style="flex:1;min-width:200px;margin:0;">Near expiry warning</div>
            <div class="fx-alert fx-alert-error" style="flex:1;min-width:200px;margin:0;">Error message</div>
        </div>
    </section>

    <!-- Handheld -->
    <section class="fx-preview-section">
        <h2><i class="fas fa-mobile-alt"></i> Handheld (Keyence)</h2>
        <div class="fx-handheld-frame">
            <div class="fx-hh-top"><span>&larr; Back</span><span>Receive RES</span></div>
            <label>Scan Reservation No.</label>
            <input type="text" value="0010012345" readonly>
            <button type="button" class="fx-btn fx-btn-secondary">Load Reservation</button>
            <label>Scan PUID</label>
            <input type="text" value="PUID-20240501-001" readonly>
            <div class="fx-handheld-summary">
                RES: 0010012345<br>
                PUID: PUID-20240501-001<br>
                Part: R0402_10K
            </div>
            <button type="button" class="fx-btn fx-btn-primary">Confirm Receive</button>
        </div>
    </section>

    <!-- Picklist -->
    <section class="fx-preview-section">
        <h2><i class="fas fa-list-check"></i> <?= $isEN ? 'Picklist issue (new)' : 'จ่ายตาม Picklist (ใหม่)' ?></h2>
        <div class="fx-panel">
            <p class="fx-panel__title"><?= $isEN ? 'Open picklists (3)' : 'Picklist รอจ่าย (3)' ?></p>
            <div class="fx-table-wrap">
                <table class="fx-table">
                    <thead>
                        <tr>
                            <th>Picklist ID</th>
                            <th>Line</th>
                            <th>Status</th>
                            <th>Time</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><strong>PL-2025-00456</strong></td>
                            <td>SMT-LINE1</td>
                            <td><span class="fx-badge fx-badge-open">Open</span></td>
                            <td>08:30</td>
                            <td><button type="button" class="fx-btn fx-btn-accent" style="min-height:36px;padding:0 12px;font-size:0.85rem;"><?= $isEN ? 'Select' : 'เลือก' ?></button></td>
                        </tr>
                        <tr>
                            <td><strong>PL-2025-00457</strong></td>
                            <td>SMT-LINE1</td>
                            <td><span class="fx-badge fx-badge-rush">Rush</span></td>
                            <td>10:15</td>
                            <td><button type="button" class="fx-btn fx-btn-accent" style="min-height:36px;padding:0 12px;font-size:0.85rem;"><?= $isEN ? 'Select' : 'เลือก' ?></button></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        <div class="fx-panel">
            <p class="fx-panel__title">PL-2025-00456 — R0402_10K</p>
            <div class="fx-scan-row">
                <input type="text" class="fx-scan-input" placeholder="Scan PUID to issue..." readonly>
                <button type="button" class="fx-btn fx-btn-primary"><?= $isEN ? 'Issue' : 'จ่าย' ?></button>
            </div>
        </div>
        <p><a href="picklist_issue.php" class="fx-btn fx-btn-secondary"><i class="fas fa-external-link-alt"></i> <?= $isEN ? 'Live picklist page (CPK API)' : 'หน้า Picklist จริง (CPK API)' ?></a></p>
    </section>

    <!-- Tokens -->
    <section class="fx-preview-section">
        <h2><i class="fas fa-swatchbook"></i> Design tokens</h2>
        <div class="fx-token-grid">
            <div class="fx-token"><div class="fx-token__swatch" style="background:#1e293b"></div><div class="fx-token__name">Header #1e293b</div></div>
            <div class="fx-token"><div class="fx-token__swatch" style="background:#059669"></div><div class="fx-token__name">Primary #059669</div></div>
            <div class="fx-token"><div class="fx-token__swatch" style="background:#2563eb"></div><div class="fx-token__name">Accent #2563eb</div></div>
            <div class="fx-token"><div class="fx-token__swatch" style="background:#f1f5f9"></div><div class="fx-token__name">BG #f1f5f9</div></div>
            <div class="fx-token"><div class="fx-token__swatch" style="background:#d97706"></div><div class="fx-token__name">Warning</div></div>
            <div class="fx-token"><div class="fx-token__swatch" style="background:#dc2626"></div><div class="fx-token__name">Danger</div></div>
        </div>
    </section>

    <!-- Components -->
    <section class="fx-preview-section">
        <h2><i class="fas fa-puzzle-piece"></i> Components</h2>
        <div class="fx-component-row">
            <button type="button" class="fx-btn fx-btn-primary">Primary</button>
            <button type="button" class="fx-btn fx-btn-accent">Accent</button>
            <button type="button" class="fx-btn fx-btn-secondary">Secondary</button>
            <button type="button" class="fx-btn fx-btn-danger">Danger</button>
        </div>
        <div class="fx-component-row">
            <span class="fx-badge fx-badge-open">Open</span>
            <span class="fx-badge fx-badge-rush">Rush</span>
            <span class="fx-badge fx-badge-ok">OK</span>
        </div>
    </section>
</main>

<?php require __DIR__ . '/includes/layout_footer.php'; ?>
<script src="assets/factory.js"></script>
</body>
</html>
