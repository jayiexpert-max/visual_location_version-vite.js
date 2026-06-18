<?php

require_once __DIR__ . '/../config/condb.php';
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

$deviceId = isset($input['device_id']) ? (int) $input['device_id'] : 0;
$pin = isset($input['pin']) ? (int) $input['pin'] : 0;
$state = isset($input['state']) ? (int) $input['state'] : 0;

if ($deviceId <= 0 || $pin <= 0) {
    echo json_encode(['status' => 'error', 'message' => 'Missing device_id or pin']);
    exit;
}

$device = io_fetch_device($condb, $deviceId);
if (!$device) {
    echo json_encode(['status' => 'error', 'message' => 'Device not found']);
    exit;
}

$result = io_send_single_pin($device, $pin, $state);
echo json_encode($result, JSON_UNESCAPED_UNICODE);
