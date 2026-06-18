<?php
require_once __DIR__ . '/../config/session_check.php';
require_once __DIR__ . '/../config/condb.php';
require_once __DIR__ . '/../config/box_layout_service.php';

header('Content-Type: application/json; charset=UTF-8');

$box_id = isset($_GET['box_id']) ? intval($_GET['box_id']) : 0;
$highlight_slot_id = isset($_GET['highlight_slot_id'])
    ? intval($_GET['highlight_slot_id'])
    : (isset($_GET['highlight_block_id']) ? intval($_GET['highlight_block_id']) : 0);

$result = box_layout_fetch($condb, $box_id, $highlight_slot_id);
echo json_encode($result);
exit;
