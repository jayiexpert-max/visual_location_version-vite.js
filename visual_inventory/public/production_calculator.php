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
require_once("../config/language.php");

// --- Handle Actions (Book / Cancel) ---
$msg = "";
$msg_type = "";

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action'])) {
    if ($_POST['action'] === 'book') {
        $bk_model_id = intval($_POST['model_id']);
        $bk_rev_id = intval($_POST['revision_id']);
        $bk_qty = intval($_POST['production_qty']);
        $user_id = $_SESSION['user_id'];

        if ($bk_model_id > 0 && $bk_rev_id > 0 && $bk_qty > 0) {
            $ins = $condb->prepare("INSERT INTO production_reservations (user_id, model_id, revision_id, production_qty, status) VALUES (?, ?, ?, ?, 'active')");
            $ins->bind_param("iiii", $user_id, $bk_model_id, $bk_rev_id, $bk_qty);
            if ($ins->execute()) {
                $msg = __('res_success');
                $msg_type = "success";
            } else {
                $msg = __('res_error') . $condb->error;
                $msg_type = "error";
            }
        }
    } elseif ($_POST['action'] === 'cancel') {
        $res_id = intval($_POST['reservation_id']);
        if ($res_id > 0) {
            $upd = $condb->prepare("UPDATE production_reservations SET status = 'cancelled' WHERE id = ?");
            $upd->bind_param("i", $res_id);
            if ($upd->execute()) {
                $msg = __('res_cancelled');
                $msg_type = "success";
            } else {
                $msg = __('cancel_error') . $condb->error;
                $msg_type = "error";
            }
        }
    }
}

// Fetch all models for the dropdown
$models = $condb->query("SELECT id, model_code, description FROM models ORDER BY model_code ASC");

$calculation_result = null;
$selected_model_id = isset($_POST['model_id']) ? intval($_POST['model_id']) : 0;
$production_qty = isset($_POST['production_qty']) ? intval($_POST['production_qty']) : 1;
$current_revision_id = 0;

// If explicitly calculating (Calculate button pressed) OR just showing page after booking (preserve state if possible)
// Simple approach: Only calculate if model_id and production_qty are present
if ($selected_model_id > 0 && $production_qty > 0) {
    // 1. Get the latest revision for the selected model
    $revStmt = $condb->prepare("
        SELECT id, revision, remark 
        FROM model_revisions 
        WHERE model_id = ? 
        ORDER BY revision DESC 
        LIMIT 1
    ");
    $revStmt->bind_param("i", $selected_model_id);
    $revStmt->execute();
    $revision = $revStmt->get_result()->fetch_assoc();

    if ($revision) {
        $current_revision_id = $revision['id'];

        // 2. Get BOM items for this revision
        $bomSql = "
            SELECT 
                m.material_code, 
                m.description, 
                b.qty as required_per_unit
            FROM bom_items b
            JOIN materials m ON b.material_id = m.id
            WHERE b.revision_id = ?
            ORDER BY CAST(b.item_list AS UNSIGNED) ASC, b.item_list ASC, m.material_code ASC
        ";
        $bomStmt = $condb->prepare($bomSql);
        $bomStmt->bind_param("i", $revision['id']);
        $bomStmt->execute();
        $bomItems = $bomStmt->get_result();

        $calculation_result = [];

        while ($item = $bomItems->fetch_assoc()) {
            $matCode = $item['material_code'];
            $reqPerUnit = floatval($item['required_per_unit']);
            $totalRequired = $reqPerUnit * $production_qty;

            // 3. Get Physical Stock Quantity
            $stockSql = "SELECT SUM(QtyRemain) as total_stock FROM inventory_receive WHERE HanaPart = ?";
            $stockStmt = $condb->prepare($stockSql);
            $stockStmt->bind_param("s", $matCode);
            $stockStmt->execute();
            $stockRes = $stockStmt->get_result()->fetch_assoc();
            $physicalStock = floatval($stockRes['total_stock'] ?? 0);

            // 4. Get Reserved Quantity for this Material from ALL active reservations
            // Logic: Sum(BOM_Qty * Reserved_Production_Qty) for all active reservations
            // Note: A material might be used in multiple models. We need to find all BOM items (across all models/revisions) that use this material
            // and are part of an active reservation.
            $reservedSql = "
                SELECT SUM(bi.qty * pr.production_qty) as reserved_qty
                FROM production_reservations pr
                JOIN bom_items bi ON pr.revision_id = bi.revision_id
                JOIN materials m ON bi.material_id = m.id
                WHERE pr.status = 'active'
                AND m.material_code = ?
            ";
            $resStmt = $condb->prepare($reservedSql);
            $resStmt->bind_param("s", $matCode);
            $resStmt->execute();
            $resResult = $resStmt->get_result()->fetch_assoc();
            $reservedStock = floatval($resResult['reserved_qty'] ?? 0);

            $effectiveStock = $physicalStock - $reservedStock;

            // Allow effective stock to be negative? Technically not possible physically, 
            // but calculation wise it means we are over-committed.
            // However, usually we display effective stock as is.

            $balance = $effectiveStock - $totalRequired;
            $status = ($balance >= 0) ? 'Sufficient' : 'Shortage';

            $calculation_result[] = [
                'material_code' => $matCode,
                'description'   => $item['description'],
                'required_per_unit' => $reqPerUnit,
                'total_required' => $totalRequired,
                'physical_stock' => $physicalStock,
                'reserved_stock' => $reservedStock,
                'current_stock'  => $effectiveStock, // Display Effective as "Available"
                'balance'        => $balance,
                'status'         => $status
            ];
        }
    }
}
$page_title = __('prod_planning_title');
$page_icon = 'fa-calculator';
$show_home = true;
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'th') ?>">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= __('prod_planning_title') ?> | Visual Location Management</title>
    <!-- Fonts & Icons -->
    <link rel="icon" type="image/png" href="assets/favicon.png">
    <link href="plugins/google-fonts/fonts.css" rel="stylesheet">
    <link href="plugins/font-awesome/all.css" rel="stylesheet">
    <link href="plugins/font-awesome/v4-font-face.css" rel="stylesheet">
        <link rel="stylesheet" href="assets/factory.css?v=20260611">
    <link rel="stylesheet" href="assets/pages-common.css?v=20260607">
    <link rel="stylesheet" href="assets/pages/production-calculator.css?v=20260607">
