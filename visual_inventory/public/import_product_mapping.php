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

if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_FILES['mapping_csv'])) {
    $file = $_FILES['mapping_csv'];

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
                $row_idx = 0;
                $success_count = 0;
                $error_list = [];

                    // Expect CSV columns: Rack, Level, BoxCode, SlotNo, ProductName
                    while (($data = fgetcsv($handle, 1000, ",")) !== FALSE) {
                        $row_idx++;
                        // Skip Header if it looks like one
                        if ($row_idx == 1 && (strtolower(trim($data[0])) == 'rack' || trim($data[0]) == 'Rack')) {
                            continue;
                        }

                        if (count($data) < 5) continue;

                        $rack_name   = trim($data[0] ?? '');
                        $level_no    = trim($data[1] ?? '');
                        $box_code    = trim($data[2] ?? '');
                        $slot_no     = trim($data[3] ?? '');
                        $product_name = trim($data[4] ?? '');

                        if (empty($rack_name) || empty($level_no) || empty($box_code) || empty($slot_no) || empty($product_name)) {
                        continue;
                    }

                    // 1. Find Rack
                    $stmt = $condb->prepare("SELECT id FROM racks WHERE name = ? LIMIT 1");
                    $stmt->bind_param("s", $rack_name);
                    $stmt->execute();
                    $rack = $stmt->get_result()->fetch_assoc();
                    if (!$rack) {
                        $error_list[] = "Row $row_idx: Rack '$rack_name' not found";
                        continue;
                    }
                    $rack_id = $rack['id'];

                    // 2. Find Level
                    $stmt = $condb->prepare("SELECT id FROM levels WHERE rack_id = ? AND level_no = ? LIMIT 1");
                    $stmt->bind_param("ii", $rack_id, $level_no);
                    $stmt->execute();
                    $level = $stmt->get_result()->fetch_assoc();
                    if (!$level) {
                        $error_list[] = "Row $row_idx: Level '$level_no' not found in Rack '$rack_name'";
                        continue;
                    }
                    $level_id = $level['id'];

                    // 3. Find Box
                    $stmt = $condb->prepare("SELECT id FROM boxes WHERE level_id = ? AND box_code = ? LIMIT 1");
                    $stmt->bind_param("is", $level_id, $box_code);
                    $stmt->execute();
                    $box = $stmt->get_result()->fetch_assoc();
                    if (!$box) {
                        $error_list[] = "Row $row_idx: Box '$box_code' not found in Level '$level_no'";
                        continue;
                    }
                    $box_id = $box['id'];

                    // 4. Find Slot
                    $stmt = $condb->prepare("SELECT id FROM slots WHERE box_id = ? AND slot_no = ? LIMIT 1");
                    $stmt->bind_param("ii", $box_id, $slot_no);
                    $stmt->execute();
                    $slot = $stmt->get_result()->fetch_assoc();
                    if (!$slot) {
                        $error_list[] = "Row $row_idx: Slot #$slot_no not found in Box '$box_code'";
                        continue;
                    }
                    $slot_id = $slot['id'];

                    // 5. Check duplicate product name or slot
                    // Is slot already taken?
                    $stmt = $condb->prepare("SELECT id FROM products WHERE slot_id = ? LIMIT 1");
                    $stmt->bind_param("i", $slot_id);
                    $stmt->execute();
                    $prod_at_slot = $stmt->get_result()->fetch_assoc();

                    // Does product name already exist?
                    $stmt = $condb->prepare("SELECT id FROM products WHERE name = ? LIMIT 1");
                    $stmt->bind_param("s", $product_name);
                    $stmt->execute();
                    $prod_by_name = $stmt->get_result()->fetch_assoc();

                    if ($prod_at_slot) {
                        // Update existing product at this slot
                        $stmt = $condb->prepare("UPDATE products SET name = ? WHERE id = ?");
                        $stmt->bind_param("si", $product_name, $prod_at_slot['id']);
                        $stmt->execute();
                        $success_count++;
                    } else if ($prod_by_name) {
                        // Move existing product to this new slot
                        $stmt = $condb->prepare("UPDATE products SET slot_id = ? WHERE id = ?");
                        $stmt->bind_param("ii", $slot_id, $prod_by_name['id']);
                        $stmt->execute();
                        $success_count++;
                    } else {
                        // Insert new product mapping
                        $stmt = $condb->prepare("INSERT INTO products (name, slot_id, qty) VALUES (?, ?, 0)");
                        $stmt->bind_param("si", $product_name, $slot_id);
                        $stmt->execute();
                        $success_count++;
                    }
                }

                if (empty($error_list)) {
                    $condb->commit();
                    $isEN = __('logout') == 'Logout';
                    $message = ($isEN ? "✅ Successfully processed " : "✅ ดำเนินการสำเร็จ ") . $success_count . " " . ($isEN ? "items" : "รายการ");
                    $message_type = "success";
                } else {
                    $condb->rollback();
                    $message = (__('logout') == 'Logout' ? "❌ Process failed. See errors below." : "❌ การดำเนินการล้มเหลว โปรดดูข้อผิดพลาดด้านล่าง");
                    $message_type = "error";
                    $message .= "<ul style='text-align:left; font-size:0.8rem; margin-top:10px;'>" . implode("", array_map(fn($e) => "<li>" . htmlspecialchars($e) . "</li>", $error_list)) . "</ul>";
                }
            } catch (Exception $e) {
                $condb->rollback();
                $message = (__('logout') == 'Logout' ? "❌ Error: " : "❌ ผิดพลาด: ") . $e->getMessage();
                $message_type = "error";
            }
            fclose($handle);
        }
    }
}
$page_title = __('logout') == 'Logout' ? 'Import Product Mapping' : 'นำเข้าข้อมูลแผนผังสินค้า';
$page_icon = 'fa-file-import';
$show_home = true;
?>

