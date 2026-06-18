<?php
require_once("../config/condb.php");
require_once("../config/session_check.php");
require_once("../config/warehouse_highlight_service.php");
require_once __DIR__ . '/../config/fifo_service.php';
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$message = "";
$message_type = "";
$product = null;
$success_highlight_data = null;

// ตรวจสอบ session
if (!isset($_SESSION['user_id'])) {
    header("Location: login.php");
    exit;
}

// AJAX Search for Withdrawal
if (isset($_GET['action']) && $_GET['action'] === 'search') {
    $puid = trim($_GET['puid'] ?? '');

    // Search by PUID and get actual QtyRemain from database
    $stmt = $condb->prepare("
        SELECT ir.QtyRemain, ir.Loc_Shelf, ir.Loc_Level, ir.Loc_Box, ir.StatusName
        FROM inventory_receive ir
        WHERE ir.PUID = ? AND ir.QtyRemain > 0 
        LIMIT 1
    ");
    $stmt->bind_param("s", $puid);
    $stmt->execute();
    $result = $stmt->get_result();
    $row = $result->fetch_assoc();

    if ($row) {
        // Also get the actual box_id to trigger the IO lights
        $box_id = null;
        $prodQuery = $condb->prepare("
            SELECT bx.id as box_id 
            FROM products p
            JOIN slots sl ON p.slot_id = sl.id
            JOIN boxes bx ON sl.box_id = bx.id
            WHERE p.name = (SELECT HanaPart FROM inventory_receive WHERE PUID = ? LIMIT 1)
            LIMIT 1
        ");
        $prodQuery->bind_param("s", $puid);
        $prodQuery->execute();
        $prodRes = $prodQuery->get_result()->fetch_assoc();
        if ($prodRes) {
            $row['box_id'] = $prodRes['box_id'];
        }
        echo json_encode(['status' => 'success', 'data' => $row]);
    } else {
        $isEN = __('logout') == 'Logout';
        echo json_encode(['status' => 'error', 'message' => $isEN ? 'PUID not found in system or already withdrawn' : 'ไม่พบข้อมูล PUID นี้ในระบบ หรือสินค้าถูกเบิกหมดแล้ว']);
    }
    exit;
}

// POST เบิกสินค้า
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['act']) && $_POST['act'] === 'withdraw') {
    $isEN = __('logout') == 'Logout';
    $puid = trim($_POST['PUID'] ?? '');
    $workorder = trim($_POST['workorder'] ?? '');

    if (defined('HANDHELD_POST') && HANDHELD_POST && $workorder === '') {
        $message = "❌ " . ($isEN ? 'Work Order is required' : 'กรุณาระบุ Work Order');
        $message_type = 'warning';
    } elseif (!empty($puid)) {
        $condb->begin_transaction();
        try {
            // STEP 1: Get Item Info (withdraw entire PUID quantity)
            $stmt = $condb->prepare("SELECT id, QtyRemain, IM, HanaPart, Loc_Shelf, Loc_Level, Loc_Box, ExpirationDate FROM inventory_receive WHERE PUID = ? AND QtyRemain > 0 LIMIT 1");
            $stmt->bind_param("s", $puid);
            $stmt->execute();
            $row = $stmt->get_result()->fetch_assoc();

            if ($row) {
                $item_id = $row['id'];
                $s_im = $row['IM'];
                $s_part = $row['HanaPart'];

                $fifoValidation = fifo_validate_puid_for_part($condb, $s_part, $puid, [
                    'is_en' => $isEN,
                    'strict' => true,
                ]);
                if ($fifoValidation['status'] === 'error') {
                    throw new Exception($fifoValidation['message'] ?? ($isEN ? 'FIFO validation failed' : 'ตรวจ FIFO ไม่ผ่าน'));
                }

                $withdraw_qty = $row['QtyRemain']; // Withdraw full quantity
                $new_qty = 0; // Set to zero after full withdrawal

                // STEP 2: Update inventory_receive (set QtyRemain to 0 and Status to Withdrawn)
                $update = $condb->prepare("UPDATE inventory_receive SET QtyRemain = ?, StatusName = 'Withdrawn' WHERE id = ?");
                $update->bind_param("ii", $new_qty, $item_id);
                $update->execute();

                // STEP 3: Get actual product location from products table and update qty
                // Find product by HanaPart name to get real slot location
                $prodQuery = "SELECT p.id, p.qty, p.slot_id, sl.slot_no, bx.id as box_id, bx.box_code, bx.layout, 
                                     lv.level_no, r.name as rack_name
                              FROM products p
                              JOIN slots sl ON p.slot_id = sl.id
                              JOIN boxes bx ON sl.box_id = bx.id
                              JOIN levels lv ON bx.level_id = lv.id
                              JOIN racks r ON lv.rack_id = r.id
                              WHERE p.name = ?
                              LIMIT 1";
                $prodStmt = $condb->prepare($prodQuery);
                $prodStmt->bind_param("s", $row['HanaPart']);
                $prodStmt->execute();
                $prodResult = $prodStmt->get_result()->fetch_assoc();

                if ($prodResult) {
                    $highlightPayload = [
                        'product_name' => $row['HanaPart'],
                        'box_id' => $prodResult['box_id'],
                        'slot_id' => $prodResult['slot_id'],
                        'slot_no' => $prodResult['slot_no'],
                        'box_code' => $prodResult['box_code'],
                        'level_no' => $prodResult['level_no'],
                        'rack_name' => $prodResult['rack_name'],
                        'qty' => $withdraw_qty,
                        'action_type' => 'withdraw',
                    ];
                    wh_highlight_location($condb, $highlightPayload, true);

                    $success_highlight_data = [
                        'slot_id' => $prodResult['slot_id'],
                        'box_id' => $prodResult['box_id'],
                        'box_code' => $prodResult['box_code'],
                        'layout' => $prodResult['layout'],
                        'slot_no' => $prodResult['slot_no'],
                        'level_no' => $prodResult['level_no'],
                        'rack_name' => $prodResult['rack_name']
                    ];

                    // Update product quantity (decrement by 1 roll, since 1 PUID = 1 roll)
                    $newProdQty = max(0, $prodResult['qty'] - 1);
                    $updProd = $condb->prepare("UPDATE products SET qty = ? WHERE id = ?");
                    $updProd->bind_param("ii", $newProdQty, $prodResult['id']);
                    $updProd->execute();

                    // STEP 4: Insert Stock Log (For Report)
                    $log_product_id = $prodResult['id'];
                    $log_qty = 1; // 1 Transaction/Reel

                    // Format: withdraw|Qty|PUID
                    $safe_puid = str_replace('|', '-', $puid);
                    $log_action = 'withdraw|' . $withdraw_qty . '|' . $safe_puid;
                    $log_remark = $workorder !== '' ? '[WorkOrder: ' . str_replace('|', '-', $workorder) . ']' : null;
                    $user_id = $_SESSION['user_id'];

                    $log_now = date('Y-m-d H:i:s');
                    $logSql = "INSERT INTO stock_logs (product_id, user_id, action, quantity, created_at, remark) VALUES (?, ?, ?, ?, ?, ?)";
                    $logStmt = $condb->prepare($logSql);
                    $logStmt->bind_param("iisiss", $log_product_id, $user_id, $log_action, $log_qty, $log_now, $log_remark);
                    $logStmt->execute();
                }

                $condb->commit();
                $woNote = $workorder !== '' ? '<br>📋 Work Order: <b>' . htmlspecialchars($workorder, ENT_QUOTES, 'UTF-8') . '</b>' : '';
                $message = "✅ " . ($isEN ? "Withdraw product <b>“{$row['IM']}”</b> (PUID: $puid) success!<br>🧮 Withdrawn: <b>$withdraw_qty Pcs</b>" : "เบิกสินค้า <b>“{$row['IM']}”</b> (PUID: {$puid}) เรียบร้อย!<br>🧮 เบิกออก: <b>{$withdraw_qty} Pcs</b>") . $woNote;
                $message_type = "success";
            } else {
                throw new Exception($isEN ? "PUID not found in system or already withdrawn" : "ไม่พบข้อมูล PUID นี้ในระบบ หรือถูกเบิกหมดแล้ว");
            }
        } catch (Exception $e) {
            $condb->rollback();
            $message = "❌ " . ($isEN ? "Error: " : "เกิดข้อผิดพลาด: ") . $e->getMessage();
            $message_type = "warning";
        }
    }
}

