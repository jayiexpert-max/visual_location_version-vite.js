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

if ($_SESSION['role'] !== 'admin') {
    $msg = __('admin_only');
    echo "<script>alert('$msg'); window.location.href='index';</script>";
    exit;
}

$model_id = isset($_GET['model']) ? intval($_GET['model']) : 0;
$rev_code = isset($_GET['rev']) ? trim($_GET['rev']) : '';
$mat_id = isset($_GET['mat']) ? intval($_GET['mat']) : 0;

if ($model_id == 0 || $rev_code == '' || $mat_id == 0) {
    header("Location: view_bom");
    exit;
}

// Fetch existing data
$sql = "
SELECT 
    b.id as bom_id, b.qty, b.item_list, b.unit,
    m.model_code, r.revision, r.id as revision_id,
    mat.material_code, mat.description as mat_desc
FROM bom_items b
JOIN model_revisions r ON b.revision_id = r.id
JOIN models m ON r.model_id = m.id
JOIN materials mat ON b.material_id = mat.id
WHERE m.id = ? AND r.revision = ? AND b.material_id = ?
LIMIT 1
";

$stmt = $condb->prepare($sql);
$stmt->bind_param("isi", $model_id, $rev_code, $mat_id);
$stmt->execute();
$data = $stmt->get_result()->fetch_assoc();

if (!$data) {
    echo (__('logout') == 'Logout' ? "Data not found." : "ไม่พบข้อมูล");
    exit;
}

$success = false;
$error = "";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $qty = floatval($_POST['qty']);
    $action = $_POST['action'] ?? 'update';

    if ($action === 'delete') {
        // Delete BOM item
        $stmt = $condb->prepare("DELETE FROM bom_items WHERE id = ?");
        $stmt->bind_param("i", $data['bom_id']);
        if ($stmt->execute()) {
            $msg = __('logout') == 'Logout' ? 'Deleted successfully' : 'ลบข้อมูลเรียบร้อย';
            echo "<script>alert('$msg'); window.location.href='view_bom_detail?id=$model_id';</script>";
            exit;
        } else {
            $error = __('logout') == 'Logout' ? 'Delete failed' : 'เกิดข้อผิดพลาดในการลบ';
        }
    } else {
        // Update Qty, Item List, Unit
        $item_list = trim($_POST['item_list'] ?? '');
        $unit = trim($_POST['unit'] ?? '');
        $stmt = $condb->prepare("UPDATE bom_items SET qty = ?, item_list = ?, unit = ? WHERE id = ?");
        $stmt->bind_param("dssi", $qty, $item_list, $unit, $data['bom_id']);
        if ($stmt->execute()) {
            $success = true;
            $data['qty'] = $qty;
            $data['item_list'] = $item_list;
            $data['unit'] = $unit;
        } else {
            $error = __('logout') == 'Logout' ? 'Save failed' : 'เกิดข้อผิดพลาดในการบันทึก';
        }
    }
}
$page_title = __('logout') == 'Logout' ? 'Edit BOM Item' : 'แก้ไขรายการ BOM';
$page_icon = 'fa-edit';
$show_home = true;
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'th') ?>">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= __('logout') == 'Logout' ? 'Edit BOM Item' : 'แก้ไขรายการ BOM' ?> | Visual Location Management</title>
    <link rel="icon" type="image/png" href="assets/favicon.png">
    <link href="plugins/google-fonts/fonts.css" rel="stylesheet">
    <link href="plugins/font-awesome/all.css" rel="stylesheet">
    <link href="plugins/font-awesome/v4-font-face.css" rel="stylesheet">
        <link rel="stylesheet" href="assets/factory.css?v=20260611">
    <link rel="stylesheet" href="assets/pages-common.css?v=20260607">
    <link rel="stylesheet" href="assets/pages/edit-bom-item.css?v=20260607">
</head>

<body class="factory-app">
<?php require __DIR__ . '/includes/layout_header.php'; ?>
<main class="fx-main fx-main--narrow">
    <div class="container">
        <div class="fx-scan-toolbar" style="margin-bottom:1rem;">
            <a href="view_bom_detail?id=<?= (int)$model_id ?>" class="fx-btn fx-btn-secondary"><i class="fas fa-arrow-left"></i>
                <?= __('logout') == 'Logout' ? 'Back to BOM detail' : 'กลับไปที่ BOM detail' ?></a>
        </div>

        <div class="card">
            <h2><i class="fas fa-edit" style="color:var(--primary);"></i>
                <?= __('logout') == 'Logout' ? 'Edit BOM Item' : 'แก้ไขรายการ BOM' ?></h2>

            <?php if ($success): ?>
                <div class="alert alert-success" id="success-alert">
                    <i class="fas fa-check-circle"></i>
                    <?= __('logout') == 'Logout' ? 'Saved successfully' : 'บันทึกข้อมูลเรียบร้อย' ?>
                </div>
                <script>
                    setTimeout(function () {
                        window.location.href = "view_bom_detail?id=<?= $model_id ?>";
                    }, 1000);
                </script>
            <?php endif; ?>

            <div class="info-group">
                <div class="info-row">
                    <span class="info-label">Model:</span>
                    <span class="info-value">
                        <?= htmlspecialchars($data['model_code']) ?>
                    </span>
                </div>
                <div class="info-row">
                    <span class="info-label">Revision:</span>
                    <span class="info-value">
                        <?= htmlspecialchars($data['revision']) ?>
                    </span>
                </div>
                <div class="info-row">
                    <span class="info-label">Material:</span>
                    <span class="info-value">
                        <?= htmlspecialchars($data['material_code']) ?>
                    </span>
                </div>
                <div class="info-row" style="margin-top:5px; font-size:0.85rem; color:var(--text-light);">
                    <?= htmlspecialchars($data['mat_desc']) ?>
                </div>
            </div>

            <form method="post">
                <label><?= __('logout') == 'Logout' ? 'Item List' : 'รายการ (Item List)' ?></label>
                <input type="text" name="item_list" value="<?= htmlspecialchars($data['item_list'] ?? '') ?>">

                <label><?= __('logout') == 'Logout' ? 'Unit' : 'หน่วย (Unit)' ?></label>
                <input type="text" name="unit" value="<?= htmlspecialchars($data['unit'] ?? '') ?>">

                <label><?= __('logout') == 'Logout' ? 'Quantity' : 'จำนวน (Quantity)' ?></label>
                <input type="number" name="qty" step="0.0001" value="<?= floatval($data['qty']) ?>" required autofocus>

                <div class="btn-group">
                    <button type="submit" name="action" value="update" class="btn-primary">
                        <i class="fas fa-save"></i> <?= __('save_btn') ?>
                    </button>
                    <button type="submit" name="action" value="delete" class="btn-danger"
                        onclick="return confirm('<?= __('confirm_deletion') ?>');">
                        <i class="fas fa-trash"></i> <?= __('logout') == 'Logout' ? 'Delete' : 'ลบรายการ' ?>
                    </button>
                    <a href="view_bom_detail?id=<?= $model_id ?>" style="flex:1; text-decoration:none;">
                        <button type="button"
                            style="width:100%; background:#f1f5f9; color:var(--text-main);"><?= __('cancel_btn') ?></button>
                    </a>
                </div>
            </form>
        </div>
    </div>
    <script src="assets/factory.js"></script>
</main>
<?php require __DIR__ . '/includes/layout_footer.php'; ?>
</body>

</html>