<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'th') ?>">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= __('logout') == 'Logout' ? 'Import Product Mapping' : 'นำเข้าข้อมูลแผนผังสินค้า' ?> | Visual Location Management</title>
    <link rel="icon" type="image/png" href="assets/favicon.png">
    <link href="plugins/google-fonts/fonts.css" rel="stylesheet">
    <link href="plugins/font-awesome/all.css" rel="stylesheet">
    <link href="plugins/font-awesome/v4-font-face.css" rel="stylesheet">
        <link rel="stylesheet" href="assets/factory.css?v=20260611">
    <link rel="stylesheet" href="assets/pages-common.css?v=20260607">
    <link rel="stylesheet" href="assets/pages/import-product-mapping.css?v=20260607">
</head>

<body class="factory-app">
<?php require __DIR__ . '/includes/layout_header.php'; ?>
<main class="fx-main fx-main--narrow">
    <div class="container">
        <div class="fx-scan-toolbar" style="margin-bottom:1rem;">
            <a href="admin#products" class="fx-btn fx-btn-secondary"><i class="fas fa-arrow-left"></i>
                <?= __('logout') == 'Logout' ? 'Back' : 'กลับ' ?></a>
        </div>

        <div class="card">
            <h2 style="margin-top:0;">📂 <?= __('logout') == 'Logout' ? 'Import Product Mapping' : 'นำเข้าแผนผังสินค้า (Mapping)' ?>
            </h2>

            <?php if ($message): ?>
                <div class="alert alert-<?= $message_type ?>">
                    <?= $message ?>
                </div>
            <?php endif; ?>

            <form method="POST" enctype="multipart/form-data">
                <label
                    style="display:block; margin-bottom:10px; font-weight:600;"><?= __('logout') == 'Logout' ? 'Select CSV File' : 'เลือกไฟล์ CSV' ?></label>
                <div class="upload-box" onclick="document.getElementById('fileInp').click()">
                    <i class="fas fa-file-csv fa-3x" style="color:#94a3b8; margin-bottom:15px;"></i>
                    <div style="color:#64748b;">
                        <?= __('logout') == 'Logout' ? 'Click to select or drag and drop file here' : 'คลิกเพื่อเลือกไฟล์ หรือลากไฟล์มาวางที่นี่' ?>
                    </div>
                    <input type="file" name="mapping_csv" id="fileInp" accept=".csv" style="display:none" required
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
                    Rack, Level, BoxCode, SlotNo, ProductName<br>
                    A, 1, B-001, 1, Product-X<br>
                    A, 1, B-001, 2, Product-Y<br>
                    B, 2, C-005, 1, Product-Z
                </div>
                <p style="font-size:0.85rem; color:#64748b; margin-top:5px;">*
                    <?= __('logout') == 'Logout' ? 'Infrastructure (Rack/Level/Box) must exist before importing mapping.' : 'ข้อมูลโครงสร้าง (Rack/Level/Box) ต้องถูกตั้งค่าไว้ก่อนแล้วในระบบ' ?>
                </p>
            </div>
        </div>
    </div>
    <script src="assets/factory.js"></script>
</main>
<?php require __DIR__ . '/includes/layout_footer.php'; ?>
</body>

</html>
