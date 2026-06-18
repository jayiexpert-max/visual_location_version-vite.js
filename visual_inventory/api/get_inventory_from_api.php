<?php
header('Content-Type: application/json; charset=UTF-8');

require_once __DIR__ . '/../config/session_check.php';
require_once __DIR__ . '/../config/condb.php';
require_once __DIR__ . '/../config/inventory_api_service.php';

$puid = trim($_GET['puid'] ?? '');
$hana = trim($_GET['hanapart'] ?? '');
$source = strtolower(trim($_GET['source'] ?? 'auto'));
$options = [];
if (in_array($source, ['api', 'pdservice'], true)) {
    $options['api_only'] = true;
}

try {
    $result = inventory_fetch_by_puid($condb, $puid, $hana, $options);
    echo json_encode($result, JSON_UNESCAPED_UNICODE);
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Server error while fetching PUID data.',
    ], JSON_UNESCAPED_UNICODE);
}
exit;
