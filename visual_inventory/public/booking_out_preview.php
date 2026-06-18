<?php

require_once __DIR__ . '/../config/condb.php';
require_once __DIR__ . '/../config/session_check.php';
require_once __DIR__ . '/../config/inventory_api_service.php';

header('Content-Type: application/json; charset=UTF-8');

if (!role_is_warehouse_staff()) {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Access denied'], JSON_UNESCAPED_UNICODE);
    exit;
}

$puid = trim($_GET['puid'] ?? '');
$result = booking_out_puid_preview($condb, $puid);

if (($result['status'] ?? '') !== 'success') {
    http_response_code(400);
}

echo json_encode($result, JSON_UNESCAPED_UNICODE);
