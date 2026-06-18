<?php
require_once("../config/condb.php");
require_once("../config/session_check.php");
require_once("../config/helpers.php");
require_once __DIR__ . '/../config/app_settings_service.php';
require_once __DIR__ . '/../config/fifo_service.php';
require_once __DIR__ . '/../config/box_admin_service.php';

if ($_SESSION['role'] !== 'admin') {
    $msg = __('admin_only');
    echo "<script>alert('$msg'); window.location='index';</script>";
    exit;
}

// ---- ฟังก์ชันช่วย ----
function insertData($condb, $table, $data)
{
    $cols = implode(",", array_keys($data));
    $vals = implode(",", array_fill(0, count($data), "?"));
    $stmt = $condb->prepare("INSERT INTO $table ($cols) VALUES ($vals)");
    $stmt->bind_param(str_repeat("s", count($data)), ...array_values($data));
    return $stmt->execute();
}

function updateData($condb, $table, $data, $id)
{
    $set = implode(",", array_map(fn($c) => "$c=?", array_keys($data)));
    $stmt = $condb->prepare("UPDATE $table SET $set WHERE id=?");
    $types = str_repeat("s", count($data)) . "i";
    $values = array_merge(array_values($data), [$id]);
    $stmt->bind_param($types, ...$values);
    return $stmt->execute();
}

function deleteData($condb, $table, $id)
{
    $id = (int) $id;

    // Handle cascading deletes for related records
    if ($table === 'racks') {
        $levels = $condb->prepare("SELECT id FROM levels WHERE rack_id = ?");
        $levels->bind_param("i", $id);
        $levels->execute();
        $levelsRes = $levels->get_result();
        while ($level = $levelsRes->fetch_assoc()) {
            deleteData($condb, 'levels', $level['id']);
        }
    } elseif ($table === 'levels') {
        $boxes = $condb->prepare("SELECT id FROM boxes WHERE level_id = ?");
        $boxes->bind_param("i", $id);
        $boxes->execute();
        $boxesRes = $boxes->get_result();
        while ($box = $boxesRes->fetch_assoc()) {
            deleteData($condb, 'boxes', $box['id']);
        }
    } elseif ($table === 'boxes') {
        $slots = $condb->prepare("SELECT id FROM slots WHERE box_id = ?");
        $slots->bind_param("i", $id);
        $slots->execute();
        $slotsRes = $slots->get_result();
        while ($slot = $slotsRes->fetch_assoc()) {
            $delProd = $condb->prepare("DELETE FROM products WHERE slot_id = ?");
            $slotId = (int) $slot['id'];
            $delProd->bind_param("i", $slotId);
            $delProd->execute();
        }
        $delSlots = $condb->prepare("DELETE FROM slots WHERE box_id = ?");
        $delSlots->bind_param("i", $id);
        $delSlots->execute();
    } elseif ($table === 'slots') {
        $delProd = $condb->prepare("DELETE FROM products WHERE slot_id = ?");
        $delProd->bind_param("i", $id);
        $delProd->execute();
    }

    // Now delete the main record
    $stmt = $condb->prepare("DELETE FROM $table WHERE id=?");
    $stmt->bind_param("i", $id);
    return $stmt->execute();
}

// ---- Pagination Helper ----
$limit = 10;
function getPagination($condb, $table, $limit, $page_param, $join = "")
{
    $page = isset($_GET[$page_param]) ? (int) $_GET[$page_param] : 1;
    if ($page < 1)
        $page = 1;
    $offset = ($page - 1) * $limit;

    $total_res = $condb->query("SELECT COUNT(*) as total FROM $table $join");
    $total_rows = $total_res->fetch_assoc()['total'];
    $total_pages = ceil($total_rows / $limit);

    return [
        'page' => $page,
        'offset' => $offset,
        'total_pages' => $total_pages,
        'total_rows' => $total_rows
    ];
}

function renderPagination($current_page, $total_pages, $page_param, $anchor = '')
{
    return render_pagination_html((int) $current_page, (int) $total_pages, '?' . $page_param . '=', [
        'href_suffix' => $anchor,
    ]);
}

$allowed_admin_tables = ['racks', 'levels', 'boxes', 'slots', 'products', 'ethernet_ios'];

// ---- การลบ ----
if (isset($_GET['delete'], $_GET['type'])) {
    $deleteType = $_GET['type'];
    if (in_array($deleteType, $allowed_admin_tables, true) && deleteData($condb, $deleteType, (int) $_GET['delete'])) {
        $_SESSION['success_msg'] = (__('logout') == 'Logout' ? "Deleted successfully!" : "ลบข้อมูลสำเร็จ!");
    } else {
        $_SESSION['error_msg'] = (__('logout') == 'Logout' ? "Error deleting data" : "เกิดข้อผิดพลาดในการลบข้อมูล");
    }
    header("Location: admin");
    exit;
}

// ---- ดึงข้อมูลแก้ไข ----
$edit_data = null;
if (isset($_GET['edit'], $_GET['type'])) {
    $id = (int) $_GET['edit'];
    $type = $_GET['type'];
    if (in_array($type, $allowed_admin_tables, true)) {
        $stmt = $condb->prepare("SELECT * FROM $type WHERE id=?");
        $stmt->bind_param("i", $id);
        $stmt->execute();
        $edit_data = $stmt->get_result()->fetch_assoc();
    }
}

// ---- Export Excel (CSV) ----
if (isset($_GET['export']) && $_GET['export'] === 'products') {
    header('Content-Type: text/csv; charset=utf-8');
    header('Content-Disposition: attachment; filename=Product_Mapping_' . date('Y-m-d') . '.csv');
    $output = fopen('php://output', 'w');

    // Add BOM for Excel UTF-8 compatibility
    fputs($output, "\xEF\xBB\xBF");

    // Headers
    fputcsv($output, ['ID', 'Rack', 'Level', 'Box Code', 'Slot No', 'Product Name (HanaPart)', 'Stock Qty']);

    // Query All Data
    $sql = "SELECT p.id, r.name as rack_name, l.level_no, b.box_code, sl.slot_no, p.name as product_name, p.qty 
            FROM products p 
            JOIN slots sl ON p.slot_id = sl.id 
            JOIN boxes b ON sl.box_id = b.id 
            JOIN levels l ON b.level_id = l.id 
            JOIN racks r ON l.rack_id = r.id 
            ORDER BY r.name, l.level_no, b.box_code, sl.slot_no";

    $result = $condb->query($sql);
    while ($row = $result->fetch_assoc()) {
        fputcsv($output, $row);
    }

    fclose($output);
    exit;
}

// ---- FIFO issue policy (admin + password) ----
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['fifo_settings_save'])) {
    $isEN = __('logout') === 'Logout';
    $userId = (int) ($_SESSION['user_id'] ?? 0);
    $password = (string) ($_POST['confirm_password'] ?? '');
    $newMode = trim((string) ($_POST['fifo_issue_mode'] ?? ''));
    $newDummyIm = strtoupper(trim((string) ($_POST['fifo_dummy_im'] ?? 'DUMMYBATCH')));

    if (!fifo_issue_mode_is_valid($newMode)) {
        $_SESSION['error_msg'] = $isEN ? 'Invalid FIFO mode.' : 'โหมด FIFO ไม่ถูกต้อง';
        header('Location: admin#fifo-settings');
        exit;
    }

    if ($newDummyIm === '') {
        $_SESSION['error_msg'] = $isEN ? 'Dummy Batch IM marker is required.' : 'ต้องระบุค่า Dummy Batch IM';
        header('Location: admin#fifo-settings');
        exit;
    }

    $auth = app_settings_verify_user_password($condb, $userId, $password);
    if (!$auth['ok']) {
        $_SESSION['error_msg'] = $isEN
            ? 'Password incorrect — FIFO settings not changed.'
            : 'รหัสผ่านไม่ถูกต้อง — ไม่ได้บันทึกการตั้งค่า FIFO';
        header('Location: admin#fifo-settings');
        exit;
    }

    $oldMode = fifo_get_issue_mode($condb);
    $oldDummy = fifo_get_dummy_im_marker($condb);
    app_setting_set($condb, APP_SETTING_FIFO_ISSUE_MODE, $newMode, $userId);
    app_setting_set($condb, APP_SETTING_FIFO_DUMMY_IM, $newDummyIm, $userId);

    if ($oldMode !== $newMode || $oldDummy !== $newDummyIm) {
        $_SESSION['success_msg'] = $isEN
            ? 'FIFO issue policy updated.'
            : 'บันทึกนโยบายการเบิกจ่าย (FIFO) แล้ว';
    } else {
        $_SESSION['success_msg'] = $isEN ? 'No changes to FIFO settings.' : 'ไม่มีการเปลี่ยนแปลงการตั้งค่า FIFO';
    }

    header('Location: admin#fifo-settings');
    exit;
}

