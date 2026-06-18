<?php
if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}

require_once __DIR__ . '/../config/condb.php';
require_once __DIR__ . '/../config/language.php';
require_once __DIR__ . '/../config/handheld.php';
require_once __DIR__ . '/../config/cpk_service.php';

$error = '';
$next = $_GET['next'] ?? $_POST['next'] ?? 'index';
if (!preg_match('/^(index|add_stock|withdraw_stock|picklist_issue|receive_reservation)$/', $next)) {
    $next = 'index';
}

if (isset($_SESSION['user_id'])) {
    header('Location: ' . $next);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $password = trim($_POST['password'] ?? '');

    if ($password === '') {
        $error = 'Scan password.';
    } else {
        $user = null;

        // Fast path: employee ID badge (username) scan
        if (preg_match('/^\d{4,10}$/', $password)) {
            $stmt = $condb->prepare("SELECT id, username, password, role FROM users WHERE username = ? LIMIT 1");
            $stmt->bind_param("s", $password);
            $stmt->execute();
            $candidate = $stmt->get_result()->fetch_assoc();
            if ($candidate && password_verify($password, $candidate['password'])) {
                $user = $candidate;
            }
        }

        // Fallback: barcode password may not match username field
        if (!$user) {
            $stmt = $condb->prepare("SELECT id, username, password, role FROM users ORDER BY id ASC");
            $stmt->execute();
            $result = $stmt->get_result();

            while ($row = $result->fetch_assoc()) {
                if (password_verify($password, $row['password'])) {
                    $user = $row;
                    break;
                }
            }
        }

        if ($user) {
            session_regenerate_id(true);
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $user['username'];
            $_SESSION['role'] = $user['role'];
            $_SESSION['login_time'] = time();
            $_SESSION['last_activity'] = time();

            cpk_clear_public_uid_cache();
            cpk_prewarm_public_uid();

            header('Location: ' . $next);
            exit;
        }

        $error = __('logout') == 'Logout' ? 'Invalid password' : 'รหัสผ่านไม่ถูกต้อง';
    }
}
?>
<?php $hh_title = 'Handheld Login'; ?>
<!DOCTYPE html>
<html lang="en">

<head>
<?php require __DIR__ . '/includes/head.php'; ?>
</head>

<body class="handheld-app">
    <main class="handheld-main">
        <?php
        $bar_title = 'Handheld Login';
        $bar_kicker = 'KEYENCE BT-A500';
        $bar_menu = true;
        $bar_user = 'Visual Inventory';
        require __DIR__ . '/includes/bar.php';
        ?>

        <?php
        $timeoutReason = $_GET['reason'] ?? '';
        if ($timeoutReason === 'shift'): ?>
            <section class="fx-alert fx-alert-warning">Shift change (07:00 / 19:00). Please login again.</section>
        <?php elseif ($timeoutReason === 'idle' || isset($_GET['timeout'])): ?>
            <section class="fx-alert fx-alert-warning">Session idle timeout (30 min). Please login again.</section>
        <?php endif; ?>

        <?php if ($error): ?>
            <section class="fx-alert fx-alert-warning"><?= htmlspecialchars($error) ?></section>
        <?php endif; ?>

        <form method="POST" class="handheld-form handheld-login-panel hh-login-form" autocomplete="off">
            <input type="hidden" name="next" value="<?= htmlspecialchars($next) ?>">

            <label for="password_input">Scan Password</label>
            <input type="password" id="password_input" name="password" class="scan-field" inputmode="numeric" autocomplete="current-password" autofocus required>

            <button type="submit" class="fx-btn fx-btn-primary">Login</button>
        </form>
    </main>

    <script>
        (function () {
            var form = document.querySelector('.hh-login-form');
            var passwordInput = document.querySelector('input[name="password"]');
            var scanDebounceTimer = null;
            var lastEnterAt = 0;
            var SCAN_DEBOUNCE_MS = 200;
            var SCAN_MIN_LEN = 4;
            var ENTER_DEDUPE_MS = 300;

            function stripScanValue() {
                var value = (passwordInput.value || '').replace(/[\r\n]+/g, '').trim();
                passwordInput.value = value;
                return value;
            }

            function submitLogin() {
                if (!form || !passwordInput || passwordInput.disabled) {
                    return;
                }
                window.clearTimeout(scanDebounceTimer);
                if (!stripScanValue()) {
                    return;
                }
                form.requestSubmit();
            }

            function handleScanInput() {
                var raw = passwordInput.value || '';
                var hadSuffix = /[\r\n]/.test(raw);

                stripScanValue();

                if (hadSuffix && passwordInput.value) {
                    window.clearTimeout(scanDebounceTimer);
                    submitLogin();
                    return;
                }

                window.clearTimeout(scanDebounceTimer);
                scanDebounceTimer = window.setTimeout(function () {
                    if (passwordInput.disabled) {
                        return;
                    }
                    stripScanValue();
                    if (passwordInput.value.length >= SCAN_MIN_LEN) {
                        submitLogin();
                    }
                }, SCAN_DEBOUNCE_MS);
            }

            function handleEnter(event) {
                if (event.key !== 'Enter' && event.keyCode !== 13) {
                    return;
                }
                var now = Date.now();
                if (now - lastEnterAt < ENTER_DEDUPE_MS) {
                    return;
                }
                lastEnterAt = now;
                event.preventDefault();
                submitLogin();
            }

            window.addEventListener('pageshow', function () {
                passwordInput?.focus();
            });

            if (passwordInput) {
                ['keydown', 'keyup', 'keypress'].forEach(function (eventName) {
                    passwordInput.addEventListener(eventName, handleEnter);
                });
                passwordInput.addEventListener('input', handleScanInput);
                passwordInput.addEventListener('change', handleScanInput);
            }
        })();
    </script>
</body>

</html>
