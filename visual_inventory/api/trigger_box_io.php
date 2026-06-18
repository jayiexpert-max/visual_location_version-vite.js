<?php

require_once __DIR__ . '/../config/condb.php';
require_once __DIR__ . '/../config/tv_kiosk_auth.php';
tv_kiosk_try_bypass();
require_once __DIR__ . '/../config/session_check.php';
require_once __DIR__ . '/../config/io_device_service.php';

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method. Use POST.']);
    exit;
}

$input = api_json_body();
if ($input === []) {
    $input = $_POST;
}

$boxId = isset($input['box_id']) ? (int) $input['box_id'] : 0;
$action = isset($input['action']) ? trim((string) $input['action']) : 'highlight';
$durationSec = isset($input['duration_sec']) ? (int) $input['duration_sec'] : io_highlight_duration_sec();
$slotNo = isset($input['slot_no']) && $input['slot_no'] !== '' ? (int) $input['slot_no'] : null;
$previousBoxId = isset($input['previous_box_id']) ? (int) $input['previous_box_id'] : 0;
$previousSlotNo = isset($input['previous_slot_no']) && $input['previous_slot_no'] !== ''
    ? (int) $input['previous_slot_no']
    : null;

if ($boxId <= 0) {
    echo json_encode(['status' => 'error', 'message' => 'Missing box_id']);
    exit;
}

if ($action === 'off') {
    $result = io_off_box($condb, $boxId, $slotNo);
} elseif ($action === 'highlight') {
    $result = io_switch_highlight_box($condb, $boxId, $slotNo, $previousBoxId, $previousSlotNo);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Invalid action. Use highlight or off.']);
    exit;
}

echo json_encode($result, JSON_UNESCAPED_UNICODE);