$fifoCurrentMode = fifo_get_issue_mode($condb);
$fifoCurrentDummyIm = fifo_get_dummy_im_marker($condb);
$fifoUpdatedStmt = $condb->prepare('SELECT updated_at, updated_by FROM app_settings WHERE setting_key = ? LIMIT 1');
$fifoMetaKey = APP_SETTING_FIFO_ISSUE_MODE;
$fifoUpdatedStmt->bind_param('s', $fifoMetaKey);
$fifoUpdatedStmt->execute();
$fifoMetaRow = $fifoUpdatedStmt->get_result()->fetch_assoc();
$fifoUpdatedStmt->close();
$fifoUpdatedByName = '';
if (!empty($fifoMetaRow['updated_by'])) {
    $uid = (int) $fifoMetaRow['updated_by'];
    $uStmt = $condb->prepare('SELECT username FROM users WHERE id = ? LIMIT 1');
    $uStmt->bind_param('i', $uid);
    $uStmt->execute();
    $uRow = $uStmt->get_result()->fetch_assoc();
    $uStmt->close();
    $fifoUpdatedByName = $uRow['username'] ?? '';
}

$product_filter_box_id = isset($_GET['filter_box']) ? (int) $_GET['filter_box'] : 0;
$product_prefill_slot_id = isset($_GET['prefill_slot']) ? (int) $_GET['prefill_slot'] : 0;
$isEN = __('logout') === 'Logout';

// ---- การบันทึก/แก้ไข ----
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $success = false;
    $redirect_after_post = 'admin';
    
    // Sanitize empty strings to NULL
    if (isset($_POST['data']) && is_array($_POST['data'])) {
        foreach ($_POST['data'] as $key => $val) {
            if ($val === '') {
                $_POST['data'][$key] = null;
            }
        }
    }
    if (isset($_POST['action']) && $_POST['action'] === 'save') {
        $table = $_POST['table'];
        $data = $_POST['data'];

        // --- ระบบตรวจสอบข้อมูลซ้ำ ---
        $is_duplicate = false;
        if ($table === 'racks') {
            $check = $condb->prepare("SELECT id FROM racks WHERE name = ?");
            $check->bind_param("s", $data['name']);
            $check->execute();
            if ($check->get_result()->num_rows > 0)
                $is_duplicate = true;
        } elseif ($table === 'levels') {
            $check = $condb->prepare("SELECT id FROM levels WHERE rack_id = ? AND level_no = ?");
            $check->bind_param("ii", $data['rack_id'], $data['level_no']);
            $check->execute();
            if ($check->get_result()->num_rows > 0)
                $is_duplicate = true;
        } elseif ($table === 'boxes') {
            $check = $condb->prepare("SELECT id FROM boxes WHERE level_id = ? AND box_code = ?");
            $check->bind_param("is", $data['level_id'], $data['box_code']);
            $check->execute();
            if ($check->get_result()->num_rows > 0) {
                $is_duplicate = true;
                $_SESSION['error_msg'] = (__('logout') == 'Logout' ? "This Box Code already exists in this Level!" : "รหัส Box นี้มีอยู่แล้วใน Level นี้!");
            }
        } elseif ($table === 'slots') {
            $check = $condb->prepare("SELECT id FROM slots WHERE box_id = ? AND slot_no = ?");
            $check->bind_param("ii", $data['box_id'], $data['slot_no']);
            $check->execute();
            if ($check->get_result()->num_rows > 0)
                $is_duplicate = true;
        } elseif ($table === 'products') {
            // เช็คชื่อสินค้าซ้ำในระบบ
            $checkName = $condb->prepare("SELECT id FROM products WHERE name = ?");
            $checkName->bind_param("s", $data['name']);
            $checkName->execute();
            if ($checkName->get_result()->num_rows > 0) {
                $is_duplicate = true;
                $_SESSION['error_msg'] = (__('logout') == 'Logout' ? "This Product Name already exists!" : "ชื่อสินค้านี้มีอยู่แล้วในระบบ!");
            }

            // เช็คว่า Slot นี้ถูกจองไปแล้วหรือยัง
            $checkSlot = $condb->prepare("SELECT id FROM products WHERE slot_id = ?");
            $checkSlot->bind_param("i", $data['slot_id']);
            $checkSlot->execute();
            if ($checkSlot->get_result()->num_rows > 0) {
                $is_duplicate = true;
                $_SESSION['error_msg'] = (__('logout') == 'Logout' ? "This Slot already has a product!" : "Slot นี้มีสินค้าติดตั้งอยู่แล้ว ไม่สามารถเพิ่มได้!");
            }
        }

        if ($table === 'products' && !isset($data['qty'])) {
            $data['qty'] = 0;
        }

        if ($is_duplicate) {
            // error_msg is already set above
        } else {
            if (insertData($condb, $table, $data)) {
                $success = true;
                $_SESSION['success_msg'] = __('save_success');
                if ($table === 'boxes') {
                    $box_id = (int) $condb->insert_id;
                    $created_slots = box_admin_create_slots($condb, $box_id, (string) ($data['layout'] ?? '1x1'));
                    $_SESSION['success_msg'] = $isEN
                        ? "Box saved with {$created_slots} slot(s)."
                        : "บันทึก Box แล้ว สร้าง {$created_slots} ช่อง";
                } elseif ($table === 'products') {
                    $saved_slot_id = (int) ($data['slot_id'] ?? 0);
                    $filter_box = box_admin_slot_box_id($condb, $saved_slot_id);
                    $next_slot = box_admin_next_empty_slot($condb, $saved_slot_id);
                    $qs = [];
                    if ($filter_box > 0) {
                        $qs['filter_box'] = $filter_box;
                    }
                    if ($next_slot) {
                        $qs['prefill_slot'] = $next_slot;
                    }
                    $redirect_after_post = 'admin' . ($qs ? '?' . http_build_query($qs) : '') . '#products';
                }
            }
        }
    }

    if (isset($_POST['action']) && $_POST['action'] === 'edit') {
        $table = $_POST['table'];
        $id = (int) $_POST['id'];
        $data = $_POST['data'];

        if ($table === 'boxes') {
            $oldLayout = null;
            $oldStmt = $condb->prepare('SELECT layout FROM boxes WHERE id = ? LIMIT 1');
            $oldStmt->bind_param('i', $id);
            $oldStmt->execute();
            $oldRow = $oldStmt->get_result()->fetch_assoc();
            $oldStmt->close();
            $oldLayout = (string) ($oldRow['layout'] ?? '1x1');
            $newLayout = (string) ($data['layout'] ?? $oldLayout);

            $condb->begin_transaction();
            try {
                if (!updateData($condb, $table, $data, $id)) {
                    throw new RuntimeException($isEN ? 'Update failed' : 'แก้ไขไม่สำเร็จ');
                }

                $resize = ['ok' => true, 'added' => 0, 'removed' => 0, 'message' => ''];
                if ($oldLayout !== $newLayout) {
                    $resize = box_admin_resize_slots($condb, $id, $newLayout);
                    if (!$resize['ok']) {
                        throw new RuntimeException($resize['message']);
                    }
                }

                $condb->commit();
                $success = true;
                if ($oldLayout !== $newLayout && ($resize['added'] > 0 || $resize['removed'] > 0)) {
                    $_SESSION['success_msg'] = $isEN
                        ? "Box updated. Slots added: {$resize['added']}, removed: {$resize['removed']}. Existing mappings kept in order."
                        : "แก้ไข Box แล้ว เพิ่มช่อง {$resize['added']} / ลบช่อง {$resize['removed']} — ของเดิมยังอยู่ลำดับเดิม";
                } else {
                    $_SESSION['success_msg'] = $isEN ? 'Updated successfully!' : 'แก้ไขข้อมูลสำเร็จ!';
                }
                $redirect_after_post = 'admin?filter_box=' . $id . '#products';
            } catch (Throwable $e) {
                $condb->rollback();
                $err = $e->getMessage();
                if (!$isEN && str_contains($err, 'Cannot shrink layout')) {
                    $err = 'ลดขนาด Layout ไม่ได้ — ช่องที่จะลบยังมี Product Mapping อยู่';
                }
                $_SESSION['error_msg'] = $isEN
                    ? 'Box update failed: ' . $err
                    : 'แก้ไข Box ไม่สำเร็จ: ' . $err;
            }
        } elseif ($table === 'products') {
            if (updateData($condb, $table, $data, $id)) {
                $success = true;
                $_SESSION['success_msg'] = $isEN ? 'Updated successfully!' : 'แก้ไขข้อมูลสำเร็จ!';
                $slotId = (int) ($data['slot_id'] ?? 0);
                $filter_box = box_admin_slot_box_id($condb, $slotId);
                if ($filter_box > 0) {
                    $redirect_after_post = 'admin?filter_box=' . $filter_box . '#products';
                }
            }
        } elseif (updateData($condb, $table, $data, $id)) {
            $success = true;
            $_SESSION['success_msg'] = $isEN ? 'Updated successfully!' : 'แก้ไขข้อมูลสำเร็จ!';
        }
    }

    if (!$success && !isset($_SESSION['success_msg']) && !isset($_SESSION['error_msg'])) {
        $_SESSION['error_msg'] = __('save_failed');
    }

    header('Location: ' . $redirect_after_post);
    exit;
}

