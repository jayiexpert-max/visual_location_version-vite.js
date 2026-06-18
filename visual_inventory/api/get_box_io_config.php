<?php

require_once __DIR__ . '/../config/condb.php';
require_once __DIR__ . '/../config/io_device_service.php';

header('Content-Type: application/json; charset=utf-8');

$boxId = isset($_GET['box_id']) ? (int) $_GET['box_id'] : 0;
if ($boxId <= 0) {
    echo json_encode(['status' => 'error', 'message' => 'Missing box_id']);
    exit;
}

$ios = io_list_highlight_pins($condb, $boxId);

echo json_encode([
    'status' => 'success',
    'ios' => $ios,
    'duration_sec' => io_highlight_duration_sec(),
], JSON_UNESCAPED_UNICODE);
