<?php
header('Content-Type: application/json; charset=UTF-8');
require_once __DIR__ . '/../config/condb.php';
require_once __DIR__ . '/../config/helpers.php';
require_once __DIR__ . '/../config/inventory_api_service.php';
require_once __DIR__ . '/../config/session_check.php';

$input = api_json_body();
if ($input === []) {
    $input = $_POST;
}

$id = $input['id'] ?? '';
$puid = trim((string) ($input['puid'] ?? ''));

if ($id === '' || $puid === '') {
    echo json_encode(['status' => 'error', 'message' => 'Missing ID or PUID']);
    exit;
}

$id = (int) $id;

$fetch = inventory_fetch_by_puid($condb, $puid);
if ($fetch['status'] !== 'success' || empty($fetch['data'])) {
    echo json_encode([
        'status' => 'error',
        'message' => $fetch['message'] ?? 'Cannot connect to PDService or PUID not found',
    ]);
    exit;
}

$apiData = $fetch['data'];

$sqlCheck = 'SELECT ExpirationDate FROM inventory_receive WHERE id = ?';
$stmtCheck = $condb->prepare($sqlCheck);
$stmtCheck->bind_param('i', $id);
$stmtCheck->execute();
$resCheck = $stmtCheck->get_result()->fetch_assoc();
$oldDate = $resCheck['ExpirationDate'] ?? '';
$stmtCheck->close();

$newDate = nullable_sql_datetime($apiData['ExpirationDate'] ?? null);

if (inventory_apply_pdservice_data($condb, $id, $apiData)) {
    if ($newDate === null) {
        $stmtAfter = $condb->prepare('SELECT ExpirationDate FROM inventory_receive WHERE id = ?');
        $stmtAfter->bind_param('i', $id);
        $stmtAfter->execute();
        $newDate = $stmtAfter->get_result()->fetch_assoc()['ExpirationDate'] ?? $oldDate;
        $stmtAfter->close();
    }

    $msg = 'Updated all data successfully';
    if ($oldDate && $newDate && $oldDate != $newDate) {
        $msg = "Data refreshed. Expiration updated from $oldDate to $newDate";
    } elseif ($oldDate && $newDate && $oldDate == $newDate) {
        $msg = "Data refreshed successfully. Expiration date remains $newDate.";
    }

    echo json_encode([
        'status' => 'success',
        'message' => $msg,
        'new_date' => $newDate,
        'old_date' => $oldDate,
    ]);
} else {
    echo json_encode(['status' => 'error', 'message' => 'Database update failed: ' . $condb->error]);
}
