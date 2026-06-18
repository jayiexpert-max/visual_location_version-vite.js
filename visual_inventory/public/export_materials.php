<?php
require_once("../config/condb.php");
require_once("../config/session_check.php");

if (!isset($_SESSION['user_id']) || $_SESSION['role'] !== 'admin') {
    die("Access Denied");
}

// Fetch all materials
$search = isset($_GET['search']) ? trim($_GET['search']) : '';
$where_clause = "";
if ($search !== "") {
    $search_safe = $condb->real_escape_string($search);
    $where_clause = " WHERE material_code LIKE '%$search_safe%' OR description LIKE '%$search_safe%' ";
}

$sql = "SELECT material_code, description FROM materials $where_clause ORDER BY material_code ASC";
$result = $condb->query($sql);

$filename = "materials_" . date('Ymd_His') . ".csv";

// Output headers to force download
header('Content-Type: text/csv; charset=utf-8');
header('Content-Disposition: attachment; filename="' . $filename . '"');

// Add BOM for Excel UTF-8 support
echo "\xEF\xBB\xBF";

$output = fopen('php://output', 'w');

// Header row
$isEN = ($_GET['lang'] ?? ($_SESSION['lang'] ?? 'th')) == 'en';
if ($isEN) {
    fputcsv($output, ['Material Code', 'Description']);
} else {
    fputcsv($output, ['รหัส Material', 'รายละเอียด']);
}

// Data rows
if ($result && $result->num_rows > 0) {
    while ($row = $result->fetch_assoc()) {
        fputcsv($output, [
            $row['material_code'],
            $row['description'] ?: '-'
        ]);
    }
}

fclose($output);
exit;
