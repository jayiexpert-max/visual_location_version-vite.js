<?php
require_once(__DIR__ . "/language.php");
require_once(__DIR__ . "/auth_helpers.php");
require_once(__DIR__ . "/tv_kiosk_auth.php");

$is_handheld_request = strpos($_SERVER['REQUEST_URI'], '/handheld/') !== false;
public_display_try_bypass();
tv_kiosk_try_bypass();
$tv_kiosk_bypass = session_auth_tv_kiosk_bypassed();

if (session_status() === PHP_SESSION_NONE) {
    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    session_start();
}

// ===== เช็ค login =====
if (!isset($_SESSION['user_id']) && !$tv_kiosk_bypass) {
    session_auth_deny_unauthenticated('Session expired or not logged in.');
}

if ($tv_kiosk_bypass) {
    return;
}

// ===== Scheduled Expiration (7:00 & 19:00) =====
$current_time = time();
$login_time = $_SESSION['login_time'] ?? 0;

// Determine the most recent cutoff time
$date_today = date('Y-m-d', $current_time);
$cutoff_morning = strtotime($date_today . ' 07:00:00');
$cutoff_evening = strtotime($date_today . ' 19:00:00');

if ($current_time < $cutoff_morning) {
    // Before 07:00, last cutoff was yesterday 19:00
    $last_cutoff = strtotime($date_today . ' -1 day 19:00:00');
} elseif ($current_time < $cutoff_evening) {
    // Between 07:00 and 19:00, last cutoff was today 07:00
    $last_cutoff = $cutoff_morning;
} else {
    // After 19:00, last cutoff was today 19:00
    $last_cutoff = $cutoff_evening;
}

// If login was before the last cutoff, force logout
if ($login_time < $last_cutoff) {
    session_unset();
    session_destroy();
    session_auth_deny_unauthenticated('Your session has expired due to shift change. Please login again.', 'shift');
}

// ===== timeout =====
$timeout_duration = $is_handheld_request ? 1800 : 14400; // handheld 30 นาที, desktop 4 ชั่วโมง

if (
    isset($_SESSION['last_activity']) &&
    (time() - $_SESSION['last_activity']) > $timeout_duration
) {
    session_unset();
    session_destroy();
    session_auth_deny_unauthenticated('Session timeout. Please login again.', 'idle');
}

// ===== update last activity =====
$_SESSION['last_activity'] = time();
