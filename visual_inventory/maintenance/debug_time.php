<?php
require_once __DIR__ . '/../config/maintenance_guard.php';
maintenance_dev_admin_guard(true);
require_once __DIR__ . '/../config/condb.php';
header('Content-Type: application/json');
echo json_encode([
    'php_time' => date('Y-m-d H:i:s'),
    'php_tz' => date_default_timezone_get(),
    'db_now' => $condb->query('SELECT NOW() as n')->fetch_assoc()['n'],
    'server_name' => $_SERVER['SERVER_NAME'] ?? 'unknown'
]);
