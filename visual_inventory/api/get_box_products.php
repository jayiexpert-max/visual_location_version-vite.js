<?php

header('Content-Type: application/json; charset=UTF-8');

require_once __DIR__ . '/../config/session_check.php';
require_once __DIR__ . '/../config/condb.php';
require_once __DIR__ . '/../config/warehouse_highlight_service.php';

$box_id = (int) ($_GET['box_id'] ?? 0);
if ($box_id <= 0) {
    echo json_encode([]);
    exit;
}

$boxCtx = ['rack_name' => '', 'level_no' => 0, 'box_code' => ''];
$boxStmt = $condb->prepare("
    SELECT b.box_code, l.level_no, r.name AS rack_name
    FROM boxes b
    JOIN levels l ON b.level_id = l.id
    JOIN racks r ON l.rack_id = r.id
    WHERE b.id = ?
    LIMIT 1
");
if ($boxStmt) {
    $boxStmt->bind_param('i', $box_id);
    $boxStmt->execute();
    $ctxRow = $boxStmt->get_result()->fetch_assoc();
    $boxStmt->close();
    if ($ctxRow) {
        $boxCtx['rack_name'] = trim((string) ($ctxRow['rack_name'] ?? ''));
        $boxCtx['level_no'] = (int) ($ctxRow['level_no'] ?? 0);
        $boxCtx['box_code'] = trim((string) ($ctxRow['box_code'] ?? ''));
    }
}

$sql = "SELECT p.id AS product_id, p.name, p.qty, sl.slot_no, sl.id AS slot_id
        FROM slots sl
        LEFT JOIN products p ON sl.id = p.slot_id
        WHERE sl.box_id = ?
        ORDER BY sl.slot_no ASC";

$stmt = $condb->prepare($sql);
$stmt->bind_param('i', $box_id);
$stmt->execute();
$result = $stmt->get_result();

$products = [];
while ($row = $result->fetch_assoc()) {
    $hanaPart = trim((string) ($row['name'] ?? ''));
    $slotId = (int) ($row['slot_id'] ?? 0);
    $row['puids'] = [];

    if ($hanaPart !== '') {
        $row['puids'] = wh_fetch_puids_for_box_slot(
            $condb,
            $hanaPart,
            $slotId,
            $boxCtx['rack_name'],
            $boxCtx['level_no'],
            $boxCtx['box_code']
        );
    }

    $qty = (int) ($row['qty'] ?? 0);
    $puidCount = count($row['puids']);
    if ($puidCount > 0) {
        $row['qty'] = max($qty, $puidCount);
    } else {
        $row['qty'] = $qty;
    }

    $products[] = $row;
}
$stmt->close();

echo json_encode($products);
