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
    die("Access Denied");
}

/* ===== Handle CSV Upload ===== */
$message = "";
$message_type = "";

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['bom_csv'])) {
    $file = $_FILES['bom_csv'];

    // Validations
    if ($file['error'] !== UPLOAD_ERR_OK) {
        $message = "Upload Error Code: " . $file['error'];
        $message_type = "error";
    } elseif (pathinfo($file['name'], PATHINFO_EXTENSION) !== 'csv') {
        $message = __('logout') == 'Logout' ? "Please upload .csv file only" : "กรุณาอัพโหลดไฟล์ .csv เท่านั้น";
        $message_type = "error";
    } else {
        // Read CSV
        $handle = fopen($file['tmp_name'], "r");
        if ($handle) {
            $condb->begin_transaction();
            try {
                $row = 0;
                $success_count = 0;

                // Expect CSV columns: Model, Revision, MaterialCode, Qty

                while (($data = fgetcsv($handle, 1000, ",")) !== FALSE) {
                    $row++;
                    // Skip Header if exists
                    if ($row == 1 && !is_numeric($data[3])) { // Simple check if qty column is not numeric, likely header
                        continue;
                    }

                    $model_code = trim($data[0]);
                    $revision = trim($data[1]);
                    $material_code = trim($data[2]);
                    $qty = floatval($data[3]);
                    $item_list = isset($data[4]) ? trim($data[4]) : '';
                    $unit = isset($data[5]) ? trim($data[5]) : '';

                    if (empty($model_code) || empty($material_code))
                        continue;

                    // 1. Find Model ID
                    $modQ = $condb->prepare("SELECT id FROM models WHERE model_code = ? LIMIT 1");
                    $modQ->bind_param("s", $model_code);
                    $modQ->execute();
                    $modRes = $modQ->get_result()->fetch_assoc();

                    if (!$modRes)
                        throw new Exception("Row $row: " . (__('logout') == 'Logout' ? "Model not found: " : "ไม่พบ Model '") . $model_code . "'");
                    $model_id = $modRes['id'];

                    // 2. Find/Create Revision
                    $revQ = $condb->prepare("SELECT id FROM model_revisions WHERE model_id = ? AND revision = ? LIMIT 1");
                    $revQ->bind_param("is", $model_id, $revision);
                    $revQ->execute();
                    $revRes = $revQ->get_result()->fetch_assoc();

                    if ($revRes) {
                        $revision_id = $revRes['id'];
                    } else {
                        $insRev = $condb->prepare("INSERT INTO model_revisions (model_id, revision) VALUES (?, ?)");
                        $insRev->bind_param("is", $model_id, $revision);
                        $insRev->execute();
                        $revision_id = $insRev->insert_id;
                    }

                    // 3. Find Material ID
                    $matQ = $condb->prepare("SELECT id FROM materials WHERE material_code = ? LIMIT 1");
                    $matQ->bind_param("s", $material_code);
                    $matQ->execute();
                    $matRes = $matQ->get_result()->fetch_assoc();

                    if (!$matRes)
                        throw new Exception("Row $row: " . (__('logout') == 'Logout' ? "Material not found: " : "ไม่พบ Material '") . $material_code . "'");
                    $material_id = $matRes['id'];

                    // 4. Insert/Update BOM Item
                    // Check duplicate
                    $dupQ = $condb->prepare("SELECT id FROM bom_items WHERE revision_id = ? AND material_id = ?");
                    $dupQ->bind_param("ii", $revision_id, $material_id);
                    $dupQ->execute();
                    if ($dupQ->get_result()->num_rows == 0) {
                        $insBom = $condb->prepare("INSERT INTO bom_items (revision_id, material_id, qty, item_list, unit) VALUES (?, ?, ?, ?, ?)");
                        $insBom->bind_param("iidss", $revision_id, $material_id, $qty, $item_list, $unit);
                        $insBom->execute();
                    } else {
                        // Update existing entry with new values
                        $updBom = $condb->prepare("UPDATE bom_items SET qty = ?, item_list = ?, unit = ? WHERE revision_id = ? AND material_id = ?");
                        $updBom->bind_param("dssii", $qty, $item_list, $unit, $revision_id, $material_id);
                        $updBom->execute();
                    }
                    $success_count++;
                }

                $condb->commit();
                $message = (__('logout') == 'Logout' ? "✅ Successfully imported " : "✅ นำเข้าข้อมูลสำเร็จ ") . $success_count . (__('logout') == 'Logout' ? " items" : " รายการ");
                $message_type = "success";
            } catch (Exception $e) {
                $condb->rollback();
                $message = (__('logout') == 'Logout' ? "❌ Error: " : "❌ ผิดพลาด: ") . $e->getMessage();
                $message_type = "error";
            }
            fclose($handle);
        }
    }
}
$page_title = __('logout') == 'Logout' ? 'Import BOM from CSV' : 'นำเข้า BOM จาก CSV';
$page_icon = 'fa-file-csv';
$show_home = true;
?>

