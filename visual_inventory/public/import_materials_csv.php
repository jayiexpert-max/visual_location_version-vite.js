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

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['material_csv'])) {
    $file = $_FILES['material_csv'];

    // Validations
    if ($file['error'] === UPLOAD_ERR_NO_FILE) {
        $message = __('logout') == 'Logout' ? "Please select a CSV file first" : "กรุณาเลือกไฟล์ CSV ก่อนกดอัปโหลด";
        $message_type = "error";
    } elseif ($file['error'] !== UPLOAD_ERR_OK) {
        $message = "Upload Error Code: " . $file['error'];
        $message_type = "error";
    } elseif (pathinfo($file['name'], PATHINFO_EXTENSION) !== 'csv') {
        $message = __('logout') == 'Logout' ? "Please upload .csv file only" : "กรุณาอัพโหลดไฟล์ .csv เท่านั้น";
        $message_type = "error";
    } else {
        // Read CSV
        $handle = fopen($file['tmp_name'], "r");
        if ($handle) {
            // Check for BOM (Byte Order Mark) and skip it if exists
            $bom = fread($handle, 3);
            if ($bom != "\xEF\xBB\xBF") {
                rewind($handle);
            }

            $condb->begin_transaction();
            try {
                $row = 0;
                $success_count = 0;
                $update_count = 0;

                // Expect CSV columns: MaterialCode, Description
                while (($data = fgetcsv($handle, 1000, ",")) !== FALSE) {
                    $row++;
                    // Skip Header if it looks like one
                    if ($row == 1 && (strtolower(trim($data[0])) == 'material code' || trim($data[0]) == 'รหัส Material')) {
                        continue;
                    }

                    $material_code = trim($data[0] ?? '');
                    $description = trim($data[1] ?? '');

                    if (empty($material_code))
                        continue;

                    // Check if exists
                    $check = $condb->prepare("SELECT id FROM materials WHERE material_code = ? LIMIT 1");
                    $check->bind_param("s", $material_code);
                    $check->execute();
                    $res = $check->get_result()->fetch_assoc();

                    if ($res) {
                        // Update
                        $stmt = $condb->prepare("UPDATE materials SET description = ? WHERE id = ?");
                        $stmt->bind_param("si", $description, $res['id']);
                        $stmt->execute();
                        $update_count++;
                    } else {
                        // Insert
                        $stmt = $condb->prepare("INSERT INTO materials (material_code, description) VALUES (?, ?)");
                        $stmt->bind_param("ss", $material_code, $description);
                        $stmt->execute();
                        $success_count++;
                    }
                }

                $condb->commit();
                $isEN = __('logout') == 'Logout';
                $message = ($isEN ? "✅ Successfully processed " : "✅ ดำเนินการสำเร็จ ") . ($success_count + $update_count) . " " . ($isEN ? "items" : "รายการ");
                $message .= " (" . ($isEN ? "Added: " : "เพิ่ม: ") . $success_count . ", " . ($isEN ? "Updated: " : "อัปเดต: ") . $update_count . ")";
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
$page_title = __('logout') == 'Logout' ? 'Import Material from CSV' : 'นำเข้า Material จาก CSV';
$page_icon = 'fa-file-csv';
$show_home = true;
?>

<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'th') ?>">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= __('logout') == 'Logout' ? 'Import Material from CSV' : 'นำเข้า Material จาก CSV' ?> | Visual Location Management</title>
    <link rel="icon" type="image/png" href="assets/favicon.png">
    <link href="plugins/google-fonts/fonts.css" rel="stylesheet">
    <link href="plugins/font-awesome/all.css" rel="stylesheet">
    <link href="plugins/font-awesome/v4-font-face.css" rel="stylesheet">
        <link rel="stylesheet" href="assets/factory.css?v=20260611">
    <link rel="stylesheet" href="assets/pages-common.css?v=20260607">
    <link rel="stylesheet" href="assets/pages/import-materials-csv.css?v=20260607">
</head>

<body class="factory-app">
<?php require __DIR__ . '/includes/layout_header.php'; ?>
<main class="fx-main fx-main--narrow">
    <div class="container">
        <div class="fx-scan-toolbar" style="margin-bottom:1rem;">
            <a href="add_material" class="fx-btn fx-btn-secondary"><i class="fas fa-arrow-left"></i>
                <?= __('logout') == 'Logout' ? 'Back' : 'กลับ' ?></a>
        </div>

        <div class="card">
            <h2 style="margin-top:0;">📂 <?= __('logout') == 'Logout' ? 'Import Material from CSV' : 'นำเข้า Material จาก CSV' ?>
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
                    <input type="file" name="material_csv" id="fileInp" accept=".csv" style="display:none" required
                        onchange="document.getElementById('fname').innerText = this.files[0].name">
                    <div id="fname" style="margin-top:10px; font-weight:600; color:var(--primary);"></div>
                </div>

                <button type="submit"><i class="fas fa-upload"></i>
                    <?= __('logout') == 'Logout' ? 'Upload and Import' : 'อัพโหลดและนำเข้า' ?></button>
            </form>

            <div style="margin-top:30px;">
                <h4 style="margin-bottom:5px;">📋
                    <?= __('logout') == 'Logout' ? 'CSV Format Example' : 'ตัวอย่างรูปแบบไฟล์ CSV' ?>
                </h4>
                <div class="code-block">
                    Material Code, Description<br>
                    MAT-001, Metal sheet A<br>
                    MAT-002, Screw M3x10<br>
                    MAT-003, Capacitor 10uF
                </div>
                <p style="font-size:0.85rem; color:#64748b; margin-top:5px;">*
                    <?= __('logout') == 'Logout' ? 'New codes will be added, existing codes will have their description updated' : 'รหัสที่ไม่มีจะถูกเพิ่มใหม่ รหัสที่มีอยู่แล้วจะอัปเดตรายละเอียด' ?>
                </p>
            </div>
        </div>
    </div>
    <script src="assets/factory.js"></script>
</main>
<?php require __DIR__ . '/includes/layout_footer.php'; ?>
</body>

</html>
