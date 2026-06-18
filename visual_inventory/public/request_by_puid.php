<?php
require_once("../config/condb.php");
require_once("../config/session_check.php");

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

if (!isset($_SESSION['user_id'])) {
    header("Location: login");
    exit;
}

if (!isset($_SESSION['role']) || !in_array($_SESSION['role'], ['admin', 'user', 'material_prep'], true)) {
    $msg = "Access Denied / ไม่มีสิทธิเข้าถึงหน้านี้";
    echo "<script>alert('$msg'); window.location.href='index';</script>";
    exit;
}
require_once("../config/language.php");
require_once __DIR__ . '/../config/fifo_service.php';

function rbp_normalize_puid(string $puid): string
{
    return fifo_normalize_puid($puid);
}

function rbp_normalize_part(string $part): string
{
    return fifo_normalize_part($part);
}

function rbp_fetch_fifo_list(mysqli $condb, string $hanaPart, int $limit = 8): array
{
    return fifo_fetch_list($condb, $hanaPart, $limit);
}

function rbp_lookup_material(mysqli $condb, string $hanaPart): ?array
{
    $stmt = $condb->prepare("
        SELECT m.id AS material_id, m.material_code, m.description,
               (SELECT COUNT(DISTINCT ir.PUID)
                FROM inventory_receive ir
                WHERE ir.HanaPart = m.material_code
                  AND ir.QtyRemain > 0
                  AND ir.StatusName NOT IN ('Withdrawn', 'Empty')) AS available_puid_count,
               (SELECT COALESCE(SUM(ir.QtyRemain), 0)
                FROM inventory_receive ir
                WHERE ir.HanaPart = m.material_code
                  AND ir.QtyRemain > 0
                  AND ir.StatusName NOT IN ('Withdrawn', 'Empty')) AS available_qty
        FROM materials m
        WHERE m.material_code = ?
        LIMIT 1
    ");
    $stmt->bind_param('s', $hanaPart);
    $stmt->execute();
    $row = $stmt->get_result()->fetch_assoc();
    $stmt->close();

    return $row ?: null;
}

/**
 * @return array{status: string, message?: string, item?: array, fifo?: array, recommended_puid?: string|null}
 */
function rbp_validate_puid_for_part(mysqli $condb, string $hanaPart, string $puid, bool $isEN): array
{
    return fifo_validate_puid_for_part($condb, $hanaPart, $puid, ['is_en' => $isEN]);
}

// --- AJAX Actions ---

if (isset($_GET['action']) && $_GET['action'] === 'get_material_by_part' && isset($_GET['hanapart'])) {
    $isEN = __('logout') == 'Logout';
    $hanapart = rbp_normalize_part($_GET['hanapart']);
    $matRes = rbp_lookup_material($condb, $hanapart);

    if ($matRes) {
        $fifo = rbp_fetch_fifo_list($condb, $hanapart);
        echo json_encode([
            'status' => 'success',
            'data' => [
                'material_id' => (int) $matRes['material_id'],
                'material_code' => $matRes['material_code'],
                'description' => $matRes['description'],
                'available_puid_count' => (int) ($matRes['available_puid_count'] ?? 0),
                'available_qty' => (float) ($matRes['available_qty'] ?? 0),
                'qty_per_unit' => 1,
                'unit' => 'Pcs',
                'fifo' => $fifo,
                'recommended_puid' => $fifo[0]['puid'] ?? null,
            ],
        ]);
    } else {
        echo json_encode(['status' => 'error', 'message' => $isEN ? "Material {$hanapart} not found" : "ไม่พบข้อมูล Material {$hanapart}"]);
    }
    exit;
}

if (isset($_GET['action']) && $_GET['action'] === 'validate_puid' && isset($_GET['hanapart'], $_GET['puid'])) {
    $isEN = __('logout') == 'Logout';
    $result = rbp_validate_puid_for_part(
        $condb,
        (string) $_GET['hanapart'],
        (string) $_GET['puid'],
        $isEN
    );
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
    exit;
}

// Legacy endpoint — requires hanapart
if (isset($_GET['action']) && $_GET['action'] === 'get_material_by_puid' && isset($_GET['puid'], $_GET['hanapart'])) {
    $isEN = __('logout') == 'Logout';
    $result = rbp_validate_puid_for_part(
        $condb,
        (string) $_GET['hanapart'],
        (string) $_GET['puid'],
        $isEN
    );

    if ($result['status'] === 'error') {
        echo json_encode(['status' => 'error', 'message' => $result['message']]);
        exit;
    }

    $matRes = rbp_lookup_material($condb, rbp_normalize_part($_GET['hanapart']));
    if (!$matRes) {
        echo json_encode(['status' => 'error', 'message' => $isEN ? 'Material not found' : 'ไม่พบ Material']);
        exit;
    }

    echo json_encode([
        'status' => 'success',
        'validation' => $result,
        'data' => [
            'material_id' => (int) $matRes['material_id'],
            'material_code' => $matRes['material_code'],
            'description' => $matRes['description'],
            'available_puid_count' => (int) ($matRes['available_puid_count'] ?? 0),
            'available_qty' => (float) ($matRes['available_qty'] ?? 0),
            'qty_per_unit' => 1,
            'unit' => 'Pcs',
            'fifo' => $result['fifo'] ?? [],
            'recommended_puid' => $result['recommended_puid'] ?? null,
        ],
    ]);
    exit;
}

// 2. Submit Order
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'submit_order') {
    $isEN = __('logout') == 'Logout';
    $items = json_decode($_POST['items'], true);
    $remark = $_POST['remark'] ?? '';
    $user_id = $_SESSION['user_id'];
    $hanapart = rbp_normalize_part($_POST['hanapart'] ?? '');
    $puid = rbp_normalize_puid($_POST['puid'] ?? '');

    if ($hanapart === '') {
        echo json_encode(['status' => 'error', 'message' => $isEN ? 'Scan HanaPart first' : 'กรุณาสแกน HanaPart ก่อน']);
        exit;
    }

    if ($puid === '') {
        echo json_encode(['status' => 'error', 'message' => $isEN ? 'Scan PUID after HanaPart' : 'กรุณาสแกน PUID หลัง HanaPart']);
        exit;
    }

    $workorder = trim($_POST['workorder'] ?? '');
    if ($workorder === '') {
        echo json_encode(['status' => 'error', 'message' => $isEN ? 'Work Order is required' : 'กรุณาระบุ Work Order']);
        exit;
    }

    $validation = rbp_validate_puid_for_part($condb, $hanapart, $puid, $isEN);
    if ($validation['status'] === 'error') {
        echo json_encode(['status' => 'error', 'message' => $validation['message']]);
        exit;
    }

    if (empty($items)) {
        echo json_encode(['status' => 'error', 'message' => $isEN ? 'No items selected' : 'ไม่มีรายการสินค้า']);
        exit;
    }

    $recommended = $validation['recommended_puid'] ?? null;
    $fifoNote = $recommended ? " [FIFO: {$recommended}]" : '';
    $remark = trim("[WorkOrder: {$workorder}] " . $remark . " [HanaPart: {$hanapart}] [PUID: {$puid}]{$fifoNote}");

    $condb->begin_transaction();
    try {
        // Generate Order Number: YYYYMMDD-X
        $today = gmdate('Ymd', time() + (7 * 3600));
        $db_today = gmdate('Y-m-d', time() + (7 * 3600));
        $checkCount = $condb->query("SELECT COUNT(*) as c FROM production_orders WHERE DATE(created_at) = '$db_today'")->fetch_assoc();
        $nextNum = intval($checkCount['c']) + 1;
        $order_no = $today . "-" . $nextNum;

        $now = date('Y-m-d H:i:s');
        $stmt = $condb->prepare("INSERT INTO production_orders (order_no, user_id, remark, created_at) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("siss", $order_no, $user_id, $remark, $now);
        $stmt->execute();
        $order_id = $condb->insert_id;

        $item_stmt = $condb->prepare("INSERT INTO production_order_items (order_id, material_id, target_qty) VALUES (?, ?, ?)");
        foreach ($items as $item) {
            $material_id = intval($item['material_id']);
            $qty = intval($item['qty']);
            if ($qty > 0) {
                $item_stmt->bind_param("iii", $order_id, $material_id, $qty);
                $item_stmt->execute();
            }
        }

        // Set empty only for depleted reference PUID (old roll)
        if ($puid !== '' && ($validation['mode'] ?? '') === 'reference') {
            $puidStripped = rbp_normalize_puid($puid);
            $vl_puid = 'VL' . $puidStripped;
            $update_stmt = $condb->prepare("UPDATE products SET qty = 0 WHERE puid = ? OR puid = ?");
            $update_stmt->bind_param('ss', $puidStripped, $vl_puid);
            $update_stmt->execute();
        }

        $condb->commit();
        echo json_encode([
            'status' => 'success',
            'message' => $isEN ? 'Order submitted successfully' : 'ส่งการสั่งซื้อสำเร็จแล้ว',
            'order_id' => $order_id,
            'order_no' => $order_no,
            'validation' => $validation,
        ]);
    } catch (Exception $e) {
        $condb->rollback();
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
    }
    exit;
}

// Fetch Production Lines
$lines = $condb->query("SELECT id, line_name FROM production_lines WHERE status = 'active' ORDER BY line_name");

$page_title = __('logout') == 'Logout' ? 'Issue Raw Materials (HanaPart + FIFO)' : 'เบิกวัตถุดิบ (HanaPart + FIFO)';
$rbpIsEN = __('logout') === 'Logout';
$rbpFifoHeading = $rbpIsEN
    ? 'FIFO — expiration first; same day any roll OK (recommend by IM)'
    : 'FIFO — วันหมดอายุก่อน วันเดียวกันจ่ายม้วนไหนก็ได้ (แนะนำตาม IM)';
$page_icon = 'fa-tag';
$show_home = true;
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'th') ?>">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= __('logout') == 'Logout' ? 'Issue Raw Materials' : 'เบิกวัตถุดิบ' ?> | Visual Location Management</title>
    <link rel="icon" type="image/png" href="assets/favicon.png">
    <link href="plugins/google-fonts/fonts.css" rel="stylesheet">
    <link href="plugins/font-awesome/all.css" rel="stylesheet">
        <link rel="stylesheet" href="assets/factory.css?v=20260611">
    <link rel="stylesheet" href="assets/pages-common.css?v=20260607">
    <link rel="stylesheet" href="assets/pages/request-by-puid.css?v=20260607">
