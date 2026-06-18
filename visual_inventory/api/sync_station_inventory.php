<?php

header('Content-Type: application/json; charset=UTF-8');
require_once __DIR__ . '/../config/session_check.php';
require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../config/condb.php';
require_once __DIR__ . '/../config/station_inven_sync_service.php';
require_once __DIR__ . '/../config/res_inven_sync_service.php';
require_once __DIR__ . '/../config/inventory_api_service.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Only POST allowed']);
    exit;
}

$input = api_json_body();
if ($input === []) {
    $input = $_POST;
}

$search = trim((string) ($input['search'] ?? ''));
$resNo = trim((string) ($input['res_no'] ?? ''));

// Central sync: expired + within 7 days only. CPK carries ExpirationDate — avoid slow per-PUID PDService loops.
$pdsLimit = 12;
if ($resNo !== '') {
    $result = res_inven_sync_to_db($condb, $resNo);
    $pdsResult = [
        'status' => 'skipped',
        'message' => 'PDService skipped (RES sync uses CPK expiration)',
        'checked' => 0,
        'updated' => 0,
        'errors' => 0,
        'skipped' => true,
    ];
} else {
    $result = station_inven_sync_to_db($condb, $search, 'all');
    // Only backfill rows still missing expiration after CPK station sync.
    $pdsResult = inventory_sync_expiration_from_pdservice($condb, $search, 'all', $pdsLimit, '', true);
}

$result['sync_scope'] = 'expired_and_' . expiration_sync_near_days() . 'd';

$result['pdservice'] = $pdsResult;
if ($pdsResult['status'] === 'success' && ($pdsResult['updated'] ?? 0) > 0) {
    $result['message'] = trim(($result['message'] ?? '') . ' | ' . ($pdsResult['message'] ?? ''));
}

echo json_encode($result, JSON_UNESCAPED_UNICODE);
