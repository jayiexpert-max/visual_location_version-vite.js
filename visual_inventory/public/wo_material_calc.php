<?php
require_once("../config/condb.php");
require_once("../config/session_check.php");
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit;
}

if (!role_is_warehouse_staff()) {
    if (isset($_GET['action'])) {
        header('Content-Type: application/json; charset=UTF-8');
        http_response_code(403);
        echo json_encode(['status' => 'error', 'message' => 'Access denied']);
        exit;
    }
    $msg = __('logout') === 'Logout' ? 'Access denied' : 'ไม่มีสิทธิเข้าถึงหน้านี้';
    echo "<script>alert(" . json_encode($msg) . "); window.location.href='index';</script>";
    exit;
}

// --- AJAX Actions ---

// 1. Get BOM Plan from WorkOrder API
if (isset($_GET['action']) && $_GET['action'] === 'get_bom_plan' && isset($_GET['workorder'])) {
    $workorder = trim($_GET['workorder']);

    if (empty($workorder)) {
        $isEN = __('logout') == 'Logout';
        echo json_encode(['status' => 'error', 'message' => $isEN ? 'Work Order is required' : 'กรุณาระบุเลข Work Order']);
        exit;
    }

    require_once __DIR__ . '/../config/env_loader.php';
    require_once __DIR__ . '/../config/cpk_service.php';
    require_once __DIR__ . '/../config/wo_bom_service.php';

    $result = cpk_get('GET_WOBOMInfo', $workorder);

    if (!$result['ok']) {
        echo json_encode([
            'status' => 'error',
            'message' => $result['cpk_message'] ?? $result['error'] ?? 'ไม่สามารถเชื่อมต่อ CPK API ได้',
            'debug_url' => cpk_path('GET_WOBOMInfo', $workorder),
        ]);
        exit;
    }

    $apiData = is_array($result['data']) ? $result['data'] : null;

    if (!$apiData || !cpk_is_success($apiData)) {
        echo json_encode(['status' => 'error', 'message' => $apiData['Message'] ?? 'ไม่พบข้อมูล Work Order หรือ API ขัดข้อง']);
        exit;
    }

    $bom_plan = [];
    foreach (cpk_as_list($apiData['Operations'] ?? []) as $op) {
        if (!is_array($op)) {
            continue;
        }
        foreach (cpk_as_list($op['MaterialList'] ?? []) as $mat) {
            if (!is_array($mat)) {
                continue;
            }
            $material_code = cpk_material_part_number($mat);
            if ($material_code === '') {
                continue;
            }
            $required = cpk_wo_bom_required_qty($mat);
            if ($required === null) {
                continue;
            }

            // Fetch extra info from local materials table if exists
            $mStmt = $condb->prepare("SELECT description FROM materials WHERE material_code = ? LIMIT 1");
            $mStmt->bind_param("s", $material_code);
            $mStmt->execute();
            $mRes = $mStmt->get_result()->fetch_assoc();
            $description = $mRes['description'] ?? ($_SESSION['lang'] == 'en' ? 'No description in local DB' : 'ไม่มีคำอธิบายในระบบ');

            $system = wo_fetch_system_stock($condb, $material_code);
            $substore = wo_fetch_substore_stock($condb, $material_code);

            $bom_plan[] = [
                'item_list' => $mat['MatItem'],
                'op_code' => $op['OpnCode'],
                'material_code' => $material_code,
                'description' => $description,
                'required_per_unit' => $required,
                'required_qty' => $required,
                'system_stock_qty' => $system['system_stock_qty'],
                'usable_stock_qty' => $system['usable_stock_qty'],
                'stock_qty' => $system['system_stock_qty'],
                'puid_in_stock' => $system['puid_count'],
                'system_puid_count' => $system['puid_count'],
                'expiration_display' => $system['expiration_display'],
                'earliest_expiration' => $system['earliest_expiration'],
                'expiry_status' => $system['expiry_status'],
                'expired_rolls' => $system['expired_rolls'],
                'near_expiry_rolls' => $system['near_expiry_rolls'],
                'recommended_puid' => $system['recommended_puid'],
                'substore_stock_qty' => $substore['total'],
                'substore_puid_count' => $substore['puid_count'],
            ];
        }
    }

    if (empty($bom_plan)) {
        $isEN = __('logout') == 'Logout';
        echo json_encode([
            'status' => 'error',
            'message' => $isEN
                ? 'No BOM lines with a numeric required quantity (MatReqQty).'
                : 'ไม่มีรายการ BOM ที่มีจำนวนต้องการ (MatReqQty) เป็นตัวเลข',
        ]);
        exit;
    }

    echo json_encode([
        'status' => 'success', 
        'data' => $bom_plan,
        'info' => [
            'AssemblyName' => $apiData['AssemblyName'] ?? '-',
            'AssemblyRevision' => $apiData['AssemblyRevision'] ?? '-',
            'DataUpdatedTime' => $apiData['DataUpdatedTime'] ?? '-',
            'WorkOrder' => $apiData['WorkOrder'] ?? $workorder,
            'substore_label' => wo_substore_label(__('logout') === 'Logout'),
            'system_stock_label' => wo_system_stock_label(__('logout') === 'Logout'),
            'near_expiry_days' => expiration_sync_near_days(),
        ]
    ]);
    exit;
}

