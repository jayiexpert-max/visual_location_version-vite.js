<?php

require_once __DIR__ . '/../config/condb.php';
require_once __DIR__ . '/../config/session_check.php';
require_once __DIR__ . '/../config/io_device_service.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method. Use POST.']);
    exit;
}

$result = io_reset_all_lights($condb);
echo json_encode($result, JSON_UNESCAPED_UNICODE);