<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'th') ?>">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= __('logout') == 'Logout' ? 'Import BOM from CSV' : 'นำเข้า BOM จาก CSV' ?> | Visual Location Management</title>
    <link rel="icon" type="image/png" href="assets/favicon.png">
    <link href="plugins/google-fonts/fonts.css" rel="stylesheet">
    <link href="plugins/font-awesome/all.css" rel="stylesheet">
    <link href="plugins/font-awesome/v4-font-face.css" rel="stylesheet">
        <link rel="stylesheet" href="assets/factory.css?v=20260611">
    <link rel="stylesheet" href="assets/pages-common.css?v=20260607">
    <link rel="stylesheet" href="assets/pages/import-bom-csv.css?v=20260607">
</head>

<body class="factory-app">
<?php require __DIR__ . '/includes/layout_header.php'; ?>
<main class="fx-main fx-main--narrow">
    <div class="container">
        <div class="fx-scan-toolbar" style="margin-bottom:1rem;">
            <a href="add_bom" class="fx-btn fx-btn-secondary"><i class="fas fa-arrow-left"></i>
                <?= __('logout') == 'Logout' ? 'Back' : 'กลับ' ?></a>
        </div>

        <div class="card">
            <h2 style="margin-top:0;">📂 <?= __('logout') == 'Logout' ? 'Import BOM from CSV' : 'นำเข้า BOM จาก CSV' ?>
            </h2>

            <?php if ($message): ?>
                <div class="alert alert-<?= $message_type ?>">
                    <?= htmlspecialchars($message) ?>
                </div>
            <?php endif; ?>

            <form method="POST" enctype="multipart/form-data">
                <label
                    style="display:block; margin-bottom:10px; font-weight:600;"><?= __('logout') == 'Logout' ? 'Select CSV File' : 'เลือกไฟล์ CSV' ?></label>
                <div class="upload-box" onclick="document.getElementById('fileInp').click()">
                    <i class="fas fa-cloud-upload-alt fa-3x" style="color:#94a3b8; margin-bottom:15px;"></i>
                    <div style="color:#64748b;">
                        <?= __('logout') == 'Logout' ? 'Click to select or drag and drop file here' : 'คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่' ?>
                    </div>
                    <input type="file" name="bom_csv" id="fileInp" accept=".csv" style="display:none"
                        onchange="document.getElementById('fname').innerText = this.files[0].name">
                    <div id="fname" style="margin-top:10px; font-weight:600; color:var(--primary);"></div>
                </div>

                <button type="submit"><i class="fas fa-upload"></i>
                    <?= __('logout') == 'Logout' ? 'Upload and Import' : 'อัพโหลดและนำเข้า' ?></button>
            </form>

            <div style="margin-top:30px;">
                <h4 style="margin-bottom:5px;">📋
                    <?= __('logout') == 'Logout' ? 'CSV Format Example (No Header)' : 'ตัวอย่างรูปแบบไฟล์ CSV (ไม่มี Header)' ?>
                </h4>
                <div class="code-block">
                    ModelName, Revision, MaterialCode, Qty, ItemList, Unit<br>
                    Model-A, 01, MAT-001, 10, ITEM-01, Pcs<br>
                    Model-A, 01, MAT-002, 5, ITEM-02, Pcs<br>
                    Model-B, B, MAT-003, 20, LIST-A, Set
                </div>
                <p style="font-size:0.85rem; color:#64748b; margin-top:5px;">*
                    <?= __('logout') == 'Logout' ? 'Please ensure Model and Material Code already exist in system' : 'โปรดตรวจสอบว่า Model และ Material Code มีข้อมูลอยู่ในระบบแล้ว' ?>
                </p>
            </div>
        </div>
    </div>
    <script src="assets/factory.js"></script>
</main>
<?php require __DIR__ . '/includes/layout_footer.php'; ?>
</body>

</html>
