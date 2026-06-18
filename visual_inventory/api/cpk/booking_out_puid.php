<?php

require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/../../config/condb.php';
require_once __DIR__ . '/../../config/inventory_api_service.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    cpk_api_json('error', 'Only POST allowed', null, 405);
}

cpk_api_require_mcid_for_post();

if (!role_is_warehouse_staff()) {
    cpk_api_json('error', 'Access denied', null, 403);
}

$body = cpk_api_read_json_body();
$puid = trim($body['PUID'] ?? $body['puid'] ?? '');
$operator = trim($body['Operator'] ?? $body['operator'] ?? ($_SESSION['username'] ?? ''));
$destination = trim((string) ($body['Destination'] ?? $body['destination'] ?? ''));

$result = cpk_booking_out_puid_call($puid, $operator, $destination);

$data = is_array($result['data']) ? $result['data'] : [];
$puidInfo = $result['puid_info'] ?? null;
if ($puidInfo === null && isset($data['PUIDInfo']) && is_array($data['PUIDInfo'])) {
    $puidInfo = cpk_normalize_booking_out_puid_info($data['PUIDInfo']);
}

$shape = [
    'Status' => (string) ($data['Status'] ?? ($result['ok'] ? 'S' : 'E')),
    'Message' => (string) ($data['Message'] ?? $result['message'] ?? ''),
    'BookingOutDone' => !empty($data['BookingOutDone']) || !empty($result['booking_out_done']),
    'PUIDInfo' => $puidInfo,
    'Request' => $result['request_sent'] ?? null,
];

if (!$result['ok']) {
    $http = !empty($result['transport_failure']) ? 502 : 400;
    cpk_api_json('error', $shape['Message'] ?: $result['message'], $shape, $http);
}

$destLogged = (string) ($shape['Request']['Destination'] ?? $destination);
$userId = (int) ($_SESSION['user_id'] ?? 0);
$shape['ReportLogged'] = inventory_log_booking_out(
    $condb,
    $puid,
    $destLogged,
    $userId,
    is_array($shape['PUIDInfo']) ? $shape['PUIDInfo'] : null,
    $operator
);

cpk_api_json('success', $shape['Message'], $shape);
