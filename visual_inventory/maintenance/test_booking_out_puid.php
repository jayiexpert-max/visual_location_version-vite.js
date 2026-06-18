<?php

require_once __DIR__ . '/../config/maintenance_guard.php';
require_once __DIR__ . '/../config/cpk_service.php';
require_once __DIR__ . '/../config/station_inven_sync_service.php';

maintenance_dev_only_guard();

if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

header('Content-Type: application/json; charset=UTF-8');

$puid = cpk_normalize_puid_input($_GET['puid'] ?? '847125390E2E');
$operator = trim($_GET['operator'] ?? '085995');
$destination = trim($_GET['destination'] ?? 'STORE');
$dryRun = !isset($_GET['send']);

$out = ['puid' => $puid, 'dry_run' => $dryRun];

$uid = cpk_public_uid(true);
$out['public_uid'] = [
    'ok' => $uid['ok'],
    'message' => $uid['message'] ?? null,
];

$inv = cpk_post_authenticated('StationInvenCheck', ['NearExpiryDays' => 0]);
$items = station_inven_normalize_items($inv['data']['Items'] ?? []);
$stationRow = null;
foreach ($items as $row) {
    if (!is_array($row)) {
        continue;
    }
    if (strcasecmp(trim((string) ($row['PUID'] ?? '')), $puid) === 0) {
        $stationRow = $row;
        break;
    }
}
$out['station_inven'] = [
    'ok' => $inv['ok'],
    'message' => $inv['cpk_message'] ?? $inv['error'] ?? null,
    'total' => count($items),
    'puid_found' => $stationRow !== null,
    'row' => $stationRow,
];

require_once __DIR__ . '/../config/helpers.php';
$pds = pdservice_fetch_puid($puid);
$out['pdservice'] = $pds ? [
    'PUID' => $pds['PUID'] ?? null,
    'McID' => $pds['McID'] ?? null,
    'StatusName' => $pds['StatusName'] ?? null,
    'QtyRemain' => $pds['QtyRemain'] ?? null,
    'HanaPart' => $pds['HanaPart'] ?? null,
] : null;

if (!$dryRun) {
    $out['booking_out'] = cpk_booking_out_puid_call($puid, $operator, $destination);
}

echo json_encode($out, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
