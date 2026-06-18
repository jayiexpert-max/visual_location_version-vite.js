<?php
/**
 * Generic API Proxy for Visual Inventory
 * This allows calling files in the /api directory through the /public directory
 * usage: api_gateway.php?call=filename.php&...params...
 * CPK: api_gateway.php?call=cpk/get_version.php
 */
require_once __DIR__ . '/../config/session_check.php';

$allowed_files = [
    'get_res_info.php',
    'get_reservation_list.php',
    'receive_item.php',
    'trigger_tv_highlight.php',
    'highlight_location.php',
    'get_rack_details.php',
    'update_expiration.php',
    'sync_station_inventory.php',
    'sync_res_cpk_received.php',
    'sync_res_local_received.php',
    'get_box_products.php',
    'io_control.php',
    'trigger_box_io.php',
    'reset_all_io.php',
];

$cpk_allowed = [
    'cpk/get_version.php',
    'cpk/get_res_no_info.php',
    'cpk/get_wo_bom_info.php',
    'cpk/get_public_uid.php',
    'cpk/res_puid_recv.php',
    'cpk/issue_puid_to_picklist.php',
    'cpk/update_puid_status.php',
    'cpk/get_open_picklists.php',
    'cpk/get_picklist_detail.php',
    'cpk/close_picklist.php',
    'cpk/booking_out_puid.php',
    'cpk/station_inven_check.php',
    'cpk/clear_cache.php',
];

$call = $_GET['call'] ?? $_POST['call'] ?? '';

$rawBody = file_get_contents('php://input');
$jsonBody = ($rawBody !== false && $rawBody !== '') ? json_decode($rawBody, true) : null;
if (is_array($jsonBody)) {
    $GLOBALS['API_JSON_BODY'] = $jsonBody;
    if ($call === '') {
        $call = $jsonBody['call'] ?? '';
    }
    foreach ($jsonBody as $key => $value) {
        if ($key !== 'call') {
            $_POST[$key] = $value;
        }
    }
} else {
    $GLOBALS['API_JSON_BODY'] = [];
}

if (in_array($call, $allowed_files, true)) {
    require_once __DIR__ . '/../api/' . $call;
    exit;
}

if (in_array($call, $cpk_allowed, true)) {
    require_once __DIR__ . '/../api/' . $call;
    exit;
}

header('Content-Type: application/json');
http_response_code(403);
echo json_encode(['status' => 'error', 'message' => 'Forbidden API call']);
