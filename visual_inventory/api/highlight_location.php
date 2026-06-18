<?php

header('Content-Type: application/json; charset=UTF-8');

require_once __DIR__ . '/../config/session_check.php';
require_once __DIR__ . '/../config/condb.php';
require_once __DIR__ . '/../config/warehouse_highlight_service.php';

$isEN = wh_is_en();

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => wh_msg($isEN, 'post_only')], JSON_UNESCAPED_UNICODE);
    exit;
}

$raw = file_get_contents('php://input');
$input = json_decode($raw, true);
if (!is_array($input)) {
    $input = $_POST;
}

$triggerIo = !isset($input['trigger_io']) || filter_var($input['trigger_io'], FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) !== false;

if (!empty($input['puid']) && empty($input['box_id'])) {
    $loc = wh_resolve_location_by_puid($condb, (string) $input['puid']);
    if ($loc) {
        $input = array_merge($loc, $input);
    }
}

if (!empty($input['material_code']) && empty($input['box_id'])) {
    $loc = wh_resolve_location_by_material($condb, (string) $input['material_code']);
    if ($loc) {
        $input = array_merge($loc, $input);
    }
}

if (empty($input['HanaPart']) && !empty($input['material_code'])) {
    $input['HanaPart'] = $input['material_code'];
}
if (empty($input['product_name']) && !empty($input['HanaPart'])) {
    $input['product_name'] = $input['HanaPart'];
}

if ((int) ($input['box_id'] ?? 0) <= 0) {
    echo json_encode([
        'status' => 'error',
        'message' => wh_highlight_failure_message($condb, $input, $isEN),
    ], JSON_UNESCAPED_UNICODE);
    exit;
}

$result = wh_highlight_location($condb, $input, $triggerIo, $isEN);
echo json_encode($result, JSON_UNESCAPED_UNICODE);