</head>

<body class="factory-app factory-scan-page">
<?php require __DIR__ . '/includes/layout_header.php'; ?>
<?php require __DIR__ . '/includes/layout_status_bar.php'; ?>
<main class="fx-main">
    <div class="container">

        <!-- Step 1: Work Order -->
        <div class="card">
            <span class="step-badge">Step 1</span>
            <div class="selection-grid">
                <div>
                    <label><i class="fas fa-barcode"></i> <?= __('workorder') ?></label>
                    <input type="text" id="workOrderInput" placeholder="<?= __('enter_workorder') ?>" autofocus onkeypress="if(event.key === 'Enter') confirmWorkOrder()">
                </div>
                <button class="btn btn-primary" id="btnConfirmWorkOrder" onclick="confirmWorkOrder()" style="height: 46px;">
                    <i class="fas fa-check"></i> <?= __('logout') == 'Logout' ? 'Confirm' : 'ยืนยัน' ?>
                </button>
            </div>
            <div id="workOrderMessage" style="margin-top: 15px; font-weight: 500;"></div>
        </div>

        <!-- Step 2: HanaPart -->
        <div class="card">
            <span class="step-badge">Step 2</span>
            <div class="selection-grid field-disabled" id="hanaPartStepFields">
                <div>
                    <label>📦 <?= __('logout') == 'Logout' ? 'Scan HanaPart (Material Code)' : 'สแกน HanaPart (รหัส Material)' ?></label>
                    <input type="text" id="hanaPartInput" placeholder="<?= __('logout') == 'Logout' ? 'Scan or enter HanaPart...' : 'สแกนหรือพิมพ์ HanaPart...' ?>" onkeypress="if(event.key === 'Enter') searchHanaPart()" oninput="this.value = this.value.toUpperCase();">
                </div>
                <button class="btn btn-primary" id="btnSearchHanaPart" onclick="searchHanaPart()" style="height: 46px;">
                    <i class="fas fa-search"></i> <?= __('search_btn') ?>
                </button>
            </div>
            <div id="hanaPartMessage" style="margin-top: 15px; font-weight: 500;"></div>
        </div>

        <!-- Step 3: PUID (enabled after HanaPart) -->
        <div class="card" id="puidStepCard">
            <span class="step-badge">Step 3</span>
            <div class="selection-grid field-disabled" id="puidStepFields">
                <div>
                    <label>🆔 <?= __('logout') == 'Logout' ? 'Scan PUID (reference or issue roll)' : 'สแกน PUID (อ้างอิงม้วนเก่า หรือม้วนที่จ่าย)' ?></label>
                    <input type="text" id="puidInput" placeholder="<?= __('logout') == 'Logout' ? 'Scan PUID after HanaPart...' : 'สแกน PUID หลัง HanaPart...' ?>" onkeypress="if(event.key === 'Enter') validatePuid()" oninput="this.value = this.value.toUpperCase().replace(/^VL/, '');">
                </div>
                <button class="btn btn-primary" id="btnValidatePuid" onclick="validatePuid()" style="height: 46px;">
                    <i class="fas fa-check"></i> <?= __('logout') == 'Logout' ? 'Validate PUID' : 'ตรวจ PUID' ?>
                </button>
            </div>
            <div id="puidMessage" style="margin-top: 15px; font-weight: 500;"></div>
        </div>

        <!-- FIFO recommendation -->
        <div id="fifoPanel" class="card" style="display:none;">
            <h3 style="margin-top:0;">📅 <?= htmlspecialchars($rbpFifoHeading) ?></h3>
            <div style="overflow-x:auto;">
                <table class="fifo-table" style="width:100%; border-collapse:collapse;">
                    <thead>
                        <tr style="background:#f8fafc; text-align:left;">
                            <th>#</th>
                            <th>PUID</th>
                            <th><?= $rbpIsEN ? 'Expiration' : 'วันหมดอายุ' ?></th>
                            <th>IM</th>
                            <th><?= __('logout') == 'Logout' ? 'Qty' : 'คงเหลือ' ?></th>
                            <th>Loc</th>
                        </tr>
                    </thead>
                    <tbody id="fifoTableBody"></tbody>
                </table>
            </div>
        </div>

        <!-- 2. Material Details Card -->
        <div id="bomTableContainer" class="card fade-in">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:15px;">
                <h3 style="margin:0;">📦 <?= __('logout') == 'Logout' ? 'Material Details' : 'รายละเอียดสินค้าที่ต้องการสั่ง' ?></h3>
            </div>

            <div style="overflow-x: auto;">
                <table>
                    <thead>
                        <tr>
                            <th width="40">
                                <input type="checkbox" id="selectAll" onclick="toggleSelectAll(this)" checked>
                            </th>
                            <th>Material Code</th>
                            <th>Description</th>
                            <th style="text-align:center;"><?= __('logout') == 'Logout' ? 'Available PUID' : 'PUID คงเหลือ' ?></th>
                            <th style="text-align:center;">
                                <?= __('logout') == 'Logout' ? 'Request Qty (PUID)' : 'จำนวนที่ต้องการสั่ง (PUID)' ?>
                            </th>
                        </tr>
                    </thead>
                    <tbody id="bomItemsBody"></tbody>
                </table>
            </div>

            <div style="margin-top:20px; display:grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap:20px;">
                <div>
                    <label><?= __('logout') == 'Logout' ? 'Select Production Line' : 'ระบุไลน์การผลิต' ?></label>
                    <select id="lineSelect">
                        <option value="">-- <?= __('logout') == 'Logout' ? 'Choose Line' : 'เลือกไลน์การผลิต' ?> --</option>
                        <?php 
                        $lines->data_seek(0);
                        while ($ln = $lines->fetch_assoc()): ?>
                            <option value="<?= htmlspecialchars($ln['line_name']) ?>">
                                <?= htmlspecialchars($ln['line_name']) ?>
                            </option>
                        <?php endwhile; ?>
                    </select>
                </div>
                <div>
                    <label><?= __('logout') == 'Logout' ? 'Remark (Job / Work Details)' : 'หมายเหตุ (งาน / รายละเอียดเพิ่มเติม)' ?></label>
                    <input type="text" id="orderRemark"
                        placeholder="<?= __('logout') == 'Logout' ? 'e.g. Job Order #1234, Urgency...' : 'เช่น Job Order #1234, งานเร่งด่วน...' ?>">
                </div>
            </div>

            <button class="btn btn-success" id="btnSubmitOrder" onclick="submitOrder()">
                <i class="fas fa-paper-plane"></i> <?= __('logout') == 'Logout' ? 'Confirm Request' : 'ยืนยันการสั่งขอสินค้า' ?>
            </button>
        </div>

        <div id="noDataState" class="card empty-state">
            <i class="fas fa-barcode"></i>
            <?= __('logout') == 'Logout' ? 'Enter Work Order first, then scan HanaPart and PUID (FIFO / expiration checked)' : 'ระบุ Work Order ก่อน จากนั้นสแกน HanaPart และ PUID (ตรวจ FIFO และวันหมดอายุ)' ?>
        </div>
    </div>

    <script src="plugins/sweetalert2/sweetalert2.all.min.js"></script>
    <script src="assets/form-busy.js"></script>
    <script>
        const isEN = <?= json_encode($_SESSION['lang'] == 'en') ?>;

        let lockedWorkOrder = '';
        let lockedHanaPart = '';
        let currentBom = [];
        let puidValidated = false;
        let lastValidation = null;

        window.onload = function() {
            document.getElementById('workOrderInput').focus();
        };

        function normalizeWorkOrder(val) {
            return (val || '').trim();
        }

        function resetHanaPartStep() {
            lockedHanaPart = '';
            document.getElementById('hanaPartInput').value = '';
            document.getElementById('hanaPartMessage').innerHTML = '';
            enablePuidStep(false);
            resetPuidStep();
            hideResult();
            renderFifoTable([]);
        }

        function enableHanaPartStep(enable) {
            const fields = document.getElementById('hanaPartStepFields');
            if (enable) {
                fields.classList.remove('field-disabled');
                document.getElementById('hanaPartInput').focus();
            } else {
                fields.classList.add('field-disabled');
            }
        }

        function confirmWorkOrder() {
            const workorder = normalizeWorkOrder(document.getElementById('workOrderInput').value);
            document.getElementById('workOrderInput').value = workorder;
            const msgDiv = document.getElementById('workOrderMessage');
            if (!workorder) {
                Swal.fire(isEN ? 'Warning' : 'แจ้งเตือน', isEN ? 'Please enter Work Order' : 'กรุณาระบุ Work Order', 'warning');
                return;
            }
            if (lockedWorkOrder && lockedWorkOrder !== workorder) {
                resetHanaPartStep();
            }
            lockedWorkOrder = workorder;
            enableHanaPartStep(true);
            msgDiv.innerHTML = `<span style="color:#10b981;"><i class="fas fa-check-circle"></i> ${isEN ? 'Work Order OK — scan HanaPart' : 'ยืนยัน Work Order แล้ว — สแกน HanaPart'} (<b>${workorder}</b>)</span>`;
        }

        function normalizePart(val) {
            return (val || '').trim().toUpperCase();
        }

        function normalizePuid(val) {
            return (val || '').trim().toUpperCase().replace(/^VL/, '');
        }

        function resetPuidStep() {
            puidValidated = false;
            lastValidation = null;
            document.getElementById('puidInput').value = '';
            document.getElementById('puidMessage').innerHTML = '';
            hideResult();
        }

        function enablePuidStep(enable) {
            const fields = document.getElementById('puidStepFields');
            if (enable) {
                fields.classList.remove('field-disabled');
                document.getElementById('puidInput').focus();
            } else {
                fields.classList.add('field-disabled');
            }
        }

        function renderFifoTable(fifo) {
            const panel = document.getElementById('fifoPanel');
            const tbody = document.getElementById('fifoTableBody');
            tbody.innerHTML = '';
            if (!fifo || !fifo.length) {
                panel.style.display = 'none';
                return;
            }
            fifo.forEach((row, idx) => {
                const tr = document.createElement('tr');
                if (row.is_recommended) tr.classList.add('fifo-recommended');
                const expCell = `<span style="color:${row.is_expired ? '#ef4444' : '#334155'}">${row.expiration_display}${row.is_expired ? ' ⚠️' : ''}</span>`;
                tr.innerHTML = `<td>${idx + 1}${row.is_recommended ? ' ⭐' : ''}</td><td><b>${row.puid}</b></td><td>${expCell}</td><td>${row.im || '-'}</td><td>${row.qty_remain}</td><td>${row.loc_box || '-'}</td>`;
                tbody.appendChild(tr);
            });
            panel.style.display = 'block';
        }

        async function searchHanaPart() {
            if (!lockedWorkOrder) {
                Swal.fire(isEN ? 'Warning' : 'แจ้งเตือน', isEN ? 'Confirm Work Order first' : 'กรุณายืนยัน Work Order ก่อน', 'warning');
                return;
            }
            const hanaPart = normalizePart(document.getElementById('hanaPartInput').value);
            document.getElementById('hanaPartInput').value = hanaPart;
            const msgDiv = document.getElementById('hanaPartMessage');
            if (!hanaPart) {
                Swal.fire(isEN ? 'Warning' : 'แจ้งเตือน', isEN ? 'Please enter HanaPart' : 'กรุณาระบุ HanaPart', 'warning');
                return;
            }
            if (!FormBusy.tryBegin('rbp:searchHana')) return;
            FormBusy.setButtons(true, [
                { id: 'btnSearchHanaPart', busyHtml: '<i class="fas fa-spinner fa-spin"></i>' },
                { id: 'btnValidatePuid' },
                { id: 'btnSubmitOrder' }
            ]);
            msgDiv.innerHTML = '<span style="color:#64748b;"><i class="fas fa-spinner fa-spin"></i> ...</span>';
            resetPuidStep();
            try {
                const res = await fetch(`request_by_puid.php?action=get_material_by_part&hanapart=${encodeURIComponent(hanaPart)}`).then(r => r.json());
                if (res.status !== 'success') {
                    lockedHanaPart = '';
                    enablePuidStep(false);
                    msgDiv.innerHTML = `<span style="color:#ef4444;">${res.message}</span>`;
                    renderFifoTable([]);
                    return;
                }
                lockedHanaPart = hanaPart;
                enablePuidStep(true);
                renderFifoTable(res.data.fifo || []);
                showResult(res.data);
                const rec = res.data.recommended_puid;
                msgDiv.innerHTML = `<span style="color:#10b981;"><i class="fas fa-check-circle"></i> ${isEN ? 'HanaPart OK — scan PUID' : 'ยืนยัน HanaPart แล้ว — สแกน PUID'}${rec ? ` (FIFO: <b>${rec}</b>)` : ''}</span>`;
                if (rec && typeof pushWarehouseHighlight === 'function') {
                    await pushWarehouseHighlight({ puid: rec, material_code: hanaPart, action_type: 'fifo_recommend' });
                } else if (typeof pushWarehouseHighlight === 'function') {
                    await pushWarehouseHighlight({ material_code: hanaPart, action_type: 'issue_material_find' });
                }
            } catch (err) {
                lockedHanaPart = '';
                enablePuidStep(false);
                msgDiv.innerHTML = `<span style="color:#ef4444;">${isEN ? 'Request failed' : 'ระบบขัดข้อง'}</span>`;
            } finally {
                FormBusy.end('rbp:searchHana');
                FormBusy.setButtons(false, [
                    { id: 'btnSearchHanaPart' },
                    { id: 'btnValidatePuid' },
                    { id: 'btnSubmitOrder' }
                ]);
            }
        }

        async function validatePuid() {
            if (!lockedHanaPart) {
                Swal.fire(isEN ? 'Warning' : 'แจ้งเตือน', isEN ? 'Scan HanaPart first' : 'กรุณาสแกน HanaPart ก่อน', 'warning');
                return;
            }
            const puid = normalizePuid(document.getElementById('puidInput').value);
            document.getElementById('puidInput').value = puid;
            const msgDiv = document.getElementById('puidMessage');
            if (!puid) {
                Swal.fire(isEN ? 'Warning' : 'แจ้งเตือน', isEN ? 'Please enter PUID' : 'กรุณาระบุ PUID', 'warning');
                return;
            }
            if (!FormBusy.tryBegin('rbp:validatePuid')) return;
            FormBusy.setButtons(true, [
                { id: 'btnValidatePuid', busyHtml: '<i class="fas fa-spinner fa-spin"></i> FIFO...' },
                { id: 'btnSearchHanaPart' },
                { id: 'btnSubmitOrder' }
            ]);
            msgDiv.innerHTML = '<span style="color:#64748b;"><i class="fas fa-spinner fa-spin"></i> FIFO...</span>';
            try {
                const res = await fetch(`request_by_puid.php?action=validate_puid&hanapart=${encodeURIComponent(lockedHanaPart)}&puid=${encodeURIComponent(puid)}`).then(r => r.json());
                lastValidation = res;
                renderFifoTable(res.fifo || []);
                if (res.status === 'error') {
                    puidValidated = false;
                    msgDiv.innerHTML = `<span style="color:#ef4444;">${res.message}</span>`;
                    return;
                }
                puidValidated = true;
                const color = res.status === 'warning' ? '#d97706' : '#10b981';
                msgDiv.innerHTML = `<span style="color:${color};">${res.message}</span>`;
                if ((res.mode === 'issue' || res.status === 'warning') && typeof highlightFromInventoryData === 'function') {
                    const proxy = await fetch(`get_inventory_proxy.php?puid=${encodeURIComponent(puid)}&hanapart=${encodeURIComponent(lockedHanaPart)}`)
                        .then(r => r.json());
                    if (proxy.status === 'success') {
                        await highlightFromInventoryData(proxy.data, 'issue_material');
                    } else if (res.recommended_puid) {
                        await pushWarehouseHighlight({ puid: res.recommended_puid, material_code: lockedHanaPart, action_type: 'issue_material' });
                    }
                }
            } catch (err) {
                puidValidated = false;
                msgDiv.innerHTML = `<span style="color:#ef4444;">${isEN ? 'Validation failed' : 'ตรวจสอบไม่สำเร็จ'}</span>`;
            } finally {
                FormBusy.end('rbp:validatePuid');
                FormBusy.setButtons(false, [
                    { id: 'btnValidatePuid' },
                    { id: 'btnSearchHanaPart' },
                    { id: 'btnSubmitOrder' }
                ]);
            }
        }

        function showResult(item) {
            currentBom = [item];
            renderTable();
            document.getElementById('bomTableContainer').style.display = 'block';
            document.getElementById('noDataState').style.display = 'none';
        }

        function hideResult() {
            currentBom = [];
            document.getElementById('bomTableContainer').style.display = 'none';
            document.getElementById('noDataState').style.display = 'block';
        }

        function renderTable() {
            const tbody = document.getElementById('bomItemsBody');
            tbody.innerHTML = '';
            
            // Should be just 1 item since we searched 1 PUID, but support array just in case
            currentBom.forEach((item, idx) => {
                const stock = item.available_puid_count ?? item.current_stock ?? 0;
                const isShort = stock <= 0;

                const tr = document.createElement('tr');
                tr.innerHTML = `
                <td>
                    <input type="checkbox" class="item-checkbox" checked data-idx="${idx}">
                </td>
                <td>
                    <span class="material-code">${item.material_code}</span>
                </td>
                <td style="font-size:0.9rem; color:var(--text-light);">
                    ${item.description || '-'}
                </td>
                <td style="text-align:center;">
                    <span style="font-weight:bold; color: ${isShort ? '#ef4444' : '#10b981'}">
                        ${stock} PUID
                    </span>
                </td>
                <td style="text-align:center;">
                    <input type="number" class="qty-input" value="1" min="1" data-idx="${idx}" style="padding:10px; border-radius:8px; border:1px solid #cbd5e1; font-weight:bold;">
                </td>
            `;
                tbody.appendChild(tr);
            });
        }

        function toggleSelectAll(master) {
            const checkboxes = document.querySelectorAll('.item-checkbox');
            checkboxes.forEach(cb => cb.checked = master.checked);
        }

        function submitOrder() {
            if (FormBusy.isBusy('rbp:submitOrder')) return;
            if (!lockedWorkOrder) {
                Swal.fire(isEN ? 'Warning' : 'แจ้งเตือน', isEN ? 'Confirm Work Order first' : 'กรุณายืนยัน Work Order ก่อน', 'warning');
                return;
            }
            if (!lockedHanaPart) {
                Swal.fire(isEN ? 'Warning' : 'แจ้งเตือน', isEN ? 'Scan HanaPart first' : 'กรุณาสแกน HanaPart ก่อน', 'warning');
                return;
            }
            const puid = normalizePuid(document.getElementById('puidInput').value);
            if (!puid) {
                Swal.fire(isEN ? 'Warning' : 'แจ้งเตือน', isEN ? 'Scan PUID after HanaPart' : 'กรุณาสแกน PUID หลัง HanaPart', 'warning');
                return;
            }
            if (!puidValidated) {
                Swal.fire(isEN ? 'Warning' : 'แจ้งเตือน', isEN ? 'Validate PUID (FIFO) first' : 'กรุณากดตรวจ PUID (FIFO) ก่อน', 'warning');
                return;
            }
            if (lastValidation && lastValidation.status === 'error') {
                Swal.fire(isEN ? 'FIFO Error' : 'ผิด FIFO', lastValidation.message, 'error');
                return;
            }

            const checkboxes = document.querySelectorAll('.item-checkbox:checked');
            if (checkboxes.length === 0) {
                Swal.fire(isEN ? 'Warning' : 'แจ้งเตือน', isEN ? 'Please select at least 1 item' : 'กรุณาเลือกสินค้าอย่างน้อย 1 รายการ', 'warning');
                return;
            }

            const itemsToOrder = [];
            checkboxes.forEach(cb => {
                const idx = cb.dataset.idx;
                const qtyInput = document.querySelector(`.qty-input[data-idx="${idx}"]`);
                itemsToOrder.push({
                    material_id: currentBom[idx].material_id,
                    qty: parseInt(qtyInput.value, 10)
                });
            });

            const line = document.getElementById('lineSelect').value;
            const extra = document.getElementById('orderRemark').value;
            const remark = (line ? (line + (extra ? ' - ' + extra : '')) : extra);
            const fifoHint = lastValidation && lastValidation.recommended_puid ? `<br><b>FIFO:</b> ${lastValidation.recommended_puid}` : '';

            Swal.fire({
                title: isEN ? 'Verify Request' : 'ตรวจสอบรายการสั่งขอสินค้า',
                html: `<div style="text-align:left;"><b>Work Order:</b> ${lockedWorkOrder}<br><b>HanaPart:</b> ${lockedHanaPart}<br><b>PUID:</b> ${puid}${fifoHint}<br><b>${isEN ? 'Remark' : 'หมายเหตุ'}:</b> ${remark || '-'}</div>`,
                icon: 'info',
                showCancelButton: true,
                confirmButtonText: isEN ? 'Confirm Request' : 'ยืนยันการตั้งเบิก',
                cancelButtonText: isEN ? 'Cancel' : 'ยกเลิก',
                confirmButtonColor: '#10b981'
            }).then((result) => {
                if (!result.isConfirmed) return;
                if (!FormBusy.tryBegin('rbp:submitOrder')) return;
                FormBusy.setButtons(true, [{ id: 'btnSubmitOrder', busyHtml: '<i class="fas fa-spinner fa-spin"></i>' }]);

                const fd = new FormData();
                fd.append('action', 'submit_order');
                fd.append('items', JSON.stringify(itemsToOrder));
                fd.append('remark', remark);
                fd.append('hanapart', lockedHanaPart);
                fd.append('puid', puid);
                fd.append('workorder', lockedWorkOrder);

                Swal.fire({ title: isEN ? 'Sending...' : 'กำลังส่ง...', allowOutsideClick: false, didOpen: () => Swal.showLoading() });

                fetch('request_by_puid.php', { method: 'POST', body: fd })
                    .then(r => r.json())
                    .then(res => {
                        if (res.status !== 'success') {
                            FormBusy.end('rbp:submitOrder');
                            FormBusy.setButtons(false, [{ id: 'btnSubmitOrder' }]);
                            Swal.fire(isEN ? 'Error!' : 'เกิดข้อผิดพลาด!', res.message, 'error');
                            return;
                        }
                        Swal.fire(isEN ? 'Success!' : 'สำเร็จ!', res.order_no, 'success').then(() => window.location.reload());
                    })
                    .catch(() => {
                        FormBusy.end('rbp:submitOrder');
                        FormBusy.setButtons(false, [{ id: 'btnSubmitOrder' }]);
                        Swal.fire(isEN ? 'Error!' : 'เกิดข้อผิดพลาด!', 'System error', 'error');
                    });
            });
        }
    </script>
    <script src="assets/warehouse-highlight.js"></script>
    <script src="assets/factory.js"></script>
</main>
<?php require __DIR__ . '/includes/layout_footer.php'; ?>
</body>
</html>