if (defined('HANDHELD_POST') && HANDHELD_POST) {
    return;
}

$racks = $condb->query("SELECT * FROM racks ORDER BY id ASC");

$isEN = __('logout') == 'Logout';
$page_title = __('withdraw_title');
$page_icon = 'fa-dolly';
$show_home = true;
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
    <link href="assets/rack-layout.css?v=20260607" rel="stylesheet">
</head>

<body class="factory-app factory-scan-page factory-scan-withdraw">
<?php require __DIR__ . '/includes/layout_header.php'; ?>
<?php require __DIR__ . '/includes/layout_status_bar.php'; ?>
<main class="fx-main">
    <div class="fx-scan-page">

        <?php if ($message): ?>
            <div class="message <?= $message_type ?>" id="messageBox"><?= $message ?></div>
            <?php if ($message_type === 'success'): ?>
                <div class="fx-countdown-hint">
                    <?= $isEN ? 'This page will refresh in' : 'หน้านี้จะรีเฟรชใน' ?>
                    <span id="countdown" class="fx-countdown">60</span>
                    <?= $isEN ? 'seconds' : 'วินาที' ?>
                </div>
                <script>
                    let timeLeft = 60;
                    const countdownEl = document.getElementById('countdown');
                    const countdownInterval = setInterval(() => {
                        timeLeft--;
                        if (countdownEl) countdownEl.textContent = timeLeft;
                        if (timeLeft <= 0) {
                            clearInterval(countdownInterval);
                            window.location.href = 'withdraw_product.php';
                        }
                    }, 1000);
                </script>
            <?php endif; ?>
        <?php endif; ?>

        <div id="dynamicMessage" class="fx-page-message" style="display:none;"></div>

        <div class="fx-scan-toolbar">
            <a href="withdraw_product" class="fx-btn fx-btn-secondary"><i class="fas fa-sync-alt"></i> <?= $isEN ? 'Refresh' : 'รีเฟรชหน้า' ?></a>
        </div>

        <form method="POST" id="withdrawForm" class="fade-in">
            <div class="fx-form-panel">
                <div class="row">
                <div class="col-md-6">
                    <label for="puid_input"><?= __('puid_label') ?></label>
                    <div class="fx-scan-row">
                        <input type="text" name="PUID" id="puid_input" class="fx-scan-input" placeholder="<?= __('placeholder_scan') ?>"
                            required autofocus oninput="this.value = this.value.toUpperCase().replace(/^VL/, '');">
                        <button type="button" class="fx-btn fx-btn-accent" id="btnFetchWithdraw"
                            onclick="fetchWithdrawData()"><i class="fas fa-search"></i> <?= __('search_btn') ?></button>
                    </div>
                </div>

                <div class="col-md-6">
                    <label for="withdraw_date_input"><?= $isEN ? 'Withdraw Date' : 'วันที่เบิกออก' ?></label>
                    <input type="datetime-local" name="WithdrawDate" id="withdraw_date_input" value="<?= date('Y-m-d\TH:i') ?>" readonly>
                </div>

                <div class="col-md-6">
                    <label for="hanapart_input"><?= __('hana_part') ?></label>
                    <input type="text" name="HanaPart" id="hanapart_input" placeholder="<?= __('hana_part') ?>" readonly>
                </div>

                <div class="col-md-6">
                    <label for="im_display">Internal Material (IM)</label>
                    <input type="text" name="IM" id="im_display" readonly>
                </div>

                <div class="col-md-6">
                    <label for="qty_display"><?= $isEN ? 'Qty (full reel)' : 'Qty (บรรจุเต็มม้วน)' ?></label>
                    <input type="number" id="qty_display" readonly placeholder="0">
                </div>

                <div class="col-md-6">
                    <label for="qty_remain_display"><?= $isEN ? 'Qty Remain (actual)' : 'Qty Remain (คงเหลือจริง)' ?></label>
                    <input type="number" id="qty_remain_display" readonly placeholder="0">
                </div>

                <div class="col-md-12">
                    <div class="fx-withdraw-note">
                        <b><?= $isEN ? 'Note:' : 'หมายเหตุ:' ?></b>
                        <?= $isEN ? 'Withdrawal will remove the entire PUID quantity (cannot be split).' : 'การเบิกจะทำการเบิกออกทั้งหมดตาม PUID (ไม่สามารถแบ่งได้)' ?>
                    </div>
                </div>

                <div class="col-md-12 fx-form-actions">
                    <input type="hidden" name="act" value="withdraw">
                    <button type="submit" class="fx-btn fx-btn-danger fx-btn-lg" id="btnSubmitWithdraw" style="min-width: 300px;">
                        <i class="fas fa-dolly"></i> <?= __('withdraw_btn') ?>
                    </button>
                </div>
                </div>
            </div>
        </form>

        <section class="fx-withdraw-layout">
            <h3 class="fx-section-title"><?= __('rack_overview') ?></h3>
            <div class="fx-rack-layout">
                <?php
                $delay = 0;
                while ($rack = $racks->fetch_assoc()):
                    $delay += 0.1;
                ?>
                    <div class="fx-rack fx-rack-stagger" style="animation-delay: <?= $delay ?>s">
                        <h3>Rack: <?= htmlspecialchars($rack['name']) ?></h3>
                        <?php
                        $levels = $condb->query("SELECT * FROM levels WHERE rack_id={$rack['id']} ORDER BY level_no ASC");
                        while ($level = $levels->fetch_assoc()):
                            $boxes = $condb->query("SELECT * FROM boxes WHERE level_id={$level['id']} ORDER BY id ASC");
                        ?>
                            <div class="fx-rack-level">
                                <h4>Level <?= $level['level_no'] ?></h4>
                                <div class="fx-rack-level__boxes">
                                    <?php while ($box = $boxes->fetch_assoc()):
                                        $box_class = 'fx-rack-box';
                                        if (isset($success_highlight_data) && $success_highlight_data['box_id'] == $box['id']) {
                                            $box_class .= ' is-highlighted';
                                        }
                                    ?>
                                        <div class="<?= $box_class ?>" data-box-id="<?= $box['id'] ?>"
                                            data-layout="<?= htmlspecialchars($box['layout']) ?>"
                                            onclick="showModal(<?= (int) $box['id'] ?>, 0, '<?= htmlspecialchars($box['layout']) ?>')">
                                            <?= htmlspecialchars($box['box_code']) ?>
                                        </div>
                                    <?php endwhile; ?>
                                </div>
                            </div>
                        <?php endwhile; ?>
                    </div>
                <?php endwhile; ?>
            </div>
        </section>
    </div>
