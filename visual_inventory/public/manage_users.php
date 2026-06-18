<?php
require_once("../config/condb.php");
require_once("../config/session_check.php");

if ($_SESSION['role'] !== 'admin') {
    $msg = __('admin_only');
    echo "<script>alert('$msg'); window.location='index';</script>";
    exit;
}

$allowed_roles = ['user', 'material_prep', 'admin'];

// ตรวจสอบตัวแปร Edit Mode
$editKey = false;
$editUser = [];

// ถ้ามีการกดแก้ไข
if (isset($_GET['edit'])) {
    $id = intval($_GET['edit']);
    $stmt = $condb->prepare("SELECT * FROM users WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $resultUser = $stmt->get_result();
    if ($resultUser->num_rows > 0) {
        $editUser = $resultUser->fetch_assoc();
        $editKey = true;
    }
}

// เพิ่มผู้ใช้ใหม่ หรือ แก้ไขข้อมูลเดิม
if ($_SERVER['REQUEST_METHOD'] === 'POST') {

    // กรณีแก้ไขผู้ใช้
    if (isset($_POST['update_user'])) {
        $id = intval($_POST['user_id']);
        $username = trim($_POST['username']);
        $role = in_array($_POST['role'], $allowed_roles, true) ? $_POST['role'] : 'user';
        $email = !empty($_POST['email']) ? trim($_POST['email']) : null;

        if (!empty($_POST['password'])) {
            $password = password_hash($_POST['password'], PASSWORD_DEFAULT);
            $stmt = $condb->prepare("UPDATE users SET username=?, password=?, role=?, email=? WHERE id=?");
            $stmt->bind_param("ssssi", $username, $password, $role, $email, $id);
        } else {
            $stmt = $condb->prepare("UPDATE users SET username=?, role=?, email=? WHERE id=?");
            $stmt->bind_param("sssi", $username, $role, $email, $id);
        }

        if ($stmt->execute()) {
            $msg = __('save_success');
            echo "<script>alert('$msg'); window.location='manage_users';</script>";
        } else {
            $msg = __('save_failed');
            echo "<script>alert('$msg');</script>";
        }
        exit;
    }

    // กรณีเพิ่มผู้ใช้ใหม่
    else if (isset($_POST['add_user'])) {
        $username = trim($_POST['username']);
        $password = password_hash($_POST['password'], PASSWORD_DEFAULT);
        $role = in_array($_POST['role'], $allowed_roles, true) ? $_POST['role'] : 'user';
        $email = !empty($_POST['email']) ? trim($_POST['email']) : null;

        $stmt = $condb->prepare("INSERT INTO users (username, password, role, email) VALUES (?, ?, ?, ?)");
        $stmt->bind_param("ssss", $username, $password, $role, $email);
        $stmt->execute();
        $msg = __('save_success');
        echo "<script>alert('$msg'); window.location='manage_users';</script>";
        exit;
    }
}

// ลบผู้ใช้
if (isset($_GET['delete'])) {
    $id = intval($_GET['delete']);
    $stmt = $condb->prepare("DELETE FROM users WHERE id = ?");
    $stmt->bind_param("i", $id);
    $stmt->execute();
    $msg = __('logout') == 'Logout' ? 'User deleted successfully' : 'ลบผู้ใช้เรียบร้อยแล้ว';
    echo "<script>alert('$msg'); window.location='manage_users';</script>";
    exit;
}

// ดึงรายชื่อผู้ใช้
$result = $condb->query("SELECT * FROM users ORDER BY id ASC");

$page_title = __('logout') == 'Logout' ? 'Manage Users' : 'จัดการผู้ใช้ระบบ';
$page_icon = 'fa-users-cog';
$show_home = true;
?>
<!DOCTYPE html>
<html lang="<?= htmlspecialchars($_SESSION['lang'] ?? 'th') ?>">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($page_title) ?> | Visual Location Management</title>
    <link rel="icon" type="image/png" href="assets/favicon.png">
    <link href="plugins/google-fonts/fonts.css" rel="stylesheet">
    <link rel="stylesheet" href="plugins/font-awesome/all.css">
        <link rel="stylesheet" href="assets/factory.css?v=20260611">
    <link rel="stylesheet" href="assets/pages-common.css?v=20260607">
    <link rel="stylesheet" href="assets/pages/manage-users.css?v=20260610">
</head>

<body class="factory-app factory-manage-users">
<?php require __DIR__ . '/includes/layout_header.php'; ?>
<main class="fx-main">
    <div class="container">
        <p class="subtitle" style="margin:0 0 1.5rem;color:var(--text-secondary);">
            <?= __('logout') == 'Logout' ? 'Add, Delete, Edit and Manage system permissions' : 'เพิ่ม ลบ แก้ไข และจัดการสิทธิ์การเข้าใช้งานระบบ' ?>
        </p>

        <!-- Form Section -->
        <div class="card" id="userForm">
            <div class="card-header">
                <div class="card-header-title">
                    <?php if ($editKey): ?>
                        <i class="fas fa-user-edit"></i>
                        <h3><?= __('logout') == 'Logout' ? 'Edit User' : 'แก้ไขข้อมูลผู้ใช้' ?></h3>
                        <span class="mode-badge">Edit Mode</span>
                    <?php else: ?>
                        <i class="fas fa-user-plus"></i>
                        <h3><?= __('logout') == 'Logout' ? 'Add New User' : 'เพิ่มผู้ใช้ใหม่' ?></h3>
                    <?php endif; ?>
                </div>
                <?php if ($editKey): ?>
                    <a href="manage_users" class="btn-cancel"><i class="fas fa-times"></i>
                        <?= __('logout') == 'Logout' ? 'Cancel' : 'ยกเลิก' ?></a>
                <?php endif; ?>
            </div>

            <form method="POST" action="manage_users">
                <?php if ($editKey): ?>
                    <input type="hidden" name="user_id" value="<?= $editUser['id'] ?>">
                <?php endif; ?>

                <div class="mu-form-grid">
                    <div class="form-group">
                        <label class="fx-field-label"><i class="fas fa-user" aria-hidden="true"></i>
                            <?= __('logout') == 'Logout' ? 'Username' : 'ชื่อผู้ใช้' ?></label>
                        <input type="text" name="username" id="username" class="form-control mu-input"
                            placeholder="<?= __('logout') == 'Logout' ? 'Enter username...' : 'กรอกชื่อผู้ใช้...' ?>"
                            value="<?= $editKey ? htmlspecialchars($editUser['username']) : '' ?>" required autofocus>
                    </div>

                    <div class="form-group">
                        <label class="fx-field-label"><i class="fas fa-key" aria-hidden="true"></i> <?= __('logout') == 'Logout' ? 'Password' : 'รหัสผ่าน' ?>
                            <?= $editKey ? '<small class="mu-label-hint">(' . (__('logout') == 'Logout' ? 'leave blank to keep current' : 'เว้นว่างหากไม่ต้องการเปลี่ยน') . ')</small>' : '' ?></label>
                        <input type="password" name="password" class="form-control mu-input"
                            placeholder="<?= $editKey ? (__('logout') == 'Logout' ? 'Enter new password...' : 'กรอกหากต้องการเปลี่ยนรหัสผ่าน...') : (__('logout') == 'Logout' ? 'Enter password...' : 'กรอกรหัสผ่าน...') ?>"
                            <?= $editKey ? '' : 'required' ?>>
                    </div>

                    <div class="form-group">
                        <label class="fx-field-label"><i class="fas fa-envelope" aria-hidden="true"></i>
                            <?= __('logout') == 'Logout' ? 'Email (Notification)' : 'อีเมล (แจ้งเตือน)' ?></label>
                        <input type="email" name="email" id="emailInput" class="form-control mu-input"
                            placeholder="example@email.com"
                            value="<?= $editKey ? htmlspecialchars($editUser['email']) : '' ?>">
                    </div>

                    <div class="form-group">
                        <label class="fx-field-label"><i class="fas fa-user-shield" aria-hidden="true"></i>
                            <?= __('logout') == 'Logout' ? 'Permission / Role' : 'สิทธิ์การใช้งาน' ?></label>
                        <select name="role" id="roleSelect" class="form-control mu-input">
                            <option value="user" <?= ($editKey && $editUser['role'] == 'user') ? 'selected' : '' ?>>User
                                (<?= __('logout') == 'Logout' ? 'General User' : 'ผู้ใช้งานทั่วไป' ?>)</option>
                            <option value="material_prep" <?= ($editKey && $editUser['role'] == 'material_prep') ? 'selected' : '' ?>>Material Prep
                                (<?= __('logout') == 'Logout' ? 'Material Preparation Room Staff' : 'พนักงานห้องจัดเตรียมวัตถุดิบ' ?>)</option>
                            <option value="admin" <?= ($editKey && $editUser['role'] == 'admin') ? 'selected' : '' ?>>Admin
                                (<?= __('logout') == 'Logout' ? 'System Admin' : 'ผู้ดูแลระบบ' ?>)</option>
                        </select>
                    </div>
                </div>

                <div class="mu-form-actions">
                    <?php if ($editKey): ?>
                        <button type="submit" name="update_user" class="btn-submit btn-update">
                            <i class="fas fa-save"></i> <?= __('logout') == 'Logout' ? 'Save Changes' : 'บันทึกการแก้ไข' ?>
                        </button>
                    <?php else: ?>
                        <button type="submit" name="add_user" class="btn-submit">
                            <i class="fas fa-plus-circle"></i> <?= __('logout') == 'Logout' ? 'Add User' : 'เพิ่มผู้ใช้' ?>
                        </button>
                    <?php endif; ?>
                </div>
            </form>
        </div>

        <!-- Table Section -->
        <div class="card">
            <div class="card-header">
                <div class="card-header-title">
                    <i class="fas fa-list"></i>
                    <h3><?= __('logout') == 'Logout' ? 'All Users' : 'รายชื่อผู้ใช้ทั้งหมด' ?></h3>
                </div>
            </div>

            <div class="table-responsive">
                <table>
                    <thead>
                        <tr>
                            <th width="5%">#</th>
                            <th width="25%"><?= __('logout') == 'Logout' ? 'Username' : 'ชื่อผู้ใช้' ?></th>
                            <th width="25%"><?= __('logout') == 'Logout' ? 'Email' : 'อีเมล' ?></th>
                            <th width="15%"><?= __('logout') == 'Logout' ? 'Role' : 'สิทธิ์' ?></th>
                            <th width="15%"><?= __('logout') == 'Logout' ? 'Created At' : 'วันที่สร้าง' ?></th>
                            <th width="15%" style="text-align: center;">
                                <?= __('logout') == 'Logout' ? 'Action' : 'จัดการ' ?>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <?php
                        $i = 1;
                        while ($row = $result->fetch_assoc()):
                            ?>
                            <tr
                                style="<?= ($editKey && $editUser['id'] == $row['id']) ? 'background-color: #fff3cd;' : '' ?>">
                                <td><?= $i++ ?></td>
                                <td>
                                    <div style="display: flex; align-items: center;">
                                        <div
                                            style="width: 32px; height: 32px; background: #eee; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 10px; color: #666;">
                                            <i class="fas fa-user"></i>
                                        </div>
                                        <?= htmlspecialchars($row['username']) ?>
                                    </div>
                                </td>
                                <td>
                                    <?php if (!empty($row['email'])): ?>
                                        <span style="display: flex; align-items: center; gap: 5px;">
                                            <i class="far fa-envelope" style="color: #bbb;"></i>
                                            <?= htmlspecialchars($row['email']) ?>
                                        </span>
                                    <?php else: ?>
                                        <span style="color: #ccc;">-
                                            <?= __('logout') == 'Logout' ? 'Not specified' : 'ไม่ระบุ' ?> -</span>
                                    <?php endif; ?>
                                </td>
                                <td>
                                    <?php if ($row['role'] == 'admin'): ?>
                                        <span class="badge badge-admin"><i class="fas fa-shield-alt"></i> Admin</span>
                                    <?php elseif ($row['role'] == 'material_prep'): ?>
                                        <span class="badge badge-user" style="background: rgba(245, 158, 11, 0.1); color: #d97706;"><i class="fas fa-dolly"></i> Material Prep</span>
                                    <?php else: ?>
                                        <span class="badge badge-user"><i class="fas fa-user"></i> User</span>
                                    <?php endif; ?>
                                </td>
                                <td><span
                                        style="font-size: 0.9em; color: #666;"><?= date('d/m/Y', strtotime($row['created_at'])) ?></span>
                                </td>
                                <td>
                                    <div class="action-group">
                                        <a href="?edit=<?= $row['id'] ?>#userForm" class="btn-icon btn-edit"
                                            title="<?= __('logout') == 'Logout' ? 'Edit' : 'แก้ไข' ?>">
                                            <i class="fas fa-edit"></i>
                                        </a>
                                        <a href="?delete=<?= $row['id'] ?>" class="btn-icon btn-delete"
                                            onclick="return confirm('<?= __('logout') == 'Logout' ? 'Are you sure you want to delete user ' : 'ต้องการลบผู้ใช้ ' ?><?= htmlspecialchars($row['username']) ?> ?')"
                                            title="<?= __('logout') == 'Logout' ? 'Delete' : 'ลบ' ?>">
                                            <i class="fas fa-trash-alt"></i>
                                        </a>
                                    </div>
                                </td>
                            </tr>
                        <?php endwhile; ?>
                    </tbody>
                </table>
            </div>
        </div>

    </div>

    <!-- Script to handle dynamic requirement for Admin email -->
    <script>
        const roleSelect = document.getElementById('roleSelect');
        const emailInput = document.getElementById('emailInput');

        function updateEmailRequirement() {
            if (roleSelect.value === 'admin') {
                emailInput.setAttribute('required', 'required');
                emailInput.placeholder = isEN ? 'Please enter email for Admin' : 'กรุณากรอกอีเมลสำหรับ Admin';

                const label = emailInput.parentElement.querySelector('label');
                if (label) {
                    label.innerHTML = isEN ? '<i class="fas fa-envelope"></i> Email (Admin must specify)' : '<i class="fas fa-envelope"></i> อีเมล (Admin จำเป็นต้องระบุ)';
                    label.style.color = 'var(--danger-color)';
                }
            } else {
                emailInput.removeAttribute('required');
                if (!emailInput.value) { // Update placeholder only if empty
                    emailInput.placeholder = isEN ? 'Optional' : 'ระบุหรือไม่ก็ได้';
                }

                const label = emailInput.parentElement.querySelector('label');
                if (label) {
                    label.innerHTML = isEN ? '<i class="fas fa-envelope"></i> Email (Notification)' : '<i class="fas fa-envelope"></i> อีเมล (แจ้งเตือน)';
                    label.style.color = 'var(--text-main)';
                }
            }
        }
        const isEN = <?= json_encode($_SESSION['lang'] == 'en') ?>;

        roleSelect.addEventListener('change', updateEmailRequirement);

        // Initial check on load
        document.addEventListener('DOMContentLoaded', function() {
            updateEmailRequirement();
            const usernameInput = document.getElementById('username');
            if (usernameInput) usernameInput.focus();
        });
    </script>
    <script src="assets/factory.js"></script>
</main>
<?php require __DIR__ . '/includes/layout_footer.php'; ?>
</body>

</html>
