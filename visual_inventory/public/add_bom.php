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

/* ===== โหลดรุ่น ===== */
$models = [];
$sql = "SELECT id, model_code FROM models ORDER BY model_code";
$result = $condb->query($sql);
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $models[] = $row;
    }
}

/* ===== โหลด material ===== */
$materials = [];
$sql = "SELECT id, material_code FROM materials ORDER BY material_code";
$result = $condb->query($sql);
if ($result) {
    while ($row = $result->fetch_assoc()) {
        $materials[] = $row;
    }
}

$success = false;
$error = "";

/* ===== บันทึกข้อมูล ===== */
if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    $model_id = $_POST['model_id'];
    $revision = trim($_POST['revision']);
    $material_id = $_POST['material_id'];
    $qty = floatval($_POST['qty']);

    if (empty($model_id) || empty($revision) || empty($material_id)) {
        $error = __('logout') == 'Logout' ? 'Please fill in all fields' : 'กรุณากรอกข้อมูลให้ครบถ้วน';
    } else {
        try {
            /* 1) หา revision */
            $stmt = $condb->prepare("SELECT id FROM model_revisions WHERE model_id = ? AND revision = ?");
            $stmt->bind_param("is", $model_id, $revision);
            $stmt->execute();
            $rev = $stmt->get_result()->fetch_assoc();

            if (!$rev) {
                $stmt = $condb->prepare("INSERT INTO model_revisions (model_id, revision) VALUES (?, ?)");
                $stmt->bind_param("is", $model_id, $revision);
                $stmt->execute();
                $revision_id = $stmt->insert_id;
            } else {
                $revision_id = $rev['id'];
            }

            /* 2) ตรวจสอบว่ามี Material นี้ใน Revision นี้แล้วหรือยัง */
            $chk_dup = $condb->prepare("SELECT id FROM bom_items WHERE revision_id = ? AND material_id = ?");
            $chk_dup->bind_param("ii", $revision_id, $material_id);
            $chk_dup->execute();
            if ($chk_dup->get_result()->num_rows > 0) {
                $isEN = __('logout') == 'Logout';
                $error = $isEN ? "Duplicate Error: This Material already exists in this BOM (Revision $revision)" : "Duplicate Error: Material นี้มีอยู่ใน BOM (Revision $revision) นี้แล้ว ไม่สามารถเพิ่มซ้ำได้";
            } else {
                /* 3) เพิ่ม BOM Item ใหม่ */
                $item_list = trim($_POST['item_list'] ?? '');
                $unit = trim($_POST['unit'] ?? '');
                $stmt = $condb->prepare("INSERT INTO bom_items (revision_id, material_id, qty, item_list, unit) VALUES (?, ?, ?, ?, ?)");
                $stmt->bind_param("iidss", $revision_id, $material_id, $qty, $item_list, $unit);

                if ($stmt->execute()) {
                    $success = true;
                } else {
                    $isEN = __('logout') == 'Logout';
                    $error = ($isEN ? "Error: " : "เกิดข้อผิดพลาด: ") . $stmt->error;
                }
            }
        } catch (Exception $e) {
            $error = "Error: " . $e->getMessage();
        }
    }
}
$page_title = __('logout') == 'Logout' ? 'Add BOM' : 'เพิ่ม BOM';
$page_icon = 'fa-plus-circle';
$show_home = true;
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'th') ?>">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= __('logout') == 'Logout' ? 'Add BOM' : 'เพิ่ม BOM' ?> | Visual Location Management</title>
    <!-- CSS -->
    <link rel="icon" type="image/png" href="assets/favicon.png">
    <link href="plugins/google-fonts/fonts.css" rel="stylesheet">
    <link href="plugins/font-awesome/all.css" rel="stylesheet">
    <link href="plugins/font-awesome/v4-font-face.css" rel="stylesheet">
    <link rel="stylesheet" href="assets/factory.css?v=20260611">
    <!-- Select2 CSS -->
    <link href="plugins/select2/select2.min.css" rel="stylesheet" />

        <link rel="stylesheet" href="assets/factory.css?v=20260611">
    <link rel="stylesheet" href="assets/pages-common.css?v=20260607">
    <link rel="stylesheet" href="assets/pages/add-bom.css?v=20260607">
</head>

