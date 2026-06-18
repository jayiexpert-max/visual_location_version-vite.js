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

$success = false;
$error = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $model_code = trim($_POST['model_code'] ?? '');
    $description = trim($_POST['description'] ?? '');
    $edit_id = isset($_POST['edit_id']) ? intval($_POST['edit_id']) : 0;

    if ($model_code === '') {
        $isEN = __('logout') == 'Logout';
        $error = $isEN ? "Please enter Model Code" : "กรุณากรอกรหัสรุ่นงาน";
    } else {
        if ($edit_id > 0) {
            // Update Mode
            // Check redundant model code (excluding itself)
            $chk = $condb->prepare("SELECT id FROM models WHERE model_code = ? AND id != ? LIMIT 1");
            $chk->bind_param("si", $model_code, $edit_id);
            $chk->execute();
            $chk->store_result();

            if ($chk->num_rows > 0) {
                $error = "รหัสรุ่นนี้มีอยู่แล้วในระบบ";
            } else {
                $stmt = $condb->prepare("UPDATE models SET model_code = ?, description = ? WHERE id = ?");
                $stmt->bind_param("ssi", $model_code, $description, $edit_id);
                if ($stmt->execute()) {
                    $success = true;
                } else {
                    $isEN = __('logout') == 'Logout';
                    $error = ($isEN ? "Error updating data: " : "เกิดข้อผิดพลาดในการแก้ไขข้อมูล: ") . $stmt->error;
                }
            }
        } else {
            // Insert Mode
            // ตรวจว่ามี model ซ้ำหรือไม่
            $chk = $condb->prepare("SELECT id FROM models WHERE model_code = ? LIMIT 1");
            $chk->bind_param("s", $model_code);
            $chk->execute();
            $chk->store_result();

            if ($chk->num_rows > 0) {
                $error = "รหัสรุ่นนี้มีอยู่แล้วในระบบ";
            } else {
                $stmt = $condb->prepare("INSERT INTO models (model_code, description) VALUES (?, ?)");
                $stmt->bind_param("ss", $model_code, $description);

                if ($stmt->execute()) {
                    $success = true;
                } else {
                    $isEN = __('logout') == 'Logout';
                    $error = ($isEN ? "Cannot save data: " : "ไม่สามารถบันทึกข้อมูลได้: ") . $stmt->error;
                }
            }
        }
    }
}

// Fetch all models for list
$models = $condb->query("SELECT * FROM models ORDER BY id DESC");

// Check if Edit Mode via GET
$edit_data = null;
if (isset($_GET['edit'])) {
    $id = intval($_GET['edit']);
    $stmt = $condb->prepare("SELECT * FROM models WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows > 0) {
        $edit_data = $result->fetch_assoc();
    }
}
$page_title = __('logout') == 'Logout' ? 'Manage Model' : 'จัดการรุ่นงาน';
$page_icon = 'fa-layer-group';
$show_home = true;
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'th') ?>">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= __('logout') == 'Logout' ? 'Manage Model' : 'จัดการรุ่นงาน' ?> | Visual Location Management</title>
    <link rel="icon" type="image/png" href="assets/favicon.png">
    <link href="plugins/google-fonts/fonts.css" rel="stylesheet">
    <link href="plugins/font-awesome/all.css" rel="stylesheet">
    <link href="plugins/font-awesome/v4-font-face.css" rel="stylesheet">
        <link rel="stylesheet" href="assets/factory.css?v=20260611">
    <link rel="stylesheet" href="assets/pages-common.css?v=20260607">
    <link rel="stylesheet" href="assets/pages/add-model.css?v=20260607">
</head>