$page_title = __('logout') == 'Logout' ? 'System Administration' : 'การดูแลระบบ';
$page_icon = 'fa-cogs';
$show_home = true;
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'th') ?>">

<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title><?= htmlspecialchars($page_title) ?> | Visual Location Management</title>
    <link rel="icon" type="image/png" href="assets/favicon.png">
    <link href="plugins/google-fonts/fonts.css" rel="stylesheet">
    <link href="plugins/font-awesome/all.css" rel="stylesheet">
    <link href="plugins/font-awesome/v4-font-face.css" rel="stylesheet">
        <link rel="stylesheet" href="assets/factory.css?v=20260611">
    <link rel="stylesheet" href="assets/pages-common.css?v=20260607">
    <link rel="stylesheet" href="assets/pages/admin.css?v=20260607">
</head>

<body class="factory-app">
<?php require __DIR__ . '/includes/layout_header.php'; ?>
<main class="fx-main">
    <div class="container">
        <div class="fx-scan-toolbar" style="margin-bottom:1rem;flex-wrap:wrap;">
            <a href="manage_users" class="fx-btn fx-btn-secondary"><i class="fas fa-users-cog"></i>
                <?= __('logout') == 'Logout' ? 'Manage Users' : 'จัดการผู้ใช้' ?></a>
            <a href="test_io.php" class="fx-btn fx-btn-secondary"><i class="fas fa-network-wired"></i>
                <?= __('logout') == 'Logout' ? 'Test IO' : 'ทดสอบ IO' ?></a>
            <a href="logout" class="fx-btn fx-btn-danger" onclick="return confirm('<?= htmlspecialchars(__('confirm_logout'), ENT_QUOTES) ?>')"><i class="fas fa-sign-out-alt"></i>
                <?= __('logout') ?></a>
        </div>
        <p style="margin:0 0 1rem;color:var(--text-light);">
            <?= __('logout') == 'Logout' ? 'Manage infrastructure (Racks, Levels, Boxes)' : 'จัดการโครงสร้างคลังสินค้า (Racks, Levels, Boxes)' ?>
        </p>

        <!-- System Messages -->
        <?php if (isset($_SESSION['success_msg'])): ?>
            <div class="alert alert-success">
                <i class="fas fa-check-circle"></i> <?= $_SESSION['success_msg'] ?>
                <?php unset($_SESSION['success_msg']); ?>
            </div>
        <?php endif; ?>

        <?php if (isset($_SESSION['error_msg'])): ?>
            <div class="alert alert-error">
                <i class="fas fa-exclamation-triangle"></i> <?= $_SESSION['error_msg'] ?>
                <?php unset($_SESSION['error_msg']); ?>
            </div>
        <?php endif; ?>



        <!-- SECTION 0.25: FIFO ISSUE POLICY -->
        <div class="card" id="fifo-settings">
            <div class="card-header">
                <h3 class="card-title" style="margin:0;">
                    <i class="fas fa-sort-amount-down" style="color:#7c3aed;"></i>
                    <?= __('logout') == 'Logout' ? 'Issue / FIFO Policy' : 'นโยบายการเบิกจ่าย (FIFO)' ?>
                </h3>
            </div>
            <div class="card-body">
                <p style="color:#64748b; font-size:13px; margin:0 0 16px; line-height:1.5;">
                    <?= __('logout') == 'Logout'
                        ? 'Stock order: expiration date first; same expiration day any roll may be issued (recommended by IM). Expired PUIDs are always blocked. Dummy Batch IM bypasses FIFO. Password required to save.'
                        : 'เรียงสต็อก: วันหมดอายุก่อน — วันเดียวกันจ่ายม้วนไหนก็ได้ (แนะนำตาม IM) — PUID หมดอายุบล็อกเสมอ, Dummy Batch ข้าม FIFO — ต้องใส่รหัสผ่านเพื่อบันทึก' ?>
                </p>
                <form method="POST" class="admin-form" style="align-items:flex-end;" autocomplete="off">
                    <input type="hidden" name="fifo_settings_save" value="1">
                    <div class="form-group" style="min-width:220px;">
                        <label><?= __('logout') == 'Logout' ? 'FIFO mode' : 'โหมด FIFO' ?></label>
                        <select name="fifo_issue_mode" required>
                            <option value="<?= FIFO_ISSUE_MODE_EXPIRATION ?>" <?= $fifoCurrentMode === FIFO_ISSUE_MODE_EXPIRATION ? 'selected' : '' ?>>
                                <?= __('logout') == 'Logout' ? 'Expiration Date (oldest first)' : 'วันหมดอายุ (เก่าก่อน)' ?>
                            </option>
                            <option value="<?= FIFO_ISSUE_MODE_IM_BATCH ?>" <?= $fifoCurrentMode === FIFO_ISSUE_MODE_IM_BATCH ? 'selected' : '' ?>>
                                <?= __('logout') == 'Logout' ? 'Batch IM (oldest IM first)' : 'Batch IM (IM เก่าก่อน)' ?>
                            </option>
                        </select>
                    </div>
                    <div class="form-group" style="min-width:200px;">
                        <label><?= __('logout') == 'Logout' ? 'Dummy Batch IM contains' : 'Dummy Batch (IM มีคำว่า)' ?></label>
                        <input type="text" name="fifo_dummy_im" value="<?= htmlspecialchars($fifoCurrentDummyIm) ?>" required
                            placeholder="DUMMYBATCH" style="text-transform:uppercase;">
                    </div>
                    <div class="form-group" style="min-width:200px;">
                        <label><?= __('logout') == 'Logout' ? 'Confirm password' : 'ยืนยันรหัสผ่าน' ?></label>
                        <input type="password" name="confirm_password" required autocomplete="new-password"
                            placeholder="<?= __('logout') == 'Logout' ? 'Your admin password' : 'รหัสผ่าน admin' ?>">
                    </div>
                    <div>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i>
                            <?= __('logout') == 'Logout' ? 'Save policy' : 'บันทึก' ?>
                        </button>
                    </div>
                </form>
                <p style="margin:14px 0 0; font-size:12px; color:#94a3b8;">
                    <?= __('logout') == 'Logout' ? 'Current:' : 'ปัจจุบัน:' ?>
                    <strong><?= htmlspecialchars(fifo_issue_mode_label($fifoCurrentMode, __('logout') === 'Logout')) ?></strong>
                    · Dummy: <strong><?= htmlspecialchars($fifoCurrentDummyIm) ?></strong>
                    <?php if (!empty($fifoMetaRow['updated_at'])): ?>
                        · <?= __('logout') == 'Logout' ? 'Updated' : 'อัปเดต' ?>
                        <?= htmlspecialchars($fifoMetaRow['updated_at']) ?>
                        <?= $fifoUpdatedByName !== '' ? '(' . htmlspecialchars($fifoUpdatedByName) . ')' : '' ?>
                    <?php endif; ?>
                </p>
            </div>
        </div>

        <!-- SECTION 0.5: ETHERNET IO -->
        <div class="card" id="ethernet_ios">
            <div class="card-header" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                <h3 class="card-title" style="margin:0;"><i class="fas fa-network-wired" style="color:#0ea5e9;"></i>
                    <?= __('logout') == 'Logout' ? 'Manage Ethernet IO' : 'จัดการ Ethernet IO' ?>
                </h3>
                <button type="button" class="btn btn-outline" onclick="resetAllLights()" style="color:#b91c1c; border-color:#fca5a5;">
                    <i class="fas fa-lightbulb"></i>
                    <?= __('logout') == 'Logout' ? 'Reset all lights' : 'ดับไฟทั้งหมด' ?>
                </button>
            </div>
            <div class="card-body">
                <form method="POST" class="admin-form">
                    <input type="hidden" name="table" value="ethernet_ios">
                    <input type="hidden" name="action" value="<?= $edit_data && $_GET['type'] == 'ethernet_ios' ? 'edit' : 'save' ?>">
                    <?php if ($edit_data && $_GET['type'] == 'ethernet_ios'): ?>
                        <input type="hidden" name="id" value="<?= $edit_data['id'] ?>">
                    <?php endif; ?>

                    <p style="color:#64748b; font-size:13px; margin:0 0 16px;">
                        <?= __('logout') == 'Logout'
                            ? 'WiFi IP of Raspi4 gateway (not the isolated Ethernet IO module). Pi forwards commands to IO on a separate network.'
                            : 'ใส่ WiFi IP ของ Raspi4 (ไม่ใช่ IP ของ Ethernet IO บนเครือข่ายแยก) — Pi จะส่งต่อคำสั่งไป IO ให้' ?>
                    </p>
                    <div class="form-group">
                        <label><?= __('logout') == 'Logout' ? 'Device Name' : 'ชื่ออุปกรณ์' ?></label>
                        <input type="text" name="data[name]" placeholder="Ex: IO Controller 1"
                            value="<?= $edit_data && $_GET['type'] == 'ethernet_ios' ? htmlspecialchars($edit_data['name']) : '' ?>" required>
                    </div>
                    <div class="form-group">
                        <label>Protocol Type</label>
                        <select name="data[controller_type]" required>
                            <option value="raspi" <?= $edit_data && $_GET['type'] == 'ethernet_ios' && ($edit_data['controller_type'] ?? '') == 'raspi' ? 'selected' : '' ?>>Raspi Gateway (WiFi) — Recommended</option>
                            <option value="http" <?= $edit_data && $_GET['type'] == 'ethernet_ios' && $edit_data['controller_type'] == 'http' ? 'selected' : '' ?>>HTTP Web Relay (dev/lab only)</option>
                            <option value="modbus" <?= $edit_data && $_GET['type'] == 'ethernet_ios' && $edit_data['controller_type'] == 'modbus' ? 'selected' : '' ?>>Modbus TCP direct (dev/lab only)</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label><?= __('logout') == 'Logout' ? 'Raspi WiFi IP Address' : 'WiFi IP ของ Raspi' ?></label>
                        <input type="text" name="data[ip_address]" placeholder="Ex: 192.168.1.50"
                            value="<?= $edit_data && $_GET['type'] == 'ethernet_ios' ? htmlspecialchars($edit_data['ip_address']) : '' ?>" required>
                    </div>
                    <div class="form-group">
                        <label>Port</label>
                        <input type="number" name="data[port]" placeholder="Ex: 8080"
                            value="<?= $edit_data && $_GET['type'] == 'ethernet_ios' ? htmlspecialchars($edit_data['port']) : '8080' ?>">
                    </div>
                    <div class="form-group" style="min-width: 80px;">
                        <label>Inputs</label>
                        <input type="number" name="data[inputs]" placeholder="Ex: 16"
                            value="<?= $edit_data && $_GET['type'] == 'ethernet_ios' && isset($edit_data['inputs']) ? htmlspecialchars($edit_data['inputs']) : '16' ?>" required>
                    </div>
                    <div class="form-group" style="min-width: 80px;">
                        <label>Outputs</label>
                        <input type="number" name="data[outputs]" placeholder="Ex: 16"
                            value="<?= $edit_data && $_GET['type'] == 'ethernet_ios' && isset($edit_data['outputs']) ? htmlspecialchars($edit_data['outputs']) : '16' ?>" required>
                    </div>
                    <div>
                        <button type="submit" class="btn btn-primary">
                            <?= $edit_data && $_GET['type'] == 'ethernet_ios' ? '<i class="fas fa-save"></i>' : '<i class="fas fa-plus"></i>' ?>
                        </button>
                    </div>
                </form>

                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th width="60" style="text-align:center">#</th>
                                <th><?= __('logout') == 'Logout' ? 'Device Name' : 'ชื่ออุปกรณ์' ?></th>
                                <th>IP Address</th>
                                <th>Port</th>
                                <th>IO (In/Out)</th>
                                <th width="150" style="text-align:center"><?= __('logout') == 'Logout' ? 'Action' : 'จัดการ' ?></th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php
                            $pg_io = getPagination($condb, 'ethernet_ios', 10, 'p_io');
                            $row_num = $pg_io['offset'] + 1;
                            foreach ($condb->query("SELECT * FROM ethernet_ios LIMIT {$pg_io['offset']}, 10") as $io): ?>
                                <tr>
                                    <td style="text-align:center"><?= $row_num++ ?></td>
                                    <td><b><?= htmlspecialchars($io['name']) ?></b><br><small style="color:#64748b;"><?= strtoupper($io['controller_type'] ?? 'http') ?></small></td>
                                    <td><?= htmlspecialchars($io['ip_address']) ?></td>
                                    <td><?= htmlspecialchars($io['port']) ?></td>
                                    <td><span class="badge" style="background:#f1f5f9; color:#475569;"><?= isset($io['inputs']) ? htmlspecialchars($io['inputs']) : '16' ?> In / <?= isset($io['outputs']) ? htmlspecialchars($io['outputs']) : '16' ?> Out</span></td>
                                    <td style="text-align:center">
                                        <a href="?edit=<?= $io['id'] ?>&type=ethernet_ios#ethernet_ios" class="btn btn-icon btn-outline" style="color:#f59e0b;"><i class="fas fa-pencil-alt"></i></a>
                                        <a href="?delete=<?= $io['id'] ?>&type=ethernet_ios" onclick="return confirm('<?= __('logout') == 'Logout' ? 'Delete this Device?' : 'ลบอุปกรณ์นี้?' ?>')" class="btn btn-icon btn-outline" style="color:#ef4444;"><i class="fas fa-trash"></i></a>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
                <?= renderPagination($pg_io['page'], $pg_io['total_pages'], 'p_io') ?>
            </div>
        </div>

        <!-- SECTION 1: RACKS -->
        <div class="card" id="racks">
            <div class="card-header">
                <h3 class="card-title"><i class="fas fa-layer-group" style="color:var(--primary);"></i>
                    <?= __('logout') == 'Logout' ? 'Manage Racks' : 'จัดการ Racks' ?>
                </h3>
            </div>
            <div class="card-body">
                <form method="POST" class="admin-form">
                    <input type="hidden" name="table" value="racks">
                    <input type="hidden" name="action"
                        value="<?= $edit_data && $_GET['type'] == 'racks' ? 'edit' : 'save' ?>">
                    <?php if ($edit_data && $_GET['type'] == 'racks'): ?><input type="hidden" name="id"
                            value="<?= $edit_data['id'] ?>"><?php endif; ?>

                    <div class="form-group">
                        <label><?= __('logout') == 'Logout' ? 'Rack Name / Zone' : 'ชื่อ Rack / โซน' ?></label>
                        <input type="text" name="data[name]" placeholder="Ex: A, B, Zone-1"
                            value="<?= $edit_data && $_GET['type'] == 'racks' ? htmlspecialchars($edit_data['name']) : '' ?>"
                            required>
                    </div>
                    <div class="form-group">
                        <label><?= __('logout') == 'Logout' ? 'IO Device' : 'อุปกรณ์ IO (Tower Light)' ?></label>
                        <select name="data[io_device_id]">
                            <option value="">-- None --</option>
                            <?php foreach ($condb->query("SELECT id, name FROM ethernet_ios ORDER BY name") as $io): ?>
                                <option value="<?= $io['id'] ?>" <?= ($edit_data && $_GET['type'] == 'racks' && $edit_data['io_device_id'] == $io['id']) ? 'selected' : '' ?>><?= htmlspecialchars($io['name']) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="form-group" style="min-width: 80px;">
                        <label>Red Pin</label>
                        <input type="number" name="data[io_red_pin]" value="<?= $edit_data && $_GET['type'] == 'racks' ? $edit_data['io_red_pin'] : '' ?>">
                    </div>
                    <div class="form-group" style="min-width: 80px;">
                        <label>Yellow Pin</label>
                        <input type="number" name="data[io_yellow_pin]" value="<?= $edit_data && $_GET['type'] == 'racks' ? $edit_data['io_yellow_pin'] : '' ?>">
                    </div>
                    <div class="form-group" style="min-width: 80px;">
                        <label>Green Pin</label>
                        <input type="number" name="data[io_green_pin]" value="<?= $edit_data && $_GET['type'] == 'racks' ? $edit_data['io_green_pin'] : '' ?>">
                    </div>
                    <div class="form-group" style="min-width: 80px;">
                        <label>Buzzer Pin</label>
                        <input type="number" name="data[io_buzzer_pin]" value="<?= $edit_data && $_GET['type'] == 'racks' ? $edit_data['io_buzzer_pin'] : '' ?>">
                    </div>
                    <div>
                        <button type="submit" class="btn btn-primary">
                            <?= $edit_data && $_GET['type'] == 'racks' ? (__('logout') == 'Logout' ? '<i class="fas fa-save"></i> Save' : '<i class="fas fa-save"></i> บันทึก') : (__('logout') == 'Logout' ? '<i class="fas fa-plus"></i> Add Rack' : '<i class="fas fa-plus"></i> เพิ่ม Rack') ?>
                        </button>
                        <?php if ($edit_data && $_GET['type'] == 'racks'): ?>
                            <a href="admin"
                                class="btn btn-outline"><?= __('logout') == 'Logout' ? 'Cancel' : 'ยกเลิก' ?></a>
                        <?php endif; ?>
                    </div>
                </form>

                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th width="60" style="text-align:center">#</th>
                                <th><?= __('logout') == 'Logout' ? 'Rack Name' : 'ชื่อ Rack' ?></th>
                                <th><?= __('logout') == 'Logout' ? 'IO Config' : 'ตั้งค่า IO' ?></th>
                                <th width="150" style="text-align:center">
                                    <?= __('logout') == 'Logout' ? 'Action' : 'จัดการ' ?>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php
                            $pg_racks = getPagination($condb, 'racks', 10, 'p_racks');
                            $row_num = $pg_racks['offset'] + 1;
                            foreach ($condb->query("SELECT * FROM racks LIMIT {$pg_racks['offset']}, 10") as $r): ?>
                                <tr>
                                    <td style="text-align:center"><?= $row_num++ ?></td>
                                    <td><b>Rack <?= $r['name'] ?></b></td>
                                    <td>
                                        <?php if ($r['io_device_id']): ?>
                                            <span class="badge" style="background:#e0e7ff; color:#4f46e5;">IO Dev: <?= $r['io_device_id'] ?></span>
                                            <button type="button" class="btn btn-sm btn-outline" onclick="testRackIO(<?= $r['io_device_id'] ?>, <?= $r['io_green_pin'] ?: 'null' ?>)" style="padding:2px 6px; font-size:12px; margin-left:5px;">Test Green</button>
                                            <button type="button" class="btn btn-sm btn-outline" onclick="testRackIO(<?= $r['io_device_id'] ?>, <?= $r['io_red_pin'] ?: 'null' ?>)" style="padding:2px 6px; font-size:12px;">Test Red</button>
                                            <button type="button" class="btn btn-sm btn-outline" onclick="testRackIO(<?= $r['io_device_id'] ?>, <?= $r['io_buzzer_pin'] ?: 'null' ?>)" style="padding:2px 6px; font-size:12px;">Test Buzzer</button>
                                        <?php else: ?>
                                            <span style="color:#cbd5e1; font-size:0.85rem;">-</span>
                                        <?php endif; ?>
                                    </td>
                                    <td style="text-align:center">
                                        <a href="?edit=<?= $r['id'] ?>&type=racks" class="btn btn-icon btn-outline"
                                            style="color:#f59e0b; border-color:#f59e0b;"><i
                                                class="fas fa-pencil-alt"></i></a>
                                        <a href="?delete=<?= $r['id'] ?>&type=racks"
                                            onclick="return confirm('<?= __('logout') == 'Logout' ? 'Warning: Deleting a Rack will delete all Levels and Boxes inside! Confirm?' : '⚠️ คำเตือน: การลบ Rack จะลบข้อมูล Level และ Box ภายในทั้งหมด! ยืนยัน?' ?>')"
                                            class="btn btn-icon btn-outline" style="color:#ef4444; border-color:#ef4444;"><i
                                                class="fas fa-trash"></i></a>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
                <?= renderPagination($pg_racks['page'], $pg_racks['total_pages'], 'p_racks') ?>
            </div>
        </div>


        <!-- SECTION 2: LEVELS -->
        <div class="card" id="levels">
            <div class="card-header">
                <h3 class="card-title"><i class="fas fa-align-justify" style="color:var(--warning);"></i>
                    <?= __('logout') == 'Logout' ? 'Manage Levels' : 'จัดการ Levels' ?>
                </h3>
            </div>
            <div class="card-body">
                <form method="POST" class="admin-form">
                    <input type="hidden" name="table" value="levels">
                    <input type="hidden" name="action"
                        value="<?= $edit_data && $_GET['type'] == 'levels' ? 'edit' : 'save' ?>">
                    <?php if ($edit_data && $_GET['type'] == 'levels'): ?><input type="hidden" name="id"
                            value="<?= $edit_data['id'] ?>"><?php endif; ?>

                    <div class="form-group">
                        <label><?= __('logout') == 'Logout' ? 'Select Rack' : 'เลือก Rack' ?></label>
                        <select name="data[rack_id]" required>
                            <option value="">-- <?= __('logout') == 'Logout' ? 'Select Rack' : 'เลือก Rack' ?> --
                            </option>
                            <?php foreach ($condb->query("SELECT * FROM racks ORDER BY name") as $r): ?>
                                <option value="<?= $r['id'] ?>" <?= ($edit_data && $_GET['type'] == 'levels' && $edit_data['rack_id'] == $r['id']) ? 'selected' : '' ?>>Rack <?= $r['name'] ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="form-group">
                        <label><?= __('logout') == 'Logout' ? 'Level Number' : 'Level Number (ชั้นที่)' ?></label>
                        <input type="number" name="data[level_no]" placeholder="Ex: 1"
                            value="<?= $edit_data && $_GET['type'] == 'levels' ? $edit_data['level_no'] : '' ?>" min="1"
                            required>
                    </div>
                    <div>
                        <button type="submit" class="btn btn-primary">
                            <?= $edit_data && $_GET['type'] == 'levels' ? '<i class="fas fa-save"></i>' : '<i class="fas fa-plus"></i>' ?>
                        </button>
                    </div>
                </form>

                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th width="60" style="text-align:center">#</th>
                                <th><?= __('logout') == 'Logout' ? 'Rack' : 'Rack' ?></th>
                                <th><?= __('logout') == 'Logout' ? 'Level' : 'Level' ?></th>
                                <th width="150" style="text-align:center">
                                    <?= __('logout') == 'Logout' ? 'Action' : 'จัดการ' ?>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php
                            $pg_lv = getPagination($condb, 'levels', 10, 'p_lv');
                            $row_num = $pg_lv['offset'] + 1;
                            foreach ($condb->query("SELECT l.*, r.name rack_name FROM levels l JOIN racks r ON l.rack_id=r.id ORDER BY r.name, l.level_no LIMIT {$pg_lv['offset']}, 10") as $lv): ?>
                                <tr>
                                    <td style="text-align:center"><?= $row_num++ ?></td>
                                    <td>Rack <?= $lv['rack_name'] ?></td>
                                    <td>Level <?= $lv['level_no'] ?></td>
                                    <td style="text-align:center">
                                        <a href="?edit=<?= $lv['id'] ?>&type=levels" class="btn btn-icon btn-outline"
                                            style="color:#f59e0b;"><i class="fas fa-pencil-alt"></i></a>
                                        <a href="?delete=<?= $lv['id'] ?>&type=levels"
                                            onclick="return confirm('<?= __('logout') == 'Logout' ? 'Confirm delete?' : 'ยืนยันการลบ?' ?>')"
                                            class="btn btn-icon btn-outline" style="color:#ef4444;"><i
                                                class="fas fa-trash"></i></a>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
                <?= renderPagination($pg_lv['page'], $pg_lv['total_pages'], 'p_lv') ?>
            </div>
        </div>


        <!-- SECTION 3: BOXES -->
        <div class="card" id="boxes">
            <div class="card-header">
                <h3 class="card-title"><i class="fas fa-box" style="color:var(--success);"></i>
                    <?= __('logout') == 'Logout' ? 'Manage Boxes' : 'จัดการ Boxes' ?></h3>
            </div>
            <div class="card-body">
                <form method="POST" class="admin-form">
                    <input type="hidden" name="table" value="boxes">
                    <input type="hidden" name="action"
                        value="<?= $edit_data && $_GET['type'] == 'boxes' ? 'edit' : 'save' ?>">
                    <?php if ($edit_data && $_GET['type'] == 'boxes'): ?><input type="hidden" name="id"
                            value="<?= $edit_data['id'] ?>"><?php endif; ?>

                    <div class="form-group" style="flex:2;">
                        <label><?= __('logout') == 'Logout' ? 'Location (Level)' : 'ตำแหน่ง (Level)' ?></label>
                        <select name="data[level_id]" required>
                            <option value="">-- <?= __('logout') == 'Logout' ? 'Choose Level' : 'เลือก Level' ?> --
                            </option>
                            <?php foreach ($condb->query("SELECT l.id, l.level_no, r.name rack_name FROM levels l JOIN racks r ON l.rack_id=r.id ORDER BY r.name, l.level_no") as $lv): ?>
                                <option value="<?= $lv['id'] ?>" <?= ($edit_data && $_GET['type'] == 'boxes' && $edit_data['level_id'] == $lv['id']) ? 'selected' : '' ?>>
                                    Rack <?= $lv['rack_name'] ?> - Level <?= $lv['level_no'] ?>
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Box Code</label>
                        <input type="text" name="data[box_code]" placeholder="Ex: B-001"
                            value="<?= $edit_data && $_GET['type'] == 'boxes' ? $edit_data['box_code'] : '' ?>"
                            required>
                    </div>
                    <div class="form-group">
                        <label>Layout (W x H)</label>
                        <div style="display:flex; align-items:center; gap:5px;">
                            <?php
                            $current_layout = ($edit_data && $_GET['type'] == 'boxes') ? $edit_data['layout'] : '1x1';
                            $parts = explode('x', $current_layout);
                            $w = $parts[0] ?? 1;
                            $h = $parts[1] ?? 1;
                            ?>
                            <input type="number" id="layout_w" value="<?= $w ?>" min="1"
                                style="width: 60px; padding:8px;" onchange="updateLayout()">
                            <span>x</span>
                            <input type="number" id="layout_h" value="<?= $h ?>" min="1"
                                style="width: 60px; padding:8px;" onchange="updateLayout()">
                            <input type="hidden" name="data[layout]" id="layout_hidden" value="<?= $current_layout ?>">
                            <script>
                                function updateLayout() {
                                    const w = document.getElementById('layout_w').value || 1;
                                    const h = document.getElementById('layout_h').value || 1;
                                    document.getElementById('layout_hidden').value = w + 'x' + h;
                                }
                            </script>
                        </div>
                        <?php if ($edit_data && ($_GET['type'] ?? '') === 'boxes'): ?>
                            <small style="color:#64748b; display:block; margin-top:6px;">
                                <?= $isEN
                                    ? 'Changing layout keeps existing slots/products in order and adds new empty slots at the end.'
                                    : 'เปลี่ยน Layout แล้วช่องเดิมและ Product ยังอยู่ลำดับเดิม — ช่องใหม่จะถูกเพิ่มต่อท้ายอัตโนมัติ' ?>
                            </small>
                        <?php endif; ?>
                    </div>
                    <div class="form-group">
                        <label><?= __('logout') == 'Logout' ? 'IO Device' : 'อุปกรณ์ IO' ?></label>
                        <select name="data[io_device_id]">
                            <option value="">-- None --</option>
                            <?php foreach ($condb->query("SELECT id, name FROM ethernet_ios ORDER BY name") as $io): ?>
                                <option value="<?= $io['id'] ?>" <?= ($edit_data && $_GET['type'] == 'boxes' && $edit_data['io_device_id'] == $io['id']) ? 'selected' : '' ?>><?= htmlspecialchars($io['name']) ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                    <div class="form-group" style="min-width: 100px;">
                        <label>Output Pin</label>
                        <input type="number" name="data[io_output_pin]" value="<?= $edit_data && $_GET['type'] == 'boxes' ? $edit_data['io_output_pin'] : '' ?>">
                    </div>
                    <div>
                        <button type="submit" class="btn btn-primary">
                            <?= $edit_data && $_GET['type'] == 'boxes' ? '<i class="fas fa-save"></i>' : '<i class="fas fa-plus"></i>' ?>
                        </button>
                    </div>
                </form>

                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th width="60" style="text-align:center">#</th>
                                <th><?= __('logout') == 'Logout' ? 'Location' : 'ตำแหน่ง' ?></th>
                                <th><?= __('logout') == 'Logout' ? 'Box Code' : 'รหัสกล่อง' ?></th>
                                <th><?= __('logout') == 'Logout' ? 'Layout Config' : 'โครงสร้าง Layout' ?></th>
                                <th><?= __('logout') == 'Logout' ? 'IO Config' : 'ตั้งค่า IO' ?></th>
                                <th width="150" style="text-align:center">
                                    <?= __('logout') == 'Logout' ? 'Action' : 'จัดการ' ?>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php
                            $pg_bx = getPagination($condb, 'boxes', 10, 'p_bx');
                            $row_num = $pg_bx['offset'] + 1;
                            foreach ($condb->query("SELECT b.*, l.level_no, r.name rack_name FROM boxes b JOIN levels l ON b.level_id=l.id JOIN racks r ON l.rack_id=r.id ORDER BY r.name, l.level_no, b.box_code LIMIT {$pg_bx['offset']}, 10") as $b): ?>
                                <tr>
                                    <td style="text-align:center"><?= $row_num++ ?></td>
                                    <td>Rack <?= $b['rack_name'] ?> <span class="badge"
                                            style="background:#f1f5f9; color:#64748b;">L<?= $b['level_no'] ?></span></td>
                                    <td><span style="font-weight:600; color:var(--primary);"><?= $b['box_code'] ?></span>
                                    </td>
                                    <td><span class="badge"><?= $b['layout'] ?></span></td>
                                    <td>
                                        <?php if ($b['io_device_id']): ?>
                                            <span class="badge" style="background:#dcfce7; color:#166534;">Pin <?= $b['io_output_pin'] ?></span>
                                            <button type="button" class="btn btn-sm btn-outline" onclick="testBoxIO(<?= $b['io_device_id'] ?>, <?= $b['io_output_pin'] ?: 'null' ?>)" style="padding:2px 6px; font-size:12px; margin-left:5px;">Test</button>
                                        <?php else: ?>
                                            <span style="color:#cbd5e1; font-size:0.85rem;">-</span>
                                        <?php endif; ?>
                                    </td>
                                    <td style="text-align:center">
                                        <a href="?edit=<?= $b['id'] ?>&type=boxes" class="btn btn-icon btn-outline"
                                            style="color:#f59e0b;"><i class="fas fa-pencil-alt"></i></a>
                                        <a href="?delete=<?= $b['id'] ?>&type=boxes"
                                            onclick="return confirm('<?= __('logout') == 'Logout' ? 'Delete this Box?' : 'ลบ Box นี้?' ?>')"
                                            class="btn btn-icon btn-outline" style="color:#ef4444;"><i
                                                class="fas fa-trash"></i></a>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
                <?= renderPagination($pg_bx['page'], $pg_bx['total_pages'], 'p_bx') ?>
            </div>
        </div>

        <!-- SECTION 4: PRODUCTS MAPPING -->
        <div class="card" id="products">
            <div class="card-header">
                <h3 class="card-title"><i class="fas fa-microchip" style="color:#8b5cf6;"></i> Product Mapping</h3>
                <div style="display:flex; gap:10px;">
                    <a href="import_product_mapping" class="btn btn-sm btn-outline" style="color:#4f46e5; border-color:#4f46e5;">
                        <i class="fas fa-file-import"></i> Import Excel
                    </a>
                    <a href="?export=products" class="btn btn-sm btn-outline" style="color:#10b981; border-color:#10b981;">
                        <i class="fas fa-file-excel"></i> Export Excel
                    </a>
                </div>
            </div>
            <div class="card-body">
                <?php
                $box_options = box_admin_list_boxes($condb);
                $current_slot_id = ($edit_data && ($_GET['type'] ?? '') === 'products')
                    ? (int) $edit_data['slot_id']
                    : ($product_prefill_slot_id > 0 ? $product_prefill_slot_id : 0);
                if ($current_slot_id === 0 && !($edit_data && ($_GET['type'] ?? '') === 'products')) {
                    $auto_slot = box_admin_first_empty_slot($condb, $product_filter_box_id);
                    if ($auto_slot) {
                        $current_slot_id = $auto_slot;
                    }
                }
                $next_hint_slot = null;
                if ($current_slot_id > 0 && !($edit_data && ($_GET['type'] ?? '') === 'products')) {
                    $next_hint_slot = $current_slot_id;
                }
                ?>
                <div class="admin-form" style="margin-bottom:12px; align-items:flex-end;">
                    <div class="form-group" style="flex:2;">
                        <label><?= $isEN ? 'Filter by Box (mapping in order)' : 'กรองตาม Box (เรียง Slot ต่อเนื่อง)' ?></label>
                        <select id="productBoxFilter" onchange="window.location='admin?filter_box='+this.value+'#products'">
                            <option value="0"><?= $isEN ? '-- All boxes --' : '-- ทุก Box --' ?></option>
                            <?php foreach ($box_options as $bx): ?>
                                <option value="<?= (int) $bx['id'] ?>" <?= $product_filter_box_id === (int) $bx['id'] ? 'selected' : '' ?>>
                                    Rack <?= htmlspecialchars($bx['rack_name']) ?> L<?= (int) $bx['level_no'] ?>
                                    Box <?= htmlspecialchars($bx['box_code']) ?>
                                    (<?= (int) $bx['mapped_count'] ?>/<?= (int) $bx['slot_total'] ?> · <?= htmlspecialchars($bx['layout']) ?>)
                                </option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>
                <?php if ($next_hint_slot): ?>
                    <p style="margin:0 0 12px; color:#64748b; font-size:0.9rem;">
                        <i class="fas fa-arrow-right"></i>
                        <?= $isEN ? 'Next empty slot pre-selected — add products in sequence.' : 'เลือกช่องว่างถัดไปให้แล้ว — เพิ่มพาร์ทเรียงต่อกันได้เลย' ?>
                    </p>
                <?php endif; ?>
                <form method="POST" class="admin-form">
                    <input type="hidden" name="table" value="products">
                    <input type="hidden" name="action"
                        value="<?= $edit_data && $_GET['type'] == 'products' ? 'edit' : 'save' ?>">
                    <?php if ($edit_data && $_GET['type'] == 'products'): ?><input type="hidden" name="id"
                            value="<?= $edit_data['id'] ?>"><?php endif; ?>

                    <div class="form-group" style="flex:2;">
                        <label><?= $isEN ? 'Select Empty Slot' : 'เลือกช่องว่าง (เรียงตาม Slot #)' ?></label>
                        <select name="data[slot_id]" required>
                            <option value="">-- <?= $isEN ? 'Choose Slot' : 'เลือก Slot' ?> --</option>
                            <?php
                            $slots_sql = "SELECT sl.id, sl.slot_no, b.id AS box_id, b.box_code, l.level_no, r.name AS rack_name
                                            FROM slots sl
                                            JOIN boxes b ON sl.box_id = b.id
                                            JOIN levels l ON b.level_id = l.id
                                            JOIN racks r ON l.rack_id = r.id
                                            LEFT JOIN products p ON sl.id = p.slot_id
                                            WHERE (p.id IS NULL OR sl.id = ?)";
                            if ($product_filter_box_id > 0) {
                                $slots_sql .= ' AND sl.box_id = ' . $product_filter_box_id;
                            }
                            $slots_sql .= ' ORDER BY r.name, l.level_no, b.box_code, sl.slot_no ASC';
                            $slotStmt = $condb->prepare($slots_sql);
                            $slotStmt->bind_param('i', $current_slot_id);
                            $slotStmt->execute();
                            foreach ($slotStmt->get_result() as $sl): ?>
                                <option value="<?= $sl['id'] ?>" <?= $current_slot_id == $sl['id'] ? 'selected' : '' ?>>
                                    [Rack <?= $sl['rack_name'] ?> | L<?= $sl['level_no'] ?>] Box <?= $sl['box_code'] ?>
                                    (Slot #<?= $sl['slot_no'] ?>)
                                </option>
                            <?php endforeach;
                            $slotStmt->close(); ?>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Product Name (HanaPart)</label>
                        <input type="text" name="data[name]"
                            value="<?= $edit_data && $_GET['type'] == 'products' ? htmlspecialchars($edit_data['name']) : '' ?>"
                            required>
                    </div>
                    <div>
                        <button type="submit" class="btn btn-primary">
                            <?= $edit_data && $_GET['type'] == 'products' ? '<i class="fas fa-save"></i>' : '<i class="fas fa-plus"></i>' ?>
                        </button>
                    </div>
                </form>

                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th width="60" style="text-align:center">#</th>
                                <th>Location (Slot)</th>
                                <th>Product Name</th>
                                <th>Stock Qty</th>
                                <th width="150" style="text-align:center">จัดการ</th>
                            </tr>
                        </thead>
                        <tbody>
                            <?php
                            if ($product_filter_box_id > 0) {
                                $p_page = max(1, (int) ($_GET['p_p'] ?? 1));
                                $p_count_stmt = $condb->prepare(
                                    'SELECT COUNT(*) AS total FROM products p
                                     JOIN slots sl ON p.slot_id = sl.id
                                     JOIN boxes b ON sl.box_id = b.id
                                     WHERE b.id = ?'
                                );
                                $p_count_stmt->bind_param('i', $product_filter_box_id);
                                $p_count_stmt->execute();
                                $p_total_rows = (int) ($p_count_stmt->get_result()->fetch_assoc()['total'] ?? 0);
                                $p_count_stmt->close();
                                $p_total_pages = max(1, (int) ceil($p_total_rows / $limit));
                                if ($p_page > $p_total_pages) {
                                    $p_page = $p_total_pages;
                                }
                                $pg_p = [
                                    'page' => $p_page,
                                    'offset' => ($p_page - 1) * $limit,
                                    'total_pages' => $p_total_pages,
                                    'total_rows' => $p_total_rows,
                                ];
                            } else {
                                $pg_p = getPagination($condb, 'products', 10, 'p_p');
                            }
                            $row_num = $pg_p['offset'] + 1;
                            $products_sql = "SELECT p.*, sl.slot_no, b.id AS box_id, b.box_code, l.level_no, r.name AS rack_name
                                                    FROM products p
                                                    JOIN slots sl ON p.slot_id = sl.id
                                                    JOIN boxes b ON sl.box_id = b.id
                                                    JOIN levels l ON b.level_id = l.id
                                                    JOIN racks r ON l.rack_id = r.id";
                            if ($product_filter_box_id > 0) {
                                $products_sql .= ' WHERE b.id = ' . $product_filter_box_id;
                            }
                            $products_sql .= " ORDER BY r.name, l.level_no, b.box_code, sl.slot_no ASC
                                                    LIMIT {$pg_p['offset']}, 10";
                            foreach ($condb->query($products_sql) as $p): ?>
                                <tr>
                                    <td style="text-align:center"><?= $row_num++ ?></td>
                                    <td>
                                        <small style="color:#94a3b8;">Rack <?= $p['rack_name'] ?> &gt; L<?= $p['level_no'] ?>
                                            &gt;</small>
                                        <b><?= $p['box_code'] ?></b>
                                        <span class="badge">#<?= $p['slot_no'] ?></span>
                                        <a href="?filter_box=<?= (int) $p['box_id'] ?>#products" class="btn btn-sm btn-outline"
                                            style="padding:2px 6px; font-size:11px; margin-left:4px;"
                                            title="<?= $isEN ? 'Map more in this box' : 'เพิ่มต่อใน Box นี้' ?>">+</a>
                                    </td>
                                    <td style="font-weight:600; color:var(--text-main);"><?= $p['name'] ?></td>
                                    <td><?= number_format($p['qty']) ?></td>
                                    <td style="text-align:center">
                                        <a href="?edit=<?= $p['id'] ?>&type=products" class="btn btn-icon btn-outline"
                                            style="color:#f59e0b;"><i class="fas fa-pencil-alt"></i></a>
                                        <a href="?delete=<?= $p['id'] ?>&type=products"
                                            onclick="return confirm('ลบ Product Mapping นี้? (สต็อกจะไม่หายแต่จะหลุดจากผัง)')"
                                            class="btn btn-icon btn-outline" style="color:#ef4444;"><i
                                                class="fas fa-trash"></i></a>
                                    </td>
                                </tr>
                            <?php endforeach; ?>
                        </tbody>
                    </table>
                </div>
                <?php
                if ($product_filter_box_id > 0) {
                    $fb = $product_filter_box_id;
                    echo render_pagination_html($pg_p['page'], (int) $pg_p['total_pages'], '?filter_box=' . urlencode((string) $fb) . '&p_p=', [
                        'href_suffix' => '#products',
                    ]);
                } else {
                    echo renderPagination($pg_p['page'], $pg_p['total_pages'], 'p_p', '#products');
                }
                ?>
            </div>
        </div>

    </div>

    <script>
        async function testIO(deviceId, pin) {
            if (!deviceId || !pin) {
                alert("<?= __('logout') == 'Logout' ? 'Invalid Device or Pin' : 'ไม่มีอุปกรณ์หรือพินที่กำหนด' ?>");
                return;
            }
            try {
                // Turn ON
                let res = await fetch('api_gateway.php?call=io_control.php', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ device_id: deviceId, pin: pin, state: 1 })
                });
                const raw = await res.text();
                let data;
                try {
                    data = JSON.parse(raw);
                } catch (parseErr) {
                    alert((<?= json_encode(__('logout') == 'Logout' ? 'Network error' : 'เชื่อมต่อไม่สำเร็จ') ?>) + ' (HTTP ' + res.status + ')');
                    return;
                }
                if (data.status === 'success') {
                    setTimeout(async () => {
                        await fetch('api_gateway.php?call=io_control.php', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ device_id: deviceId, pin: pin, state: 0 })
                        });
                    }, 1000);
                    alert(data.message || (<?= json_encode(__('logout') == 'Logout' ? 'IO test OK' : 'ทดสอบ IO สำเร็จ') ?>));
                } else {
                    let detail = data.url ? '\nURL: ' + data.url : '';
                    if (data.response) {
                        try {
                            const pi = JSON.parse(data.response);
                            if (pi.message) detail += '\nPi: ' + pi.message;
                        } catch (e) {
                            if (data.response.length < 200) detail += '\n' + data.response;
                        }
                    }
                    alert('Error: ' + (data.message || raw) + detail);
                }
            } catch (e) {
                alert((<?= json_encode(__('logout') == 'Logout' ? 'Network error' : 'เชื่อมต่อไม่สำเร็จ') ?>) + ': ' + (e.message || e));
            }
        }

        function testRackIO(deviceId, pin) {
            testIO(deviceId, pin);
        }

        function testBoxIO(deviceId, pin) {
            testIO(deviceId, pin);
        }

        function resetAllLights() {
            const isEN = <?= json_encode(__('logout') == 'Logout') ?>;
            const confirmMsg = isEN
                ? 'Turn OFF all configured IO outputs?'
                : 'ปิดไฟ output ทั้งหมดที่ตั้งค่าไว้ในระบบ?';
            if (!window.confirm(confirmMsg)) {
                return;
            }

            fetch('api/reset_all_io.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{}'
            })
            .then(res => res.json())
            .then(data => {
                if (data.status === 'success') {
                    alert(data.message || (isEN ? 'All lights reset' : 'ดับไฟทั้งหมดแล้ว'));
                    return;
                }
                if (data.status === 'warning') {
                    alert(data.message || (isEN ? 'No IO configured' : 'ยังไม่ได้ตั้งค่า IO'));
                    return;
                }
                alert((isEN ? 'Error: ' : 'ผิดพลาด: ') + (data.message || 'Unknown error'));
            })
            .catch(() => alert(isEN ? 'Network error' : 'เชื่อมต่อไม่สำเร็จ'));
        }
    </script>
    <script src="assets/factory.js"></script>
</main>
<?php require __DIR__ . '/includes/layout_footer.php'; ?>
</body>

</html>