<body class="factory-app">
<?php require __DIR__ . '/includes/layout_header.php'; ?>
<main class="fx-main fx-main--narrow">
    <div class="container">
        <div class="fx-scan-toolbar" style="margin-bottom:1rem;justify-content:space-between;">
            <a href="view_bom" class="fx-btn fx-btn-secondary"><i class="fas fa-arrow-left"></i>
                <?= __('back') == 'Back' ? 'Back to BOM List' : 'กลับไปรายการ BOM' ?></a>
            <a href="import_bom_csv" class="fx-btn fx-btn-secondary"><i class="fas fa-file-csv"></i>
                <?= __('logout') == 'Logout' ? 'Import CSV' : 'นำเข้าไฟล์ CSV' ?></a>
        </div>

        <div class="card">
            <h2><i class="fas fa-plus-circle" style="color:var(--primary);"></i>
                <?= __('logout') == 'Logout' ? 'Add BOM Data' : 'เพิ่มข้อมูล BOM' ?></h2>

            <?php if ($success): ?>
                <div class="alert alert-success" id="success-alert">
                    <i class="fas fa-check-circle"></i> <?= __('save_success') ?>
                </div>
                <script>
                    setTimeout(function () {
                        var alert = document.getElementById('success-alert');
                        alert.style.transition = "opacity 0.5s ease";
                        alert.style.opacity = 0;
                        setTimeout(function () {
                            alert.style.display = "none";
                        }, 500);
                    }, 1500);
                </script>
            <?php endif; ?>

            <?php if ($error): ?>
                <div class="alert alert-error">
                    <i class="fas fa-exclamation-circle"></i> <?= htmlspecialchars($error) ?>
                </div>
            <?php endif; ?>

            <form method="post">
                <!-- รุ่น -->
                <label><?= __('logout') == 'Logout' ? 'Model' : 'รุ่นงาน (Model)' ?></label>
                <select name="model_id" id="model_id" class="searchable-select" required autofocus>
                    <option value="">-- <?= __('logout') == 'Logout' ? 'Select Model' : 'เลือกรุ่น' ?> --</option>
                    <?php foreach ($models as $m): ?>
                        <option value="<?= $m['id'] ?>">
                            <?= htmlspecialchars($m['model_code']) ?>
                        </option>
                    <?php endforeach; ?>
                </select>

                <!-- Revision -->
                <label>Revision</label>
                <input type="text" name="revision" maxlength="5" placeholder="Ex: 01, A" required>

                <!-- Material -->
                <label><?= __('logout') == 'Logout' ? 'Material (Searchable)' : 'Material (ค้นหาได้)' ?></label>
                <select name="material_id" class="searchable-select" required>
                    <option value="">-- <?= __('logout') == 'Logout' ? 'Select Material' : 'เลือก Material' ?> --
                    </option>
                    <?php foreach ($materials as $mt): ?>
                        <option value="<?= $mt['id'] ?>">
                            <?= htmlspecialchars($mt['material_code']) ?>
                        </option>
                    <?php endforeach; ?>
                </select>

                <label><?= __('logout') == 'Logout' ? 'Item List' : 'รายการ (Item List)' ?></label>
                <input type="text" name="item_list"
                    placeholder="<?= __('logout') == 'Logout' ? 'Item name or sequence' : 'ชื่อรายการหรือลำดับ' ?>">

                <!-- Unit -->
                <label><?= __('logout') == 'Logout' ? 'Unit' : 'หน่วย (Unit)' ?></label>
                <input type="text" name="unit"
                    placeholder="<?= __('logout') == 'Logout' ? 'e.g. Pcs, Set, Roll' : 'เช่น Pcs, Set, Roll' ?>">

                <!-- จำนวน -->
                <label><?= __('logout') == 'Logout' ? 'Quantity' : 'จำนวนที่ใช้ (Quantity)' ?></label>
                <input type="number" name="qty" min="0" step="0.0001" placeholder="0.00" required>

                <button type="submit" class="btn-primary"><i class="fas fa-save"></i> <?= __('save_btn') ?></button>
            </form>
        </div>
    </div>

    <!-- Scripts for Select2 -->
    <script src="plugins/jquery/jquery.min.js"></script>
    <script src="plugins/select2/select2.min.js"></script>
    <script>
        $(document).ready(function () {
            $('.searchable-select').select2({
                width: '100%',
                placeholder: function () {
                    $(this).data('placeholder');
                },
                allowClear: true
            });

            // Fix input focus style matching
            $('.select2-selection').on('focus', function () {
                $(this).addClass('focused');
            }).on('blur', function () {
                $(this).removeClass('focused');
            });

            // Focus on model_id select
            $('#model_id').select2('open');
            setTimeout(() => {
                $('.select2-search__field').focus();
            }, 100);
        });
    </script>
    <script src="assets/factory.js"></script>
</main>
<?php require __DIR__ . '/includes/layout_footer.php'; ?>
</body>

</html>
