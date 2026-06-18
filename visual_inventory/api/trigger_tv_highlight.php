<?php
require_once("../config/condb.php");
require_once("../config/session_check.php");
require_once("../config/warehouse_highlight_service.php");

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Only POST allowed']);
    exit;
}

$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    echo json_encode(['status' => 'error', 'message' => 'No data provided']);
    exit;
}

$data['action_type'] = $data['action_type'] ?? 'verify';
$result = wh_highlight_from_proxy_data($condb, $data, (string) $data['action_type']);

if ($result['status'] === 'success') {
    echo json_encode(['status' => 'success']);
    exit;
}

echo json_encode([
    'status' => 'error',
    'message' => $result['message'] ?? 'Failed to write highlight file',
]);
