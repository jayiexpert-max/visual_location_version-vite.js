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

session_unset();
session_destroy();

$query = [];
if (isset($_GET['timeout'])) {
    $query['timeout'] = '1';
}
if (!empty($_GET['reason']) && preg_match('/^(idle|shift)$/', $_GET['reason'])) {
    $query['reason'] = $_GET['reason'];
}

$qs = $query ? '?' . http_build_query($query) : '';
header('Location: login' . $qs);
exit;