</main>

    <div id="boxModal" class="fx-withdraw-modal">
        <div class="fx-withdraw-modal__panel">
            <div id="modalSlots" class="fx-withdraw-modal__slots"></div>
            <button type="button" onclick="closeModal()" class="fx-btn fx-btn-secondary" style="margin-top: 1.25rem; width: 100%;">
                <i class="fas fa-times"></i> <?= __('close') ?>
            </button>
        </div>
    </div>

    <script src="assets/form-busy.js"></script>
    <script>
        let activeHighlight = null;
        window._isFetchingAPI = false;
        window._isSubmitting = false;

        function lockWithdrawUi(busy, mode) {
            FormBusy.setButtons(busy, [
                { id: 'btnFetchWithdraw', busyHtml: '<i class="fas fa-spinner fa-spin"></i> กำลังดึงข้อมูล...' },
                { id: 'btnSubmitWithdraw', busyHtml: mode === 'submit' ? '<i class="fas fa-spinner fa-spin"></i> กำลังเบิก...' : undefined }
            ]);
            FormBusy.setInputs(busy, ['puid_input']);
        }

        async function fetchWithdrawData() {
            let puid = document.getElementById('puid_input').value.trim().toUpperCase();
            puid = puid.replace(/^VL/, '');
            document.getElementById('puid_input').value = puid;

            const hanapart = document.getElementById('hanapart_input').value;
            if (!puid) return;
            if (window._isFetchingAPI || window._isSubmitting) return;
            if (!FormBusy.tryBegin('fetch:withdraw')) return;

            window._isFetchingAPI = true;
            lockWithdrawUi(true, 'fetch');

            const msgDiv = document.getElementById('dynamicMessage');
            msgDiv.style.display = 'block';
            msgDiv.className = 'message warning';
            msgDiv.innerHTML = '<i class="fas fa-spinner fa-spin"></i> กำลังดึงข้อมูล...';

            let url = 'get_inventory_proxy.php?puid=' + encodeURIComponent(puid);
            if (hanapart) url += '&hanapart=' + encodeURIComponent(hanapart);

            try {
                const data = await fetch(url).then(function (res) { return res.json(); });
                if (data.status === 'success') {
                    document.getElementById('hanapart_input').value = data.data.HanaPart || '';
                    document.getElementById('im_display').value = data.data.IM || '';
                    document.getElementById('qty_display').value = data.data.Qty || 0;

                    const invData = await fetch('withdraw_product?action=search&puid=' + encodeURIComponent(puid))
                        .then(function (res) { return res.json(); });

                    if (invData.status === 'success') {
                        const actualQtyRemain = invData.data.QtyRemain || 0;
                        document.getElementById('qty_remain_display').value = actualQtyRemain;
                        msgDiv.style.display = 'block';
                        msgDiv.className = 'message success fx-page-message';
                        msgDiv.innerHTML = '🔍 <b>พบข้อมูล:</b> ' + data.data.IM +
                            '<br>📍 ตำแหน่ง: <b>' + (data.data.Loc_Shelf || 'N/A') + ' → Level ' + (data.data.Loc_Level || 'N/A') +
                            ' → Box ' + (data.data.Loc_Box || 'N/A') + '</b><br>📦 คงเหลือจริง: <b>' + actualQtyRemain + ' Pcs</b>';

                        const highlightData = Object.assign({}, data.data, {
                            box_id: invData.data.box_id || data.data.box_id,
                            action_type: 'verify_withdraw'
                        });
                        if (typeof highlightFromInventoryData === 'function') {
                            await highlightFromInventoryData(highlightData, 'verify_withdraw');
                        } else if (invData.data.box_id && typeof triggerIOForBox === 'function') {
                            triggerIOForBox(invData.data.box_id);
                        }
                    } else {
                        document.getElementById('qty_remain_display').value = 0;
                        msgDiv.style.display = 'block';
                        msgDiv.className = 'message warning';
                        msgDiv.innerHTML = '⚠️ พบข้อมูลสินค้า <b>' + data.data.HanaPart + '</b> แต่ไม่มีในสต็อก หรือถูกเบิกหมดแล้ว<br>กรุณาตรวจสอบสถานะสินค้า';
                    }
                } else {
                    document.getElementById('hanapart_input').value = '';
                    document.getElementById('im_display').value = '';
                    document.getElementById('qty_display').value = '';
                    document.getElementById('qty_remain_display').value = '';
                    msgDiv.style.display = 'block';
                    msgDiv.className = 'message warning';
                    msgDiv.innerHTML = '❌ ' + data.message;
                }
            } catch (err) {
                console.error('Error fetching API data:', err);
                msgDiv.style.display = 'block';
                msgDiv.className = 'message warning';
                let errorDetail = err.message;
                if (err.message.includes('Failed to fetch')) {
                    errorDetail = 'ไม่สามารถเชื่อมต่อกับ Web Server ได้ (อาจติด Proxy หรือ Firewall ที่เครื่องนี้)';
                }
                msgDiv.innerHTML = '❌ <b>Network Error:</b> ' + errorDetail +
                    '<br><small style="font-size:0.7rem;">โปรดตรวจสอบว่าไม่ได้เปิด Proxy หรือ VPN ทิ้งไว้</small>';
                alert('❌ เกิดข้อผิดพลาดในการเชื่อมต่อข้อมูล API\n' + err.message);
            } finally {
                window._isFetchingAPI = false;
                FormBusy.end('fetch:withdraw');
                if (!window._isSubmitting) {
                    lockWithdrawUi(false, 'fetch');
                    document.getElementById('puid_input').focus();
                }
            }
        }

        FormBusy.guardSubmit('withdrawForm', {
            submitId: 'btnSubmitWithdraw',
            busyHtml: '<i class="fas fa-spinner fa-spin"></i> กำลังเบิก...',
            alsoDisable: ['btnFetchWithdraw']
        });

        function showModal(box_id, highlight_slot_id, layout) {
            if (activeHighlight && activeHighlight.box_id == box_id) {
                highlight_slot_id = activeHighlight.slot_id;
            }

            const modal = document.getElementById('boxModal');
            const modalSlots = document.getElementById('modalSlots');
            const isEN = <?= json_encode(__('logout') == 'Logout') ?>;

            // Skeleton Loader
            let gridCols = layout.includes('x') ? parseInt(layout.split('x')[0]) : 1;
            modalSlots.style.display = 'grid';
            modalSlots.style.gridTemplateColumns = `repeat(${gridCols}, 1fr)`;
            modalSlots.style.gap = '10px';

            let skeletonHtml = '';
            for (let i = 0; i < 4; i++) {
                skeletonHtml += '<div class="fx-rack-skeleton"></div>';
            }
            modalSlots.innerHTML = skeletonHtml;
            modal.classList.add('is-open');

            fetch('get_box_layout?box_id=' + box_id + '&highlight_slot_id=' + highlight_slot_id)
                .then(res => res.json())
                .then(data => {
                    modalSlots.innerHTML = '';
                    let gridCols = layout.includes('x') ? parseInt(layout.split('x')[0]) : 1;
                    modalSlots.style.display = 'grid';
                    modalSlots.style.gridTemplateColumns = `repeat(${gridCols}, 1fr)`;
                    modalSlots.style.gap = '10px';

                    let totalSlots = data.slots.length;
                    let gridRows = Math.ceil(totalSlots / gridCols);
                    let arrangedSlots = [];

                    for (let r = 0; r < gridRows; r++) {
                        for (let c = 0; c < gridCols; c++) {
                            let slotIndex = (c * gridRows) + (gridRows - 1 - r);
                            if (data.slots[slotIndex]) arrangedSlots.push(data.slots[slotIndex]);
                            else arrangedSlots.push({
                                empty: true
                            });
                        }
                    }

                    arrangedSlots.forEach((s, idx) => {
                        let div = document.createElement('div');
                        div.className = 'fx-withdraw-slot fade-in';
                        div.style.animationDelay = (idx * 0.05) + 's';

                        if (s.empty) {
                            div.style.visibility = 'hidden';
                        } else {
                            if (s.highlight) div.classList.add('is-highlighted');
                            let productInfo = s.name
                                ? `<div style="font-weight:700; color:var(--fx-danger); margin-top:4px;">${s.name}</div><div style="font-size:0.75rem; color:var(--fx-text-muted);">(${s.qty})</div>`
                                : `<div style="color:var(--fx-text-muted); font-size:0.75rem; margin-top:4px;">${isEN ? 'Empty' : 'ว่าง'}</div>`;
                            div.innerHTML = `<div style="font-size:0.7rem; color:var(--fx-text-muted); font-weight:700;">#${s.slot_no}</div>` + productInfo;
                        }
                        modalSlots.appendChild(div);
                    });
                });
        }

        function closeModal() {
            document.getElementById('boxModal').classList.remove('is-open');
        }

        window.onload = function() {
            // Auto focus input on load
            const puidInput = document.getElementById('puid_input');
            if (puidInput) puidInput.focus();

            const hData = <?= json_encode($success_highlight_data) ?>;
            if (hData && hData.box_id) {
                activeHighlight = hData;
                const msgDiv = document.getElementById('dynamicMessage');
                msgDiv.style.display = 'block';
                msgDiv.className = 'message success fx-page-message';
                msgDiv.innerHTML = `📤 <b>เบิกออกเรียบร้อยจาก:</b> <b>${hData.rack_name}</b> → <b>Level ${hData.level_no}</b> → <b>${hData.box_code}</b> → <b>Slot ${hData.slot_no}</b>`;

                setTimeout(() => {
                    fetch('api_tv_highlight.php?action=clear').catch(e => console.error(e));
                    msgDiv.style.opacity = '0';
                    activeHighlight = null;
                    document.querySelectorAll('.fx-rack-box').forEach(el => el.classList.remove('is-highlighted'));
                    setTimeout(() => msgDiv.style.display = 'none', 500);
                }, 120000);

                const targetBox = document.querySelector(`.fx-rack-box[data-box-id="${hData.box_id}"]`);
                if (targetBox) {
                    targetBox.classList.add('is-highlighted');
                    targetBox.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                    setTimeout(() => {
                        showModal(hData.box_id, hData.slot_id, hData.layout);
                    }, 800);
                }
            }
        };

        window.onclick = function(event) {
            if (event.target == document.getElementById('boxModal')) closeModal();
        };

        document.getElementById('puid_input').addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                fetchWithdrawData();
            }
        });
    </script>
    <?php include("io_auto_trigger_script.php"); ?>
    <script src="assets/warehouse-highlight.js"></script>
    <script src="assets/factory.js"></script>
<?php require __DIR__ . '/includes/layout_footer.php'; ?>
</body>

</html>