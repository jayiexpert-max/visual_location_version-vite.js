<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}
require_once("../config/condb.php");
require_once("../config/language.php");
require_once("../config/cpk_service.php");

if ($_SERVER["REQUEST_METHOD"] === "POST") {
    $username = trim($_POST['username']);
    $password = trim($_POST['password']);

    $stmt = $condb->prepare("SELECT * FROM users WHERE username = ?");
    $stmt->bind_param("s", $username);
    $stmt->execute();
    $result = $stmt->get_result();
    $user = $result->fetch_assoc();

    if ($user && password_verify($password, $user['password'])) {
        // ✅ เข้าสู่ระบบสำเร็จ
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];
        $_SESSION['role'] = $user['role'];
        $_SESSION['login_time'] = time();

        cpk_clear_public_uid_cache();
        cpk_prewarm_public_uid();

        if ($user['role'] === 'admin') {
            header("Location: index");
        } else {
            header("Location: index");
        }
        exit;
    } else {
        $error = __('logout') == 'Logout' ? 'Invalid username or password' : 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง';
    }
}
?>
<?php if (isset($_GET['timeout'])): ?>
    <script>
        alert('<?= __('logout') == "Logout" ? "Session expired. Please login again." : "เซสชั่นหมดอายุ กรุณาเข้าสู่ระบบใหม่" ?>');
    </script>
<?php endif; ?>

<!DOCTYPE html>
<html lang="th">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= __('login') == 'Login' ? 'Login' : 'เข้าสู่ระบบ' ?> | Visual Location Management</title>
    <!-- Fonts & Icons -->
    <link rel="icon" type="image/png" href="assets/favicon.png">
    <link href="plugins/google-fonts/fonts.css" rel="stylesheet">
    <link href="plugins/font-awesome/all.css" rel="stylesheet">
    <link href="plugins/font-awesome/v4-font-face.css" rel="stylesheet">

    <link rel="stylesheet" href="assets/factory.css?v=20260611">
    <link rel="stylesheet" href="assets/pages/login.css?v=20260614">
</head>

<body>
    <!-- Floating Particles -->
    <div class="particles">
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
        <div class="particle"></div>
    </div>

    <div class="login-card">
        <div class="login-header">
            <div class="brand-icon-wrapper">
                <i class="fas fa-cube brand-icon"></i>
            </div>
            <h1>Visual Location Management</h1>
            <p><?= __('logout') == 'Logout' ? 'Please login to continue' : 'กรุณาเข้าสู่ระบบเพื่อใช้งาน' ?></p>
        </div>

        <?php if (!empty($error)): ?>
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                <?= htmlspecialchars($error) ?>
            </div>
        <?php endif; ?>

        <form method="POST">
            <div class="input-group">
                <label><?= __('logout') == 'Logout' ? 'Username' : 'ชื่อผู้ใช้' ?></label>
                <div class="input-wrapper">
                    <input type="text" name="username" id="username"
                        placeholder="<?= __('logout') == 'Logout' ? 'Enter username' : 'กรอกชื่อผู้ใช้' ?>" required
                        autocomplete="username" autofocus>
                    <i class="fas fa-user input-icon"></i>
                </div>
            </div>

            <div class="input-group">
                <label><?= __('logout') == 'Logout' ? 'Password' : 'รหัสผ่าน' ?></label>
                <div class="input-wrapper">
                    <input type="password" name="password" id="password"
                        placeholder="<?= __('logout') == 'Logout' ? 'Enter password' : 'กรอกรหัสผ่าน' ?>" required
                        autocomplete="current-password">
                    <i class="fas fa-lock input-icon"></i>
                </div>
            </div>

            <button type="submit" class="submit-btn">
                <?= __('login') == 'Login' ? 'Login' : 'เข้าสู่ระบบ' ?>
                <i class="fas fa-arrow-right"></i>
            </button>
        </form>

        <div class="lang-switch-login">
            <a href="?lang=th" class="<?= $_SESSION['lang'] == 'th' ? 'active' : '' ?>">ภาษาไทย</a>
            <span class="lang-divider">|</span>
            <a href="?lang=en" class="<?= $_SESSION['lang'] == 'en' ? 'active' : '' ?>">English</a>
        </div>

        <div class="footer-text">
            &copy; <?= date('Y') ?> <?= htmlspecialchars(__('system_name')) ?>
        </div>
    </div>

    <script>
        (function () {
            var username = document.getElementById('username');
            var password = document.getElementById('password');
            var form = username && username.closest('form');
            if (!username || !password || !form) return;

            username.addEventListener('keydown', function (e) {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                password.focus();
            });

            password.addEventListener('keydown', function (e) {
                if (e.key !== 'Enter') return;
                e.preventDefault();
                if (typeof form.requestSubmit === 'function') {
                    form.requestSubmit();
                } else {
                    form.submit();
                }
            });

            username.focus();
        })();
    </script>
</body>

</html>
