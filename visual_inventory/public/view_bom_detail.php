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

if ($_SESSION['role'] !== 'admin') {
    $msg = __('admin_only');
    echo "<script>alert('$msg'); window.location.href='index';</script>";
    exit;
}

$model_id = isset($_GET['id']) ? intval($_GET['id']) : 0;

if ($model_id === 0) {
    header("Location: view_bom");
    exit;
}

// Fetch Model Info
$stmt = $condb->prepare("SELECT * FROM models WHERE id = ?");
$stmt->bind_param("i", $model_id);
$stmt->execute();
$model = $stmt->get_result()->fetch_assoc();

if (!$model) {
    echo "Model not found.";
    exit;
}

// Fetch BOM Items grouped by Revision
$sql = "
SELECT 
    r.id as revision_id,
    r.revision,
    r.remark as note,
    r.created_at,
    mat.id as material_id,
    mat.material_code,
    mat.description as mat_desc,
    b.qty,
    b.item_list,
    b.unit
FROM model_revisions r
JOIN bom_items b ON r.id = b.revision_id
JOIN materials mat ON b.material_id = mat.id
WHERE r.model_id = ?
ORDER BY r.revision DESC, CAST(b.item_list AS UNSIGNED) ASC, b.item_list ASC, mat.material_code ASC
";

$stmt = $condb->prepare($sql);
$stmt->bind_param("i", $model_id);
$stmt->execute();
$result = $stmt->get_result();

$revisions = [];
while ($row = $result->fetch_assoc()) {
    $rev_id = $row['revision_id'];
    if (!isset($revisions[$rev_id])) {
        $revisions[$rev_id] = [
            'revision' => $row['revision'],
            'note' => $row['note'],
            'created_at' => $row['created_at'],
            'items' => []
        ];
    }
    $revisions[$rev_id]['items'][] = [
        'material_id' => $row['material_id'],
        'material_code' => $row['material_code'],
        'description' => $row['mat_desc'],
        'qty' => $row['qty'],
        'item_list' => $row['item_list'],
        'unit' => $row['unit']
    ];
}
$page_title = __('bom_title') . ' — ' . htmlspecialchars($model['model_code']);
$page_icon = 'fa-list-ul';
$show_home = true;
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'th') ?>">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= __('bom_title') ?> - <?= htmlspecialchars($model['model_code']) ?> | Visual Location Management</title>
    <!-- Fonts & Icons -->
    <link rel="icon" type="image/png" href="assets/favicon.png">
    <link href="plugins/google-fonts/fonts.css" rel="stylesheet">
    <link href="plugins/font-awesome/all.css" rel="stylesheet">
    <link href="plugins/font-awesome/v4-font-face.css" rel="stylesheet">
        <link rel="stylesheet" href="assets/factory.css?v=20260611">
    <link rel="stylesheet" href="assets/pages-common.css?v=20260607">
    <link rel="stylesheet" href="assets/pages/view-bom-detail.css?v=20260607">
</head>

