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

// Handle Delete Action
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['action']) && $_POST['action'] === 'delete') {
    $del_id = intval($_POST['model_id']);

    // 1. Get Model Revisions
    $revs = $condb->query("SELECT id FROM model_revisions WHERE model_id = $del_id");
    while ($r = $revs->fetch_assoc()) {
        $rid = $r['id'];
        // Delete BOM Items
        $condb->query("DELETE FROM bom_items WHERE revision_id = $rid");
    }

    // Delete Revisions
    $condb->query("DELETE FROM model_revisions WHERE model_id = $del_id");

    // Delete Model
    if ($condb->query("DELETE FROM models WHERE id = $del_id")) {
        echo "<script>
            setTimeout(() => {
                // Must load SweetAlert first for this to work, but since we echo it before HTML, it's tricky.
                // Better to set a session flag or just simple redirect with parameter?
                // For simplicity in this structure:
                window.location.href='view_bom?msg=deleted';
            }, 100);
        </script>";
        // We will catch 'msg=deleted' in JS below
    } else {
        $error_msg = (__('logout') == 'Logout' ? 'Delete Failed' : 'เกิดข้อผิดพลาดในการลบ');
        echo "<script>alert('$error_msg');</script>";
    }
}

// Query to list Models and their latest revision count
$sql = "
SELECT 
    m.id, 
    m.model_code, 
    m.description, 
    COUNT(DISTINCT r.id) as rev_count, 
    MAX(r.revision) as latest_rev,
    MAX(r.created_at) as last_updated
FROM models m
LEFT JOIN model_revisions r ON m.id = r.model_id
GROUP BY m.id
ORDER BY m.id DESC
";

$result = $condb->query($sql);

$page_title = __('bom_title');
$page_icon = 'fa-layer-group';
$show_home = true;
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'th') ?>">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= __('bom_title') ?> | Visual Location Management</title>
    <!-- Fonts & Icons -->
    <link rel="icon" type="image/png" href="assets/favicon.png">
    <link href="plugins/google-fonts/fonts.css" rel="stylesheet">
    <link href="plugins/font-awesome/all.css" rel="stylesheet">
    <link href="plugins/font-awesome/v4-font-face.css" rel="stylesheet">
    <link rel="stylesheet" href="assets/factory.css?v=20260611">
    <script src="plugins/sweetalert2/sweetalert2.all.min.js"></script>
        <link rel="stylesheet" href="assets/factory.css?v=20260611">
    <link rel="stylesheet" href="assets/pages-common.css?v=20260607">
    <link rel="stylesheet" href="assets/pages/view-bom.css?v=20260607">
</head>

<body class="factory-app">
<?php require __DIR__ . '/includes/layout_header.php'; ?>
<main class="fx-main fx-main--narrow">
    <div class="container">
        <p style="margin:0 0 1.5rem;color:var(--text-light);">
            <?= __('logout') == 'Logout' ? 'Manage Material items and BOM structures' : 'บริหารจัดการข้อมูล Material และโครงสร้าง BOM' ?>
        </p>

        <div class="card" style="padding: 60px 40px; text-align: center;">
            <i class="fas fa-boxes" style="font-size: 5rem; color: #cbd5e1; margin-bottom: 25px;"></i>
            <h2 style="margin-bottom: 15px;"><?= __('logout') == 'Logout' ? 'Model Management moved to API' : 'การจัดการรุ่นงานถูกย้ายไปยังระบบ API' ?></h2>
            <p style="color: var(--text-light); max-width: 600px; margin: 0 auto 35px; font-size: 1.1rem;">
                <?= __('logout') == 'Logout' ? 'Production model data is now retrieved from web services. Use the buttons below to manage local material mappings and BOM rules.' : 'ข้อมูลรุ่นงานสำหรับการผลิตถูกดึงผ่าน Web Service โดยตรงแล้ว ท่านยังสามารถจัดการข้อมูล Material และโครงสร้างการเบิก (BOM) ได้ที่นี่' ?>
            </p>
            <div style="display: flex; justify-content: center; gap: 20px; flex-wrap: wrap;">
                <a href="add_material" class="btn btn-primary" style="padding: 15px 30px; font-size: 1.1rem;"><i class="fas fa-cube"></i> <?= __('logout') == 'Logout' ? 'Manage Materials' : 'จัดการ Material' ?></a>
                <a href="add_bom" class="btn btn-outline" style="padding: 15px 30px; font-size: 1.1rem;"><i class="fas fa-plus-circle"></i> <?= __('logout') == 'Logout' ? 'Create BOM Rule' : 'สร้างเงื่อนไข BOM' ?></a>
            </div>
        </div>
    </div>

    <script>
        // Check for success message from URL
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('msg') === 'deleted') {
            Swal.fire({
                icon: 'success',
                title: '<?= __('logout') == 'Logout' ? 'Success' : 'สำเร็จ' ?>',
                text: '<?= __('logout') == 'Logout' ? 'BOM and Model deleted successfully' : 'ลบข้อมูล BOM และ Model เรียบร้อยแล้ว' ?>',
                timer: 2000,
                showConfirmButton: false
            }).then(() => {
                // Remove param from URL
                window.history.replaceState(null, null, window.location.pathname);
            });
        }

        function confirmDelete(id, modelCode) {
            const isEN = <?= json_encode($_SESSION['lang'] == 'en') ?>;
            Swal.fire({
                title: isEN ? 'Confirm Delete?' : 'ยืนยันการลบ?',
                html: isEN ? `Are you sure you want to delete Model <b>${modelCode}</b> <br><br>⚠️ All BOM data and History will be permanently deleted!<br>Type model name <b>"${modelCode}"</b> to confirm:` : `คุณแน่ใจหรือไม่ที่จะลบ Model <b>${modelCode}</b> <br><br>⚠️ ข้อมูล BOM และ History ทั้งหมดของ Model นี้จะถูกลบถาวร!<br>พิมพ์ชื่อ Model <b>"${modelCode}"</b> เพื่อยืนยัน:`,
                icon: 'warning',
                input: 'text',
                inputAttributes: {
                    autocapitalize: 'off',
                    placeholder: modelCode
                },
                showCancelButton: true,
                confirmButtonText: isEN ? 'Yes, delete it' : 'ใช่, ลบทิ้งเลย',
                confirmButtonColor: '#ef4444',
                cancelButtonText: isEN ? 'Cancel' : 'ยกเลิก',
                preConfirm: (inputValue) => {
                    if (inputValue !== modelCode) {
                        Swal.showValidationMessage(isEN ? `Incorrect model name (must match "${modelCode}")` : `ชื่อ Model ไม่ถูกต้อง (ต้องตรงกับ "${modelCode}")`)
                    }
                    return true;
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    const form = document.createElement('form');
                    form.method = 'POST';
                    form.action = 'view_bom.php';

                    const actInput = document.createElement('input');
                    actInput.type = 'hidden';
                    actInput.name = 'action';
                    actInput.value = 'delete';

                    const idInput = document.createElement('input');
                    idInput.type = 'hidden';
                    idInput.name = 'model_id';
                    idInput.value = id;

                    form.appendChild(actInput);
                    form.appendChild(idInput);
                    document.body.appendChild(form);
                    form.submit();
                }
            })
        }
    </script>
    <script src="assets/factory.js"></script>
</main>
<?php require __DIR__ . '/includes/layout_footer.php'; ?>
</body>

</html>