// 2. FIFO location + expiration for highlight (TV / 3D)
if (isset($_GET['action']) && $_GET['action'] === 'get_material_highlight' && isset($_GET['material_code'])) {
    require_once __DIR__ . '/../config/warehouse_highlight_service.php';

    $material_code = trim($_GET['material_code']);
    $loc = wo_resolve_highlight_for_material($condb, $material_code);

    if (!$loc || empty($loc['box_id'])) {
        $isEN = __('logout') === 'Logout';
        echo json_encode([
            'status' => 'error',
            'message' => $isEN ? 'Not found in warehouse' : 'ไม่พบตำแหน่งในคลัง',
        ]);
        exit;
    }

    $highlight = wh_highlight_location($condb, array_merge($loc, [
        'action_type' => 'wo_material_find',
    ]), true);

    echo json_encode([
        'status' => $highlight['status'] ?? 'error',
        'message' => $highlight['message'] ?? '',
        'highlight' => $highlight['highlight'] ?? null,
        'location' => $loc,
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

require_once __DIR__ . '/../config/wo_bom_service.php';

$page_title = __('wo_material_calc_title');
$page_icon = 'fa-calculator';
$show_home = true;
$isENPage = __('logout') === 'Logout';
$woSubstoreLabel = wo_substore_label($isENPage);
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'th') ?>">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($page_title) ?> | Visual Location Management</title>
    <link rel="icon" type="image/png" href="assets/favicon.png">
    <link href="plugins/google-fonts/fonts.css" rel="stylesheet">
    <link href="plugins/font-awesome/all.css" rel="stylesheet">
    <link href="assets/factory.css?v=20260611" rel="stylesheet">
    <link href="assets/wo-material-calc.css?v=20260622" rel="stylesheet">
    <link href="plugins/sweetalert2/sweetalert2.min.css" rel="stylesheet">
</head>
<body class="factory-app factory-scan-page">
<?php require __DIR__ . '/includes/layout_header.php'; ?>
<?php require __DIR__ . '/includes/layout_status_bar.php'; ?>
<main class="fx-main">
    <div class="fx-scan-page fx-wo-page">
        <section class="fx-panel fx-wo-search-panel">
            <label for="woInput"><i class="fas fa-barcode"></i> <?= __('workorder') ?></label>
            <div class="fx-scan-row">
                <input type="text" id="woInput" class="fx-scan-input" placeholder="<?= __('enter_workorder') ?>" autofocus
                    onkeypress="if(event.key === 'Enter') loadBomPlan()">
                <button type="button" class="fx-btn fx-btn-accent" id="btnLoadBom" onclick="loadBomPlan()">
                    <i class="fas fa-search"></i> <?= __('show_list') ?>
                </button>
            </div>
        </section>

        <div id="woInfoPanel" class="wo-info-panel">
            <div class="wo-info-item"><label>Work Order</label><span id="info_wo">-</span></div>
            <div class="wo-info-item"><label>Assembly Name</label><span id="info_assembly">-</span></div>
            <div class="wo-info-item"><label>Revision</label><span id="info_rev">-</span></div>
            <div class="wo-info-item"><label>Updated At</label><span id="info_time">-</span></div>
            <div class="wo-info-item wo-prod-qty-wrap">
                <label for="productionQtyInput"><?= $isENPage ? 'Production qty (WO)' : 'จำนวนผลิต (WO)' ?></label>
                <input type="number" id="productionQtyInput" min="1" step="1" value="1"
                    title="<?= $isENPage ? 'Multiply BOM required qty per unit' : 'คูณจำนวนต้องการต่อหน่วยจาก BOM' ?>">
            </div>
            <div class="wo-info-item"><label><?= $isENPage ? 'Stock source' : 'แหล่งจำนวนคงเหลือ' ?></label><span id="info_substore"><?= $isENPage ? 'Warehouse system' : 'คลังในระบบ' ?></span></div>
        </div>

        <section id="bomList" class="fx-panel fx-wo-bom-panel" hidden>
            <h3 class="fx-section-title"><?= $isENPage ? 'Requirement List' : 'รายการพาร์ทตามใบสั่งงาน' ?></h3>
            <div id="bomSummary" class="wo-bom-summary" hidden></div>
            <div class="wo-bom-table-wrap">
                <table class="fx-table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th class="fx-center">Item</th>
                            <th class="fx-center">Opn</th>
                            <th>Material Part</th>
                            <th>Description</th>
                            <th class="fx-num"><?= $isENPage ? 'Req/unit' : 'ต้องการ/หน่วย' ?></th>
                            <th class="fx-num"><?= $isENPage ? 'Total need' : 'ต้องใช้รวม' ?></th>
                            <th class="fx-num"><?= $isENPage ? 'In system' : 'คงเหลือ (ระบบ)' ?></th>
                            <th class="fx-num"><?= $isENPage ? 'Usable' : 'ใช้ได้' ?></th>
                            <th class="fx-center"><?= $isENPage ? 'Expiry' : 'หมดอายุ' ?></th>
                            <th class="fx-num"><?= $isENPage ? 'Balance' : 'คงเหลือหลังใช้' ?></th>
                            <th class="fx-center"><?= $isENPage ? 'Status' : 'สถานะ' ?></th>
                            <th class="fx-center"><?= $isENPage ? 'Rolls' : 'ม้วน' ?></th>
                            <th class="fx-center"><?= $isENPage ? 'Action' : 'ดำเนินการ' ?></th>
                        </tr>
                    </thead>
                    <tbody id="bomTableBody"></tbody>
                </table>
            </div>
        </section>
    </div>

    <script src="plugins/sweetalert2/sweetalert2.all.min.js"></script>
    <script src="assets/form-busy.js"></script>
    <script>
        let currentBom = [];
        let activeMaterialCode = null;
        let activeBomIndex = -1;
        let substoreLabel = <?= json_encode($woSubstoreLabel, JSON_UNESCAPED_UNICODE) ?>;
        let systemStockLabel = <?= json_encode($isENPage ? 'Warehouse system' : 'คลังในระบบ', JSON_UNESCAPED_UNICODE) ?>;
        let nearExpiryDays = 7;
        window.lang = '<?= $_SESSION['lang'] ?>';

        function fmtNum(n) {
            const x = Number(n);
            if (!Number.isFinite(x)) return '0';
            return Math.abs(x - Math.round(x)) < 0.0001 ? String(Math.round(x)) : x.toFixed(2);
        }

        function getProductionQty() {
            const v = parseFloat(document.getElementById('productionQtyInput').value);
            return Number.isFinite(v) && v > 0 ? v : 1;
        }

        function calcBomLine(item, prodQty) {
            const perUnit = parseFloat(item.required_per_unit ?? item.required_qty) || 0;
            const totalNeed = perUnit * prodQty;
            const systemStock = parseFloat(item.system_stock_qty ?? item.stock_qty) || 0;
            const usableStock = parseFloat(item.usable_stock_qty ?? systemStock) || 0;
            const balance = usableStock - totalNeed;
            return {
                perUnit: perUnit,
                totalNeed: totalNeed,
                systemStock: systemStock,
                usableStock: usableStock,
                balance: balance,
                ok: balance >= 0,
                rolls: parseInt(item.system_puid_count ?? item.puid_in_stock, 10) || 0,
                expiryStatus: item.expiry_status || 'none',
                expirationDisplay: item.expiration_display || '-',
                expiredRolls: parseInt(item.expired_rolls, 10) || 0,
                nearRolls: parseInt(item.near_expiry_rolls, 10) || 0
            };
        }

        function expiryBadgeHtml(line) {
            const exp = line.expirationDisplay || '-';
            if (line.expiryStatus === 'expired') {
                return '<span class="wo-badge wo-badge--expired" title="' + (window.lang == 'en' ? 'All rolls expired' : 'ม้วนหมดอายุทั้งหมด') + '">' + exp + '</span>';
            }
            if (line.expiryStatus === 'mixed_expired') {
                return '<span class="wo-badge wo-badge--expired" title="' + (window.lang == 'en'
                    ? line.expiredRolls + ' expired roll(s)'
                    : 'มีม้วนหมดอายุ ' + line.expiredRolls + ' ม้วน') + '">' + exp + '</span>';
            }
            if (line.expiryStatus === 'near') {
                return '<span class="wo-badge wo-badge--near" title="' + (window.lang == 'en'
                    ? 'Near expiry within ' + nearExpiryDays + ' days'
                    : 'ใกล้หมดอายุภายใน ' + nearExpiryDays + ' วัน') + '">' + exp + '</span>';
            }
            if (line.systemStock > 0 && exp !== '-') {
                return '<span class="wo-badge wo-badge--exp-ok">' + exp + '</span>';
            }
            return '<span class="wo-bom-meta">' + exp + '</span>';
        }

        function rowExpiryClass(line) {
            if (line.expiryStatus === 'expired') return 'wo-bom-row--expired';
            if (line.expiryStatus === 'mixed_expired') return 'wo-bom-row--expired';
            if (line.expiryStatus === 'near') return 'wo-bom-row--near-expiry';
            return '';
        }

        window.onload = function() {
            document.getElementById('woInput').focus();
            const prodInput = document.getElementById('productionQtyInput');
            if (prodInput) {
                prodInput.addEventListener('input', function () {
                    if (currentBom.length) renderBomTable();
                });
            }
        };

        function loadBomPlan() {
            const wo = document.getElementById('woInput').value.trim();
            if (!wo) return Swal.fire(window.lang == 'en' ? 'Error' : 'ข้อผิดพลาด', window.lang == 'en' ? 'Please enter Work Order' : 'กรุณาระบุเลข Work Order', 'error');

            Swal.fire({ title: window.lang == 'en' ? 'Loading...' : 'กำลังโหลด...', didOpen: () => Swal.showLoading() });
            
            fetch(`wo_material_calc.php?action=get_bom_plan&workorder=${encodeURIComponent(wo)}`)
                .then(r => r.json()).then(res => {
                    console.log("API Response:", res);
                    Swal.close();
                    if (res.status == 'success') {
                        currentBom = res.data;

                        // Show Info
                        document.getElementById('woInfoPanel').style.display = 'grid';
                        document.getElementById('info_wo').innerText = res.info.WorkOrder;
                        document.getElementById('info_assembly').innerText = res.info.AssemblyName;
                        document.getElementById('info_rev').innerText = res.info.AssemblyRevision;
                        document.getElementById('info_time').innerText = res.info.DataUpdatedTime;
                        if (res.info.system_stock_label) {
                            systemStockLabel = res.info.system_stock_label;
                            document.getElementById('info_substore').innerText = systemStockLabel;
                        }
                        if (res.info.near_expiry_days) {
                            nearExpiryDays = parseInt(res.info.near_expiry_days, 10) || 7;
                        }
                        if (res.info.substore_label) {
                            substoreLabel = res.info.substore_label;
                        }
                        const prodIn = document.getElementById('productionQtyInput');
                        if (prodIn && (!prodIn.value || parseFloat(prodIn.value) <= 0)) {
                            prodIn.value = '1';
                        }
                        
                        renderBomTable();
                        document.getElementById('bomList').hidden = false;
                    } else {
                        Swal.fire(window.lang == 'en' ? 'Error' : 'ข้อผิดพลาด', res.message, 'error');
                    }
                })
                .catch(err => {
                    console.error("Fetch Error:", err);
                    Swal.fire(window.lang == 'en' ? 'Network Error' : 'ข้อผิดพลาดเครือข่าย', window.lang == 'en' ? 'Connection failed or API did not return JSON' : 'เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์ หรือ API ไม่ตอบกลับเป็น JSON', 'error');
                });
        }

        function renderBomTable() {
            const tb = document.getElementById('bomTableBody');
            const summaryEl = document.getElementById('bomSummary');
            tb.innerHTML = '';
            const prodQty = getProductionQty();
            let readyCount = 0;
            let shortCount = 0;
            let expiredCount = 0;
            let nearCount = 0;

            currentBom.forEach((item, idx) => {
                const line = calcBomLine(item, prodQty);
                if (line.ok) readyCount++; else shortCount++;
                if (line.expiryStatus === 'expired' || line.expiryStatus === 'mixed_expired') expiredCount++;
                else if (line.expiryStatus === 'near') nearCount++;

                let statusLabel = line.ok
                    ? (window.lang == 'en' ? 'Enough' : 'พอ')
                    : (window.lang == 'en' ? 'Short' : 'ไม่พอ');
                let badgeClass = line.ok ? 'wo-badge wo-badge--ok' : 'wo-badge wo-badge--short';
                if (!line.ok && line.systemStock > 0 && line.usableStock <= 0) {
                    statusLabel = window.lang == 'en' ? 'Expired' : 'หมดอายุ';
                    badgeClass = 'wo-badge wo-badge--expired';
                } else if (!line.ok && line.expiredRolls > 0) {
                    statusLabel = window.lang == 'en' ? 'Short / exp.' : 'ไม่พอ/หมดอายุ';
                    badgeClass = 'wo-badge wo-badge--expired';
                }

                const balClass = line.ok ? 'wo-num-ok' : 'wo-num-bad';

                const tr = document.createElement('tr');
                const rowClass = !line.ok ? 'wo-bom-row--short' : rowExpiryClass(line);
                if (rowClass) tr.className = rowClass;

                tr.innerHTML = `
                    <td>${idx + 1}</td>
                    <td class="fx-center wo-bom-meta">${item.item_list}</td>
                    <td class="fx-center wo-bom-meta" style="font-weight:700;">${item.op_code}</td>
                    <td class="wo-bom-material">${item.material_code}</td>
                    <td class="wo-bom-meta">${item.description}</td>
                    <td class="fx-num">${fmtNum(line.perUnit)}</td>
                    <td class="fx-num" style="font-weight:700;">${fmtNum(line.totalNeed)}</td>
                    <td class="fx-num">${fmtNum(line.systemStock)}</td>
                    <td class="fx-num">${fmtNum(line.usableStock)}</td>
                    <td class="fx-center">${expiryBadgeHtml(line)}</td>
                    <td class="fx-num ${balClass}">${fmtNum(line.balance)}</td>
                    <td class="fx-center"><span class="${badgeClass}">${statusLabel}</span></td>
                    <td class="fx-center wo-bom-meta">${line.rolls}</td>
                    <td class="fx-center">
                        <button type="button" class="btn-action ${activeBomIndex == idx ? 'active' : ''}" 
                            onclick="locateMaterial('${item.material_code}', ${idx})">
                            <i class="fas fa-map-marker-alt"></i> ${window.lang == 'en' ? 'Find' : 'ค้นหา'}
                        </button>
                    </td>
                `;

                tb.appendChild(tr);
            });

            if (summaryEl) {
                summaryEl.hidden = false;
                const allOk = shortCount === 0 && expiredCount === 0;
                summaryEl.className = 'wo-bom-summary ' + (allOk ? 'wo-bom-summary--ok' : 'wo-bom-summary--short');
                const expiryNote = (window.lang == 'en'
                    ? (expiredCount ? ` · <span class="wo-num-bad">${expiredCount} expired</span>` : '') +
                      (nearCount ? ` · <span class="wo-num-warn">${nearCount} near expiry</span>` : '')
                    : (expiredCount ? ` · <span class="wo-num-bad">หมดอายุ ${expiredCount}</span> รายการ` : '') +
                      (nearCount ? ` · <span class="wo-num-warn">ใกล้หมดอายุ ${nearCount}</span> รายการ` : ''));
                summaryEl.innerHTML = (window.lang == 'en'
                    ? `Production: <b>${fmtNum(prodQty)}</b> unit(s) · Stock: <b>${systemStockLabel}</b> · `
                    : `ผลิต <b>${fmtNum(prodQty)}</b> ชิ้น · สต็อก: <b>${systemStockLabel}</b> · `) +
                    (window.lang == 'en'
                        ? `<span class="wo-num-ok">${readyCount} enough</span>, <span class="wo-num-bad">${shortCount} short</span>`
                        : `<span class="wo-num-ok">พอ ${readyCount}</span> รายการ, <span class="wo-num-bad">ไม่พอ ${shortCount}</span> รายการ`) +
                    expiryNote;
            }
        }

        function formatWoLocation(loc) {
            if (!loc) return '';
            return [
                loc.rack_name,
                loc.level_no != null && loc.level_no !== '' ? 'L' + loc.level_no : '',
                loc.box_code,
                loc.slot_no != null && loc.slot_no !== '' ? 'S' + loc.slot_no : ''
            ].filter(Boolean).join(' / ');
        }

        function expiryToastSuffix(loc) {
            if (!loc) return '';
            const exp = loc.expiration_display || '-';
            if (loc.expiry_status === 'expired') {
                return window.lang == 'en'
                    ? ' · EXPIRED ' + exp
                    : ' · หมดอายุแล้ว ' + exp;
            }
            if (loc.expiry_status === 'mixed_expired') {
                return window.lang == 'en'
                    ? ' · has expired rolls, earliest ' + exp
                    : ' · มีม้วนหมดอายุ เร็วสุด ' + exp;
            }
            if (loc.expiry_status === 'near') {
                return window.lang == 'en'
                    ? ' · near expiry ' + exp
                    : ' · ใกล้หมดอายุ ' + exp;
            }
            if (exp && exp !== '-') {
                return window.lang == 'en' ? ' · EXP ' + exp : ' · หมดอายุ ' + exp;
            }
            return '';
        }

        function locateMaterial(code, idx) {
            if (!FormBusy.tryBegin('wo:locate')) return;
            activeMaterialCode = code;
            activeBomIndex = idx;
            renderBomTable();
            document.querySelectorAll('.btn-action').forEach(function (btn) { btn.disabled = true; });

            fetch(`wo_material_calc.php?action=get_material_highlight&material_code=${encodeURIComponent(code)}`)
                .then(r => r.json()).then(function (res) {
                    if (res.status === 'success') {
                        const loc = res.location || {};
                        const locText = formatWoLocation(loc);
                        const expHint = expiryToastSuffix(loc);
                        const icon = (loc.expiry_status === 'expired' || loc.expiry_status === 'mixed_expired')
                            ? 'warning' : 'success';
                        Swal.fire({
                            toast: true,
                            position: 'top',
                            icon: icon,
                            title: (window.lang == 'en' ? 'Shown on TV & 3D' : 'แสดงบน TV & 3D') +
                                (locText ? ': ' + locText : '') + expHint,
                            timer: 3200,
                            showConfirmButton: false
                        });
                        return;
                    }
                    Swal.fire({
                        toast: true,
                        position: 'top',
                        icon: 'warning',
                        title: res.message || (window.lang == 'en' ? 'Not found in warehouse' : 'ไม่พบตำแหน่งในคลัง'),
                        timer: 2500,
                        showConfirmButton: false
                    });
                })
                .finally(function () {
                    FormBusy.end('wo:locate');
                    document.querySelectorAll('.btn-action').forEach(function (btn) { btn.disabled = false; });
                });
        }

    </script>
    <script src="assets/factory.js"></script>
</main>
<?php require __DIR__ . '/includes/layout_footer.php'; ?>
</body>
</html>
