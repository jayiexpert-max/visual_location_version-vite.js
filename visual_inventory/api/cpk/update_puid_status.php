<?php

require_once __DIR__ . '/_bootstrap.php';
require_once __DIR__ . '/../../config/inventory_api_service.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    cpk_api_json('error', 'Only POST allowed', null, 405);
}

cpk_api_require_mcid_for_post();

$body = cpk_api_read_json_body();
$puid = trim($body['PUID'] ?? $body['puid'] ?? '');
$operator = trim($body['Operator'] ?? $body['operator'] ?? ($_SESSION['username'] ?? ''));
$newQty = trim((string) ($body['New_Qty'] ?? $body['new_qty'] ?? ''));

if ($puid === '' || $newQty === '') {
    cpk_api_json('error', 'PUID and New_Qty are required', null, 400);
}

if ($operator === '') {
    cpk_api_json('error', 'Operator is required', null, 400);
}

$locData = [
    'Loc_Shelf' => $body['Loc_Shelf'] ?? $body['loc_shelf'] ?? '',
    'Loc_Level' => $body['Loc_Level'] ?? $body['loc_level'] ?? '',
    'Loc_Box' => $body['Loc_Box'] ?? $body['loc_box'] ?? '',
    'Loc_Slot' => $body['Loc_Slot'] ?? $body['loc_slot'] ?? '',
    'Location' => $body['Location'] ?? $body['location'] ?? '',
];

$result = cpk_update_puid_status_call($puid, $operator, $newQty, $locData);

if (!$result['ok']) {
    cpk_api_json('error', $result['message'], $result['data'], $result['transport_failure'] ? 502 : 400);
}

$msg = $result['message'];
if ($result['warnings'] !== []) {
    $msg .= cpk_format_warnings_html($result['warnings']);
}

$qtyBreakdown = $result['qty_breakdown'] ?? cpk_puid_info_breakdown($result['puid_info']);
$targetQty = (int) ($qtyBreakdown['effective_remain'] ?? 0);
$hanaPart = trim((string) ($body['HanaPart'] ?? $body['hana_part'] ?? ($result['puid_info']['PartNumber'] ?? '')));
$verify = $targetQty > 0
    ? inventory_verify_central_qty_after_cpk($puid, $targetQty, $hanaPart)
    : null;

if (is_array($verify) && ($verify['message'] ?? '') !== '') {
    $msg .= ' ' . $verify['message'];
}

cpk_api_json('success', $msg, [
    'UpdateDone' => $result['update_done'],
    'PUIDInfo' => $result['puid_info'],
    'qty_breakdown' => $qtyBreakdown,
    'central_verify' => $verify,
    'Warnings' => $result['warnings'],
    'cpk' => $result['data'],
]);
