<?php
require_once("../config/condb.php");
require_once("../config/session_check.php");
require_once("../config/helpers.php");
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
$error = "";

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $material_code = trim($_POST['material_code']);
    $description = trim($_POST['description'] ?? ''); // Optional description
    $edit_id = isset($_POST['edit_id']) ? intval($_POST['edit_id']) : 0;

    if ($material_code === '') {
        $isEN = __('logout') == 'Logout';
        $error = $isEN ? "Please enter Material Code" : "กรุณากรอกรหัส Material";
    } else {
        if ($edit_id > 0) {
            // Update Mode
            $stmt = $condb->prepare("UPDATE materials SET material_code = ?, description = ? WHERE id = ?");
            $stmt->bind_param("ssi", $material_code, $description, $edit_id);
            if ($stmt->execute()) {
                $success = true;
            } else {
                $isEN = __('logout') == 'Logout';
                $error = $isEN ? "Error updating data" : "เกิดข้อผิดพลาดในการแก้ไขข้อมูล";
            }
        } else {
            // Insert Mode
            $stmt = $condb->prepare("INSERT INTO materials (material_code, description) VALUES (?, ?)");
            $stmt->bind_param("ss", $material_code, $description);
            try {
                if ($stmt->execute()) {
                    $success = true;
                } else {
                    $isEN = __('logout') == 'Logout';
                    $error = $isEN ? "Material already exists or error occurred" : "Material นี้มีอยู่แล้วหรือเกิดข้อผิดพลาด";
                }
            } catch (Exception $e) {
                $isEN = __('logout') == 'Logout';
                $error = $isEN ? "Material already exists" : "Material นี้มีอยู่แล้ว";
            }
        }
    }
}

// Search & Pagination Logic
$limit = 10; // Items per page
$page = isset($_GET['page']) ? max(1, intval($_GET['page'])) : 1;
$offset = ($page - 1) * $limit;
$search = isset($_GET['search']) ? trim($_GET['search']) : '';

// Build Search SQL
$where_clause = "";
if ($search !== "") {
    $search_safe = $condb->real_escape_string($search);
    $where_clause = " WHERE material_code LIKE '%$search_safe%' OR description LIKE '%$search_safe%' ";
}

// Count total items
$count_sql = "SELECT COUNT(*) as total FROM materials $where_clause";
$total_rows = $condb->query($count_sql)->fetch_assoc()['total'];
$total_pages = ceil($total_rows / $limit);

// Fetch materials for current page
$materials = $condb->query("SELECT * FROM materials $where_clause ORDER BY id DESC LIMIT $limit OFFSET $offset");

// Check if Edit Mode via GET
$edit_data = null;
if (isset($_GET['edit'])) {
    $id = intval($_GET['edit']);
    $stmt = $condb->prepare("SELECT * FROM materials WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $result = $stmt->get_result();
    if ($result->num_rows > 0) {
        $edit_data = $result->fetch_assoc();
    }
}
$page_title = __('logout') == 'Logout' ? 'Manage Material' : 'จัดการ Material';
$page_icon = 'fa-cube';
$show_home = true;
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'th') ?>">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= __('logout') == 'Logout' ? 'Manage Material' : 'จัดการ Material' ?> | Visual Location Management</title>
    <link rel="icon" type="image/png" href="assets/favicon.png">
    <link href="plugins/google-fonts/fonts.css" rel="stylesheet">
    <link href="plugins/font-awesome/all.css" rel="stylesheet">
    <link href="plugins/font-awesome/v4-font-face.css" rel="stylesheet">
        <link rel="stylesheet" href="assets/factory.css?v=20260611">
    <link rel="stylesheet" href="assets/pages-common.css?v=20260607">
    <link rel="stylesheet" href="assets/pages/add-material.css?v=20260613">
</head>

