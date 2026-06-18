<?php

/**
 * Save CPK-received PUIds into local warehouse (no RES_PUIDRecv).
 * For handheld receive that updated CPK but local stock was not saved yet.
 */

header('Content-Type: application/json; charset=UTF-8');

require_once __DIR__ . '/../config/auth_helpers.php';
cors_allow_app_origin();

require_once __DIR__ . '/../config/session_check.php';
require_once __DIR__ . '/../config/condb.php';
require_once __DIR__ . '/../config/res_info_service.php';

if (!role_can_receive_inbound()) {
    http_response_code(403);
    echo json_encode(['status' => 'error', 'message' => 'Access denied']);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Only POST allowed']);
    exit;
}

$body = $GLOBALS['API_JSON_BODY'] ?? [];
if (!is_array($body) || $body === []) {
    $body = $_POST;
}

$resNo = trim((string) ($body['res_no'] ?? $body['RES_NO'] ?? $body['ReservationNo'] ?? ''));
$resNo = preg_replace('/^RES/i', '', $resNo);

if ($resNo === '') {
    echo json_encode(['status' => 'error', 'message' => 'RES number is required']);
    exit;
}

$result = res_info_sync_local_from_cpk($condb, $resNo);
echo json_encode($result);