</head>

<body class="factory-app">
<?php require __DIR__ . '/includes/layout_header.php'; ?>
<main class="fx-main">
    <div class="container">
        <p style="color:var(--text-light);margin:0 0 1.5rem;"><?= __('prod_planning_desc') ?></p>

        <?php if ($msg): ?>
            <div class="alert alert-<?= $msg_type === 'success' ? 'success' : 'error' ?>">
                <i class="fas fa-<?= $msg_type === 'success' ? 'check-circle' : 'exclamation-circle' ?>"></i>
                <?= $msg ?>
            </div>
        <?php endif; ?>

        <div class="card fade-in">
            <form method="POST" action="">
                <div class="form-grid">
                    <div>
                        <label for="model_id">📦
                            <?= __('select_product_model') ?></label>
                        <select name="model_id" id="model_id" required autofocus>
                            <option value="">-- <?= __('select_model') ?> --</option>
                            <?php while ($m = $models->fetch_assoc()): ?>
                                <option value="<?= $m['id'] ?>" <?= $selected_model_id == $m['id'] ? 'selected' : '' ?>>
                                    <?= htmlspecialchars($m['model_code']) ?>
                                    <?= $m['description'] ? ' (' . htmlspecialchars($m['description']) . ')' : '' ?>
                                </option>
                            <?php endwhile; ?>
                        </select>
                    </div>
                    <div>
                        <label for="production_qty">📊
                            <?= __('prod_qty_unit') ?></label>
                        <input type="number" name="production_qty" id="production_qty" min="1"
                            value="<?= $production_qty ?>" required>
                    </div>
                    <div>
                        <button type="submit" class="btn-primary">
                            <i class="fas fa-calculator"></i> <?= __('calculate_btn') ?>
                        </button>
                    </div>
                </div>
            </form>
        </div>

        <!-- Active Reservations Section -->
        <?php
        $resListSql = "
            SELECT pr.id, pr.created_at, pr.production_qty, m.model_code, u.username
            FROM production_reservations pr
            JOIN models m ON pr.model_id = m.id
            LEFT JOIN users u ON pr.user_id = u.id
            WHERE pr.status = 'active'
            ORDER BY pr.created_at DESC
        ";
        $resList = $condb->query($resListSql);
        ?>
        <?php if ($resList && $resList->num_rows > 0): ?>
            <div class="card" style="margin-bottom: 30px; border-left: 5px solid var(--primary);">
                <h3 style="margin-top:0; margin-bottom:20px; color:var(--text-main); font-size:1.2rem; display:flex; align-items:center; gap:10px;">
                    <i class="fas fa-bookmark" style="color:var(--primary);"></i>
                    <?= __('active_reservations') ?>
                </h3>
                <div class="table-responsive">
                    <table>
                        <thead>
                            <tr>
                                <th><?= __('date_booked') ?></th>
                                <th>Model</th>
                                <th style="text-align:right;"><?= __('prod_qty') ?></th>
                                <th><?= __('user') ?></th>
                                <th style="text-align:center;"><?= __('action') ?></th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php while ($res = $resList->fetch_assoc()): ?>
                                <tr class="stagger-row hover-glow">
                                    <td><?= date('d/m/Y H:i', strtotime($res['created_at'])) ?></td>
                                    <td style="font-weight:600;"><?= $res['model_code'] ?></td>
                                    <td style="text-align:right;"><?= number_format($res['production_qty']) ?></td>
                                    <td><?= htmlspecialchars($res['username']) ?></td>
                                    <td style="text-align:center;">
                                        <form method="POST" onsubmit="return confirm('<?= __('confirm_cancel_res') ?>');">
                                            <input type="hidden" name="action" value="cancel">
                                            <input type="hidden" name="reservation_id" value="<?= $res['id'] ?>">
                                            <input type="hidden" name="model_id" value="<?= $selected_model_id ?>">
                                            <input type="hidden" name="production_qty" value="<?= $production_qty ?>">
                                            <button type="submit" class="btn-danger-sm">
                                                <?= __('cancel') ?>
                                            </button>
                                        </form>
                                    </td>
                                </tr>
                            <?php endwhile; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        <?php endif; ?>

        <?php if ($calculation_result !== null): ?>
            <?php
            // Calculate Summary
            $totalItems = count($calculation_result);
            $shortageCount = 0;
            foreach ($calculation_result as $row) {
                if ($row['status'] === 'Shortage')
                    $shortageCount++;
            }
            $isReady = $shortageCount === 0;
            ?>

            <div class="summary-box fade-in" style="animation-delay: 0.2s;">
                <div class="stat-card" style="border-left: 4px solid var(--primary);">
                    <div class="stat-value">
                        <?= number_format($production_qty) ?>
                    </div>
                    <div class="stat-label"><?= __('prod_target') ?></div>
                </div>
                <div class="stat-card" style="border-left: 4px solid var(--secondary);">
                    <div class="stat-value" style="color: var(--secondary);">
                        <?= $totalItems ?>
                    </div>
                    <div class="stat-label"><?= __('total_bom_items') ?></div>
                </div>
                <div class="stat-card"
                    style="border-left: 4px solid <?= $shortageCount > 0 ? 'var(--danger)' : 'var(--secondary)' ?>;">
                    <div class="stat-value"
                        style="color: <?= $shortageCount > 0 ? 'var(--danger)' : 'var(--secondary)' ?>;">
                        <?= $isReady ? __('status_ready') : $shortageCount . ' ' . __('status_shortage') ?>
                    </div>
                    <div class="stat-label"><?= __('material_status') ?></div>
                </div>
            </div>

            <div class="card fade-in" style="padding: 0; overflow: hidden; animation-delay: 0.4s;">
                <div
                    style="padding: 20px; border-bottom: 1px solid var(--border); display: flex; justify-content: space-between; align-items: center;">
                    <h3 style="margin: 0; display: flex; align-items: center; gap: 10px;">
                        <i class="fas fa-list-check" style="color: var(--primary);"></i>
                        <?= __('mat_list_available') ?>
                    </h3>
                    <div style="display:flex; gap:10px; align-items:center;">
                        <?php if (!$isReady): ?>
                            <span class="badge badge-danger"><?= __('requires_action') ?></span>
                        <?php else: ?>
                            <span class="badge badge-success"><?= __('fully_stocked') ?></span>
                        <?php endif; ?>

                        <!-- BOOKING BUTTON -->
                        <form method="POST" onsubmit="return confirm('<?= $isReady ? __('confirm_reserve') : __('warn_shortage_reserve') ?>');">
                            <input type="hidden" name="action" value="book">
                            <input type="hidden" name="model_id" value="<?= $selected_model_id ?>">
                            <input type="hidden" name="revision_id" value="<?= $current_revision_id ?>">
                            <input type="hidden" name="production_qty" value="<?= $production_qty ?>">
                            <button type="submit" class="btn-primary" style="height: 36px; padding: 0 15px; font-size: 0.9rem; background: <?= $isReady ? 'var(--primary)' : '#f59e0b' ?>;">
                                <i class="fas fa-bookmark"></i> <?= __('book_reserve_btn') ?>
                            </button>
                        </form>

                        <button onclick="exportToExcel()" class="btn-secondary"
                            style="height: 36px; padding: 0 15px; color: #10b981; border-color:#10b981;">
                            <i class="fas fa-file-excel"></i> Excel
                        </button>
                    </div>
                </div>

                <div class="table-responsive">
                    <table id="calcTable">
                        <thead>
                            <tr>
                                <th width="5%">#</th>
                                <th width="15%"><?= __('mat_code') ?></th>
                                <th width="20%"><?= __('description') ?></th>
                                <th width="10%" style="text-align: right;">BOM/Unit</th>
                                <th width="10%" style="text-align: right;">
                                    <?= __('required_verb') ?>
                                </th>
                                <th width="10%" style="text-align: right; color:#64748b;">
                                    <?= __('physical_stock') ?>
                                </th>
                                <th width="10%" style="text-align: right; color:#ef4444;">
                                    <?= __('reserved_stock') ?>
                                </th>
                                <th width="10%" style="text-align: right; font-weight:bold; color:var(--primary);">
                                    <?= __('available_stock') ?>
                                </th>
                                <th width="10%" style="text-align: center;">
                                    <?= __('status') ?>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php foreach ($calculation_result as $index => $row): ?>
                                <?php
                                $isLack = $row['balance'] < 0;
                                ?>
                                <tr class="stagger-row hover-glow" style="<?= $isLack ? 'background-color: #fef2f2;' : '' ?>">
                                    <td style="text-align: center; color: var(--text-light);">
                                        <?= $index + 1 ?>
                                    </td>
                                    <td style="font-weight: 500; font-family: monospace; font-size: 1rem;">
                                        <?= htmlspecialchars($row['material_code']) ?>
                                    </td>
                                    <td style="color: var(--text-light); font-size: 0.9rem;">
                                        <?= htmlspecialchars($row['description']) ?>
                                    </td>
                                    <td style="text-align: right;">
                                        <?= number_format($row['required_per_unit'], 4) ?>
                                    </td>
                                    <td style="text-align: right; font-weight: 600;">
                                        <?= number_format($row['total_required'], 2) ?>
                                    </td>
                                    <td style="text-align: right; color: #64748b;">
                                        <?= number_format($row['physical_stock'], 2) ?>
                                    </td>
                                    <td style="text-align: right; color: #ef4444;">
                                        <?= $row['reserved_stock'] > 0 ? '-' . number_format($row['reserved_stock'], 2) : '-' ?>
                                    </td>
                                    <td style="text-align: right; font-weight: 700; color: var(--primary);">
                                        <?= number_format($row['current_stock'], 2) ?>
                                    </td>
                                    <td style="text-align: center;">
                                        <?php if ($row['balance'] >= 0): ?>
                                            <span class="badge badge-success"><i class="fas fa-check"></i> OK</span>
                                        <?php else: ?>
                                            <span class="badge badge-danger"><i class="fas fa-times"></i> Short</span>
                                            <div style="font-size:0.75rem; color:#ef4444; margin-top:2px;">(<?= number_format($row['balance'], 2) ?>)</div>
                                        <?php endif; ?>
                                    </td>
                                </tr>
                            <?php endforeach; ?>

                            <?php if (empty($calculation_result)): ?>
                                <tr>
                                    <td colspan="9" style="text-align: center; padding: 40px; color: var(--text-light);">
                                        <i class="fas fa-info-circle"
                                            style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                                        <?= __('no_bom_found') ?>
                                    </td>
                                </tr>
                            <?php endif; ?>
                        </tbody>
                    </table>
                </div>
            </div>
        <?php endif; ?>

    </div>
    <script>
        window.onload = function() {
            document.getElementById('model_id').focus();
        };

        function exportToExcel() {
            let table = document.getElementById('calcTable'); // Explicitly target calculation table
            let rows = Array.from(table.rows);
            let csvContent = "\uFEFF"; // BOM for UTF-8

            rows.forEach(row => {
                let rowData = [];
                Array.from(row.cells).forEach(cell => {
                    let text = cell.innerText.replace(/(\r\n|\n|\r)/gm, " ").trim();
                    rowData.push('"' + text + '"'); // Escape double quotes
                });
                csvContent += rowData.join(",") + "\n";
            });

            let blob = new Blob([csvContent], {
                type: "text/csv;charset=utf-8;"
            });
            let link = document.createElement("a");
            let url = URL.createObjectURL(blob);

            let modelName = document.getElementById('model_id').options[document.getElementById('model_id').selectedIndex].text.trim();
            let date = new Date().toISOString().slice(0, 10);

            link.setAttribute("href", url);
            link.setAttribute("download", `Plan_${modelName}_${date}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    </script>
    <script src="assets/factory.js"></script>
</main>
<?php require __DIR__ . '/includes/layout_footer.php'; ?>
</body>

</html>