<body class="factory-app">
<?php require __DIR__ . '/includes/layout_header.php'; ?>
<main class="fx-main">
    <div class="container">
        <div class="fx-scan-toolbar" style="margin-bottom:1rem;">
            <a href="view_bom" class="fx-btn fx-btn-secondary"><i class="fas fa-arrow-left"></i> <?= __('back') == 'Back' ? 'Back' : 'กลับ' ?></a>
        </div>

        <div class="model-card">
            <div class="model-header">
                <div class="model-icon">
                    <i class="fas fa-layer-group"></i>
                </div>
                <div class="model-info">
                    <h1>
                        <?= htmlspecialchars($model['model_code']) ?>
                    </h1>
                    <p>
                        <?= htmlspecialchars($model['description'] ?: (__('logout') == 'Logout' ? 'No description' : 'ไม่มีรายละเอียด')) ?>
                    </p>
                </div>
            </div>
        </div>

        <?php if (!empty($revisions)): ?>
            <?php foreach ($revisions as $rev): ?>
                <div class="revision-card">
                    <div class="revision-header">
                        <div style="display:flex; align-items:center; gap:10px;">
                            <span class="rev-badge">REV.
                                <?= htmlspecialchars($rev['revision']) ?>
                            </span>
                            <?php if ($rev['note']): ?>
                                <span
                                    style="font-size:0.9rem; color:var(--text-light); border-left:1px solid #cbd5e1; padding-left:10px;">
                                    <?= htmlspecialchars($rev['note']) ?>
                                </span>
                            <?php endif; ?>
                        </div>
                        <div style="display:flex; align-items:center; gap:15px;">
                            <div class="rev-date">
                                <i class="far fa-clock"></i>
                                <?= date('d/m/Y H:i', strtotime($rev['created_at'])) ?>
                            </div>
                            <button
                                onclick="exportToExcel('bom-table-<?= $rev['revision'] ?>', 'BOM_<?= $model['model_code'] ?>_REV<?= $rev['revision'] ?>')"
                                style="background:none; border:none; cursor:pointer; color:#10b981; font-size:1.1rem; padding:0; transition:transform 0.2s;"
                                onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'"
                                title="Export Excel">
                                <i class="fas fa-file-excel"></i>
                            </button>
                        </div>
                    </div>
                    <table id="bom-table-<?= $rev['revision'] ?>">
                        <thead>
                            <tr>
                                <th width="5%" style="text-align:center;">#</th>
                                <th width="15%"><?= __('item_list') == 'Item List' ? 'Item List' : 'ลำดับรายการ' ?></th>
                                <th width="20%"><?= __('material_code') == 'Material Code' ? 'Material Code' : 'รหัสพาร์ท' ?>
                                </th>
                                <th width="35%"><?= __('description') == 'Description' ? 'Description' : 'รายละเอียด' ?></th>
                                <th width="10%" style="text-align:right"><?= __('qty') ?></th>
                                <th width="10%" style="text-align:center"><?= __('unit') ?></th>
                                <th width="5%"></th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php $index = 1;
                            foreach ($rev['items'] as $item): ?>
                                <tr>
                                    <td style="text-align:center; color:var(--text-light); font-size:0.85rem;">
                                        <?= $index++ ?>
                                    </td>
                                    <td style="font-size:0.9rem; color:var(--text-main);">
                                        <?= htmlspecialchars($item['item_list'] ?: '-') ?>
                                    </td>
                                    <td style="font-weight:700;">
                                        <?= htmlspecialchars($item['material_code']) ?>
                                    </td>
                                    <td style="color:var(--text-light); font-size:0.9rem;">
                                        <?= htmlspecialchars($item['description'] ?: '-') ?>
                                    </td>
                                    <td style="text-align:right; font-weight:700; color:var(--primary);">
                                        <?= number_format($item['qty'], 4) ?>
                                    </td>
                                    <td style="text-align:center; color:var(--text-light);">
                                        <?= htmlspecialchars($item['unit'] ?: '-') ?>
                                    </td>
                                    <td style="text-align:right;">
                                        <a href="edit_bom_item?model=<?= $model_id ?>&rev=<?= $rev['revision'] ?>&mat=<?= $item['material_id'] ?>"
                                            class="btn-edit-item" title="<?= __('logout') == 'Logout' ? 'Edit' : 'แก้ไข' ?>">
                                            <i class="fas fa-pen"></i>
                                        </a>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
            <?php endforeach; ?>
        <?php else: ?>
            <div class="empty-state">
                <i class="fas fa-folder-open" style="font-size:3rem; margin-bottom:15px; color:#e2e8f0;"></i>
                <p><?= __('no_data') ?></p>
                <a href="add_bom" class="btn-back"
                    style="margin-top:15px; display:inline-flex;"><?= __('logout') == 'Logout' ? 'Create New BOM' : 'สร้าง BOM ใหม่' ?></a>
            </div>
        <?php endif; ?>
    </div>
    <script>
        function exportToExcel(tableId, filename) {
            let table = document.getElementById(tableId);
            if (!table) return;

            // Clone table to manipulate without affecting DOM
            let tableClone = table.cloneNode(true);

            // Remove Action Buttons or any non-text elements we don't want
            let links = tableClone.querySelectorAll('a');
            links.forEach(link => link.remove());

            let rows = Array.from(tableClone.rows);
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

            link.setAttribute("href", url);
            link.setAttribute("download", filename + ".csv");
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