<body class="factory-app factory-add-material">
<?php require __DIR__ . '/includes/layout_header.php'; ?>
<main class="fx-main">
    <div class="container">

        <div class="card">
            <h2>
                <i class="fas <?= $edit_data ? 'fa-edit' : 'fa-cube' ?>" style="color:var(--primary);"></i>
                <?= $edit_data ? (__('logout') == 'Logout' ? 'Edit Material' : 'แก้ไข Material') : (__('logout') == 'Logout' ? 'Add New Material' : 'เพิ่ม Material ใหม่') ?>
            </h2>

            <?php if ($success): ?>
                <div class="alert alert-success">
                    <i class="fas fa-check-circle"></i>
                    <?= $edit_data ? (__('logout') == 'Logout' ? 'Updated successfully' : 'แก้ไขข้อมูลเรียบร้อย') : (__('logout') == 'Logout' ? 'Saved successfully' : 'บันทึกข้อมูลเรียบร้อย') ?>
                    <?php if ($edit_data):
                        echo '<script>setTimeout(() => window.location="add_material", 1500);</script>';
                    endif; ?>
                </div>
            <?php endif; ?>

            <?php if ($error): ?>
                <div class="alert alert-error">
                    <i class="fas fa-exclamation-circle"></i> <?= htmlspecialchars($error) ?>
                </div>
            <?php endif; ?>

            <form method="post" action="add_material" class="am-form">
                <?php if ($edit_data): ?>
                    <input type="hidden" name="edit_id" value="<?= $edit_data['id'] ?>">
                <?php endif; ?>

                <div class="am-form-grid">
                    <div class="am-field">
                        <label class="fx-field-label" for="material_code">
                            <?= __('logout') == 'Logout' ? 'Material Code' : 'รหัส Material' ?>
                        </label>
                        <input type="text" class="am-input" name="material_code" id="material_code"
                            placeholder="<?= __('logout') == 'Logout' ? 'e.g. MAT-001' : 'เช่น MAT-001' ?>"
                            value="<?= $edit_data ? htmlspecialchars($edit_data['material_code']) : '' ?>" required
                            <?= $edit_data ? '' : 'autofocus' ?>>
                    </div>
                    <div class="am-field">
                        <label class="fx-field-label" for="material_description">
                            <?= __('logout') == 'Logout' ? 'Description' : 'รายละเอียด' ?>
                            <span class="am-optional"><?= __('logout') == 'Logout' ? '(optional)' : '(ไม่บังคับ)' ?></span>
                        </label>
                        <input type="text" class="am-input" name="description" id="material_description"
                            placeholder="<?= __('logout') == 'Logout' ? 'e.g. Metal sheet 10×10 cm' : 'เช่น แผ่นเหล็กขนาด 10×10 cm' ?>"
                            value="<?= $edit_data ? htmlspecialchars($edit_data['description']) : '' ?>">
                    </div>
                </div>

                <div class="am-form-actions">
                    <button type="submit" class="fx-btn fx-btn-accent am-btn-submit">
                        <i class="fas <?= $edit_data ? 'fa-save' : 'fa-plus' ?>" aria-hidden="true"></i>
                        <?= __('save_btn') ?>
                    </button>
                    <?php if ($edit_data): ?>
                        <a href="add_material" class="fx-btn fx-btn-secondary">
                            <?= __('logout') == 'Logout' ? 'Cancel' : 'ยกเลิก' ?>
                        </a>
                    <?php endif; ?>
                </div>
            </form>
        </div>

        <!-- Table Section -->
        <div class="am-list-toolbar">
            <div class="am-toolbar-top">
                <h3 class="section-title">
                    <i class="fas fa-list" aria-hidden="true"></i>
                    <?= __('logout') == 'Logout' ? 'All Materials' : 'รายการ Material ทั้งหมด' ?>
                </h3>
                <div class="am-toolbar-actions">
                    <a href="export_materials?search=<?= urlencode($search) ?>" class="fx-btn fx-btn-secondary am-btn-export">
                        <i class="fas fa-file-excel" aria-hidden="true"></i>
                        <?= __('logout') == 'Logout' ? 'Export Excel' : 'ส่งออก Excel' ?>
                    </a>
                    <a href="import_materials_csv" class="fx-btn fx-btn-secondary">
                        <i class="fas fa-file-csv" aria-hidden="true"></i>
                        <?= __('logout') == 'Logout' ? 'Import CSV' : 'นำเข้า CSV' ?>
                    </a>
                </div>
            </div>

            <form method="GET" class="am-search-row" role="search">
                <label class="am-search-row__label" for="amSearch">
                    <?= __('logout') == 'Logout' ? 'Search materials' : 'ค้นหา Material' ?>
                </label>
                <div class="am-search-row__input">
                    <i class="fas fa-search am-search-row__icon" aria-hidden="true"></i>
                    <input type="search" class="am-input am-input--search" id="amSearch" name="search"
                        placeholder="<?= __('logout') == 'Logout' ? 'Material code or description…' : 'รหัส Material หรือรายละเอียด…' ?>"
                        value="<?= htmlspecialchars($search) ?>"
                        autocomplete="off">
                </div>
                <div class="am-search-row__buttons">
                    <button type="submit" class="fx-btn fx-btn-accent">
                        <i class="fas fa-search" aria-hidden="true"></i> <?= __('search_btn') ?>
                    </button>
                    <?php if ($search !== ''): ?>
                        <a href="add_material" class="fx-btn fx-btn-secondary">
                            <?= __('logout') == 'Logout' ? 'Clear' : 'ล้างค่า' ?>
                        </a>
                    <?php endif; ?>
                </div>
            </form>
        </div>

        <div class="table-container">
            <table>
                <thead>
                    <tr>
                        <th width="30%">Material Code</th>
                        <th width="50%">Description</th>
                        <th width="20%" style="text-align:right;">Action</th>
                    </tr>
                </thead>
                <tbody>
                    <?php if ($materials && $materials->num_rows > 0): ?>
                        <?php while ($row = $materials->fetch_assoc()): ?>
                            <tr>
                                <td style="font-weight:500;"><?= htmlspecialchars($row['material_code']) ?></td>
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

        <!-- Pagination Controls -->
        <?php
        $amIsEN = (($_SESSION['lang'] ?? 'th') === 'en');
        $amPaginationMeta = ($amIsEN ? 'Page ' : 'หน้า ') . $page
            . ($amIsEN ? ' of ' : ' จาก ') . $total_pages
            . ' (' . ($amIsEN ? 'Total ' : 'ทั้งหมด ') . number_format((int) $total_rows)
            . ($amIsEN ? ' items' : ' รายการ') . ')';
        echo render_pagination_html($page, (int) $total_pages, pagination_href_prefix($_GET), [
            'meta' => $amPaginationMeta,
        ]);
        ?>
    </div>

    <script>
        window.onload = function() {
            const mc = document.getElementById('material_code');
            if (mc) mc.focus();
        };
    </script>
    <script src="assets/factory.js"></script>
</main>
<?php require __DIR__ . '/includes/layout_footer.php'; ?>
</body>

</html>
