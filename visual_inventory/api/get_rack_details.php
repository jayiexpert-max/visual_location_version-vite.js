<?php
require_once __DIR__ . '/../config/session_check.php';
require_once("../config/condb.php");

header('Content-Type: application/json');

$rack_id = intval($_GET['rack_id'] ?? 0);

if (!$rack_id) {
    echo json_encode(['status' => 'error', 'message' => 'Missing rack_id']);
    exit;
}

try {
    $levelsStmt = $condb->prepare("SELECT id, level_no FROM levels WHERE rack_id = ? ORDER BY level_no ASC");
    $levelsStmt->bind_param("i", $rack_id);
    $levelsStmt->execute();
    $levels_res = $levelsStmt->get_result();
    $levels = [];
    while ($l = $levels_res->fetch_assoc()) {
        $level_id = (int) $l['id'];
        $boxesStmt = $condb->prepare("SELECT id, box_code, layout FROM boxes WHERE level_id = ? ORDER BY id ASC");
        $boxesStmt->bind_param("i", $level_id);
        $boxesStmt->execute();
        $boxes_res = $boxesStmt->get_result();
        $boxes = [];
        while ($b = $boxes_res->fetch_assoc()) {
            $boxes[] = $b;
        }
        $l['boxes'] = $boxes;
        $levels[] = $l;
    }

    echo json_encode(['status' => 'success', 'data' => ['levels' => $levels]]);
} catch (Exception $e) {
    echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
}