<body class="factory-app">
<?php require __DIR__ . '/includes/layout_header.php'; ?>
<main class="fx-main fx-main--narrow">
    <div class="container">
        <div class="fx-scan-toolbar" style="margin-bottom:1rem;">
            <a href="view_bom" class="fx-btn fx-btn-secondary"><i class="fas fa-arrow-left"></i>
                <?= __('back') == 'Back' ? 'Back to BOM List' : 'กลับไปรายการ BOM' ?></a>
        </div>

        <div class="card">
            <h2>
                <i class="fas <?= $edit_data ? 'fa-edit' : 'fa-layer-group' ?>" style="color:var(--primary);"></i>
                <?= $edit_data ? (__('logout') == 'Logout' ? 'Edit Model' : 'แก้ไขรุ่นงาน (Model)') : (__('logout') == 'Logout' ? 'Add Model' : 'เพิ่มรุ่นงาน (Model)') ?>
            </h2>

            <?php if ($success): ?>
                <div class="alert alert-success">
                    <i class="fas fa-check-circle"></i>
                    <?= $edit_data ? (__('logout') == 'Logout' ? 'Updated successfully' : 'แก้ไขข้อมูลเรียบร้อย') : (__('logout') == 'Logout' ? 'Saved successfully' : 'บันทึกข้อมูลเรียบร้อย') ?>
                    <?php if ($edit_data):
                        echo '<script>setTimeout(() => window.location="add_model", 1500);</script>';
                    endif; ?>
                </div>
            <?php endif; ?>

            <?php if ($error): ?>
                <div class="alert alert-error">
                    <i class="fas fa-exclamation-circle"></i> <?= htmlspecialchars($error) ?>
                </div>
            <?php endif; ?>

            <form method="post" action="add_model">
                <?php if ($edit_data): ?>
                    <input type="hidden" name="edit_id" value="<?= $edit_data['id'] ?>">
                <?php endif; ?>

                <label><?= __('logout') == 'Logout' ? 'Model Code' : 'รหัสรุ่นงาน (Model Code)' ?></label>
                <input type="text" name="model_code" id="model_code" placeholder="Ex: MD-001"
                    value="<?= $edit_data ? htmlspecialchars($edit_data['model_code']) : '' ?>" required <?= $edit_data ? '' : 'autofocus' ?>>

                <label><?= __('logout') == 'Logout' ? 'Description' : 'รายละเอียด (Description)' ?> <span
                        style="font-weight:normal; color:var(--text-light); font-size:0.85rem;">(Optional)</span></label>
                <input type="text" name="description"
                    placeholder="<?= __('logout') == 'Logout' ? 'Additional details...' : 'รายละเอียดเพิ่มเติม (ถ้ามี)' ?>"
                    value="<?= $edit_data ? htmlspecialchars($edit_data['description']) : '' ?>">

                <button type="submit" class="btn-primary">
                    <i class="fas <?= $edit_data ? 'fa-save' : 'fa-plus' ?>"></i>
                    <?= $edit_data ? (__('save_btn')) : (__('save_btn')) ?>
                </button>

                <?php if ($edit_data): ?>
                    <a href="add_model"
                        style="display:block; text-align:center; margin-top:15px; text-decoration:none; color:var(--text-light); font-size:0.9rem;"><?= __('logout') == 'Logout' ? 'Cancel' : 'ยกเลิก' ?></a>
                <?php endif; ?>
            </form>
        </div>

        <!-- Table Section -->
        <h3 class="section-title"><i class="fas fa-list"></i>
            <?= __('logout') == 'Logout' ? 'All Models' : 'รายการ Model ทั้งหมด' ?></h3>
        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th width="30%">Model Code</th>
                        <th width="50%">Description</th>
                        <th width="20%" style="text-align:right;">Action</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if ($models && $models->num_rows > 0): ?>
                        <?php while ($row = $models->fetch_assoc()): ?>
                            <tr>
                                <td style="font-weight:500;"><?= htmlspecialchars($row['model_code']) ?></td>
                                <td style="color:var(--text-light);"><?= htmlspecialchars($row['description'] ?: '-') ?></td>
                                <td style="text-align:right;">
                                    <a href="?edit=<?= $row['id'] ?>" class="btn-edit">
                                        <i class="fas fa-edit"></i> <?= __('logout') == 'Logout' ? 'Edit' : 'แก้ไข' ?>
                                    </a>
                                </td>
                            </tr>
                        <?php endwhile; ?>
                    <?php else: ?>
                        <tr>
                            <td colspan="3" style="text-align:center; padding:30px; color:var(--text-light);">
                                <?= __('no_data') ?>
                            </td>
                        </tr>
                    <?php endif; ?>
                </tbody>
            </table>
        </div>
    </div>

    <script>
        window.onload = function() {
            const mc = document.getElementById('model_code');
            if (mc) mc.focus();
        };
    </script>
    <script src="assets/factory.js"></script>
</main>
<?php require __DIR__ . '/includes/layout_footer.php'; ?>
</body>

</html>
