<?php
require_once __DIR__ . '/../config/auth_helpers.php';
require_once __DIR__ . '/../config/session_check.php';
require_once("../config/condb.php");

header('Content-Type: application/json');
cors_allow_app_origin();
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if (!isset($_GET['name'])) {
    echo json_encode(['status' => 'error', 'message' => 'No product name provided']);
    exit;
}

$product_name = trim($_GET['name']);

$stmt = $condb->prepare("
    SELECT p.id, p.qty, sl.id AS slot_id, sl.slot_no, x.id AS box_id, x.box_code, x.layout, 
           l.level_no, r.name AS rack_name 
    FROM products p
    JOIN slots sl ON p.slot_id = sl.id
    JOIN boxes x ON sl.box_id = x.id
    JOIN levels l ON x.level_id = l.id
    JOIN racks r ON l.rack_id = r.id
    WHERE p.name LIKE ?
    LIMIT 1
");

$search_term = "%" . $product_name . "%";
$stmt->bind_param("s", $search_term);
$stmt->execute();
$result = $stmt->get_result();

if ($result->num_rows > 0) {
    $product = $result->fetch_assoc();
    echo json_encode(['status' => 'success', 'data' => $product]);
} else {
    echo json_encode(['status' => 'not_found']);
}
